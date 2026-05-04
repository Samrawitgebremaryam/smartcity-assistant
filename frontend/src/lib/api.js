import axios from 'axios'
import { jwtDecode } from 'jwt-decode'

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
export const SUPPORTED_DOCUMENT_EXTENSIONS = ['.txt', '.md', '.json', '.csv', '.html', '.htm']

axios.defaults.baseURL = API_BASE

export function authHeaders(token) {
  return { Authorization: `Bearer ${token}` }
}

export function extractApiError(error, fallback) {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string' && detail.trim()) return detail
  if (Array.isArray(detail) && detail.length > 0) {
    const firstMessage = detail
      .map((item) => item?.msg || item?.message || '')
      .find((message) => typeof message === 'string' && message.trim())
    if (firstMessage) return firstMessage
  }
  if (!error?.response) {
    return `Cannot reach the backend at ${API_BASE}. Make sure the API is running.`
  }
  return fallback
}

export async function getCurrentUser(token) {
  const decoded = jwtDecode(token)
  if (decoded.exp * 1000 <= Date.now()) {
    throw new Error('Session expired')
  }
  const response = await axios.get('/auth/me', { headers: authHeaders(token) })
  return { token, ...response.data }
}

export default axios
