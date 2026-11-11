/*
 * Builds supabase/seed.sql from the same sample catalogue the in-browser
 * sample backend uses, so the two can never drift apart.
 * tests/unit/seed.test.ts fails when seed.sql is out of date.
 */
import {
  SAMPLE_CATEGORIES,
  SAMPLE_PRODUCTS,
  SAMPLE_PRODUCT_IMAGES,
} from '../src/lib/data/local/sampleData.ts'

type Value = string | number | boolean

function literal(value: Value): string {
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) throw new Error(`Seed numbers must be integers, got ${value}`)
    return String(value)
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return `'${value.replace(/'/g, "''")}'`
}

function upsert(table: string, columns: string[], rows: Value[][]): string {
  const updates = columns
    .filter((column) => column !== 'id')
    .map((column) => `  ${column} = excluded.${column}`)
    .join(',\n')
  const values = rows.map((row) => `  (${row.map(literal).join(', ')})`).join(',\n')
  return [
    `insert into public.${table} (${columns.join(', ')})`,
    'values',
    values,
    'on conflict (id) do update set',
    `${updates};`,
  ].join('\n')
}

export function buildSeedSql(): string {
  const categories = upsert(
    'categories',
    ['id', 'created_at', 'name', 'slug', 'sort_order'],
    SAMPLE_CATEGORIES.map((row) => [row.id, row.created_at, row.name, row.slug, row.sort_order]),
  )
  const products = upsert(
    'products',
    ['id', 'created_at', 'category_id', 'name', 'slug', 'description', 'price_cents', 'stock', 'is_active'],
    SAMPLE_PRODUCTS.map((row) => [
      row.id,
      row.created_at,
      row.category_id,
      row.name,
      row.slug,
      row.description,
      row.price_cents,
      row.stock,
      row.is_active,
    ]),
  )
  const images = upsert(
    'product_images',
    ['id', 'created_at', 'product_id', 'storage_path', 'alt_text', 'sort_order'],
    SAMPLE_PRODUCT_IMAGES.map((row) => [
      row.id,
      row.created_at,
      row.product_id,
      row.storage_path,
      row.alt_text,
      row.sort_order,
    ]),
  )

  return `-- Kraft & Petal sample catalogue: categories, products and their pictures.
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

${categories}

${products}

${images}
`
}
