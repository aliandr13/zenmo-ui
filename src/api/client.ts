/** Same-origin API via Caddy: build with VITE_API_URL=relative. Else absolute base or local dev default. */
function resolveApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined
  if (raw === 'relative') return ''
  if (raw !== undefined && raw !== '') return raw
  return 'http://localhost:8080'
}

const baseUrl = resolveApiBaseUrl()
const baseUrlLabel = baseUrl === '' ? 'same origin (/api)' : baseUrl

export type RequestInitWithAuth = RequestInit & { skipAuth?: boolean }

/**
 * Access token lives in memory only. The refresh token is an HttpOnly cookie set by the API
 * (scoped to /api/auth) — JavaScript never sees or stores it, so a reload restores the session via
 * a cookie-based refresh instead of reading anything from localStorage.
 */
let accessToken: string | null = null
let refreshPromise: Promise<string> | null = null
let onAuthFailure: (() => void) | null = null

/** The refresh token is invalid, expired or revoked: the user must log in again. */
export class AuthExpiredError extends Error {
  constructor(message = 'Session expired') {
    super(message)
    this.name = 'AuthExpiredError'
  }
}

export function setAccessToken(access: string) {
  accessToken = access
}

export function clearTokens() {
  accessToken = null
  refreshPromise = null
}

export function getAccessToken(): string | null {
  return accessToken
}

/** Called when a request fails because the session can no longer be refreshed. */
export function setAuthFailureHandler(handler: () => void) {
  onAuthFailure = handler
}

async function doRefresh(): Promise<string> {
  // Network errors propagate as-is (TypeError): the session may still be valid, so keep it.
  const res = await fetch(`${baseUrl}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    if (res.status === 400 || res.status === 401) throw new AuthExpiredError(err.message)
    throw new Error(err.message || `Refresh failed (HTTP ${res.status})`)
  }
  const data = await res.json()
  accessToken = data.accessToken
  return data.accessToken
}

/** Single-flight: parallel 401s share one refresh call (the refresh token rotates on every use). */
export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) refreshPromise = doRefresh().finally(() => { refreshPromise = null })
  return refreshPromise
}

/** Revokes the refresh token on the server and clears the cookie. Best effort. */
export async function logoutSession(): Promise<void> {
  try {
    await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST', credentials: 'include' })
  } catch {
    /* offline: the cookie stays until it expires; the in-memory token is cleared anyway */
  } finally {
    clearTokens()
  }
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
    // 'include' so the browser stores/sends the refresh cookie on /api/auth/* (also cross-origin in dev)
    return fetch(url, { credentials: 'include', ...opts, headers })
  }

  let res = await doRequest(skipAuth ? null : accessToken)

  if (!skipAuth && res.status === 401) {
    try {
      const newAccess = await refreshAccessToken()
      res = await doRequest(newAccess)
    } catch (e) {
      if (!(e instanceof AuthExpiredError)) throw e
      clearTokens()
      onAuthFailure?.()
      return new Response(JSON.stringify({ message: 'Session expired. Please log in again.' }), { status: 401 })
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
