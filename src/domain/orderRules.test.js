import { describe, expect, it } from 'vitest'
import {
  ORDER_STATUS,
  ORDER_STATUS_GROUP,
  OrderRuleError,
  calculateBatchRenewalTotal,
  calculateCardFee,
  calculateRenewalFee,
  canCancelOrder,
  canExportOrder,
  canRenewOrder,
  cancelOrder,
  filterOrders,
  formatOrderAmount,
  isValidMainlandMobile,
  matchesStatusGroup,
  paginateOrders,
  renewOrder,
  sortOrdersByCreatedAtDesc,
  validateCancellationBatch,
  validateRenewalBatch,
} from './orderRules.js'

const createOrder = (overrides = {}) => ({
  orderNo: 'GYM202610010001',
  memberName: '周予安',
  years: 2,
  amount: 2400,
  status: ORDER_STATUS.EXPIRED,
  createdAt: '2026-10-01 10:00:00',
  ...overrides,
})

describe('订单金额规则', () => {
  it('新卡按每年 1200 元计算且不应用续卡折扣', () => {
    expect(calculateCardFee(1)).toBe(1200)
    expect(calculateCardFee(5)).toBe(6000)
  })

  it('续卡 1-4 年按原价，5 年及以上按 8 折', () => {
    expect(calculateRenewalFee(4)).toBe(4800)
    expect(calculateRenewalFee(5)).toBe(4800)
    expect(calculateRenewalFee(10)).toBe(9600)
  })

  it('拒绝非整数或超出 1-10 的年限', () => {
    for (const years of [0, 11, 1.5, NaN]) {
      expect(() => calculateRenewalFee(years)).toThrow(OrderRuleError)
    }
  })

  it('批量总费用等于单笔费用乘订单数', () => {
    expect(calculateBatchRenewalTotal(3, 5)).toBe(14400)
    expect(calculateBatchRenewalTotal(0, 5)).toBe(0)
  })

  it('金额为空时列表显示 --，零金额显示 0.00', () => {
    expect(formatOrderAmount(null)).toBe('--')
    expect(formatOrderAmount('')).toBe('--')
    expect(formatOrderAmount(0)).toBe('0.00')
    expect(formatOrderAmount(12000)).toBe('12,000.00')
  })
})

describe('订单状态与权限', () => {
  it('进行中包含待审核、待制卡、待寄卡', () => {
    expect(
      matchesStatusGroup(
        ORDER_STATUS.PENDING_REVIEW,
        ORDER_STATUS_GROUP.ACTIVE,
      ),
    ).toBe(true)
    expect(
      matchesStatusGroup(ORDER_STATUS.PENDING_CARD, ORDER_STATUS_GROUP.ACTIVE),
    ).toBe(true)
    expect(
      matchesStatusGroup(
        ORDER_STATUS.PENDING_SHIPMENT,
        ORDER_STATUS_GROUP.ACTIVE,
      ),
    ).toBe(true)
    expect(
      matchesStatusGroup(ORDER_STATUS.COMPLETED, ORDER_STATUS_GROUP.ACTIVE),
    ).toBe(false)
  })

  it('仅已到期订单允许续卡', () => {
    expect(canRenewOrder(createOrder())).toBe(true)
    expect(canRenewOrder(createOrder({ status: ORDER_STATUS.COMPLETED }))).toBe(
      false,
    )
  })

  it('仅待制卡和待寄卡订单允许撤单', () => {
    expect(
      canCancelOrder(createOrder({ status: ORDER_STATUS.PENDING_CARD })),
    ).toBe(true)
    expect(
      canCancelOrder(createOrder({ status: ORDER_STATUS.PENDING_SHIPMENT })),
    ).toBe(true)
    expect(
      canCancelOrder(createOrder({ status: ORDER_STATUS.PENDING_REVIEW })),
    ).toBe(false)
  })

  it('仅已完成和已到期订单允许导出', () => {
    expect(
      canExportOrder(createOrder({ status: ORDER_STATUS.COMPLETED })),
    ).toBe(true)
    expect(canExportOrder(createOrder({ status: ORDER_STATUS.EXPIRED }))).toBe(
      true,
    )
    expect(
      canExportOrder(createOrder({ status: ORDER_STATUS.CANCELLED })),
    ).toBe(false)
  })
})

describe('订单写操作规则', () => {
  it('续卡累加年限与费用并回到待审核', () => {
    const original = createOrder()
    const renewed = renewOrder(original, 5)

    expect(renewed).toEqual({
      ...original,
      years: 7,
      amount: 7200,
      status: ORDER_STATUS.PENDING_REVIEW,
    })
    expect(original.status).toBe(ORDER_STATUS.EXPIRED)
  })

  it('原金额为 null 时按 0 元累计', () => {
    expect(renewOrder(createOrder({ amount: null }), 1).amount).toBe(1200)
  })

  it('不允许续卡的状态抛出明确错误', () => {
    expect(() =>
      renewOrder(createOrder({ status: ORDER_STATUS.COMPLETED }), 1),
    ).toThrowError(expect.objectContaining({ code: 'ORDER_NOT_RENEWABLE' }))
  })

  it('撤单产生新对象且不修改原订单', () => {
    const original = createOrder({ status: ORDER_STATUS.PENDING_CARD })
    const cancelled = cancelOrder(original)

    expect(cancelled.status).toBe(ORDER_STATUS.CANCELLED)
    expect(original.status).toBe(ORDER_STATUS.PENDING_CARD)
  })
})

describe('批量操作校验', () => {
  it('批量续卡包含无效状态时阻止整批并列出全部订单号', () => {
    const result = validateRenewalBatch([
      createOrder({ orderNo: 'A' }),
      createOrder({ orderNo: 'B', status: ORDER_STATUS.COMPLETED }),
      createOrder({ orderNo: 'C', status: ORDER_STATUS.PENDING_CARD }),
    ])

    expect(result).toEqual({
      valid: false,
      reason: 'INVALID_STATUS',
      invalidOrderNos: ['B', 'C'],
    })
  })

  it('批量撤单包含无效状态时阻止整批并列出全部订单号', () => {
    const result = validateCancellationBatch([
      createOrder({ orderNo: 'A', status: ORDER_STATUS.PENDING_CARD }),
      createOrder({ orderNo: 'B', status: ORDER_STATUS.PENDING_REVIEW }),
      createOrder({ orderNo: 'C', status: ORDER_STATUS.COMPLETED }),
    ])

    expect(result).toEqual({
      valid: false,
      reason: 'INVALID_STATUS',
      invalidOrderNos: ['B', 'C'],
    })
  })

  it('空选择返回 EMPTY_SELECTION', () => {
    expect(validateRenewalBatch([])).toEqual({
      valid: false,
      reason: 'EMPTY_SELECTION',
      invalidOrderNos: [],
    })
  })
})

describe('筛选、排序与分页', () => {
  const orders = [
    createOrder({
      orderNo: 'A',
      memberName: '周予安',
      status: ORDER_STATUS.EXPIRED,
      createdAt: '2026-09-01 10:00:00',
    }),
    createOrder({
      orderNo: 'B',
      memberName: '周予宁',
      status: ORDER_STATUS.PENDING_CARD,
      createdAt: '2026-10-01 10:00:00',
    }),
    createOrder({
      orderNo: 'C',
      memberName: '林晓雯',
      status: ORDER_STATUS.COMPLETED,
      createdAt: 'invalid',
    }),
  ]

  it('订单号精确匹配，会员姓名模糊匹配', () => {
    expect(
      filterOrders(orders, { orderNo: 'B' }).map((order) => order.orderNo),
    ).toEqual(['B'])
    expect(filterOrders(orders, { orderNo: 'b' })).toEqual([])
    expect(
      filterOrders(orders, { memberName: '周予' }).map(
        (order) => order.orderNo,
      ),
    ).toEqual(['A', 'B'])
  })

  it('组合筛选状态分组与姓名', () => {
    expect(
      filterOrders(orders, {
        memberName: '周',
        statusGroup: ORDER_STATUS_GROUP.ACTIVE,
      }).map((order) => order.orderNo),
    ).toEqual(['B'])
  })

  it('创建时间默认降序，无效时间排在最后且不修改原数组', () => {
    const sorted = sortOrdersByCreatedAtDesc(orders)
    expect(sorted.map((order) => order.orderNo)).toEqual(['B', 'A', 'C'])
    expect(orders.map((order) => order.orderNo)).toEqual(['A', 'B', 'C'])
  })

  it('分页返回当前页数据和完整元信息', () => {
    expect(paginateOrders(orders, 2, 2)).toEqual({
      items: [orders[2]],
      page: 2,
      pageSize: 2,
      total: 3,
    })
  })
})

describe('手机号规则', () => {
  it('仅接受中国大陆 11 位手机号', () => {
    expect(isValidMainlandMobile('13812345678')).toBe(true)
    expect(isValidMainlandMobile('12812345678')).toBe(false)
    expect(isValidMainlandMobile('1381234567')).toBe(false)
  })
})
