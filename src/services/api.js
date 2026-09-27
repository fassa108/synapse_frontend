import axios from 'axios'
import router from '../router'
import { useAuthStore } from '../stores/auth'

// URL de l'API : VITE_API_URL (fichier .env), localhost par défaut.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const publicApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ─── Request interceptor : inject Bearer token ───────────────────────────────

api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('access_token')
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ─── Response interceptor : auto-refresh on 401 ──────────────────────────────

let isRefreshing = false
let refreshQueue = []

const processQueue = (error, token = null) => {
  refreshQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  refreshQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Organisme suspendu, ou accès du membre suspendu : page dédiée
    const code = error.response?.status === 403 ? error.response.data?.code : null
    if (code === 'organisme_suspendu') {
      useAuthStore().marquerOrganismeSuspendu()
      router.push({ name: 'organisme-suspendu' })
      return Promise.reject(error)
    }
    if (code === 'membre_suspendu') {
      useAuthStore().marquerAccesSuspendu()
      router.push({ name: 'organisme-suspendu' })
      return Promise.reject(error)
    }

    // Only attempt refresh once per request, and only on 401
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    const refreshToken = localStorage.getItem('refresh_token')

    // No refresh token → force logout
    if (!refreshToken) {
      window.location.href = '/login'
      return Promise.reject(error)
    }

    if (isRefreshing) {
      // Queue the request until refresh completes
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject })
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
        .catch((err) => Promise.reject(err))
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const response = await publicApi.post('accounts/refresh/', {
        refresh: refreshToken,
      })

      const newAccessToken = response.data.access

      // Le backend renouvelle aussi le refresh token (ROTATE_REFRESH_TOKENS)
      // et invalide l'ancien : il faut enregistrer le nouveau.
      useAuthStore().enregistrerTokens(newAccessToken, response.data.refresh)
      api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`

      processQueue(null, newAccessToken)

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
      return api(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)

      // Refresh failed → clear session and redirect
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('utilisateur')
      localStorage.removeItem('tenants')
      localStorage.removeItem('tenant_courant')

      window.location.href = '/login'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export default api
