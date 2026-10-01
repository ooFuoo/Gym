import { ORDER_STATUS, calculateCardFee } from '../domain/orderRules.js'
import { formatDateTime } from '../utils/date.js'

const MEMBER_NAMES = [
  '周予安',
  '沈清禾',
  '程屿',
  '许知夏',
  '陆时越',
  '顾南乔',
  '林晓雯',
  '宋砚舟',
  '姜禾',
  '陈嘉树',
  '苏晚晴',
  '秦知远',
]

const STATUSES = [
  ORDER_STATUS.PENDING_REVIEW,
  ORDER_STATUS.PENDING_CARD,
  ORDER_STATUS.PENDING_SHIPMENT,
  ORDER_STATUS.COMPLETED,
  ORDER_STATUS.EXPIRED,
  ORDER_STATUS.CANCELLED,
]

export function createInitialOrders() {
  const newestTime = new Date('2026-10-01T10:42:18+08:00').getTime()

  return Array.from({ length: 36 }, (_, index) => {
    const years = (index % 10) + 1
    const createdAt = new Date(newestTime - index * 5 * 60 * 60 * 1000)

    return {
      id: `order-${String(36 - index).padStart(4, '0')}`,
      orderNo: `GYM${formatDateTime(createdAt).slice(0, 10).replaceAll('-', '')}${String(36 - index).padStart(4, '0')}`,
      memberName: MEMBER_NAMES[index % MEMBER_NAMES.length],
      phone: `138${String(12345678 + index).padStart(8, '0')}`,
      years,
      amount: index === 4 ? null : index === 17 ? 0 : calculateCardFee(years),
      status: STATUSES[index % STATUSES.length],
      createdAt: formatDateTime(createdAt),
      remark: index % 5 === 0 ? '偏好晚间到店' : '',
    }
  })
}
