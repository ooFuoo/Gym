import { describe, expect, it } from 'vitest'
import { buildCsv, escapeCsvCell } from './csv.js'

describe('CSV 转义', () => {
  it('包含逗号、引号或换行时使用双引号包裹', () => {
    expect(escapeCsvCell('12,000.00')).toBe('"12,000.00"')
    expect(escapeCsvCell('备注"重点"')).toBe('"备注""重点"""')
    expect(escapeCsvCell('第一行\n第二行')).toBe('"第一行\n第二行"')
  })

  it('null 和 undefined 转为空字符串', () => {
    expect(escapeCsvCell(null)).toBe('')
    expect(escapeCsvCell(undefined)).toBe('')
  })

  it('按 CRLF 拼接 CSV 行', () => {
    expect(
      buildCsv([
        ['订单号', '订单金额'],
        ['A', '12,000.00'],
      ]),
    ).toBe('订单号,订单金额\r\nA,"12,000.00"')
  })
})
