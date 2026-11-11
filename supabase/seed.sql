-- Kraft & Petal sample catalogue: categories, products and their pictures.
--
-- GENERATED FILE. Do not edit by hand.
-- Source: src/lib/data/local/sampleData.ts
-- Rebuild: npm run seed:generate
--
-- Safe to run more than once: rows are matched by id and updated in place.
-- It holds no users and no orders. Create accounts through the app, then
-- promote the first operator by hand (see the README).
--
-- Pictures use the illustrations built into the app
-- (storage_path 'illustrations/<name>'), so nothing has to be uploaded.
-- Prices are integer cents.

insert into public.categories (id, created_at, name, slug, sort_order)
values
  ('949abf44-0000-4000-8000-000100000001', '2026-01-05T09:00:00.000Z', 'Bouquets', 'bouquets', 1),
  ('32d238f5-0000-4000-8000-000100000002', '2026-01-05T09:00:00.000Z', 'Plants', 'plants', 2),
  ('d109b2a6-0000-4000-8000-000100000003', '2026-01-05T09:00:00.000Z', 'Gifts', 'gifts', 3),
  ('6f412c57-0000-4000-8000-000100000004', '2026-01-05T09:00:00.000Z', 'Workshops', 'workshops', 4)
on conflict (id) do update set
  created_at = excluded.created_at,
  name = excluded.name,
  slug = excluded.slug,
  sort_order = excluded.sort_order;

insert into public.products (id, created_at, category_id, name, slug, description, price_cents, stock, is_active)
values
  ('8afe04d7-0000-4000-8000-000200000001', '2026-01-05T09:01:00.000Z', '949abf44-0000-4000-8000-000100000001', 'Blush Peony Bouquet', 'blush-peony-bouquet', 'Soft pink peonies with a little greenery, hand-tied and wrapped in kraft paper. Our most-loved bunch for birthdays and thank-yous.', 190000, 8, true),
  ('29357e88-0000-4000-8000-000200000002', '2026-01-05T09:02:00.000Z', '949abf44-0000-4000-8000-000100000001', 'Sunny Meadow Bunch', 'sunny-meadow-bunch', 'Cheerful yellow daisies gathered like a walk through a summer field. Bright, simple and hard not to smile at.', 140000, 12, true),
  ('c76cf839-0000-4000-8000-000200000003', '2026-01-05T09:03:00.000Z', '949abf44-0000-4000-8000-000100000001', 'Lilac Morning Posy', 'lilac-morning-posy', 'A small posy of lilac tulips, just right for a bedside table or a desk that needs cheering up.', 160000, 6, true),
  ('65a471ea-0000-4000-8000-000200000004', '2026-01-05T09:04:00.000Z', '949abf44-0000-4000-8000-000100000001', 'Cream & Green Wrap', 'cream-and-green-wrap', 'Cream roses and plenty of leafy green. Calm, quiet and lovely for a new home or a gentle hello.', 210000, 3, true),
  ('03dbeb9b-0000-4000-8000-000200000005', '2026-01-05T09:05:00.000Z', '949abf44-0000-4000-8000-000100000001', 'Autumn Dahlia Bunch', 'autumn-dahlia-bunch', 'Rust and coral dahlias for cooler days. A seasonal bunch that comes back each September.', 180000, 0, false),
  ('a213654c-0000-4000-8000-000200000006', '2026-01-05T09:06:00.000Z', '32d238f5-0000-4000-8000-000100000002', 'Little Monstera', 'little-monstera', 'A young monstera in a terracotta pot. Happy in bright, indirect light with a drink once a week.', 90000, 10, true),
  ('404adefd-0000-4000-8000-000200000007', '2026-01-05T09:07:00.000Z', '32d238f5-0000-4000-8000-000100000002', 'Snake Plant in Terracotta', 'snake-plant-in-terracotta', 'Tall, tidy and almost impossible to upset. A good first plant for a shady corner.', 110000, 7, true),
  ('de8258ae-0000-4000-8000-000200000008', '2026-01-05T09:08:00.000Z', '32d238f5-0000-4000-8000-000100000002', 'Windowsill Succulent', 'windowsill-succulent', 'A plump little rosette that asks for sunshine and not much else. Water it when you remember.', 45000, 0, true),
  ('7cb9d25f-0000-4000-8000-000200000009', '2026-01-05T09:09:00.000Z', 'd109b2a6-0000-4000-8000-000100000003', 'Petal Post Gift Box', 'petal-post-gift-box', 'A kraft box tied with twine, filled with a candle, a seed paper card and a sprig of dried flowers.', 150000, 5, true),
  ('1af14c10-0000-4000-8000-000200000010', '2026-01-05T09:10:00.000Z', 'd109b2a6-0000-4000-8000-000100000003', 'Wildflower Candle', 'wildflower-candle', 'A hand-poured soy candle that smells like a hedgerow in June. Burns for about 30 hours.', 70000, 15, true),
  ('b928c5c1-0000-4000-8000-000200000011', '2026-01-05T09:11:00.000Z', 'd109b2a6-0000-4000-8000-000100000003', 'Seed Paper Card', 'seed-paper-card', 'Write your note, then plant the card. Wildflowers come up a few weeks later.', 22500, 40, true),
  ('57603f72-0000-4000-8000-000200000012', '2026-01-05T09:12:00.000Z', '6f412c57-0000-4000-8000-000100000004', 'Wreath Making Evening', 'wreath-making-evening', 'Two relaxed hours making your own leafy wreath to take home. Tea, cake and all materials included.', 225000, 8, true),
  ('f597b923-0000-4000-8000-000200000013', '2026-01-05T09:13:00.000Z', '6f412c57-0000-4000-8000-000100000004', 'Hand-Tied Bouquet Class', 'hand-tied-bouquet-class', 'Learn the spiral technique florists use, then wrap your bouquet in kraft paper to carry home.', 275000, 4, true)
on conflict (id) do update set
  created_at = excluded.created_at,
  category_id = excluded.category_id,
  name = excluded.name,
  slug = excluded.slug,
  description = excluded.description,
  price_cents = excluded.price_cents,
  stock = excluded.stock,
  is_active = excluded.is_active;

insert into public.product_images (id, created_at, product_id, storage_path, alt_text, sort_order)
values
  ('81614a6a-0000-4000-8000-000300000001', '2026-01-05T09:01:00.000Z', '8afe04d7-0000-4000-8000-000200000001', 'illustrations/bouquet-blush', 'Pink peonies wrapped in kraft paper and tied with a twine bow', 0),
  ('1f98c41b-0000-4000-8000-000300000002', '2026-01-05T09:02:00.000Z', '29357e88-0000-4000-8000-000200000002', 'illustrations/bouquet-sunny', 'Yellow daisies wrapped in kraft paper and tied with a twine bow', 0),
  ('bdd03dcc-0000-4000-8000-000300000003', '2026-01-05T09:03:00.000Z', 'c76cf839-0000-4000-8000-000200000003', 'illustrations/bouquet-lilac', 'Lilac tulips wrapped in kraft paper and tied with a twine bow', 0),
  ('5c07b77d-0000-4000-8000-000300000004', '2026-01-05T09:04:00.000Z', '65a471ea-0000-4000-8000-000200000004', 'illustrations/bouquet-cream', 'Cream roses and green leaves wrapped in kraft paper with a twine bow', 0),
  ('fa3f312e-0000-4000-8000-000300000005', '2026-01-05T09:05:00.000Z', '03dbeb9b-0000-4000-8000-000200000005', 'illustrations/bouquet-autumn', 'Coral dahlias wrapped in kraft paper and tied with a twine bow', 0),
  ('9876aadf-0000-4000-8000-000300000006', '2026-01-05T09:06:00.000Z', 'a213654c-0000-4000-8000-000200000006', 'illustrations/plant-monstera', 'Small monstera plant with split leaves in a terracotta pot', 0),
  ('36ae2490-0000-4000-8000-000300000007', '2026-01-05T09:07:00.000Z', '404adefd-0000-4000-8000-000200000007', 'illustrations/plant-snake', 'Snake plant with tall pointed leaves in a terracotta pot', 0),
  ('d4e59e41-0000-4000-8000-000300000008', '2026-01-05T09:08:00.000Z', 'de8258ae-0000-4000-8000-000200000008', 'illustrations/plant-succulent', 'Small rosette succulent in a terracotta pot', 0),
  ('731d17f2-0000-4000-8000-000300000009', '2026-01-05T09:09:00.000Z', '7cb9d25f-0000-4000-8000-000200000009', 'illustrations/gift-box', 'Kraft paper gift box tied with twine, with a leafy sprig tucked in', 0),
  ('115491a3-0000-4000-8000-000300000010', '2026-01-05T09:10:00.000Z', '1af14c10-0000-4000-8000-000200000010', 'illustrations/gift-candle', 'Lit candle in a glass jar with a small flower on its label', 0),
  ('af8c0b54-0000-4000-8000-000300000011', '2026-01-05T09:11:00.000Z', 'b928c5c1-0000-4000-8000-000200000011', 'illustrations/gift-card', 'Folded greeting card with a pressed flower on the front', 0),
  ('4dc38505-0000-4000-8000-000300000012', '2026-01-05T09:12:00.000Z', '57603f72-0000-4000-8000-000200000012', 'illustrations/workshop-wreath', 'Round wreath of green leaves with small pink flowers', 0),
  ('ebfafeb6-0000-4000-8000-000300000013', '2026-01-05T09:13:00.000Z', 'f597b923-0000-4000-8000-000200000013', 'illustrations/workshop-bouquet', 'Florist scissors, a ball of twine and cut flower stems', 0)
on conflict (id) do update set
  created_at = excluded.created_at,
  product_id = excluded.product_id,
  storage_path = excluded.storage_path,
  alt_text = excluded.alt_text,
  sort_order = excluded.sort_order;
