
export type AccountType = 'CHECKING' | 'CASH' | 'SAVINGS' | 'CREDIT'
export type TxnStatus = 'PENDING' | 'POSTED'

export interface RegisterRequest {
  email: string
  password: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface TokensResponse {
  accessToken: string
  refreshToken: string
}

export interface RefreshRequest {
  refreshToken: string
}

export interface CurrentUser {
  userId: string
  email: string
}

export interface AccountRequest {
  name: string
  type: AccountType
  currency: string
  creditLimit?: number
  statementBalance?: number
  paymentDueDay?: number
  closingDay?: number
  currentBalance?: number
}

export interface AccountResponse {
  id: string
  name: string
  type: AccountType
  currency: string
  creditLimit?: number
  currentBalance?: number
  statementBalance?: number
  paymentDueDay?: number
  closingDay?: number
  archived: boolean
  createdAt: string
}

export interface CategoryRequest {
  name: string
  parentId?: string
  color?: string
}

export interface CategoryResponse {
  id: string
  name: string
  parentId?: string
  color?: string
  createdAt: string
}

export interface TxnRequest {
  accountId: string
  categoryId?: string
  transactionDate: string
  postDate?: string
  amount: number
  currency: string
  description: string
  merchant?: string
  status: TxnStatus
  notes?: string
}

export interface TxnResponse {
  id: string
  accountId: string
  categoryId?: string
  transactionDate: string
  postDate?: string
  amount: number
  currency: string
  description: string
  merchant?: string
  status: TxnStatus
  notes?: string
  createdAt: string
}

export interface Pageable {
  page?: number
  size?: number
  sort?: string[]
}

export interface PageTxnResponse {
  content: TxnResponse[]
  totalElements: number
  totalPages: number
  size: number
  number: number
  first: boolean
  last: boolean
  empty: boolean
}

export interface TransactionsQuery {
  accountId?: string
  fromDate?: string
  toDate?: string
  page?: number
  size?: number
  sort?: string[]
}
