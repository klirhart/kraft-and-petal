// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { buildSeedSql } from '../../scripts/seed-sql.ts'
import { read } from '../helpers/css'
import { sampleBackend } from '../helpers/sampleBackend'

describe('supabase/seed.sql', () => {
  it('is up to date with the sample catalogue (run "npm run seed:generate" if this fails)', () => {
    expect(read('supabase/seed.sql')).toBe(buildSeedSql())
  })

  it('holds every sample product the local backend serves', async () => {
    const seed = read('supabase/seed.sql')
    const backend = sampleBackend()
    for (const category of await backend.catalog.listCategories()) expect(seed).toContain(`'${category.slug}'`)
    for (const product of await backend.catalog.listProducts()) {
      expect(seed).toContain(`'${product.slug}', `)
      expect(seed).toContain(`${product.price_cents}, ${product.stock}, true)`)
    }
  })

  it('holds no accounts, orders or passwords', () => {
    const seed = read('supabase/seed.sql')
    expect(seed).not.toMatch(/auth\.users|public\.orders|public\.profiles|password/i)
  })
})
