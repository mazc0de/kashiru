import { FunctionsHttpError } from '@supabase/supabase-js'

/** Pesan error yang bisa ditampilkan ke Pengguna. */
export async function errorMessage(e: unknown): Promise<string> {
  if (e instanceof FunctionsHttpError) {
    const res = e.context as Response
    if (res.status === 404) return 'Edge Function belum di-deploy. Lihat supabase/README.md langkah 3.'
    try {
      const body = await res.json()
      // `error`: pesan dari fungsi kita; `message`: pesan dari gateway/library Supabase.
      if (body?.error) return String(body.error)
      if (body?.message) return `Edge Function gagal (${res.status}): ${body.message}`
    } catch {
      /* abaikan */
    }
    return `Edge Function gagal (${res.status}).`
  }
  return errorText(e)
}

export function errorText(e: unknown): string {
  if (isNetworkError(e)) return 'Koneksi terputus. Periksa internet lalu coba lagi.'
  if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string') {
    if (/duplicate key|unique constraint/i.test(e.message)) return 'Nama sudah dipakai.'
    if (e.message === 'Invalid login credentials') return 'Email atau password salah.'
    return e.message
  }
  return 'Terjadi kesalahan.'
}

export function isNetworkError(e: unknown) {
  const msg = e && typeof e === 'object' && 'message' in e ? String(e.message) : ''
  return /Failed to fetch|NetworkError|Load failed|fetch failed/i.test(msg)
}
