import { apiFetch, apiJson } from './client'
import type { AccountRequest, AccountResponse } from '@/types/api'

export function listAccounts(): Promise<AccountResponse[]> {
  return apiJson<AccountResponse[]>('/api/accounts')
}

export function getAccount(id: string): Promise<AccountResponse> {
  return apiJson<AccountResponse>(`/api/accounts/${id}`)
}

export function createAccount(body: AccountRequest): Promise<AccountResponse> {
  return apiJson<AccountResponse>('/api/accounts', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateAccount(id: string, body: AccountRequest): Promise<AccountResponse> {
  return apiJson<AccountResponse>(`/api/accounts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function deleteAccount(id: string): Promise<void> {
  return apiFetch(`/api/accounts/${id}`, { method: 'DELETE' }).then((res) => {
    if (!res.ok) return res.text().then((t) => { throw new Error(t || `HTTP ${res.status}`) })
  })
}
