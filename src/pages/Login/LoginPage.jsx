import { Button, Checkbox, Form, Input, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'

function LoginPage() {
  const navigate = useNavigate()

  return (
    <main className="login-page">
      <section className="login-story" aria-label="产品介绍">
        <div className="login-brand">
          <span className="brand-mark brand-mark-light" aria-hidden="true">
            GF
          </span>
          <strong>GymFlow</strong>
        </div>
        <div className="story-copy">
          <span className="story-index">会员订单管理</span>
          <Typography.Title>每一张会员卡，都有清晰的进度。</Typography.Title>
          <Typography.Paragraph>
            从审核、制卡到寄送完成，在一个界面跟进门店订单。
          </Typography.Paragraph>
        </div>
        <div className="story-stats" aria-label="示例运营数据">
          <div>
            <strong>32</strong>
            <span>今日新增</span>
          </div>
          <div>
            <strong>96%</strong>
            <span>按时完成</span>
          </div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-form-wrap">
          <div className="mobile-brand">
            <span className="brand-mark" aria-hidden="true">
              GF
            </span>
            <strong>GymFlow</strong>
          </div>
          <Typography.Text className="form-kicker">欢迎回来</Typography.Text>
          <Typography.Title level={2}>登录管理后台</Typography.Title>
          <Typography.Paragraph className="form-intro">
            输入任意非空账号和密码即可预览系统。
          </Typography.Paragraph>

          <Form
            layout="vertical"
            size="large"
            onFinish={() => navigate('/orders')}
          >
            <Form.Item
              label="登录账号"
              name="username"
              rules={[{ required: true, message: '请输入登录账号' }]}
            >
              <Input placeholder="请输入账号" autoComplete="username" />
            </Form.Item>
            <Form.Item
              label="登录密码"
              name="password"
              rules={[{ required: true, message: '请输入登录密码' }]}
            >
              <Input.Password
                placeholder="请输入密码"
                autoComplete="current-password"
              />
            </Form.Item>
            <div className="login-options">
              <Checkbox>记住账号</Checkbox>
              <Typography.Text type="secondary">模拟登录环境</Typography.Text>
            </div>
            <Button
              type="primary"
              htmlType="submit"
              block
              className="login-submit"
            >
              登录系统
            </Button>
          </Form>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
