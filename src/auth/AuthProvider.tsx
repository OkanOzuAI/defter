import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { isConfigured, supabase } from '../api/supabase'
import { AuthContext, type AuthState } from './AuthContext'
import { clearCachedProfile } from './profileCache'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isConfigured)

  useEffect(() => {
    if (!isConfigured) return
    // Fires once with the stored session (INITIAL_SESSION), then on every change.
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      setLoading(false)
      if (event === 'SIGNED_OUT') {
        // Nothing of the previous user may stay in memory or on disk.
        queryClient.clear()
        clearCachedProfile()
      }
    })
    return () => data.subscription.unsubscribe()
  }, [queryClient])

  const value = useMemo<AuthState>(
    () => ({ session, user: session?.user ?? null, loading }),
    [session, loading],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
