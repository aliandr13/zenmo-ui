import type { AccountResponse, AccountType } from '@/types/api'

export function typeLabel(t: AccountType): string {
  return t === 'CREDIT_CARD' ? 'Credit' : 'Debit'
}

export function formatMoney(value: number | undefined, currency: string): string {
  if (value == null || Number.isNaN(value)) return '—'
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value)
  } catch {
    return `${value} ${currency}`
  }
}

/** API has no per-account balance; placeholder until backend exposes it */
export function amountCell(_a: AccountResponse): string {
  return '—'
}

export function limitCell(a: AccountResponse): string {
  if (a.type !== 'CREDIT_CARD' || a.creditLimit == null) return '—'
  return formatMoney(a.creditLimit, a.currency)
}

export function dueCell(a: AccountResponse): string {
  if (a.type !== 'CREDIT_CARD' || a.paymentDueDay == null) return '—'
  return `Day ${a.paymentDueDay}`
}

export function closingCell(a: AccountResponse): string {
  if (a.type !== 'CREDIT_CARD') return '—'
  return `Day ${a.closingDay}`
}
