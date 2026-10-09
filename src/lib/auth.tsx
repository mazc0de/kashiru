import type { Session } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { persister } from './queryClient'
import { supabase } from './supabase'
import type { Profile } from './types'

interface AuthState {
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthState>({ session: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setState({ session: data.session, loading: false }))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, loading: false })
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

/** Profil Pengguna yang sedang login (null bila belum punya Toko). */
export function useMyProfile() {
  const { session } = useAuth()
  const uid = session?.user.id
  return useQuery({
    queryKey: ['me', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', uid!).maybeSingle()
      if (error) throw error
      return data as Profile | null
    },
  })
}

export function useSignOut() {
  const qc = useQueryClient()
  return async () => {
    await supabase.auth.signOut()
    qc.clear()
    await persister.removeClient()
  }
}
