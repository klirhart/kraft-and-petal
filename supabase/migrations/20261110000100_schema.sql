-- Kraft & Petal: tables, constraints and indexes.
--
-- Rules that hold for every table:
--   * id uuid primary key, created_at timestamptz
--   * money is integer cents, never floating point
--   * Row Level Security is switched on (policies are in the next migration)
--
-- Never edit the live schema by hand in the Supabase dashboard. Add a new
-- migration file instead.

-- One row per signed-in user. Rows are created by a trigger on auth.users
-- (next migration), always with role 'customer'.
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null default 'customer',
  constraint profiles_full_name_length check (char_length(btrim(full_name)) between 1 and 80),
  constraint profiles_role_known check (role in ('customer', 'operator'))
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  slug text not null unique,
  sort_order integer not null default 0,
  constraint categories_name_length check (char_length(btrim(name)) between 1 and 80),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  category_id uuid not null references public.categories (id) on delete restrict,
  name text not null,
  slug text not null unique,
  description text not null default '',
  price_cents integer not null,
  stock integer not null default 0,
  is_active boolean not null default false,
  constraint products_name_length check (char_length(btrim(name)) between 1 and 80),
  constraint products_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  constraint products_description_length check (char_length(description) <= 2000),
  constraint products_price_not_negative check (price_cents >= 0),
  constraint products_stock_not_negative check (stock >= 0)
);

create index products_category_id_idx on public.products (category_id);
create index products_active_idx on public.products (created_at) where is_active;

-- storage_path is either a file in the product-images bucket
-- ('products/<uuid>.webp') or a built-in illustration ('illustrations/<name>').
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null,
  alt_text text not null,
  sort_order integer not null default 0,
  constraint product_images_storage_path_present check (char_length(btrim(storage_path)) between 1 and 300),
  -- Every picture needs a description for people who cannot see it.
  constraint product_images_alt_text_present check (char_length(btrim(alt_text)) > 0),
  constraint product_images_alt_text_length check (char_length(alt_text) <= 125)
);

create index product_images_product_id_idx on public.product_images (product_id, sort_order);

-- Rows are written only by public.place_order(). A customer with orders
-- cannot be deleted until their orders are dealt with, so order history is
-- never lost by accident.
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customer_id uuid not null references public.profiles (user_id) on delete restrict,
  status text not null default 'pending',
  total_cents integer not null,
  delivery_date date not null,
  delivery_address text not null,
  note text,
  constraint orders_status_known check (
    status in ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')
  ),
  constraint orders_total_not_negative check (total_cents >= 0),
  constraint orders_delivery_address_length check (char_length(btrim(delivery_address)) between 1 and 500),
  constraint orders_note_length check (note is null or char_length(note) <= 500)
);

create index orders_customer_id_idx on public.orders (customer_id, created_at desc);
create index orders_created_at_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (status);

-- product_name is a copy taken when the order is placed. A customer can then
-- still read what they bought after the product is renamed or hidden, without
-- being given access to hidden products.
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  product_name text not null,
  quantity integer not null,
  unit_price_cents integer not null,
  constraint order_items_quantity_positive check (quantity > 0),
  constraint order_items_unit_price_not_negative check (unit_price_cents >= 0)
);

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);

-- One-time keys sent with "Place order", so a double press or a retry after a
-- dropped connection returns the first order instead of creating a second.
-- Only public.place_order() reads or writes this table.
create table public.order_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customer_id uuid not null references public.profiles (user_id) on delete cascade,
  request_id uuid not null,
  order_id uuid not null references public.orders (id) on delete cascade,
  constraint order_requests_once_per_customer unique (customer_id, request_id)
);

create index order_requests_order_id_idx on public.order_requests (order_id);

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_requests enable row level security;
