import {
  Avatar,
  Breadcrumb,
  Button,
  Layout,
  Menu,
  Space,
  Typography,
} from 'antd'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'

const { Header, Sider, Content } = Layout

const menuItems = [
  {
    key: '/orders',
    icon: <span className="menu-glyph">单</span>,
    label: <Link to="/orders">订单列表</Link>,
  },
  {
    key: '/orders/new',
    icon: <span className="menu-glyph">新</span>,
    label: <Link to="/orders/new">新建订单</Link>,
  },
]

const pageMeta = {
  '/orders': { title: '订单列表', breadcrumb: ['订单管理', '订单列表'] },
  '/orders/new': { title: '新建订单', breadcrumb: ['订单管理', '新建订单'] },
}

function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const currentPage = pageMeta[location.pathname] ?? pageMeta['/orders']

  return (
    <Layout className="admin-shell">
      <Sider
        width={232}
        breakpoint="lg"
        collapsedWidth={72}
        className="admin-sider"
      >
        <Link
          to="/orders"
          className="brand-lockup"
          aria-label="GymFlow 订单中心"
        >
          <span className="brand-mark" aria-hidden="true">
            GF
          </span>
          <span className="brand-copy">
            <strong>GymFlow</strong>
            <small>会员订单中心</small>
          </span>
        </Link>

        <nav aria-label="后台主导航">
          <Typography.Text className="menu-caption">业务管理</Typography.Text>
          <Menu
            mode="inline"
            items={menuItems}
            selectedKeys={[location.pathname]}
            className="admin-menu"
          />
        </nav>

        <div className="sider-footnote">
          <span>今日待处理</span>
          <strong>08</strong>
        </div>
      </Sider>

      <Layout>
        <Header className="admin-header">
          <div>
            <Breadcrumb
              items={currentPage.breadcrumb.map((title) => ({ title }))}
            />
            <Typography.Title level={4}>{currentPage.title}</Typography.Title>
          </div>
          <Space size={12}>
            <div className="header-user">
              <Avatar size={36}>林</Avatar>
              <div>
                <strong>林晓雯</strong>
                <span>运营专员</span>
              </div>
            </div>
            <Button type="text" onClick={() => navigate('/login')}>
              退出登录
            </Button>
          </Space>
        </Header>

        <Content className="admin-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default AdminLayout
