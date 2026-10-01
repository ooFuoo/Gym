export const ORDER_STATUS = Object.freeze({
  PENDING_REVIEW: '待审核',
  PENDING_CARD: '待制卡',
  PENDING_SHIPMENT: '待寄卡',
  COMPLETED: '已完成',
  EXPIRED: '已到期',
  CANCELLED: '已取消',
})

export const ORDER_STATUS_GROUP = Object.freeze({
  ALL: 'all',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
})

export const ACTIVE_ORDER_STATUSES = Object.freeze([
  ORDER_STATUS.PENDING_REVIEW,
  ORDER_STATUS.PENDING_CARD,
  ORDER_STATUS.PENDING_SHIPMENT,
])

export const EXPORTABLE_ORDER_STATUSES = Object.freeze([
  ORDER_STATUS.COMPLETED,
  ORDER_STATUS.EXPIRED,
])

export const CANCELLABLE_ORDER_STATUSES = Object.freeze([
  ORDER_STATUS.PENDING_CARD,
  ORDER_STATUS.PENDING_SHIPMENT,
])

export const ANNUAL_CARD_PRICE = 1200
export const RENEWAL_DISCOUNT_THRESHOLD = 5
export const RENEWAL_DISCOUNT_RATE = 0.8
export const MIN_CARD_YEARS = 1
export const MAX_CARD_YEARS = 10

const STATUS_GROUP_MAP = Object.freeze({
  [ORDER_STATUS_GROUP.ACTIVE]: ACTIVE_ORDER_STATUSES,
  [ORDER_STATUS_GROUP.EXPIRED]: [ORDER_STATUS.EXPIRED],
  [ORDER_STATUS_GROUP.COMPLETED]: [ORDER_STATUS.COMPLETED],
  [ORDER_STATUS_GROUP.CANCELLED]: [ORDER_STATUS.CANCELLED],
})

export class OrderRuleError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'OrderRuleError'
    this.code = code
  }
}

export function assertValidCardYears(years) {
  if (
    !Number.isInteger(years) ||
    years < MIN_CARD_YEARS ||
    years > MAX_CARD_YEARS
  ) {
    throw new OrderRuleError('INVALID_CARD_YEARS', '购卡年限必须是 1-10 的整数')
  }

  return years
}

export function calculateCardFee(years) {
  return assertValidCardYears(years) * ANNUAL_CARD_PRICE
}

export function calculateRenewalFee(years) {
  const validYears = assertValidCardYears(years)
  const originalFee = validYears * ANNUAL_CARD_PRICE

  return validYears >= RENEWAL_DISCOUNT_THRESHOLD
    ? originalFee * RENEWAL_DISCOUNT_RATE
    : originalFee
}

export function calculateBatchRenewalTotal(orderCount, years) {
  if (!Number.isInteger(orderCount) || orderCount < 0) {
    throw new OrderRuleError(
      'INVALID_ORDER_COUNT',
      '订单数量必须是大于或等于 0 的整数',
    )
  }

  return calculateRenewalFee(years) * orderCount
}

export function normalizeAmount(amount) {
  if (amount === null || amount === undefined || amount === '') return 0

  const number = Number(amount)
  return Number.isFinite(number) ? number : 0
}

export function formatOrderAmount(amount, emptyDisplay = '--') {
  if (amount === null || amount === undefined || amount === '')
    return emptyDisplay

  const number = Number(amount)
  if (!Number.isFinite(number)) return emptyDisplay

  return number.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function matchesStatusGroup(status, group = ORDER_STATUS_GROUP.ALL) {
  if (!group || group === ORDER_STATUS_GROUP.ALL) return true
  return STATUS_GROUP_MAP[group]?.includes(status) ?? false
}

export function canRenewOrder(order) {
  return order?.status === ORDER_STATUS.EXPIRED
}

export function canCancelOrder(order) {
  return CANCELLABLE_ORDER_STATUSES.includes(order?.status)
}

export function canExportOrder(order) {
  return EXPORTABLE_ORDER_STATUSES.includes(order?.status)
}

function validateBatch(orders, permission) {
  if (!Array.isArray(orders) || orders.length === 0) {
    return { valid: false, reason: 'EMPTY_SELECTION', invalidOrderNos: [] }
  }

  const invalidOrderNos = orders
    .filter((order) => !permission(order))
    .map((order) => order.orderNo)

  return {
    valid: invalidOrderNos.length === 0,
    reason: invalidOrderNos.length === 0 ? null : 'INVALID_STATUS',
    invalidOrderNos,
  }
}

export function validateRenewalBatch(orders) {
  return validateBatch(orders, canRenewOrder)
}

export function validateCancellationBatch(orders) {
  return validateBatch(orders, canCancelOrder)
}

export function renewOrder(order, years) {
  if (!canRenewOrder(order)) {
    throw new OrderRuleError(
      'ORDER_NOT_RENEWABLE',
      `订单 ${order?.orderNo ?? ''} 当前不可续卡`,
    )
  }

  const renewalFee = calculateRenewalFee(years)

  return {
    ...order,
    years: normalizeAmount(order.years) + years,
    amount: normalizeAmount(order.amount) + renewalFee,
    status: ORDER_STATUS.PENDING_REVIEW,
  }
}

export function cancelOrder(order) {
  if (!canCancelOrder(order)) {
    throw new OrderRuleError(
      'ORDER_NOT_CANCELLABLE',
      `订单 ${order?.orderNo ?? ''} 当前不可撤单`,
    )
  }

  return { ...order, status: ORDER_STATUS.CANCELLED }
}

export function filterOrders(orders, filters = {}) {
  const orderNo = String(filters.orderNo ?? '').trim()
  const memberName = String(filters.memberName ?? '')
    .trim()
    .toLocaleLowerCase()
  const statusGroup = filters.statusGroup ?? ORDER_STATUS_GROUP.ALL

  return orders.filter((order) => {
    const matchesOrderNo = !orderNo || order.orderNo === orderNo
    const matchesMemberName =
      !memberName ||
      String(order.memberName ?? '')
        .toLocaleLowerCase()
        .includes(memberName)

    return (
      matchesOrderNo &&
      matchesMemberName &&
      matchesStatusGroup(order.status, statusGroup)
    )
  })
}

export function sortOrdersByCreatedAtDesc(orders) {
  return orders
    .map((order, index) => ({ order, index }))
    .sort((left, right) => {
      const leftTime = Date.parse(left.order.createdAt)
      const rightTime = Date.parse(right.order.createdAt)
      const normalizedLeftTime = Number.isNaN(leftTime)
        ? Number.NEGATIVE_INFINITY
        : leftTime
      const normalizedRightTime = Number.isNaN(rightTime)
        ? Number.NEGATIVE_INFINITY
        : rightTime

      return (
        normalizedRightTime - normalizedLeftTime || left.index - right.index
      )
    })
    .map(({ order }) => order)
}

export function paginateOrders(orders, page = 1, pageSize = 10) {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1
  const safePageSize =
    Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 10
  const start = (safePage - 1) * safePageSize

  return {
    items: orders.slice(start, start + safePageSize),
    page: safePage,
    pageSize: safePageSize,
    total: orders.length,
  }
}

export function isValidMainlandMobile(phone) {
  return /^1[3-9]\d{9}$/.test(String(phone ?? ''))
}
