import { createLocalDataSource, type KeyValueStore } from '@/lib/data/local/localDataSource'

export function memoryStore(): KeyValueStore {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  }
}

export const NOW = new Date('2026-11-10T15:00:00Z')
export const CUSTOMER = { email: 'maya@example.com', password: 'sample-petals' }
export const OTHER_CUSTOMER = { email: 'sam@example.com', password: 'sample-leaves' }
export const OPERATOR = { email: 'olive@kraftandpetal.example', password: 'sample-twine' }

/** A fresh sample backend that keeps its data in memory. */
export function sampleBackend(store: KeyValueStore = memoryStore()) {
  return createLocalDataSource({ storage: store, now: () => NOW })
}
