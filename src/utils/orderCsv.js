import { canExportOrder, formatOrderAmount } from '../domain/orderRules.js'
import { formatDateTime } from './date.js'
import { buildCsv } from './csv.js'

export const ORDER_CSV_HEADERS = Object.freeze([
  '订单号',
  '会员姓名',
  '购卡年限',
  '订单金额',
  '状态',
  '创建时间',
])

export function getExportableOrders(orders) {
  return orders.filter(canExportOrder)
}

export function buildOrderCsv(orders) {
  const rows = getExportableOrders(orders).map((order) => [
    order.orderNo,
    order.memberName,
    order.years,
    formatOrderAmount(order.amount, '0.00'),
    order.status,
    formatDateTime(order.createdAt),
  ])

  return `\uFEFF${buildCsv([ORDER_CSV_HEADERS, ...rows])}`
}

export function createOrderCsvFilename(date = new Date()) {
  const [day, time] = formatDateTime(date).split(' ')
  return `健身房订单_${day.replaceAll('-', '')}_${time.replaceAll(':', '')}.csv`
}

export function downloadOrderCsv(content, filename, options = {}) {
  const documentRef = options.documentRef ?? document
  const urlRef = options.urlRef ?? URL
  const BlobConstructor = options.BlobConstructor ?? Blob
  const blob = new BlobConstructor([content], {
    type: 'text/csv;charset=utf-8',
  })
  const objectUrl = urlRef.createObjectURL(blob)
  const link = documentRef.createElement('a')

  link.href = objectUrl
  link.download = filename
  documentRef.body.appendChild(link)
  link.click()
  link.remove()
  urlRef.revokeObjectURL(objectUrl)
}
