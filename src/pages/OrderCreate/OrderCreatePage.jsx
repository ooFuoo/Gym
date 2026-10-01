import {
  Button,
  Form,
  Input,
  InputNumber,
  message,
  Space,
  Typography,
} from 'antd'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createOrder } from '../../api/orders.js'
import {
  MAX_CARD_YEARS,
  MIN_CARD_YEARS,
  calculateCardFee,
  formatOrderAmount,
  isValidMainlandMobile,
} from '../../domain/orderRules.js'

const { TextArea } = Input

function getCardFee(years) {
  return Number.isInteger(years) &&
    years >= MIN_CARD_YEARS &&
    years <= MAX_CARD_YEARS
    ? calculateCardFee(years)
    : 0
}

function validateMemberName(_, value) {
  const memberName = String(value ?? '').trim()

  if (!memberName) return Promise.reject(new Error('请输入会员姓名'))
  if (memberName.length < 2 || memberName.length > 30) {
    return Promise.reject(new Error('会员姓名必须为 2-30 个字符'))
  }

  return Promise.resolve()
}

function validatePhone(_, value) {
  if (!value) return Promise.resolve()
  return isValidMainlandMobile(String(value).trim())
    ? Promise.resolve()
    : Promise.reject(new Error('请输入正确的中国大陆 11 位手机号'))
}

function validateYears(_, value) {
  if (value === undefined || value === null) return Promise.resolve()
  return Number.isInteger(value) &&
    value >= MIN_CARD_YEARS &&
    value <= MAX_CARD_YEARS
    ? Promise.resolve()
    : Promise.reject(new Error('购卡年限必须是 1-10 的整数'))
}

function OrderCreatePage() {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const years = Form.useWatch('years', form)
  const cardFee = getCardFee(years)

  async function handleSubmit(values) {
    setSubmitting(true)

    try {
      const created = await createOrder({
        memberName: values.memberName.trim(),
        phone: values.phone.trim(),
        years: values.years,
        remark: String(values.remark ?? '').trim(),
      })

      message.success(`订单 ${created.orderNo} 创建成功`)
      navigate('/orders')
    } catch {
      // 请求层统一展示错误提示，表单内容保留以便用户修正后重试。
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="page-stack create-page">
      <div className="page-lead">
        <div>
          <Typography.Title level={2}>创建会员订单</Typography.Title>
          <Typography.Paragraph>
            录入会员资料与购卡方案，提交后进入待审核。
          </Typography.Paragraph>
        </div>
      </div>

      <div className="create-grid">
        <div className="content-panel form-panel">
          <div className="section-heading">
            <Typography.Title level={4}>订单信息</Typography.Title>
            <Typography.Text type="secondary">
              带 * 的字段为必填项
            </Typography.Text>
          </div>

          <Form
            form={form}
            layout="vertical"
            requiredMark
            onFinish={handleSubmit}
            disabled={submitting}
          >
            <div className="form-grid">
              <Form.Item
                label="会员姓名"
                name="memberName"
                rules={[{ validator: validateMemberName }]}
                required
              >
                <Input
                  placeholder="请输入 2-30 个字符"
                  maxLength={30}
                  autoComplete="name"
                />
              </Form.Item>
              <Form.Item
                label="联系手机号"
                name="phone"
                rules={[
                  { required: true, message: '请输入联系手机号' },
                  { validator: validatePhone },
                ]}
              >
                <Input
                  placeholder="请输入 11 位手机号"
                  maxLength={11}
                  inputMode="numeric"
                  autoComplete="tel"
                />
              </Form.Item>
              <Form.Item
                label="购卡年限"
                name="years"
                rules={[
                  { required: true, message: '请输入购卡年限' },
                  { validator: validateYears },
                ]}
              >
                <InputNumber
                  min={MIN_CARD_YEARS}
                  max={MAX_CARD_YEARS}
                  step={1}
                  placeholder="1-10"
                  addonAfter="年"
                />
              </Form.Item>
              <Form.Item label="办卡费用">
                <Input
                  value={formatOrderAmount(cardFee)}
                  readOnly
                  addonAfter="元"
                />
              </Form.Item>
            </div>
            <Form.Item
              label="备注"
              name="remark"
              extra="最多 200 个字符"
              rules={[{ max: 200, message: '备注不能超过 200 个字符' }]}
            >
              <TextArea
                rows={5}
                maxLength={200}
                showCount
                placeholder="补充会员偏好或订单说明"
              />
            </Form.Item>
            <Space className="form-actions">
              <Button
                type="primary"
                size="large"
                htmlType="submit"
                loading={submitting}
              >
                提交订单
              </Button>
              <Link to="/orders">
                <Button size="large" disabled={submitting}>
                  返回列表
                </Button>
              </Link>
            </Space>
          </Form>
        </div>

        <aside className="order-preview" aria-label="订单费用预览">
          <Typography.Text>费用预览</Typography.Text>
          <strong>¥ {formatOrderAmount(cardFee)}</strong>
          <div>
            <span>购卡年限</span>
            <b>{cardFee > 0 ? `${years} 年` : '待填写'}</b>
          </div>
          <div>
            <span>订单状态</span>
            <b>待审核</b>
          </div>
          <p>新订单按 1,200 元/年计费，提交后进入审核流程。</p>
        </aside>
      </div>
    </section>
  )
}

export default OrderCreatePage
