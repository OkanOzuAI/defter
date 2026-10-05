import type { Profile } from '../api/types'
import { setLang } from '../i18n'
import { setActiveTimezone } from '../lib/date'
import { setTheme } from '../lib/theme'

const STORAGE_KEY = 'defter.profile'

/** The profile is the source of truth for language, theme and timezone on every device. */
export function applyProfilePrefs(profile: Profile) {
  setLang(profile.language)
  setTheme(profile.theme)
  setActiveTimezone(profile.timezone)
}

/** Kept on the device so the app (and the workout draft) still opens without signal. */
export function cacheProfile(profile: Profile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  } catch {
    // storage full or unavailable: the app just needs the network next time
  }
}

export function readCachedProfile(userId: string): Profile | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return undefined
    const profile = JSON.parse(raw) as Profile
    return profile.id === userId ? profile : undefined
  } catch {
    return undefined
  }
}

export function clearCachedProfile() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // nothing to clear
  }
}

/**
 * Read-only copies kept for offline use (saved workouts, last sets). Removed on logout.
 * The workout draft and the unsent queue are deliberately kept: they may hold sets
 * that have not reached the server yet.
 */
export function clearDeviceCaches() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('defter.cache.') || key.startsWith('defter.lastsets.')) {
        localStorage.removeItem(key)
      }
    }
  } catch {
    // nothing to clear
  }
}
