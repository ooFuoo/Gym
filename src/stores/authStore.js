import { create } from 'zustand'
import {
  AUTH_TOKEN_KEY,
  AUTH_USERNAME_KEY,
  clearStoredAuth,
  getBrowserStorage,
} from '../api/authStorage.js'

export const MOCK_AUTH_TOKEN = 'gym-mock-token'

export class AuthError extends Error {
  constructor(message) {
    super(message)
    this.name = 'AuthError'
  }
}

function readStoredAuth(storage) {
  const token = storage?.getItem(AUTH_TOKEN_KEY)
  const username = storage?.getItem(AUTH_USERNAME_KEY)

  if (token && username) {
    return { isAuthenticated: true, token, username }
  }

  if (token || username) clearStoredAuth(storage)
  return { isAuthenticated: false, token: null, username: '' }
}

export function createAuthStore(storage = getBrowserStorage()) {
  return create((set) => ({
    ...readStoredAuth(storage),

    login(credentials) {
      const username = String(credentials?.username ?? '').trim()
      const password = String(credentials?.password ?? '').trim()

      if (!username || !password) {
        throw new AuthError('账号和密码不能为空')
      }

      storage?.setItem(AUTH_TOKEN_KEY, MOCK_AUTH_TOKEN)
      storage?.setItem(AUTH_USERNAME_KEY, username)
      set({ isAuthenticated: true, token: MOCK_AUTH_TOKEN, username })

      return MOCK_AUTH_TOKEN
    },

    logout() {
      clearStoredAuth(storage)
      set({ isAuthenticated: false, token: null, username: '' })
    },
  }))
}

export const useAuthStore = createAuthStore()
