import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { AUTH_TOKEN_KEY, AUTH_USERNAME_KEY } from './authStorage.js'
import { createApiClient } from './client.js'

function createStorage(values = {}) {
  const state = new Map(Object.entries(values))

  return {
    getItem: vi.fn((key) => state.get(key) ?? null),
    removeItem: vi.fn((key) => state.delete(key)),
  }
}

function response(config, status, data) {
  return {
    config,
    data,
    headers: new AxiosHeaders(),
    request: {},
    status,
    statusText: 'OK',
  }
}

describe('Axios 请求层', () => {
  it('配置 baseURL 并在请求头注入 Bearer token', async () => {
    const storage = createStorage({ [AUTH_TOKEN_KEY]: 'mock-token' })
    const adapter = vi.fn(async (config) =>
      response(config, 200, {
        authorization: config.headers.get('Authorization'),
      }),
    )
    const client = createApiClient({
      adapter,
      baseURL: '/api',
      storage,
      notifyError: vi.fn(),
      onUnauthorized: vi.fn(),
    })

    await expect(client.get('/orders')).resolves.toEqual({
      authorization: 'Bearer mock-token',
    })
    expect(adapter.mock.calls[0][0].baseURL).toBe('/api')
  })

  it('统一处理错误消息', async () => {
    const notifyError = vi.fn()
    const adapter = async (config) => {
      throw new AxiosError(
        '失败',
        'BAD_REQUEST',
        config,
        {},
        response(config, 400, { message: '参数错误' }),
      )
    }
    const client = createApiClient({
      adapter,
      storage: createStorage(),
      notifyError,
      onUnauthorized: vi.fn(),
    })

    await expect(client.get('/orders')).rejects.toThrow('失败')
    expect(notifyError).toHaveBeenCalledWith('参数错误')
  })

  it('401 时清除 token 和用户名并触发回登录处理', async () => {
    const storage = createStorage({
      [AUTH_TOKEN_KEY]: 'mock-token',
      [AUTH_USERNAME_KEY]: '林晓雯',
    })
    const onUnauthorized = vi.fn()
    const adapter = async (config) => {
      throw new AxiosError(
        '未登录',
        'UNAUTHORIZED',
        config,
        {},
        response(config, 401, { message: '请重新登录' }),
      )
    }
    const client = createApiClient({
      adapter,
      storage,
      notifyError: vi.fn(),
      onUnauthorized,
    })

    await expect(client.get('/orders')).rejects.toThrow('未登录')
    expect(storage.removeItem).toHaveBeenCalledWith(AUTH_TOKEN_KEY)
    expect(storage.removeItem).toHaveBeenCalledWith(AUTH_USERNAME_KEY)
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })
})
