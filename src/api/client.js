import { message } from 'antd'
import axios from 'axios'
import {
  AUTH_TOKEN_KEY,
  clearStoredAuth,
  getBrowserStorage,
} from './authStorage.js'
import { mockAdapter } from '../mocks/mockAdapter.js'

function defaultErrorNotifier(errorMessage) {
  message.error(errorMessage)
}

function defaultUnauthorizedHandler() {
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.assign('/login')
  }
}

export function createApiClient(options = {}) {
  const storage = options.storage ?? getBrowserStorage()
  const notifyError = options.notifyError ?? defaultErrorNotifier
  const onUnauthorized = options.onUnauthorized ?? defaultUnauthorizedHandler
  const client = axios.create({
    adapter: options.adapter ?? mockAdapter,
    baseURL: options.baseURL ?? import.meta.env.VITE_API_BASE_URL ?? '/api',
    timeout: options.timeout ?? 10000,
  })

  client.interceptors.request.use((config) => {
    const token = storage?.getItem(AUTH_TOKEN_KEY)

    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`)
    }

    return config
  })

  client.interceptors.response.use(
    (response) => response.data,
    (error) => {
      const errorMessage =
        error.response?.data?.message ?? error.message ?? '请求失败，请稍后重试'

      if (error.response?.status === 401) {
        clearStoredAuth(storage)
        onUnauthorized()
      }

      notifyError(errorMessage)
      return Promise.reject(error)
    },
  )

  return client
}

export const apiClient = createApiClient()
