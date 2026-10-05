import type { Session, User } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

export type AuthState = {
  session: Session | null
  user: User | null
  /** True until the stored session has been read on app start. */
  loading: boolean
}

export const AuthContext = createContext<AuthState>({ session: null, user: null, loading: true })

export function useAuth(): AuthState {
  return useContext(AuthContext)
}
