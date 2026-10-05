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

export async function changePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

/**
 * Deletes the signed-in user through the `delete_my_account()` database function
 * (every table cascades), then drops this device's session and local data.
 */
export async function deleteAccount(userId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account')
  if (error) throw error
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('defter.') && key.includes(userId)) localStorage.removeItem(key)
    }
  } catch {
    // nothing to clear
  }
  await supabase.auth.signOut({ scope: 'local' })
}
