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

export function currentBalanceCell(a: AccountResponse): string {
  return formatMoney(a.currentBalance, a.currency)
}

export function statementBalanceCell(a: AccountResponse): string {
  return formatMoney(a.statementBalance, a.currency)
}

export function limitCell(a: AccountResponse): string {
  if (a.type !== 'CREDIT_CARD' || a.creditLimit == null) return '—'
  return formatMoney(a.creditLimit, a.currency)
}

function calendarDaysBetweenUtc(
  y1: number,
  m1: number,
  d1: number,
  y2: number,
  m2: number,
  d2: number,
): number {
  const ms = Date.UTC(y2, m2, d2) - Date.UTC(y1, m1, d1)
  return Math.round(ms / 86400000)
}

/** Next calendar occurrence of `dayOfMonth` (1–31): this month if today <= day, else next month. */
function formatNextDayOfMonth(dayOfMonth: number): string {
  const now = new Date()
  const todayY = now.getFullYear()
  const todayM = now.getMonth()
  const todayD = now.getDate()

  let targetY = todayY
  let targetM = todayM
  if (todayD > dayOfMonth) {
    targetM += 1
    if (targetM > 11) {
      targetM = 0
      targetY += 1
    }
  }

  const targetDate = new Date(targetY, targetM, dayOfMonth)
  const dateStr = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
  }).format(targetDate)

  const ty = targetDate.getFullYear()
  const tm = targetDate.getMonth()
  const td = targetDate.getDate()
  const n = calendarDaysBetweenUtc(todayY, todayM, todayD, ty, tm, td)

  if (n === 0) return `${dateStr} (today)`
  return `${dateStr} (in ${n} day${n === 1 ? '' : 's'})`
}

export function dueCell(a: AccountResponse): string {
  if (a.type !== 'CREDIT_CARD' || a.paymentDueDay == null) return '—'
  return formatNextDayOfMonth(a.paymentDueDay)
}

export function closingCell(a: AccountResponse): string {
  if (a.type !== 'CREDIT_CARD') return '—'
  return formatNextDayOfMonth(a.closingDay)
}
