import { today } from '../lib/date'
import { saveDailyLog } from './dailyLogs'
import { createProfile } from './profile'
import { seedSupplements } from './supplements'
import type { NewProfile, Profile } from './types'

/**
 * The profile row is written last: its existence is what ends onboarding, so a
 * failure earlier (or a taken username) leaves the user on the form and a retry
 * repeats the first two steps harmlessly.
 */
export async function completeOnboarding(profile: NewProfile, weight: number): Promise<Profile> {
  await saveDailyLog(today(profile.timezone), { weight })
  await seedSupplements(profile.language)
  return createProfile(profile)
}
