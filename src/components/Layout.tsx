import { NavLink, Navigate, Outlet } from 'react-router'
import { Boxes, History, LogOut, PackageCheck, Settings, ShoppingCart, WifiOff } from 'lucide-react'
import { useAuth, useMyProfile, useSignOut } from '../lib/auth'
import { useOnline } from '../lib/online'
import { useStore } from '../lib/queries'
import { Button, Spinner, focusRing } from './ui'

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
    <div role="status" className="flex items-center justify-center gap-2 bg-red-700 px-4 py-2 text-center text-sm font-medium text-white">
      <WifiOff size={16} className="shrink-0" />
      Koneksi internet terputus. Penyimpanan dinonaktifkan, pencarian tetap jalan dari data tersimpan.
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
      <div className="mx-auto max-w-sm px-4 py-16 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Akun nonaktif</h1>
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
      <a
        href="#konten"
        className="sr-only z-50 rounded-lg bg-white px-3 py-2 text-sm font-medium text-teal-800 shadow-raised focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Lewati ke konten
      </a>
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-md supports-[not(backdrop-filter:blur(0))]:bg-white">
        <OfflineBanner />
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-3 sm:gap-4 sm:px-4">
          <div className="flex min-w-0 shrink-0 items-center gap-2.5">
            <span
              aria-hidden
              className="grid size-9 place-items-center rounded-lg bg-teal-700 text-base font-bold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.15)]"
            >
              K
            </span>
            <div className="min-w-0">
              <div className="text-sm leading-tight font-semibold tracking-tight text-slate-900">Kashiru</div>
              <div className="max-w-28 truncate text-xs leading-tight sm:max-w-36 text-slate-500">{store.data?.name}</div>
            </div>
          </div>
          <nav aria-label="Menu utama" className="-my-1 flex flex-1 gap-1 overflow-x-auto py-1 [scrollbar-width:none]">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors duration-150 ${focusRing} ${isActive ? 'bg-teal-700/10 text-teal-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`
                }
              >
                <n.icon size={18} aria-hidden />
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden shrink-0 border-l border-slate-200 pl-4 text-right text-xs md:block">
            <div className="max-w-32 truncate font-medium text-slate-700">{profile.data.display_name}</div>
            <button
              type="button"
              className={`ml-auto flex items-center gap-1 rounded text-slate-500 transition-colors hover:text-teal-800 ${focusRing}`}
              onClick={signOut}
            >
              <LogOut size={14} />
              Keluar
            </button>
          </div>
        </div>
      </header>
      <main id="konten" className="mx-auto w-full max-w-7xl flex-1 px-3 pt-4 pb-10 sm:px-4 sm:pt-6">
        <Outlet />
      </main>
    </div>
  )
}
