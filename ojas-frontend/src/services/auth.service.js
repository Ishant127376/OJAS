const DEFAULT_PROD_BACKEND_BASE_URL = 'https://ojas-r00n.onrender.com'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])
const currentHost = typeof window !== 'undefined' ? window.location.hostname : ''
const isLocalhost = LOCAL_HOSTS.has(currentHost)

const normalizeUrl = (value) => (value ? value.replace(/\/+$/, '') : value)
const isLocalUrl = (value) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(value || '')

const envApiBaseUrl = normalizeUrl(import.meta.env.VITE_API_BASE_URL)
const envBackendBaseUrl = normalizeUrl(import.meta.env.VITE_BACKEND_BASE_URL)
const safeEnvApiBaseUrl = !isLocalhost && isLocalUrl(envApiBaseUrl) ? null : envApiBaseUrl
const safeEnvBackendBaseUrl = !isLocalhost && isLocalUrl(envBackendBaseUrl) ? null : envBackendBaseUrl

const BACKEND_BASE_URL =
  safeEnvBackendBaseUrl ||
  (safeEnvApiBaseUrl ? safeEnvApiBaseUrl.replace(/\/api$/i, '') : null) ||
  (isLocalhost ? 'http://localhost:5001' : DEFAULT_PROD_BACKEND_BASE_URL)

const API_BASE_URL =
  safeEnvApiBaseUrl ||
  `${BACKEND_BASE_URL}/api`

const getGoogleAuthBaseUrl = () => {
  if (isLocalhost) {
    return BACKEND_BASE_URL
  }

  return DEFAULT_PROD_BACKEND_BASE_URL
}

const parseResponse = async (response) => {
  const json = await response.json().catch(() => null)
  if (!response.ok) {
    const message = json?.error?.message || `Request failed with status ${response.status}`
    throw new Error(message)
  }
  return json?.data
}

export const loginUser = async ({ email, password }) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  return parseResponse(response)
}

export const registerUser = async ({ name, email, password }) => {
  console.log('[AuthService] Debug - API_BASE_URL:', API_BASE_URL)
  console.log('[AuthService] Debug - Register URL:', `${API_BASE_URL}/auth/register`)
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password }),
  })

  return parseResponse(response)
}

export const getMe = async (token) => {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return parseResponse(response)
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('ojas_token')
  console.log('[AuthService] Token from localStorage:', token ? 'EXISTS' : 'MISSING')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export const continueWithGoogle = () => {
  const redirectBaseUrl = getGoogleAuthBaseUrl()
  window.location.href = `${redirectBaseUrl}/auth/google`
}

export const createSubAdminUser = async ({ name, email, password }) => {
  const response = await fetch(`${API_BASE_URL}/admin/create-subadmin`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, email, password }),
  })

  return parseResponse(response)
}

export const createManagedUser = async ({ name, email, password }) => {
  const response = await fetch(`${API_BASE_URL}/admin/create-user`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, email, password }),
  })

  return parseResponse(response)
}

export const getAdminUsers = async () => {
  const response = await fetch(`${API_BASE_URL}/admin/users`, {
    headers: getAuthHeaders(),
  })

  return parseResponse(response)
}

export const setRole = async (role) => {
  const response = await fetch(`${API_BASE_URL}/auth/set-role`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ role }),
  })

  return parseResponse(response)
}
