import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
})

// 请求拦截器
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error.response?.data || error)
  }
)

// 认证API
export const authApi = {
  login: (username: string, password: string) => {
    const formData = new FormData()
    formData.append('username', username)
    formData.append('password', password)
    return api.post('/auth/login', formData)
  },
  register: (data: { username: string; password: string; role?: string }) =>
    api.post('/auth/register', data),
  getMe: () => api.get('/auth/me')
}

// 预约API
export const reservationApi = {
  create: (data: { start_time: number; end_time: number; priority?: string }) =>
    api.post('/reservations/', data),
  getMyReservations: () => api.get('/reservations/'),
  getPending: () => api.get('/reservations/pending'),
  cancel: (id: number) => api.delete(`/reservations/${id}`),
  getSeats: () => api.get('/reservations/seats')
}

// 模拟API
export const simulationApi = {
  getStatus: () => api.get('/simulation/status'),
  start: (duration?: number) => api.post('/simulation/start', null, { params: { duration } }),
  stop: () => api.post('/simulation/stop'),
  reset: () => api.post('/simulation/reset'),
  step: () => api.post('/simulation/step'),
  optimize: () => api.post('/simulation/optimize'),
  applySolution: (solutionId: number) => api.post(`/simulation/apply-solution/${solutionId}`),
  getReport: () => api.get('/simulation/report'),
  getParetoHistory: () => api.get('/simulation/pareto-history'),
  getConfig: () => api.get('/simulation/config')
}

export default api
