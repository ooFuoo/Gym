import {
  Avatar,
  Breadcrumb,
  Button,
  Layout,
  Menu,
  Space,
  Typography,
} from 'antd'
import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore.js'

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
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const username = useAuthStore((state) => state.username)
  const logout = useAuthStore((state) => state.logout)
  const currentPage = pageMeta[location.pathname] ?? pageMeta['/orders']

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <Layout className="admin-shell">
      <Sider
        width={232}
        breakpoint="lg"
        collapsedWidth={80}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        className="admin-sider"
      >
        <div
          className="brand-lockup"
          style={collapsed ? { gap: 4, padding: '0 4px' } : undefined}
        >
          <Link
            to="/orders"
            aria-label="GymFlow 订单中心"
            style={{ display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <span className="brand-mark" aria-hidden="true">
              GF
            </span>
            {!collapsed ? (
              <span className="brand-copy">
                <strong>GymFlow</strong>
                <small>会员订单中心</small>
              </span>
            ) : null}
          </Link>
          <Button
            type="text"
            aria-label={collapsed ? '展开侧边菜单' : '折叠侧边菜单'}
            title={collapsed ? '展开侧边菜单' : '折叠侧边菜单'}
            onClick={() => setCollapsed((value) => !value)}
            style={{
              width: 30,
              minWidth: 30,
              marginLeft: collapsed ? 0 : 'auto',
              padding: 0,
              color: '#b9bdc6',
              fontSize: 18,
            }}
          >
            <span aria-hidden="true">☰</span>
          </Button>
        </div>

        <nav aria-label="后台主导航">
          {!collapsed ? (
            <Typography.Text className="menu-caption">业务管理</Typography.Text>
          ) : null}
          <Menu
            mode="inline"
            inlineCollapsed={collapsed}
            items={menuItems}
            selectedKeys={[location.pathname]}
            className="admin-menu"
            style={collapsed ? { padding: '0 8px' } : undefined}
          />
        </nav>

        {!collapsed ? (
          <div className="sider-footnote">
            <span>今日待处理</span>
            <strong>08</strong>
          </div>
        ) : null}
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
              <Avatar size={36}>{username.slice(0, 1)}</Avatar>
              <div>
                <strong>{username}</strong>
                <span>运营专员</span>
              </div>
            </div>
            <Button type="text" onClick={handleLogout}>
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
