import { describe, expect, it } from 'vitest'
import { ORDER_STATUS, ORDER_STATUS_GROUP } from '../domain/orderRules.js'
import { createOrderRepository, MockApiError } from './orderRepository.js'
import { createInitialOrders } from './orderSeeds.js'

describe('内存订单仓库', () => {
  it('初始提供 36 条数据并覆盖全部状态', () => {
    const repository = createOrderRepository()
    const orders = repository.getAll()

    expect(orders).toHaveLength(36)
    expect(new Set(orders.map((order) => order.status))).toEqual(
      new Set(Object.values(ORDER_STATUS)),
    )
  })

  it('支持状态、订单号、会员姓名、分页和默认降序查询', () => {
    const repository = createOrderRepository()
    const active = repository.query({
      statusGroup: ORDER_STATUS_GROUP.ACTIVE,
      page: 1,
      pageSize: 5,
    })
    const exact = repository.query({
      orderNo: 'GYM202610010036',
      page: 1,
      pageSize: 10,
    })
    const fuzzy = repository.query({
      memberName: '周予',
      page: 1,
      pageSize: 10,
    })

    expect(active.items).toHaveLength(5)
    expect(active.total).toBe(18)
    expect(
      active.items.every((order) =>
        ['待审核', '待制卡', '待寄卡'].includes(order.status),
      ),
    ).toBe(true)
    expect(exact.items).toHaveLength(1)
    expect(fuzzy.total).toBeGreaterThan(1)
    expect(repository.query({ page: 1, pageSize: 36 }).items[0].orderNo).toBe(
      'GYM202610010036',
    )
  })

  it('新建订单后可立即查询且状态为待审核', () => {
    const repository = createOrderRepository()
    const created = repository.create(
      {
        memberName: '叶星澜',
        phone: '13912345678',
        years: 3,
        remark: '首次办卡',
      },
      { now: new Date('2026-10-02T09:30:00+08:00') },
    )
    const result = repository.query({
      orderNo: created.orderNo,
      page: 1,
      pageSize: 10,
    })

    expect(created).toMatchObject({
      status: ORDER_STATUS.PENDING_REVIEW,
      amount: 3600,
    })
    expect(result.items).toEqual([created])
    expect(repository.getAll()).toHaveLength(37)
  })

  it('续卡后后续查询能看到年限、累计金额和状态变更', () => {
    const repository = createOrderRepository()
    const expired = repository
      .getAll()
      .find((order) => order.status === ORDER_STATUS.EXPIRED)
    const renewed = repository.renew([expired.orderNo], 5)[0]
    const queried = repository.query({
      orderNo: expired.orderNo,
      page: 1,
      pageSize: 10,
    }).items[0]

    expect(expired.amount).toBeNull()
    expect(renewed).toMatchObject({
      years: expired.years + 5,
      amount: 4800,
      status: ORDER_STATUS.PENDING_REVIEW,
    })
    expect(queried).toEqual(renewed)
  })

  it('批量续卡含无效订单时整批不修改', () => {
    const seed = createInitialOrders()
    const repository = createOrderRepository(seed)
    const expired = seed.find((order) => order.status === ORDER_STATUS.EXPIRED)
    const completed = seed.find(
      (order) => order.status === ORDER_STATUS.COMPLETED,
    )

    expect(() =>
      repository.renew([expired.orderNo, completed.orderNo], 1),
    ).toThrowError(
      expect.objectContaining({
        code: 'INVALID_STATUS',
        details: { invalidOrderNos: [completed.orderNo] },
      }),
    )
    expect(
      repository.query({ orderNo: expired.orderNo, page: 1, pageSize: 10 })
        .items[0],
    ).toEqual(expired)
  })

  it('撤单后状态持久变更，批量无效时保持原状', () => {
    const repository = createOrderRepository()
    const pendingCard = repository
      .getAll()
      .find((order) => order.status === ORDER_STATUS.PENDING_CARD)
    const pendingReview = repository
      .getAll()
      .find((order) => order.status === ORDER_STATUS.PENDING_REVIEW)

    expect(repository.cancel([pendingCard.orderNo])[0].status).toBe(
      ORDER_STATUS.CANCELLED,
    )
    expect(
      repository.query({ orderNo: pendingCard.orderNo, page: 1, pageSize: 10 })
        .items[0].status,
    ).toBe(ORDER_STATUS.CANCELLED)
    expect(() => repository.cancel([pendingReview.orderNo])).toThrow(
      MockApiError,
    )
    expect(
      repository.query({
        orderNo: pendingReview.orderNo,
        page: 1,
        pageSize: 10,
      }).items[0].status,
    ).toBe(ORDER_STATUS.PENDING_REVIEW)
  })

  it('reset 后恢复初始数据', () => {
    const repository = createOrderRepository()
    repository.create(
      { memberName: '叶星澜', phone: '13912345678', years: 1 },
      { now: new Date('2026-10-02T09:30:00+08:00') },
    )
    repository.reset()

    expect(repository.getAll()).toHaveLength(36)
  })
})
