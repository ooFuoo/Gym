import { AxiosError, AxiosHeaders } from 'axios'
import { MockApiError, orderRepository } from './orderRepository.js'

const JSON_HEADERS = new AxiosHeaders({ 'Content-Type': 'application/json' })

function createResponse(config, status, data) {
  return {
    config,
    data,
    headers: JSON_HEADERS,
    request: {},
    status,
    statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
  }
}

function parseBody(data) {
  if (!data) return {}
  return typeof data === 'string' ? JSON.parse(data) : data
}

function throwResponseError(config, error) {
  const status = error instanceof MockApiError ? error.status : 500
  const data = {
    code: error.code ?? 'INTERNAL_ERROR',
    message: error.message || '服务暂时不可用',
    details: error.details,
  }
  const response = createResponse(config, status, data)

  throw new AxiosError(data.message, data.code, config, {}, response)
}

export function createMockAdapter(repository = orderRepository) {
  return async function mockAdapter(config) {
    try {
      if (!config.headers?.get?.('Authorization')) {
        throw new MockApiError(
          401,
          'UNAUTHORIZED',
          '登录状态已失效，请重新登录',
        )
      }

      const method = config.method?.toLowerCase()
      const url = config.url?.replace(/^\/api/, '')

      if (method === 'get' && url === '/orders') {
        return createResponse(config, 200, repository.query(config.params))
      }
      if (method === 'post' && url === '/orders') {
        return createResponse(
          config,
          201,
          repository.create(parseBody(config.data)),
        )
      }
      if (method === 'post' && url === '/orders/renew') {
        const { orderNos, years } = parseBody(config.data)
        return createResponse(
          config,
          200,
          repository.renew(orderNos ?? [], years),
        )
      }
      if (method === 'post' && url === '/orders/cancel') {
        const { orderNos } = parseBody(config.data)
        return createResponse(config, 200, repository.cancel(orderNos ?? []))
      }

      throw new MockApiError(404, 'ENDPOINT_NOT_FOUND', '接口不存在')
    } catch (error) {
      return throwResponseError(config, error)
    }
  }
}

export const mockAdapter = createMockAdapter()
