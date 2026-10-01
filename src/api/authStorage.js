export const AUTH_TOKEN_KEY = 'gym_mock_token'
export const AUTH_USERNAME_KEY = 'gym_username'

export function getBrowserStorage() {
  return typeof window === 'undefined' ? null : window.localStorage
}

export function clearStoredAuth(storage = getBrowserStorage()) {
  storage?.removeItem(AUTH_TOKEN_KEY)
  storage?.removeItem(AUTH_USERNAME_KEY)
}
