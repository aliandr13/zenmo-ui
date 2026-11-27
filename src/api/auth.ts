import { apiJson } from './client'
import type { LoginRequest, RegisterRequest, TokensResponse, CurrentUser } from '@/types/api'

export function register(body: RegisterRequest): Promise<TokensResponse> {
  return apiJson<TokensResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  })
}

export function login(body: LoginRequest): Promise<TokensResponse> {
  return apiJson<TokensResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  })
}

export function me(): Promise<CurrentUser> {
  return apiJson<CurrentUser>('/api/auth/me')
}
