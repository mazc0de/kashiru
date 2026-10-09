import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { QueryClient } from '@tanstack/react-query'
import { del, get, set } from 'idb-keyval'

const DAY = 24 * 60 * 60 * 1000

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 7 * DAY,
      staleTime: 30_000,
      retry: 1,
      // Tetap tampilkan data cache saat offline (mis. pencarian Sparepart).
      networkMode: 'offlineFirst',
    },
  },
})

export const persister = createAsyncStoragePersister({
  storage: { getItem: get, setItem: set, removeItem: del },
  key: 'kashiru-cache',
  throttleTime: 2000,
})

/** Hanya data master yang dipersist ke browser untuk pencarian instan. */
export const persistedKeys = new Set(['products', 'categories', 'brands', 'mechanics', 'store', 'me'])
