import { ConfigProvider } from 'antd'
import { BrowserRouter } from 'react-router-dom'
import AppRouter from './router/AppRouter.jsx'

const theme = {
  token: {
    colorPrimary: '#e65332',
    colorInfo: '#e65332',
    colorText: '#202329',
    colorTextSecondary: '#6c727f',
    colorBorder: '#e4e6ea',
    colorBgLayout: '#f4f5f7',
    borderRadius: 10,
    borderRadiusLG: 12,
    controlHeight: 40,
    fontFamily:
      "'Avenir Next', 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  components: {
    Button: { fontWeight: 600, primaryShadow: 'none' },
    Menu: { itemBorderRadius: 8, itemHeight: 44 },
    Table: {
      headerBg: '#f7f8fa',
      headerColor: '#535966',
      headerSplitColor: 'transparent',
      rowHoverBg: '#fff8f5',
    },
  },
}

function App() {
  return (
    <ConfigProvider theme={theme}>
      <BrowserRouter basename="/Gym/">
        <AppRouter />
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App
