/*
 * The app's single door to its data. Components import `data` from here and
 * never touch a backend directly.
 *
 * With VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set, calls go to
 * Supabase. Without them, the app runs on sample data kept in this browser.
 * Each backend is loaded on demand, so the unused one never downloads.
 */
import { isSupabaseConfigured, sampleLatencyMs } from '@/lib/env'
import type { DataMode, DataSource } from './types'

export type { DataMode, DataSource } from './types'

export const dataMode: DataMode = isSupabaseConfigured ? 'supabase' : 'sample'

/** Photo uploads need Supabase Storage. On sample data, products use the built-in illustrations. */
export const supportsImageUpload: boolean = dataMode === 'supabase'

let backend: Promise<DataSource> | null = null

function loadBackend(): Promise<DataSource> {
  backend ??=
    dataMode === 'supabase'
      ? Promise.all([import('@/lib/supabase'), import('./supabase/supabaseDataSource')]).then(
          ([client, module]) => module.createSupabaseDataSource(client.getSupabaseClient()),
        )
      : import('./local/localDataSource').then((module) =>
          module.createLocalDataSource({ latencyMs: sampleLatencyMs }),
        )
  return backend
}

type AsyncMethods = Record<string, (...args: never[]) => Promise<unknown>>

/**
 * Builds one section of the data source. Each method waits for the backend
 * to load, then passes the call on. A complete, typed list of names keeps
 * this a plain object (easy to read, and to replace in tests).
 */
function section<K extends keyof DataSource>(
  name: K,
  methodNames: { [M in keyof DataSource[K]]: true },
): DataSource[K] {
  const forwarders: Record<string, unknown> = {}
  for (const method of Object.keys(methodNames)) {
    forwarders[method] = async (...args: never[]) => {
      const source = await loadBackend()
      const target = (source[name] as unknown as AsyncMethods)[method]
      if (!target) throw new Error(`Unknown data method: ${name}.${method}`)
      return target(...args)
    }
  }
  return forwarders as DataSource[K]
}

const auth = section('auth', {
  getSession: true,
  onSessionChange: true,
  signIn: true,
  signUp: true,
  signOut: true,
  listSampleAccounts: true,
})

export const data: DataSource = {
  auth: {
    ...auth,
    // Subscribing is synchronous, so it is bridged by hand.
    onSessionChange(listener) {
      let unsubscribe: (() => void) | null = null
      let cancelled = false
      void loadBackend().then((source) => {
        if (!cancelled) unsubscribe = source.auth.onSessionChange(listener)
      })
      return () => {
        cancelled = true
        unsubscribe?.()
      }
    },
  },
  catalog: section('catalog', {
    listCategories: true,
    listProducts: true,
    getProductBySlug: true,
    getProductsByIds: true,
  }),
  orders: section('orders', { place: true, listMine: true }),
  admin: section('admin', {
    listProducts: true,
    createProduct: true,
    updateProduct: true,
    setProductActive: true,
    setProductStock: true,
    deleteProduct: true,
    uploadProductImage: true,
    listOrders: true,
    updateOrderStatus: true,
  }),
}

/** Restores the sample data. Does nothing when Supabase is in use. */
export async function resetSampleData(): Promise<void> {
  if (dataMode !== 'sample') return
  const source = await loadBackend()
  if ('reset' in source && typeof source.reset === 'function') await source.reset()
}
