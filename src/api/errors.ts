import type { TKey } from '../i18n'

/** True when the request never reached Supabase (offline, DNS, paused project …). */
export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error) && typeof error !== 'object') return false
  const { name, message } = error as { name?: string; message?: string }
  if (name === 'AuthRetryableFetchError') return true
  return /failed to fetch|networkerror|load failed|network request failed/i.test(message ?? '')
}

const AUTH_CODES: Record<string, TKey> = {
  invalid_credentials: 'auth.err.invalidCredentials',
  user_already_exists: 'auth.err.userExists',
  email_exists: 'auth.err.userExists',
  weak_password: 'auth.err.weakPassword',
  email_not_confirmed: 'auth.err.emailNotConfirmed',
  email_address_invalid: 'auth.err.emailInvalid',
  validation_failed: 'auth.err.emailInvalid',
  over_request_rate_limit: 'auth.err.rateLimit',
  over_email_send_rate_limit: 'auth.err.rateLimit',
  signup_disabled: 'auth.err.signupDisabled',
}

/** Maps a Supabase error to a translated message key. */
export function errorKey(error: unknown): TKey {
  if (isNetworkError(error)) return 'app.serverUnreachable'
  const code = (error as { code?: string } | null)?.code
  return (code && AUTH_CODES[code]) || 'common.error'
}
