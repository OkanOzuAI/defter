import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getProfile, updateProfile } from '../api/profile'
import type { Profile } from '../api/types'
import { useAuth } from './AuthContext'
import { applyProfilePrefs, cacheProfile, readCachedProfile } from './profileCache'

export const profileKey = (userId: string | undefined) => ['profile', userId] as const

/** Remembers a freshly loaded or saved profile and applies its language/theme/timezone. */
export function rememberProfile(profile: Profile) {
  applyProfilePrefs(profile)
  cacheProfile(profile)
}

/** `data === null` means onboarding is not finished. */
export function useProfile() {
  const { user } = useAuth()

  return useQuery({
    queryKey: profileKey(user?.id),
    enabled: Boolean(user),
    queryFn: async () => {
      const profile = await getProfile()
      if (profile) rememberProfile(profile)
      return profile
    },
    // Start from the copy on this device (kept even if the refetch fails), then refresh.
    initialData: () => {
      const cached = user && readCachedProfile(user.id)
      if (cached) applyProfilePrefs(cached)
      return cached || undefined
    },
    initialDataUpdatedAt: 0,
    staleTime: 5 * 60_000,
  })
}

export function useUpdateProfile() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (profile) => {
      rememberProfile(profile)
      queryClient.setQueryData(profileKey(user?.id), profile)
    },
  })
}
