import { FunctionsHttpError } from '@supabase/supabase-js'

/** Pesan error yang bisa ditampilkan ke Pengguna. */
export async function errorMessage(e: unknown): Promise<string> {
  if (e instanceof FunctionsHttpError) {
    try {
      const body = await e.context.json()
      if (body?.error) return String(body.error)
    } catch {
      /* abaikan */
    }
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
