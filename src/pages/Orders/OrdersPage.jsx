import {
  Alert,
  Button,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { cancelOrders, queryOrders, renewOrders } from '../../api/orders.js'
import {
  ORDER_STATUS,
  ORDER_STATUS_GROUP,
  calculateBatchRenewalTotal,
  calculateRenewalFee,
  formatOrderAmount,
} from '../../domain/orderRules.js'
import {
  buildOrderCsv,
  createOrderCsvFilename,
  downloadOrderCsv,
  getExportableOrders,
} from '../../utils/orderCsv.js'

const PAGE_SIZE = 10
const EXPORT_PAGE_SIZE = Number.MAX_SAFE_INTEGER

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

const emptyFilters = Object.freeze({ memberName: '', orderNo: '' })

function normalizeSearchValues(values) {
  return {
    memberName: String(values.memberName ?? '').trim(),
    orderNo: String(values.orderNo ?? '').trim(),
  }
}

function getBatchErrorOrderNos(error) {
  const details = error.response?.data?.details
  return details?.invalidOrderNos ?? details?.missingOrderNos ?? []
}

function showBatchError(action, error) {
  const orderNos = getBatchErrorOrderNos(error)

  if (orderNos.length === 0) return

  Modal.error({
    title: `${action}失败`,
    content: (
      <div className="batch-error-content">
        <p>以下订单当前无法{action}，本次操作未修改任何订单：</p>
        <div className="order-number-list">{orderNos.join('、')}</div>
      </div>
    ),
  })
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
  const [renewTarget, setRenewTarget] = useState(null)
  const [renewalYears, setRenewalYears] = useState(1)
  const [renewSubmitting, setRenewSubmitting] = useState(false)
  const [cancelSubmitting, setCancelSubmitting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [refreshVersion, setRefreshVersion] = useState(0)
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
  }, [filters, page, refreshVersion, statusGroup])

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
  }, [refreshVersion])

  const renewalOrderNos = renewTarget?.orderNos ?? []
  const renewalOrderSummary = renewalOrderNos.slice(0, 3).join('、')
  const singleRenewalFee = calculateRenewalFee(renewalYears)
  const batchRenewalTotal = calculateBatchRenewalTotal(
    renewalOrderNos.length,
    renewalYears,
  )

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
      render: (status, order) =>
        status === ORDER_STATUS.EXPIRED ? (
          <Button
            type="link"
            onClick={() => openRenewModal([order.orderNo], 'single')}
          >
            续卡
          </Button>
        ) : (
          <span className="muted">暂无</span>
        ),
    },
  ]

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

  function openRenewModal(orderNos, mode = 'batch') {
    setRenewalYears(1)
    setRenewTarget({ mode, orderNos })
  }

  function closeRenewModal() {
    if (!renewSubmitting) setRenewTarget(null)
  }

  function refreshAfterMutation() {
    setPage(1)
    clearSelection()
    setRefreshVersion((version) => version + 1)
  }

  async function handleRenewSubmit() {
    if (renewalOrderNos.length === 0) return

    setRenewSubmitting(true)
    try {
      await renewOrders(renewalOrderNos, renewalYears)
      setRenewTarget(null)
      refreshAfterMutation()
      message.success(
        renewalOrderNos.length === 1
          ? '订单续卡成功'
          : `已成功续卡 ${renewalOrderNos.length} 笔订单`,
      )
    } catch (error) {
      showBatchError('续卡', error)
    } finally {
      setRenewSubmitting(false)
    }
  }

  function handleCancelSelected() {
    const orderNos = [...selectedRowKeys]

    Modal.confirm({
      title: `确认撤销所选 ${orderNos.length} 笔订单？`,
      content: (
        <div className="cancel-confirm-content">
          <p>全部订单均符合条件时才会整批撤单，否则不会修改任何订单。</p>
          <div className="order-number-list">{orderNos.join('、')}</div>
        </div>
      ),
      okText: '确认撤单',
      okButtonProps: { danger: true },
      cancelText: '暂不撤单',
      async onOk() {
        setCancelSubmitting(true)
        try {
          await cancelOrders(orderNos)
          refreshAfterMutation()
          message.success(`已成功撤销 ${orderNos.length} 笔订单`)
        } catch (error) {
          showBatchError('撤单', error)
        } finally {
          setCancelSubmitting(false)
        }
      },
    })
  }

  async function handleExport() {
    setExporting(true)

    try {
      const result = await queryOrders({
        ...filters,
        page: 1,
        pageSize: EXPORT_PAGE_SIZE,
        statusGroup,
      })
      const exportableOrders = getExportableOrders(result.items)

      if (exportableOrders.length === 0) {
        message.warning('当前筛选条件下没有可导出的订单')
        return
      }

      downloadOrderCsv(
        buildOrderCsv(exportableOrders),
        createOrderCsvFilename(),
      )
      message.success(`已导出 ${exportableOrders.length} 笔订单`)
    } catch {
      // 请求层统一展示错误提示。
    } finally {
      setExporting(false)
    }
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
              onClick={() => openRenewModal([...selectedRowKeys])}
            >
              批量续卡
            </Button>
            <Button
              danger
              disabled={selectedRowKeys.length === 0}
              loading={cancelSubmitting}
              onClick={handleCancelSelected}
            >
              一键撤单
            </Button>
            <Typography.Text type="secondary">
              已选择 {selectedRowKeys.length} 项
            </Typography.Text>
          </Space>
          <Button loading={exporting} onClick={handleExport}>
            导出 CSV
          </Button>
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
        title={renewTarget?.mode === 'single' ? '订单续卡' : '批量续卡'}
        open={Boolean(renewTarget)}
        onCancel={closeRenewModal}
        onOk={handleRenewSubmit}
        confirmLoading={renewSubmitting}
        maskClosable={!renewSubmitting}
        okText="确认续卡"
        cancelText="取消"
      >
        <div className="renew-summary">
          <span>本次续卡 {renewalOrderNos.length} 笔订单</span>
          <strong>
            {renewalOrderSummary}
            {renewalOrderNos.length > 3 ? ' 等' : ''}
          </strong>
        </div>
        <Form layout="vertical">
          <Form.Item label="续卡年限" required>
            <Select
              value={renewalYears}
              onChange={setRenewalYears}
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
            <strong>{formatOrderAmount(singleRenewalFee)} 元</strong>
          </div>
          <div>
            <span>本次总费用</span>
            <strong>{formatOrderAmount(batchRenewalTotal)} 元</strong>
          </div>
        </div>
      </Modal>
    </section>
  )
}

export default OrdersPage
