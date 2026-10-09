import { NavLink, Navigate, Outlet } from 'react-router'
import { Boxes, History, LogOut, PackageCheck, Settings, ShoppingCart, WifiOff } from 'lucide-react'
import { useAuth, useMyProfile, useSignOut } from '../lib/auth'
import { useOnline } from '../lib/online'
import { useStore } from '../lib/queries'
import { Button, Spinner } from './ui'

const nav = [
  { to: '/', label: 'Kasir', icon: ShoppingCart, end: true },
  { to: '/stok', label: 'Cek Stok', icon: Boxes },
  { to: '/penerimaan', label: 'Penerimaan', icon: PackageCheck },
  { to: '/riwayat', label: 'Riwayat', icon: History },
  { to: '/pengaturan', label: 'Pengaturan', icon: Settings },
]

export function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div className="flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-center text-sm font-medium text-white">
      <WifiOff size={16} className="shrink-0" />
      Koneksi internet terputus — penyimpanan dinonaktifkan. Pencarian tetap jalan dari data tersimpan.
    </div>
  )
}

/** Halaman aplikasi: butuh login, Toko, dan Pengguna aktif. */
export function AppLayout() {
  const { session, loading } = useAuth()
  const profile = useMyProfile()
  const store = useStore()
  const signOut = useSignOut()

  if (loading) return <Spinner />
  if (!session) return <Navigate to="/login" replace />
  if (profile.isLoading) return <Spinner />
  if (profile.error && !profile.data) {
    return (
      <div className="p-6 text-center">
        <OfflineBanner />
        <p className="mt-4 text-slate-600">Gagal memuat akun. Periksa koneksi lalu muat ulang.</p>
      </div>
    )
  }
  if (!profile.data) return <Navigate to="/buat-toko" replace />
  if (!profile.data.is_active) {
    return (
      <div className="mx-auto max-w-sm p-6 text-center">
        <h1 className="text-lg font-semibold">Akun nonaktif</h1>
        <p className="mt-2 text-slate-600">Akun ini sudah dinonaktifkan oleh Toko. Hubungi pemilik bengkel.</p>
        <Button className="mt-4" variant="secondary" onClick={signOut}>
          <LogOut size={18} />
          Keluar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <OfflineBanner />
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2">
          <div className="min-w-0 shrink-0">
            <div className="font-bold text-teal-700">Kashiru</div>
            <div className="max-w-40 truncate text-xs text-slate-500">{store.data?.name}</div>
          </div>
          <nav className="flex flex-1 gap-1 overflow-x-auto">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium ${isActive ? 'bg-teal-50 text-teal-800' : 'text-slate-600 hover:bg-slate-100'}`
                }
              >
                <n.icon size={18} />
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden shrink-0 text-right text-xs text-slate-500 md:block">
            {profile.data.display_name}
            <button type="button" className="ml-auto flex items-center gap-1 text-teal-700 hover:underline" onClick={signOut}>
              <LogOut size={14} />
              Keluar
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 p-3 sm:p-4">
        <Outlet />
      </main>
    </div>
  )
}
