import type { AccountResponse } from '@/types/api'
import { daysUntilClosingDay, daysUntilPaymentDue, formatMoney } from '@/composables/useAccountTableFormatters'

function pickNearestByDays(
  accounts: AccountResponse[],
  daysFn: (a: AccountResponse) => number | null,
): AccountResponse | null {
  let best: AccountResponse | null = null
  let bestDays = Infinity
  for (const a of accounts) {
    const d = daysFn(a)
    if (d == null) continue
    if (d < bestDays || (d === bestDays && best && a.name.localeCompare(best.name) < 0)) {
      bestDays = d
      best = a
    }
  }
  return best
}

/** CREDIT account with the soonest next statement closing day. */
export function nearestClosingAccount(accounts: AccountResponse[]): AccountResponse | null {
  return pickNearestByDays(accounts.filter((a) => a.type === 'CREDIT'), daysUntilClosingDay)
}

/** CREDIT account with payment due day set and the soonest next due date. */
export function nearestPaymentDueAccount(accounts: AccountResponse[]): AccountResponse | null {
  return pickNearestByDays(
    accounts.filter((a) => a.type === 'CREDIT' && a.paymentDueDay != null),
    daysUntilPaymentDue,
  )
}

function addBalance(map: Map<string, number>, a: AccountResponse, amount: number | undefined) {
  const v = amount ?? 0
  if (Number.isNaN(v)) return
  map.set(a.currency, (map.get(a.currency) ?? 0) + v)
}

/** Sum of current balances for CHECKING + CASH (per currency; do not mix currencies). */
export function totalsCheckingCashByCurrency(accounts: AccountResponse[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const a of accounts) {
    if (a.type === 'CHECKING' || a.type === 'CASH') {
      addBalance(m, a, a.currentBalance)
    }
  }
  return m
}

/** Sum of current balances for CHECKING + CASH + SAVINGS (per currency). */
export function totalsLiquidByCurrency(accounts: AccountResponse[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const a of accounts) {
    if (a.type === 'CHECKING' || a.type === 'CASH' || a.type === 'SAVINGS') {
      addBalance(m, a, a.currentBalance)
    }
  }
  return m
}

/**
 * Total owed on credit cards: sum of statement balances (per currency).
 * Statement balance is the billed amount; use currentBalance if you need card running balance instead.
 */
export function totalsCreditStatementByCurrency(accounts: AccountResponse[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const a of accounts) {
    if (a.type === 'CREDIT') {
      addBalance(m, a, a.statementBalance)
    }
  }
  return m
}

/** Utilization % per currency: sum(statement) / sum(limit) for CREDIT with limit > 0. */
export function creditUtilizationPercentByCurrency(accounts: AccountResponse[]): Map<string, number> {
  const agg = new Map<string, { stmt: number; limit: number }>()
  for (const a of accounts) {
    if (a.type !== 'CREDIT' || a.creditLimit == null || a.creditLimit <= 0) continue
    const stmt = a.statementBalance ?? 0
    const row = agg.get(a.currency) ?? { stmt: 0, limit: 0 }
    row.stmt += stmt
    row.limit += a.creditLimit
    agg.set(a.currency, row)
  }
  const out = new Map<string, number>()
  for (const [cur, { stmt, limit }] of agg) {
    if (limit > 0) {
      out.set(cur, Math.min(100, Math.round((stmt / limit) * 1000) / 10))
    }
  }
  return out
}

export function formatCurrencyTotals(totals: Map<string, number>): string[] {
  const lines: string[] = []
  for (const [currency, total] of [...totals.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(formatMoney(total, currency))
  }
  return lines
}

export function formatUtilizationLines(util: Map<string, number>): string[] {
  const lines: string[] = []
  for (const [currency, pct] of [...util.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`${pct}% (${currency})`)
  }
  return lines
}
