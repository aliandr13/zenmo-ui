import { apiFetch, apiJson } from './client'
import type { CategoryRequest, CategoryResponse } from '@/types/api'

export function listCategories(): Promise<CategoryResponse[]> {
  return apiJson<CategoryResponse[]>('/api/categories')
}

export function getCategory(id: string): Promise<CategoryResponse> {
  return apiJson<CategoryResponse>(`/api/categories/${id}`)
}

export function createCategory(body: CategoryRequest): Promise<CategoryResponse> {
  return apiJson<CategoryResponse>('/api/categories', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function deleteCategory(id: string): Promise<void> {
  return apiFetch(`/api/categories/${id}`, { method: 'DELETE' }).then((res) => {
    if (!res.ok) return res.text().then((t) => { throw new Error(t || `HTTP ${res.status}`) })
  })
}
