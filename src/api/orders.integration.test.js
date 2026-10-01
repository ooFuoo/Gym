import { describe, expect, it, vi } from 'vitest'
import { ORDER_STATUS, ORDER_STATUS_GROUP } from '../domain/orderRules.js'
import { createMockAdapter } from '../mocks/mockAdapter.js'
import { createOrderRepository } from '../mocks/orderRepository.js'
import { AUTH_TOKEN_KEY } from './authStorage.js'
import { createApiClient } from './client.js'

function createTestClient(repository) {
  return createApiClient({
    adapter: createMockAdapter(repository),
    storage: {
      getItem: (key) => (key === AUTH_TOKEN_KEY ? 'mock-token' : null),
      removeItem: vi.fn(),
    },
    notifyError: vi.fn(),
    onUnauthorized: vi.fn(),
  })
}

describe('订单 Mock API 集成', () => {
  it('支持分页与筛选查询', async () => {
    const client = createTestClient(createOrderRepository())
    const result = await client.get('/orders', {
      params: { statusGroup: ORDER_STATUS_GROUP.EXPIRED, page: 1, pageSize: 3 },
    })

    expect(result.items).toHaveLength(3)
    expect(result.total).toBe(6)
    expect(
      result.items.every((order) => order.status === ORDER_STATUS.EXPIRED),
    ).toBe(true)
  })

  it('新建、续卡和撤单会真实修改后续查询结果', async () => {
    const repository = createOrderRepository()
    const client = createTestClient(repository)
    const created = await client.post('/orders', {
      memberName: '叶星澜',
      phone: '13912345678',
      years: 2,
      remark: '接口集成测试',
    })

    expect(
      (await client.get('/orders', { params: { orderNo: created.orderNo } }))
        .items[0],
    ).toEqual(created)

    const expired = repository
      .getAll()
      .find((order) => order.status === ORDER_STATUS.EXPIRED)
    await client.post('/orders/renew', {
      orderNos: [expired.orderNo],
      years: 5,
    })
    expect(
      (await client.get('/orders', { params: { orderNo: expired.orderNo } }))
        .items[0],
    ).toMatchObject({
      status: ORDER_STATUS.PENDING_REVIEW,
      amount: 4800,
    })

    const pendingCard = repository
      .getAll()
      .find((order) => order.status === ORDER_STATUS.PENDING_CARD)
    await client.post('/orders/cancel', { orderNos: [pendingCard.orderNo] })
    expect(
      (
        await client.get('/orders', {
          params: { orderNo: pendingCard.orderNo },
        })
      ).items[0].status,
    ).toBe(ORDER_STATUS.CANCELLED)
  })

  it('无 token 时返回 401', async () => {
    const onUnauthorized = vi.fn()
    const client = createApiClient({
      adapter: createMockAdapter(createOrderRepository()),
      storage: { getItem: () => null, removeItem: vi.fn() },
      notifyError: vi.fn(),
      onUnauthorized,
    })

    await expect(client.get('/orders')).rejects.toMatchObject({
      response: { status: 401 },
    })
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })
})
