import { describe, expect, it, vi } from 'vitest'
import { ORDER_STATUS } from '../domain/orderRules.js'
import {
  ORDER_CSV_HEADERS,
  buildOrderCsv,
  createOrderCsvFilename,
  downloadOrderCsv,
  getExportableOrders,
} from './orderCsv.js'

const createOrder = (overrides = {}) => ({
  orderNo: 'GYM202610010001',
  memberName: '周予安',
  phone: '13812345678',
  years: 2,
  amount: 2400,
  status: ORDER_STATUS.COMPLETED,
  createdAt: '2026-10-01 10:00:00',
  remark: '不应导出',
  ...overrides,
})

describe('订单 CSV 导出', () => {
  it('仅保留已完成和已到期订单', () => {
    const orders = [
      createOrder({ orderNo: 'A', status: ORDER_STATUS.COMPLETED }),
      createOrder({ orderNo: 'B', status: ORDER_STATUS.EXPIRED }),
      createOrder({ orderNo: 'C', status: ORDER_STATUS.PENDING_CARD }),
      createOrder({ orderNo: 'D', status: ORDER_STATUS.CANCELLED }),
    ]

    expect(getExportableOrders(orders).map(({ orderNo }) => orderNo)).toEqual([
      'A',
      'B',
    ])
  })

  it('生成带 BOM、固定字段、格式化金额与正确转义的完整内容', () => {
    const csv = buildOrderCsv([
      createOrder({
        orderNo: 'A',
        memberName: '周予安,VIP',
        amount: 12000,
      }),
      createOrder({
        orderNo: 'B',
        memberName: '沈"清禾',
        amount: null,
        status: ORDER_STATUS.EXPIRED,
        createdAt: '2026-09-30 09:08:07',
      }),
      createOrder({ orderNo: 'C', status: ORDER_STATUS.PENDING_REVIEW }),
    ])

    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv).toBe(
      `\uFEFF${ORDER_CSV_HEADERS.join(',')}\r\n` +
        'A,"周予安,VIP",2,"12,000.00",已完成,2026-10-01 10:00:00\r\n' +
        'B,"沈""清禾",2,0.00,已到期,2026-09-30 09:08:07',
    )
    expect(csv).not.toContain('手机号')
    expect(csv).not.toContain('备注')
    expect(csv).not.toContain(',C,')
  })

  it('按约定生成本地时间文件名', () => {
    expect(createOrderCsvFilename(new Date(2026, 9, 1, 21, 5, 9))).toBe(
      '健身房订单_20261001_210509.csv',
    )
  })

  it('以 CSV Blob 触发下载并释放临时地址', async () => {
    const link = { click: vi.fn(), remove: vi.fn() }
    const documentRef = {
      body: { appendChild: vi.fn() },
      createElement: vi.fn(() => link),
    }
    const urlRef = {
      createObjectURL: vi.fn(() => 'blob:order-csv'),
      revokeObjectURL: vi.fn(),
    }
    const content = buildOrderCsv([createOrder()])

    downloadOrderCsv(content, 'orders.csv', { documentRef, urlRef })

    const blob = urlRef.createObjectURL.mock.calls[0][0]
    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect(blob.type).toBe('text/csv;charset=utf-8')
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf])
    expect(new TextDecoder().decode(bytes.slice(3))).toBe(content.slice(1))
    expect(link).toMatchObject({
      href: 'blob:order-csv',
      download: 'orders.csv',
    })
    expect(documentRef.body.appendChild).toHaveBeenCalledWith(link)
    expect(link.click).toHaveBeenCalledOnce()
    expect(link.remove).toHaveBeenCalledOnce()
    expect(urlRef.revokeObjectURL).toHaveBeenCalledWith('blob:order-csv')
  })
})
