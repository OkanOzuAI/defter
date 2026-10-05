import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** False until .env.local (or Vercel's env vars) holds the project URL and anon key. */
export const isConfigured = Boolean(url && anonKey)

/** Password reset needs custom SMTP; hidden unless explicitly enabled. */
export const emailEnabled = import.meta.env.VITE_EMAIL_ENABLED === 'true'

// Only the anon/publishable key is ever used here. Row Level Security does the rest.
export const supabase = createClient(url || 'http://localhost:54321', anonKey || 'missing-anon-key')

/** The signed-in user's id, read from the locally stored session (no network call). */
export async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const id = data.session?.user.id
  if (!id) throw new Error('Not signed in')
  return id
}
