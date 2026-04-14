import type { AccountResponse, AccountType } from '@/types/api'

export function typeLabel(t: AccountType): string {
  switch (t) {
    case 'CHECKING':
      return 'Checking'
    case 'CASH':
      return 'Cash'
    case 'SAVINGS':
      return 'Savings'
    case 'CREDIT':
      return 'Credit'
    default:
      return t
  }
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
  if (a.type !== 'CREDIT' || a.creditLimit == null) return '—'
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
function nextDayOfMonthInfo(dayOfMonth: number): { days: number; dateStr: string } {
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
  const days = calendarDaysBetweenUtc(todayY, todayM, todayD, ty, tm, td)

  return { days, dateStr }
}

function formatNextDayOfMonth(dayOfMonth: number): string {
  const { days, dateStr } = nextDayOfMonthInfo(dayOfMonth)
  if (days === 0) return `${dateStr} (today)`
  return `${dateStr} (in ${days} day${days === 1 ? '' : 's'})`
}

export function dueCell(a: AccountResponse): string {
  if (a.type !== 'CREDIT' || a.paymentDueDay == null) return '—'
  return formatNextDayOfMonth(a.paymentDueDay)
}

/** Days until next calendar occurrence of payment due day; null if N/A. Sort by this, not raw day-of-month. */
export function daysUntilPaymentDue(a: AccountResponse): number | null {
  if (a.type !== 'CREDIT' || a.paymentDueDay == null) return null
  return nextDayOfMonthInfo(a.paymentDueDay).days
}

/** Days until next calendar occurrence of statement closing day; null if not credit. */
export function daysUntilClosingDay(a: AccountResponse): number | null {
  if (a.type !== 'CREDIT' || a.closingDay == null) return null
  return nextDayOfMonthInfo(a.closingDay).days
}

/** Bootstrap text classes when payment is soon and there is a statement balance owed. */
export function paymentDueUrgencyClass(a: AccountResponse): string {
  if (a.type !== 'CREDIT' || a.paymentDueDay == null) return ''
  const stmt = a.statementBalance
  if (stmt == null || Number.isNaN(stmt) || stmt <= 0) return ''
  const { days } = nextDayOfMonthInfo(a.paymentDueDay)
  if (days < 2) return 'text-danger fw-semibold'
  if (days < 7) return 'text-warning fw-semibold'
  return ''
}

export function closingCell(a: AccountResponse): string {
  if (a.type !== 'CREDIT' || a.closingDay == null) return '—'
  return formatNextDayOfMonth(a.closingDay)
}
