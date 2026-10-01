import { Button, Typography } from 'antd'
import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <main className="not-found-page">
      <div className="not-found-code" aria-hidden="true">
        404
      </div>
      <Typography.Text>页面未找到</Typography.Text>
      <Typography.Title level={1}>这里没有待处理的订单。</Typography.Title>
      <Typography.Paragraph>
        你访问的地址不存在，或页面已经移动。
      </Typography.Paragraph>
      <Link to="/orders">
        <Button type="primary" size="large">
          返回订单列表
        </Button>
      </Link>
    </main>
  )
}

export default NotFoundPage
