import { describe, expect, it, vi } from 'vitest'
import { AUTH_TOKEN_KEY, AUTH_USERNAME_KEY } from '../api/authStorage.js'
import { AuthError, MOCK_AUTH_TOKEN, createAuthStore } from './authStore.js'

function createMemoryStorage(initialValues = {}) {
  const values = new Map(Object.entries(initialValues))

  return {
    getItem: vi.fn((key) => values.get(key) ?? null),
    setItem: vi.fn((key, value) => values.set(key, value)),
    removeItem: vi.fn((key) => values.delete(key)),
  }
}

describe('Zustand 登录态', () => {
  it('从 localStorage 恢复 token 与用户名', () => {
    const store = createAuthStore(
      createMemoryStorage({
        [AUTH_TOKEN_KEY]: MOCK_AUTH_TOKEN,
        [AUTH_USERNAME_KEY]: '林晓雯',
      }),
    )

    expect(store.getState()).toMatchObject({
      isAuthenticated: true,
      token: MOCK_AUTH_TOKEN,
      username: '林晓雯',
    })
  })

  it('不完整的持久化数据视为未登录并清理残留', () => {
    const storage = createMemoryStorage({ [AUTH_TOKEN_KEY]: MOCK_AUTH_TOKEN })
    const store = createAuthStore(storage)

    expect(store.getState().isAuthenticated).toBe(false)
    expect(storage.removeItem).toHaveBeenCalledWith(AUTH_TOKEN_KEY)
    expect(storage.removeItem).toHaveBeenCalledWith(AUTH_USERNAME_KEY)
  })

  it('任意非空账号密码均可登录，且只持久化 token 与用户名', () => {
    const storage = createMemoryStorage()
    const store = createAuthStore(storage)

    expect(
      store
        .getState()
        .login({ username: '  运营账号  ', password: 'demo-pass' }),
    ).toBe(MOCK_AUTH_TOKEN)
    expect(store.getState()).toMatchObject({
      isAuthenticated: true,
      token: MOCK_AUTH_TOKEN,
      username: '运营账号',
    })
    expect(storage.setItem).toHaveBeenCalledWith(
      AUTH_TOKEN_KEY,
      MOCK_AUTH_TOKEN,
    )
    expect(storage.setItem).toHaveBeenCalledWith(AUTH_USERNAME_KEY, '运营账号')
    expect(storage.setItem).not.toHaveBeenCalledWith(
      expect.anything(),
      'demo-pass',
    )
  })

  it('拒绝空账号或空密码', () => {
    const store = createAuthStore(createMemoryStorage())

    expect(() =>
      store.getState().login({ username: ' ', password: 'pass' }),
    ).toThrow(AuthError)
    expect(() =>
      store.getState().login({ username: 'user', password: '' }),
    ).toThrow(AuthError)
    expect(store.getState().isAuthenticated).toBe(false)
  })

  it('退出时清除持久化信息和内存状态', () => {
    const storage = createMemoryStorage()
    const store = createAuthStore(storage)
    store.getState().login({ username: '林晓雯', password: 'pass' })
    store.getState().logout()

    expect(store.getState()).toMatchObject({
      isAuthenticated: false,
      token: null,
      username: '',
    })
    expect(storage.removeItem).toHaveBeenCalledWith(AUTH_TOKEN_KEY)
    expect(storage.removeItem).toHaveBeenCalledWith(AUTH_USERNAME_KEY)
  })
})
