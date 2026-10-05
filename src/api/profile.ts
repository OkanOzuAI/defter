import { currentUserId, supabase } from './supabase'
import type { NewProfile, Profile } from './types'

export class UsernameTakenError extends Error {
  constructor() {
    super('Username taken')
    this.name = 'UsernameTakenError'
  }
}

/** Null means the user has signed up but not finished onboarding yet. */
export async function getProfile(): Promise<Profile | null> {
  const id = await currentUserId()
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function createProfile(profile: NewProfile): Promise<Profile> {
  const id = await currentUserId()
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id, ...profile })
    .select()
    .single()
  if (error) throw toUsernameError(error)
  return data
}

export async function updateProfile(patch: Partial<Omit<Profile, 'id'>>): Promise<Profile> {
  const id = await currentUserId()
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw toUsernameError(error)
  return data
}

// 23505 = unique violation; only the username constraint means "taken".
function toUsernameError(error: { code?: string; message?: string }) {
  if (error.code === '23505' && error.message?.includes('username')) {
    return new UsernameTakenError()
  }
  return error
}
