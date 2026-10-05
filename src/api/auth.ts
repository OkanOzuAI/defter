import { supabase } from './supabase'

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

/** Returns true when Supabase has "Confirm email" on and the user must click a link first. */
export async function signUp(email: string, password: string): Promise<boolean> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.origin },
  })
  if (error) throw error
  return data.session === null
}

export async function signOut(): Promise<void> {
  // scope 'local' also works offline: it clears this device's session without a round trip.
  const { error } = await supabase.auth.signOut({ scope: 'local' })
  if (error) throw error
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/profile`,
  })
  if (error) throw error
}
