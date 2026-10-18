import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { AppLayout } from './components/Layout'
import './index.css'
import { AuthProvider } from './lib/auth'
import { persistedKeys, persister, queryClient } from './lib/queryClient'
import { supabaseConfigured } from './lib/supabase'
import { CreateStorePage, LoginPage, SignupPage } from './pages/AuthPages'
import { CashierPage } from './pages/CashierPage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { ProductFormPage } from './pages/ProductFormPage'
import { ReceivingPage } from './pages/ReceivingPage'
import { SaleDetailPage } from './pages/SaleDetailPage'
import { SalesHistoryPage } from './pages/SalesHistoryPage'
import { CategoriesBrandsPage } from './pages/settings/CategoriesBrandsPage'
import { MechanicsPage } from './pages/settings/MechanicsPage'
import { SettingsPage } from './pages/settings/SettingsPage'
import { UsersPage } from './pages/settings/UsersPage'
import { StockPage } from './pages/StockPage'

// Setelah deploy baru, hash chunk berubah dan service worker baru menghapus precache lama,
// sehingga tab yang masih memakai bundle lama gagal memuat chunk lazy (mis. CameraScanner).
// Muat ulang agar memakai bundle terbaru; jeda minimal 10 detik antar-reload mencegah loop.
const RELOAD_KEY = 'kashiru:chunk-reload-at'
window.addEventListener('vite:preloadError', (event) => {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0)
    if (Date.now() - last < 10_000) return
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch {
    return
  }
  event.preventDefault()
  window.location.reload()
})

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/daftar', element: <SignupPage /> },
  { path: '/buat-toko', element: <CreateStorePage /> },
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <CashierPage /> },
      { path: 'stok', element: <StockPage /> },
      { path: 'stok/:id', element: <ProductDetailPage /> },
      { path: 'sparepart/baru', element: <ProductFormPage /> },
      { path: 'sparepart/:id/ubah', element: <ProductFormPage /> },
      { path: 'penerimaan', element: <ReceivingPage /> },
      { path: 'riwayat', element: <SalesHistoryPage /> },
      { path: 'riwayat/:id', element: <SaleDetailPage /> },
      { path: 'pengaturan', element: <SettingsPage /> },
      { path: 'pengaturan/pengguna', element: <UsersPage /> },
      { path: 'pengaturan/kategori-merek', element: <CategoriesBrandsPage /> },
      { path: 'pengaturan/mekanik', element: <MechanicsPage /> },
    ],
  },
])

function MissingConfig() {
  return (
    <div className="mx-auto max-w-lg p-8">
      <h1 className="text-lg font-semibold">Konfigurasi Supabase belum diisi</h1>
      <p className="mt-2 text-slate-600">
        Salin <code>.env.example</code> menjadi <code>.env</code>, isi <code>VITE_SUPABASE_URL</code> dan{' '}
        <code>VITE_SUPABASE_ANON_KEY</code>, lalu jalankan ulang <code>pnpm dev</code>.
      </p>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {supabaseConfigured ? (
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 7 * 24 * 60 * 60 * 1000,
          dehydrateOptions: {
            shouldDehydrateQuery: (q) =>
              q.state.status === 'success' && persistedKeys.has(String(q.queryKey[0])),
          },
        }}
      >
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </PersistQueryClientProvider>
    ) : (
      <MissingConfig />
    )}
  </StrictMode>,
)
