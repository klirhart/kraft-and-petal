import { useCallback, useEffect, useRef, useState } from 'react'
import { toError } from '@/lib/errors'

export type AsyncData<T> =
  | { status: 'loading'; data: undefined; error: undefined }
  | { status: 'error'; data: undefined; error: Error }
  | { status: 'success'; data: T; error: undefined }

export type AsyncDataResult<T> = AsyncData<T> & {
  /** Fetches again. Keeps showing current data while the new data loads. */
  reload: () => Promise<void>
  /** True while a reload is in flight behind already-shown data. */
  isRefreshing: boolean
}

interface Stored<T> {
  key: string
  result: AsyncData<T>
}

const LOADING = { status: 'loading', data: undefined, error: undefined } as const

/**
 * Loads data for a screen and exposes the three states every route must
 * handle: loading, error and success (the screen decides what "empty" means).
 * Refetches when `key` changes; pass `null` to wait (stays loading).
 */
export function useAsyncData<T>(key: string | null, load: () => Promise<T>): AsyncDataResult<T> {
  const [stored, setStored] = useState<Stored<T> | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const loadRef = useRef(load)
  const requestRef = useRef(0)

  useEffect(() => {
    loadRef.current = load
  })

  const run = useCallback(async (forKey: string) => {
    const request = ++requestRef.current
    try {
      const data = await loadRef.current()
      if (request === requestRef.current) {
        setStored({ key: forKey, result: { status: 'success', data, error: undefined } })
      }
    } catch (error) {
      if (request === requestRef.current) {
        setStored({ key: forKey, result: { status: 'error', data: undefined, error: toError(error) } })
      }
    }
  }, [])

  useEffect(() => {
    if (key === null) return
    void run(key)
    return () => {
      // Ignore the answer to a request the screen no longer wants.
      requestRef.current += 1
    }
  }, [key, run])

  const reload = useCallback(async () => {
    if (key === null) return
    setIsRefreshing(true)
    try {
      await run(key)
    } finally {
      setIsRefreshing(false)
    }
  }, [key, run])

  // A result for a different key is stale, so the screen shows loading again.
  const result: AsyncData<T> = stored && stored.key === key ? stored.result : LOADING

  return { ...result, reload, isRefreshing }
}
