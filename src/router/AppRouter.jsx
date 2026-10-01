import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout.jsx'
import LoginPage from '../pages/Login/LoginPage.jsx'
import NotFoundPage from '../pages/NotFound/NotFoundPage.jsx'
import OrderCreatePage from '../pages/OrderCreate/OrderCreatePage.jsx'
import OrdersPage from '../pages/Orders/OrdersPage.jsx'

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/orders" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AdminLayout />}>
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/new" element={<OrderCreatePage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default AppRouter
