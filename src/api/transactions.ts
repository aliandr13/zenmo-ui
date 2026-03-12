import { apiFetch, apiJson } from './client'
import type { TxnRequest, TxnResponse, PageTxnResponse, TransactionsQuery } from '@/types/api'

/** Build query string. Backend may use arg0=accountId, arg1=fromDate, arg2=toDate, or named params; try named first per README. */
function buildQuery(q: TransactionsQuery): string {
  const params = new URLSearchParams()
  if (q.accountId) params.set('accountId', q.accountId)
  if (q.fromDate) params.set('fromDate', q.fromDate)
  if (q.toDate) params.set('toDate', q.toDate)
  params.set('page', String(q.page ?? 0))
  params.set('size', String(q.size ?? 20))
  if (q.sort?.length) params.set('sort', q.sort.join(','))
  return params.toString()
}

export function listTransactions(query: TransactionsQuery): Promise<PageTxnResponse> {
  const search = buildQuery(query)
  return apiJson<PageTxnResponse>(`/api/transactions?${search}`)
}

export function getTransaction(id: string): Promise<TxnResponse> {
  return apiJson<TxnResponse>(`/api/transactions/${id}`)
}

export function createTransaction(body: TxnRequest): Promise<TxnResponse> {
  return apiJson<TxnResponse>('/api/transactions', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function deleteTransaction(id: string): Promise<void> {
  return apiFetch(`/api/transactions/${id}`, { method: 'DELETE' }).then((res) => {
    if (!res.ok) return res.text().then((t) => { throw new Error(t || `HTTP ${res.status}`) })
  })
}
