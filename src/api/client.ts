/** Same-origin API via nginx: build with VITE_API_URL=relative. Else absolute base or local dev default. */
function resolveApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined
  if (raw === 'relative') return ''
  if (raw !== undefined && raw !== '') return raw
  return 'http://localhost:8080'
}

const baseUrl = resolveApiBaseUrl()
const baseUrlLabel = baseUrl === '' ? 'same origin (/api)' : baseUrl

export type RequestInitWithAuth = RequestInit & { skipAuth?: boolean }

let accessToken: string | null = null
let refreshToken: string | null = null
let refreshPromise: Promise<string> | null = null

export function setTokens(access: string, refresh: string) {
  accessToken = access
  refreshToken = refresh
}

export function clearTokens() {
  accessToken = null
  refreshToken = null
  refreshPromise = null
}

export function getAccessToken(): string | null {
  return accessToken
}

function doRefresh(): Promise<string> {
  if (!refreshToken) return Promise.reject(new Error('No refresh token'))
  return fetch(`${baseUrl}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  }).then(async (res) => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Refresh failed')
    }
    const data = await res.json()
    accessToken = data.accessToken
    if (data.refreshToken) refreshToken = data.refreshToken
    return data.accessToken
  })
}

function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) refreshPromise = doRefresh().finally(() => { refreshPromise = null })
  return refreshPromise
}

export async function apiFetch(path: string, init: RequestInitWithAuth = {}): Promise<Response> {
  const { skipAuth, ...opts } = init
  const url = path.startsWith('http') ? path : `${baseUrl}${path}`

  const doRequest = (token: string | null) => {
    const headers = new Headers(opts.headers)
    if (token) headers.set('Authorization', `Bearer ${token}`)
    if (!headers.has('Content-Type') && opts.body && typeof opts.body === 'string') {
      headers.set('Content-Type', 'application/json')
    }
    return fetch(url, { ...opts, headers })
  }

  let res = await doRequest(skipAuth ? null : accessToken)

  if (!skipAuth && res.status === 401) {
    try {
      const newAccess = await refreshAccessToken()
      res = await doRequest(newAccess)
    } catch {
      clearTokens()
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 })
    }
  }

  return res
}

export async function apiJson<T>(path: string, init: RequestInitWithAuth = {}): Promise<T> {
  let res: Response
  try {
    res = await apiFetch(path, init)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Request failed'
    if (msg === 'Load failed' || msg === 'Failed to fetch' || msg.includes('NetworkError')) {
      throw new Error(`Cannot reach API at ${baseUrlLabel}. Is the backend running? CORS must allow this origin.`)
    }
    throw e
  }
  const text = await res.text()
  if (!res.ok) {
    let err: { message?: string; detail?: string; title?: string; error?: string } = {}
    try {
      if (text) err = JSON.parse(text)
    } catch {
      /* ignore */
    }
    const apiMsg =
      err.message ||
      err.detail ||
      err.title ||
      (typeof err.error === 'string' ? err.error : undefined)
    throw new Error(apiMsg || text || `HTTP ${res.status}`)
  }
  return text ? JSON.parse(text) : (null as T)
}
