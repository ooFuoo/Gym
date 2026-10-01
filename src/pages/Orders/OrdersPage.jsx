import {
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import { useState } from 'react'
import { Link } from 'react-router-dom'

const statusColors = {
  待审核: 'gold',
  待制卡: 'blue',
  待寄卡: 'cyan',
  已完成: 'green',
  已到期: 'default',
  已取消: 'red',
}

const orders = [
  {
    key: '1',
    orderNo: 'GYM202610010036',
    memberName: '周予安',
    years: 3,
    amount: 3600,
    status: '待审核',
    createdAt: '2026-10-01 10:42:18',
  },
  {
    key: '2',
    orderNo: 'GYM202610010035',
    memberName: '沈清禾',
    years: 5,
    amount: 6000,
    status: '待制卡',
    createdAt: '2026-10-01 09:36:04',
  },
  {
    key: '3',
    orderNo: 'GYM202609300034',
    memberName: '程屿',
    years: 2,
    amount: 2400,
    status: '待寄卡',
    createdAt: '2026-09-30 17:12:51',
  },
  {
    key: '4',
    orderNo: 'GYM202609300033',
    memberName: '许知夏',
    years: 8,
    amount: 8640,
    status: '已到期',
    createdAt: '2026-09-30 14:08:26',
  },
  {
    key: '5',
    orderNo: 'GYM202609290032',
    memberName: '陆时越',
    years: 1,
    amount: 1200,
    status: '已完成',
    createdAt: '2026-09-29 16:55:39',
  },
  {
    key: '6',
    orderNo: 'GYM202609280031',
    memberName: '顾南乔',
    years: 3,
    amount: null,
    status: '已取消',
    createdAt: '2026-09-28 11:21:07',
  },
]

const columns = [
  {
    title: '订单号',
    dataIndex: 'orderNo',
    width: 180,
    render: (value) => <span className="order-number">{value}</span>,
  },
  { title: '会员姓名', dataIndex: 'memberName', width: 110 },
  {
    title: '购卡年限',
    dataIndex: 'years',
    width: 105,
    render: (value) => `${value} 年`,
  },
  {
    title: '订单金额',
    dataIndex: 'amount',
    width: 120,
    align: 'right',
    render: (value) => (
      <span className="amount-cell">
        {value == null
          ? '--'
          : value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
      </span>
    ),
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 100,
    render: (status) => <Tag color={statusColors[status]}>{status}</Tag>,
  },
  { title: '创建时间', dataIndex: 'createdAt', width: 172 },
  {
    title: '操作',
    dataIndex: 'status',
    fixed: 'right',
    width: 92,
    render: (status) =>
      status === '已到期' ? (
        <Button type="link">续卡</Button>
      ) : (
        <span className="muted">暂无</span>
      ),
  },
]

const tabItems = [
  { key: 'all', label: '全部 36' },
  { key: 'active', label: '进行中 18' },
  { key: 'expired', label: '已到期 6' },
  { key: 'completed', label: '已完成 9' },
  { key: 'cancelled', label: '已取消 3' },
]

function OrdersPage() {
  const [renewOpen, setRenewOpen] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState(['4'])

  return (
    <section className="page-stack">
      <div className="page-lead">
        <div>
          <Typography.Title level={2}>会员订单</Typography.Title>
          <Typography.Paragraph>
            查询订单状态，处理续卡与撤单任务。
          </Typography.Paragraph>
        </div>
        <Link to="/orders/new">
          <Button type="primary" size="large">
            新建订单
          </Button>
        </Link>
      </div>

      <div className="metric-strip" aria-label="订单概览">
        <div>
          <span>今日新增</span>
          <strong>12</strong>
          <small>较昨日 +3</small>
        </div>
        <div>
          <span>进行中</span>
          <strong>18</strong>
          <small>8 笔待审核</small>
        </div>
        <div>
          <span>已到期</span>
          <strong>06</strong>
          <small>可发起续卡</small>
        </div>
      </div>

      <div className="content-panel orders-panel">
        <Tabs items={tabItems} defaultActiveKey="all" className="order-tabs" />
        <Form layout="inline" className="filter-bar">
          <Form.Item label="订单号">
            <Input placeholder="请输入完整订单号" allowClear />
          </Form.Item>
          <Form.Item label="会员姓名">
            <Input placeholder="请输入会员姓名" allowClear />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary">查询</Button>
              <Button>重置</Button>
            </Space>
          </Form.Item>
        </Form>

        <div className="table-toolbar">
          <Space wrap>
            <Button onClick={() => setRenewOpen(true)}>批量续卡</Button>
            <Button danger>一键撤单</Button>
            <Typography.Text type="secondary">
              已选择 {selectedRowKeys.length} 项
            </Typography.Text>
          </Space>
          <Button>导出 CSV</Button>
        </div>

        <Table
          columns={columns}
          dataSource={orders}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            preserveSelectedRowKeys: true,
          }}
          scroll={{ x: 1050 }}
          pagination={{
            current: 1,
            total: 36,
            pageSize: 10,
            showSizeChanger: false,
          }}
        />
      </div>

      <Modal
        title="批量续卡"
        open={renewOpen}
        onCancel={() => setRenewOpen(false)}
        onOk={() => setRenewOpen(false)}
        okText="确认续卡"
        cancelText="取消"
      >
        <div className="renew-summary">
          <span>已选择 1 笔到期订单</span>
          <strong>GYM202609300033</strong>
        </div>
        <Form layout="vertical">
          <Form.Item label="续卡年限" required>
            <Select
              defaultValue={5}
              options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => ({
                value,
                label: `${value} 年${value >= 5 ? '（8 折）' : ''}`,
              }))}
            />
          </Form.Item>
        </Form>
        <div className="fee-breakdown">
          <div>
            <span>单笔续卡费用</span>
            <strong>4,800.00 元</strong>
          </div>
          <div>
            <span>本次总费用</span>
            <strong>4,800.00 元</strong>
          </div>
        </div>
      </Modal>
    </section>
  )
}

export default OrdersPage
