import { Button, Form, Input, InputNumber, Space, Typography } from 'antd'
import { Link } from 'react-router-dom'

const { TextArea } = Input

function OrderCreatePage() {
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

          <Form layout="vertical" requiredMark>
            <div className="form-grid">
              <Form.Item label="会员姓名" required>
                <Input placeholder="请输入 2-30 个字符" />
              </Form.Item>
              <Form.Item label="联系手机号" required>
                <Input placeholder="请输入 11 位手机号" />
              </Form.Item>
              <Form.Item label="购卡年限" required>
                <InputNumber
                  min={1}
                  max={10}
                  placeholder="1-10"
                  addonAfter="年"
                />
              </Form.Item>
              <Form.Item label="办卡费用">
                <Input value="0.00" readOnly addonAfter="元" />
              </Form.Item>
            </div>
            <Form.Item label="备注" extra="最多 200 个字符">
              <TextArea
                rows={5}
                maxLength={200}
                showCount
                placeholder="补充会员偏好或订单说明"
              />
            </Form.Item>
            <Space className="form-actions">
              <Button type="primary" size="large">
                提交订单
              </Button>
              <Link to="/orders">
                <Button size="large">返回列表</Button>
              </Link>
            </Space>
          </Form>
        </div>

        <aside className="order-preview" aria-label="订单费用预览">
          <Typography.Text>费用预览</Typography.Text>
          <strong>¥ 0.00</strong>
          <div>
            <span>购卡年限</span>
            <b>待填写</b>
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
