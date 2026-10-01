import { Route, Routes } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout.jsx'
import LoginPage from '../pages/Login/LoginPage.jsx'
import NotFoundPage from '../pages/NotFound/NotFoundPage.jsx'
import OrderCreatePage from '../pages/OrderCreate/OrderCreatePage.jsx'
import OrdersPage from '../pages/Orders/OrdersPage.jsx'
import {
  ProtectedRoute,
  PublicOnlyRoute,
  RootRedirect,
} from './RouteGuards.jsx'

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/new" element={<OrderCreatePage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default AppRouter
