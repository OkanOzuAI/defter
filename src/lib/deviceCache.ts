import { isNetworkError } from '../api/errors'

/**
 * Runs a read and remembers the result on this device; if the network is down the
 * remembered copy is returned instead. For data that must be reachable with no signal.
 * Keys are per user and are removed on logout.
 */
export async function withDeviceCache<T>(
  userId: string,
  name: string,
  read: () => Promise<T>,
): Promise<T> {
  const key = `defter.cache.${userId}.${name}`
  try {
    const value = await read()
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // the cache is optional
    }
    return value
  } catch (error) {
    if (isNetworkError(error)) {
      const raw = localStorage.getItem(key)
      if (raw) return JSON.parse(raw) as T
    }
    throw error
  }
}
