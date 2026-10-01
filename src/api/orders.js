import { apiClient } from './client.js'

export function queryOrders(params) {
  return apiClient.get('/orders', { params })
}

export function createOrder(payload) {
  return apiClient.post('/orders', payload)
}

export function renewOrders(orderNos, years) {
  return apiClient.post('/orders/renew', { orderNos, years })
}

export function cancelOrders(orderNos) {
  return apiClient.post('/orders/cancel', { orderNos })
}
