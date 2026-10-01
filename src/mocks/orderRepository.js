import {
  ORDER_STATUS,
  OrderRuleError,
  calculateCardFee,
  cancelOrder,
  filterOrders,
  isValidMainlandMobile,
  paginateOrders,
  renewOrder,
  sortOrdersByCreatedAtDesc,
  validateCancellationBatch,
  validateRenewalBatch,
} from '../domain/orderRules.js'
import { formatCompactDate, formatDateTime } from '../utils/date.js'
import { createInitialOrders } from './orderSeeds.js'

const cloneOrder = (order) => ({ ...order })

export class MockApiError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message)
    this.name = 'MockApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

function assertOrderPayload(payload) {
  const memberName = String(payload.memberName ?? '').trim()
  const phone = String(payload.phone ?? '').trim()
  const remark = String(payload.remark ?? '')

  if (memberName.length < 2 || memberName.length > 30) {
    throw new MockApiError(
      400,
      'INVALID_MEMBER_NAME',
      '会员姓名必须为 2-30 个字符',
    )
  }
  if (!isValidMainlandMobile(phone)) {
    throw new MockApiError(400, 'INVALID_PHONE', '请输入正确的中国大陆手机号')
  }
  if (remark.length > 200) {
    throw new MockApiError(400, 'INVALID_REMARK', '备注不能超过 200 个字符')
  }

  try {
    calculateCardFee(payload.years)
  } catch (error) {
    if (error instanceof OrderRuleError) {
      throw new MockApiError(400, error.code, error.message)
    }
    throw error
  }

  return { memberName, phone, remark, years: payload.years }
}

function assertExistingOrders(orders, orderNos) {
  const uniqueOrderNos = [...new Set(orderNos)]
  const foundOrders = uniqueOrderNos.map((orderNo) =>
    orders.find((order) => order.orderNo === orderNo),
  )
  const missingOrderNos = uniqueOrderNos.filter(
    (_, index) => !foundOrders[index],
  )

  if (missingOrderNos.length > 0) {
    throw new MockApiError(404, 'ORDER_NOT_FOUND', '部分订单不存在', {
      missingOrderNos,
    })
  }

  return foundOrders
}

function toBatchError(result, message) {
  if (result.reason === 'EMPTY_SELECTION') {
    return new MockApiError(400, result.reason, '请至少选择一笔订单')
  }

  return new MockApiError(400, result.reason, message, {
    invalidOrderNos: result.invalidOrderNos,
  })
}

export function createOrderRepository(seedOrders = createInitialOrders()) {
  let orders = seedOrders.map(cloneOrder)
  let sequence = orders.length

  return {
    reset() {
      orders = seedOrders.map(cloneOrder)
      sequence = orders.length
    },

    getAll() {
      return orders.map(cloneOrder)
    },

    query(filters = {}) {
      const filtered = filterOrders(orders, filters)
      const sorted = sortOrdersByCreatedAtDesc(filtered)
      const result = paginateOrders(
        sorted,
        Number(filters.page),
        Number(filters.pageSize),
      )

      return { ...result, items: result.items.map(cloneOrder) }
    },

    create(payload, options = {}) {
      const validated = assertOrderPayload(payload)
      const now = options.now ?? new Date()
      sequence += 1

      const order = {
        id: `order-${String(sequence).padStart(4, '0')}`,
        orderNo: `GYM${formatCompactDate(now)}${String(sequence).padStart(4, '0')}`,
        ...validated,
        amount: calculateCardFee(validated.years),
        status: ORDER_STATUS.PENDING_REVIEW,
        createdAt: formatDateTime(now),
      }

      orders = [order, ...orders]
      return cloneOrder(order)
    },

    renew(orderNos, years) {
      const selectedOrders = assertExistingOrders(orders, orderNos)
      const validation = validateRenewalBatch(selectedOrders)

      if (!validation.valid) {
        throw toBatchError(validation, '所选订单中包含不可续卡的订单')
      }

      const selectedSet = new Set(orderNos)
      orders = orders.map((order) =>
        selectedSet.has(order.orderNo) ? renewOrder(order, years) : order,
      )

      return orders
        .filter((order) => selectedSet.has(order.orderNo))
        .map(cloneOrder)
    },

    cancel(orderNos) {
      const selectedOrders = assertExistingOrders(orders, orderNos)
      const validation = validateCancellationBatch(selectedOrders)

      if (!validation.valid) {
        throw toBatchError(validation, '所选订单中包含不可撤单的订单')
      }

      const selectedSet = new Set(orderNos)
      orders = orders.map((order) =>
        selectedSet.has(order.orderNo) ? cancelOrder(order) : order,
      )

      return orders
        .filter((order) => selectedSet.has(order.orderNo))
        .map(cloneOrder)
    },
  }
}

export const orderRepository = createOrderRepository()
