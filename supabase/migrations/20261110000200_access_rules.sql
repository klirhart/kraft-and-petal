-- Kraft & Petal: who may read and change what.
--
-- Roles
--   visitor   no session            Postgres role `anon`
--   customer  signed in             Postgres role `authenticated`, profiles.role = 'customer'
--   operator  signed in             Postgres role `authenticated`, profiles.role = 'operator'
--
-- Two layers, both needed:
--   1. GRANTs decide which commands and columns a Postgres role may touch.
--   2. Row Level Security policies decide which rows.
-- The browser guard in src/features/auth is a convenience only. These rules
-- are what protect the data.
--
-- A change to anything here needs a new migration and an update to
-- tests/unit/rls.test.ts (RLS-01 to RLS-15).

-- ---------------------------------------------------------------------------
-- Helper: is the caller an operator?
-- Security definer, so policies on `profiles` never have to read `profiles`
-- through themselves.
-- ---------------------------------------------------------------------------
create function public.is_operator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = (select auth.uid())
      and role = 'operator'
  );
$$;

revoke all on function public.is_operator() from public;
grant execute on function public.is_operator() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Profiles are created by the database, always as a customer.
-- The first operator is promoted by hand in the Supabase SQL editor:
--   update public.profiles set role = 'operator'
--   where user_id = (select id from auth.users where email = 'you@example.com');
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  -- The name typed at sign-up is the only thing taken from the browser.
  v_name := left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 80);
  if v_name = '' then
    v_name := left(coalesce(nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Customer'), 80);
  end if;

  insert into public.profiles (user_id, full_name, role)
  values (new.id, v_name, 'customer')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Second lock on top of the column grant below: a request from the app can
-- never change who a profile belongs to or what role it has.
create function public.protect_profile_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated')
     and (new.role is distinct from old.role
          or new.user_id is distinct from old.user_id
          or new.id is distinct from old.id) then
    raise exception 'KP_FORBIDDEN'
      using errcode = '42501', detail = 'Roles can only be changed by the shop owner in the database.';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_identity
  before update on public.profiles
  for each row execute function public.protect_profile_identity();

-- ---------------------------------------------------------------------------
-- Order status rules, enforced for every caller:
--   * a delivered or cancelled order is closed and cannot change again
--   * cancelling puts the items back in stock
-- ---------------------------------------------------------------------------
create function public.apply_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if old.status in ('delivered', 'cancelled') then
    raise exception 'KP_ORDER_CLOSED'
      using detail = 'This order is closed, so its status can no longer change.';
  end if;

  if new.status = 'cancelled' then
    update public.products as p
    set stock = p.stock + i.quantity
    from (
      select product_id, sum(quantity)::integer as quantity
      from public.order_items
      where order_id = old.id
      group by product_id
    ) as i
    where p.id = i.product_id;
  end if;

  return new;
end;
$$;

revoke all on function public.apply_order_status_change() from public, anon, authenticated;

create trigger orders_apply_status_change
  before update of status on public.orders
  for each row execute function public.apply_order_status_change();

-- A request from the app may change an order's status and nothing else.
-- (The column grant below says the same; this holds even if a grant is
-- widened by mistake.)
create function public.protect_order_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated')
     and (new.id is distinct from old.id
          or new.created_at is distinct from old.created_at
          or new.customer_id is distinct from old.customer_id
          or new.total_cents is distinct from old.total_cents
          or new.delivery_date is distinct from old.delivery_date
          or new.delivery_address is distinct from old.delivery_address
          or new.note is distinct from old.note) then
    raise exception 'KP_FORBIDDEN'
      using errcode = '42501', detail = 'Only the status of an order can be changed.';
  end if;
  return new;
end;
$$;

create trigger orders_protect_columns
  before update on public.orders
  for each row execute function public.protect_order_columns();

-- ---------------------------------------------------------------------------
-- The shop's calendar day. Keep the time zone in step with
-- SHOP_CONFIG.timeZone in src/lib/config.ts.
-- ---------------------------------------------------------------------------
create function public.shop_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/New_York')::date;
$$;

revoke all on function public.shop_today() from public;
grant execute on function public.shop_today() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Placing an order.
--
-- The browser says what, where and when. The database decides everything
-- about money and stock: it reads current prices, checks each product is in
-- the shop and in stock, lowers stock, and writes the order for the signed-in
-- user with status 'pending'. Any failure rolls the whole order back.
--
-- p_items: [{"product_id": "<uuid>", "quantity": 2}, ...]
-- Any price, total, customer or status sent by the browser is ignored; there
-- is no parameter for them.
--
-- Errors use a fixed message the app recognises, with a sentence for the
-- customer in DETAIL:
--   KP_AUTH_REQUIRED, KP_INVALID_ORDER, KP_PRODUCT_UNAVAILABLE, KP_OUT_OF_STOCK
-- ---------------------------------------------------------------------------
create function public.place_order(
  p_items jsonb,
  p_delivery_date date,
  p_delivery_address text,
  p_note text default null,
  p_request_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer uuid := (select auth.uid());
  v_order_id uuid;
  v_total bigint := 0;
  v_earliest date := public.shop_today() + 1;
  v_address text := btrim(coalesce(p_delivery_address, ''));
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_line record;
  v_product public.products%rowtype;
begin
  if v_customer is null
     or not exists (select 1 from public.profiles where user_id = v_customer) then
    raise exception 'KP_AUTH_REQUIRED' using detail = 'Sign in to place your order.';
  end if;

  -- A repeated request returns the first order. The lock makes a double
  -- press wait for the first press to finish instead of racing it.
  if p_request_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(v_customer::text || ':' || p_request_id::text, 0));
    select r.order_id into v_order_id
    from public.order_requests as r
    where r.customer_id = v_customer and r.request_id = p_request_id;
    if v_order_id is not null then
      return v_order_id;
    end if;
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'KP_INVALID_ORDER' using detail = 'Your cart is empty.';
  end if;
  if jsonb_array_length(p_items) > 100 then
    raise exception 'KP_INVALID_ORDER' using detail = 'That is too many different items for one order.';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_items) as item
    where jsonb_typeof(item) <> 'object'
       or coalesce(item ->> 'product_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or coalesce(item ->> 'quantity', '') !~ '^[0-9]{1,4}$'
       or (item ->> 'quantity')::integer < 1
  ) then
    raise exception 'KP_INVALID_ORDER' using detail = 'Each item needs a quantity of one or more.';
  end if;

  if p_delivery_date is null or p_delivery_date < v_earliest then
    raise exception 'KP_INVALID_ORDER'
      using detail = 'Choose a delivery date from ' || to_char(v_earliest, 'FMMonth FMDD') || '.';
  end if;
  if v_address = '' then
    raise exception 'KP_INVALID_ORDER' using detail = 'Enter a delivery address.';
  end if;
  if char_length(v_address) > 500 then
    raise exception 'KP_INVALID_ORDER' using detail = 'Shorten the delivery address a little.';
  end if;
  if char_length(coalesce(v_note, '')) > 500 then
    raise exception 'KP_INVALID_ORDER' using detail = 'Keep the note to 500 characters or fewer.';
  end if;

  insert into public.orders (customer_id, status, total_cents, delivery_date, delivery_address, note)
  values (v_customer, 'pending', 0, p_delivery_date, v_address, v_note)
  returning id into v_order_id;

  -- Lines for the same product are added together. Products are locked in a
  -- fixed order so two orders placed at once cannot deadlock or oversell.
  for v_line in
    select (item ->> 'product_id')::uuid as product_id,
           sum((item ->> 'quantity')::integer) as quantity
    from jsonb_array_elements(p_items) as item
    group by 1
    order by 1
  loop
    select * into v_product
    from public.products
    where id = v_line.product_id
    for update;

    if not found then
      raise exception 'KP_PRODUCT_UNAVAILABLE'
        using detail = 'Sorry, one of your items is no longer available.';
    end if;
    if not v_product.is_active then
      raise exception 'KP_PRODUCT_UNAVAILABLE'
        using detail = 'Sorry, ' || v_product.name || ' is no longer available.';
    end if;
    if v_product.stock < v_line.quantity then
      raise exception 'KP_OUT_OF_STOCK'
        using detail = case
          when v_product.stock = 0 then 'Sorry, ' || v_product.name || ' has just sold out.'
          else 'Sorry, we only have ' || v_product.stock || ' of ' || v_product.name || ' left.'
        end;
    end if;

    update public.products
    set stock = stock - v_line.quantity::integer
    where id = v_product.id;

    insert into public.order_items (order_id, product_id, product_name, quantity, unit_price_cents)
    values (v_order_id, v_product.id, v_product.name, v_line.quantity::integer, v_product.price_cents);

    v_total := v_total + v_product.price_cents::bigint * v_line.quantity;
  end loop;

  if v_total > 2147483647 then
    raise exception 'KP_INVALID_ORDER' using detail = 'That order is too large to place online. Please contact the shop.';
  end if;

  update public.orders set total_cents = v_total::integer where id = v_order_id;

  if p_request_id is not null then
    insert into public.order_requests (customer_id, request_id, order_id)
    values (v_customer, p_request_id, v_order_id);
  end if;

  return v_order_id;
end;
$$;

revoke all on function public.place_order(jsonb, date, text, text, uuid) from public, anon;
grant execute on function public.place_order(jsonb, date, text, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Grants. Start from nothing, then give each role exactly what it needs.
-- (Supabase can grant broad table rights by default; RLS would still apply,
-- but column limits would not.)
-- ---------------------------------------------------------------------------
revoke all on table
  public.profiles,
  public.categories,
  public.products,
  public.product_images,
  public.orders,
  public.order_items,
  public.order_requests
from public, anon, authenticated;

grant usage on schema public to anon, authenticated;

-- Shop window: anyone may read. RLS limits products to active ones.
grant select on public.categories, public.products, public.product_images to anon, authenticated;

-- Catalogue management. RLS limits these to operators.
grant insert, update, delete on public.categories, public.products, public.product_images to authenticated;

-- Profiles: read (RLS: own row, or all for operators); change the name only.
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

-- Orders: read (RLS: own, or all for operators); change the status only
-- (RLS: operators). No insert and no delete: orders are created by
-- place_order() and are never deleted from the app.
grant select on public.orders, public.order_items to authenticated;
grant update (status) on public.orders to authenticated;

-- order_requests: no grants. Only place_order() touches it.

-- ---------------------------------------------------------------------------
-- Row Level Security policies
-- ---------------------------------------------------------------------------

-- profiles
create policy "Profiles: read own, operators read all"
  on public.profiles for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_operator()));

create policy "Profiles: update own row"
  on public.profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- categories
create policy "Categories: anyone can read"
  on public.categories for select to anon, authenticated
  using (true);

create policy "Categories: operators add"
  on public.categories for insert to authenticated
  with check ((select public.is_operator()));

create policy "Categories: operators change"
  on public.categories for update to authenticated
  using ((select public.is_operator()))
  with check ((select public.is_operator()));

create policy "Categories: operators remove"
  on public.categories for delete to authenticated
  using ((select public.is_operator()));

-- products
create policy "Products: anyone reads active, operators read all"
  on public.products for select to anon, authenticated
  using (is_active or (select public.is_operator()));

create policy "Products: operators add"
  on public.products for insert to authenticated
  with check ((select public.is_operator()));

create policy "Products: operators change"
  on public.products for update to authenticated
  using ((select public.is_operator()))
  with check ((select public.is_operator()));

create policy "Products: operators remove"
  on public.products for delete to authenticated
  using ((select public.is_operator()));

-- product_images
create policy "Product images: anyone reads images of active products, operators read all"
  on public.product_images for select to anon, authenticated
  using (
    (select public.is_operator())
    or exists (
      select 1 from public.products as p
      where p.id = product_images.product_id and p.is_active
    )
  );

create policy "Product images: operators add"
  on public.product_images for insert to authenticated
  with check ((select public.is_operator()));

create policy "Product images: operators change"
  on public.product_images for update to authenticated
  using ((select public.is_operator()))
  with check ((select public.is_operator()));

create policy "Product images: operators remove"
  on public.product_images for delete to authenticated
  using ((select public.is_operator()));

-- orders
create policy "Orders: customers read own, operators read all"
  on public.orders for select to authenticated
  using (customer_id = (select auth.uid()) or (select public.is_operator()));

create policy "Orders: operators update"
  on public.orders for update to authenticated
  using ((select public.is_operator()))
  with check ((select public.is_operator()));

-- order_items
create policy "Order items: customers read own, operators read all"
  on public.order_items for select to authenticated
  using (
    (select public.is_operator())
    or exists (
      select 1 from public.orders as o
      where o.id = order_items.order_id and o.customer_id = (select auth.uid())
    )
  );

-- order_requests: RLS is on and there are no policies, so the app roles can
-- neither read nor write it.
