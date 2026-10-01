import {
  Alert,
  Button,
  Empty,
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
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { queryOrders } from '../../api/orders.js'
import {
  ORDER_STATUS,
  ORDER_STATUS_GROUP,
  formatOrderAmount,
} from '../../domain/orderRules.js'

const PAGE_SIZE = 10

const statusColors = {
  [ORDER_STATUS.PENDING_REVIEW]: 'gold',
  [ORDER_STATUS.PENDING_CARD]: 'blue',
  [ORDER_STATUS.PENDING_SHIPMENT]: 'cyan',
  [ORDER_STATUS.COMPLETED]: 'green',
  [ORDER_STATUS.EXPIRED]: 'default',
  [ORDER_STATUS.CANCELLED]: 'red',
}

const tabItems = [
  { key: ORDER_STATUS_GROUP.ALL, label: '全部' },
  { key: ORDER_STATUS_GROUP.ACTIVE, label: '进行中' },
  { key: ORDER_STATUS_GROUP.EXPIRED, label: '已到期' },
  { key: ORDER_STATUS_GROUP.COMPLETED, label: '已完成' },
  { key: ORDER_STATUS_GROUP.CANCELLED, label: '已取消' },
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
      <span className="amount-cell">{formatOrderAmount(value)}</span>
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
      status === ORDER_STATUS.EXPIRED ? (
        <Button type="link">续卡</Button>
      ) : (
        <span className="muted">暂无</span>
      ),
  },
]

const emptyFilters = Object.freeze({ memberName: '', orderNo: '' })

function normalizeSearchValues(values) {
  return {
    memberName: String(values.memberName ?? '').trim(),
    orderNo: String(values.orderNo ?? '').trim(),
  }
}

function OrdersPage() {
  const [form] = Form.useForm()
  const [orders, setOrders] = useState([])
  const [statusGroup, setStatusGroup] = useState(ORDER_STATUS_GROUP.ALL)
  const [filters, setFilters] = useState(emptyFilters)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const [renewOpen, setRenewOpen] = useState(false)
  const [summary, setSummary] = useState({
    all: null,
    active: null,
    expired: null,
  })

  useEffect(() => {
    let active = true

    async function loadOrders() {
      setLoading(true)
      setErrorMessage('')

      try {
        const result = await queryOrders({
          ...filters,
          page,
          pageSize: PAGE_SIZE,
          statusGroup,
        })

        if (!active) return
        setOrders(result.items)
        setTotal(result.total)
      } catch (error) {
        if (!active) return
        setOrders([])
        setTotal(0)
        setErrorMessage(
          error.response?.data?.message ?? '订单加载失败，请稍后重试',
        )
      } finally {
        if (active) setLoading(false)
      }
    }

    loadOrders()
    return () => {
      active = false
    }
  }, [filters, page, statusGroup])

  useEffect(() => {
    let active = true

    async function loadSummary() {
      try {
        const [all, ongoing, expired] = await Promise.all([
          queryOrders({
            page: 1,
            pageSize: 1,
            statusGroup: ORDER_STATUS_GROUP.ALL,
          }),
          queryOrders({
            page: 1,
            pageSize: 1,
            statusGroup: ORDER_STATUS_GROUP.ACTIVE,
          }),
          queryOrders({
            page: 1,
            pageSize: 1,
            statusGroup: ORDER_STATUS_GROUP.EXPIRED,
          }),
        ])

        if (active) {
          setSummary({
            all: all.total,
            active: ongoing.total,
            expired: expired.total,
          })
        }
      } catch {
        if (active) setSummary({ all: null, active: null, expired: null })
      }
    }

    loadSummary()
    return () => {
      active = false
    }
  }, [])

  const selectedSummary = useMemo(
    () => selectedRowKeys.slice(0, 3).join('、'),
    [selectedRowKeys],
  )

  function clearSelection() {
    setSelectedRowKeys([])
  }

  function handleTabChange(nextStatusGroup) {
    setStatusGroup(nextStatusGroup)
    setPage(1)
    clearSelection()
  }

  function handleSearch(values) {
    setFilters(normalizeSearchValues(values))
    setPage(1)
    clearSelection()
  }

  function handleReset() {
    form.resetFields()
    setFilters(emptyFilters)
    setPage(1)
    clearSelection()
  }

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
          <span>全部订单</span>
          <strong>{summary.all ?? '--'}</strong>
          <small>Mock 数据总量</small>
        </div>
        <div>
          <span>进行中</span>
          <strong>{summary.active ?? '--'}</strong>
          <small>等待业务处理</small>
        </div>
        <div>
          <span>已到期</span>
          <strong>{summary.expired ?? '--'}</strong>
          <small>可发起续卡</small>
        </div>
      </div>

      <div className="content-panel orders-panel">
        <Tabs
          items={tabItems}
          activeKey={statusGroup}
          onChange={handleTabChange}
          className="order-tabs"
        />

        <Form
          form={form}
          layout="inline"
          className="filter-bar"
          onFinish={handleSearch}
        >
          <Form.Item label="订单号" name="orderNo">
            <Input placeholder="请输入完整订单号" allowClear />
          </Form.Item>
          <Form.Item label="会员姓名" name="memberName">
            <Input placeholder="请输入会员姓名" allowClear />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                查询
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Form.Item>
        </Form>

        <div className="table-toolbar">
          <Space wrap>
            <Button
              disabled={selectedRowKeys.length === 0}
              onClick={() => setRenewOpen(true)}
            >
              批量续卡
            </Button>
            <Button danger disabled={selectedRowKeys.length === 0}>
              一键撤单
            </Button>
            <Typography.Text type="secondary">
              已选择 {selectedRowKeys.length} 项
            </Typography.Text>
          </Space>
          <Button>导出 CSV</Button>
        </div>

        {errorMessage ? (
          <Alert
            type="error"
            showIcon
            message={errorMessage}
            className="orders-alert"
          />
        ) : null}

        <Table
          rowKey="orderNo"
          columns={columns}
          dataSource={orders}
          loading={loading}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无符合条件的订单"
              />
            ),
          }}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            preserveSelectedRowKeys: true,
          }}
          scroll={{ x: 1050 }}
          pagination={{
            current: page,
            total,
            pageSize: PAGE_SIZE,
            showSizeChanger: false,
            showTotal: (value) => `共 ${value} 条`,
            onChange: setPage,
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
          <span>已选择 {selectedRowKeys.length} 笔订单</span>
          <strong>
            {selectedSummary}
            {selectedRowKeys.length > 3 ? ' 等' : ''}
          </strong>
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
            <strong>待确认</strong>
          </div>
        </div>
      </Modal>
    </section>
  )
}

export default OrdersPage
