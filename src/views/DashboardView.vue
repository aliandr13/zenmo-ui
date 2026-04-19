<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { listAccounts } from '@/api/accounts'
import type { AccountResponse, AccountType } from '@/types/api'
import {
  closingCell,
  dueCell,
  paymentDueUrgencyClass,
  typeLabel,
} from '@/composables/useAccountTableFormatters'
import { useNarrowViewport } from '@/composables/useNarrowViewport'
import {
  nearestClosingAccount,
  nearestPaymentDueAccount,
  totalsCheckingCashByCurrency,
  totalsLiquidByCurrency,
  totalsCreditStatementByCurrency,
  creditUtilizationPercentByCurrency,
  formatCurrencyTotals,
  formatUtilizationLines,
} from '@/composables/useDashboardSummaries'
import { BAlert } from 'bootstrap-vue-next'

const isNarrowViewport = useNarrowViewport()
const accounts = ref<AccountResponse[]>([])
const loading = ref(true)
const error = ref('')

const nearestClosing = computed(() => nearestClosingAccount(accounts.value))
const nearestDue = computed(() => nearestPaymentDueAccount(accounts.value))
const checkingCashLines = computed(() => formatCurrencyTotals(totalsCheckingCashByCurrency(accounts.value)))
const liquidLines = computed(() => formatCurrencyTotals(totalsLiquidByCurrency(accounts.value)))
const creditStatementLines = computed(() => formatCurrencyTotals(totalsCreditStatementByCurrency(accounts.value)))
const utilizationLines = computed(() => formatUtilizationLines(creditUtilizationPercentByCurrency(accounts.value)))

const typeCounts = computed(() => {
  const m = new Map<AccountType, number>()
  for (const a of accounts.value) {
    m.set(a.type, (m.get(a.type) ?? 0) + 1)
  }
  return m
})

const overviewBadges = computed(() => {
  const order: AccountType[] = ['CREDIT', 'CHECKING', 'CASH', 'SAVINGS']
  return order
    .filter((t) => (typeCounts.value.get(t) ?? 0) > 0)
    .map((t) => ({ type: t, label: typeLabel(t), count: typeCounts.value.get(t) ?? 0 }))
})

onMounted(async () => {
  try {
    accounts.value = await listAccounts()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="dashboard">
    <div class="pricing-header px-3 py-3 pt-md-4 pb-md-4 mx-auto text-center">
      <h1 class="display-6 fw-normal">Dashboard</h1>
      <p class="text-muted">Balances, due dates, and utilization at a glance.</p>
    </div>

    <BAlert v-if="error" :model-value="true" variant="danger" class="mb-3">{{ error }}</BAlert>

    <template v-if="loading">
      <p class="text-muted text-center">Loading…</p>
    </template>
    <template v-else>
      <p v-if="!accounts.length" class="text-muted text-center mb-4">
        No accounts yet.
        <RouterLink to="/accounts" class="link-secondary">Add one</RouterLink>.
      </p>

      <div v-else class="row row-cols-1 row-cols-lg-2 row-cols-xxl-3 gx-4 gy-4 mb-3 text-center">
        <div class="col">
          <div class="card rounded-3 shadow-sm h-100">
            <div class="card-header py-3">
              <h4 class="my-0 fw-normal">Payment due</h4>
            </div>
            <div class="card-body">
              <template v-if="nearestDue">
                <h1 class="card-title pricing-card-title text-truncate px-1">{{ nearestDue.name }}</h1>
                <p class="mb-0 mt-2" :class="paymentDueUrgencyClass(nearestDue)">
                  {{ dueCell(nearestDue, isNarrowViewport) }}
                </p>
              </template>
              <template v-else>
                <h1 class="card-title pricing-card-title text-body-secondary">—</h1>
                <p class="text-muted small mb-0 mt-2">No credit account with a payment due day.</p>
              </template>
            </div>
          </div>
        </div>

        <div class="col">
          <div class="card rounded-3 shadow-sm h-100">
            <div class="card-header py-3">
              <h4 class="my-0 fw-normal">Nearest closing</h4>
            </div>
            <div class="card-body">
              <template v-if="nearestClosing">
                <h1 class="card-title pricing-card-title text-truncate px-1">{{ nearestClosing.name }}</h1>
                <p class="text-muted mb-0 mt-2">{{ closingCell(nearestClosing, isNarrowViewport) }}</p>
              </template>
              <template v-else>
                <h1 class="card-title pricing-card-title text-body-secondary">—</h1>
                <p class="text-muted small mb-0 mt-2">No credit accounts.</p>
              </template>
            </div>
          </div>
        </div>

        <div class="col">
          <div class="card rounded-3 shadow-sm h-100">
            <div class="card-header py-3">
              <h4 class="my-0 fw-normal">Checking + cash</h4>
            </div>
            <div class="card-body">
              <p class="text-muted small text-start mb-3">Sum of current balances (checking and cash).</p>
              <ul v-if="checkingCashLines.length" class="list-unstyled mt-3 mb-4">
                <li v-for="(line, i) in checkingCashLines" :key="i">{{ line }}</li>
              </ul>
              <p v-else class="text-muted small mb-0">No checking or cash accounts.</p>
            </div>
          </div>
        </div>

        <div class="col">
          <div class="card rounded-3 shadow-sm h-100">
            <div class="card-header py-3">
              <h4 class="my-0 fw-normal">Credit (statement)</h4>
            </div>
            <div class="card-body">
              <p class="text-muted small text-start mb-3">Total statement balances on credit cards.</p>
              <ul v-if="creditStatementLines.length" class="list-unstyled mt-3 mb-4">
                <li v-for="(line, i) in creditStatementLines" :key="i">{{ line }}</li>
              </ul>
              <p v-else class="text-muted small mb-0">No credit accounts.</p>
            </div>
          </div>
        </div>

        <div class="col">
          <div class="card rounded-3 shadow-sm h-100">
            <div class="card-header py-3">
              <h4 class="my-0 fw-normal">Liquid assets</h4>
            </div>
            <div class="card-body">
              <p class="text-muted small text-start mb-3">Checking, cash, and savings (current balance).</p>
              <ul v-if="liquidLines.length" class="list-unstyled mt-3 mb-4">
                <li v-for="(line, i) in liquidLines" :key="i">{{ line }}</li>
              </ul>
              <p v-else class="text-muted small mb-0">No checking, cash, or savings accounts.</p>
            </div>
          </div>
        </div>

        <div class="col">
          <div class="card rounded-3 shadow-sm h-100">
            <div class="card-header py-3">
              <h4 class="my-0 fw-normal">Utilization</h4>
            </div>
            <div class="card-body">
              <p class="text-muted small text-start mb-3">Statement balance ÷ credit limit (per currency).</p>
              <ul v-if="utilizationLines.length" class="list-unstyled mt-3 mb-4">
                <li v-for="(line, i) in utilizationLines" :key="i">{{ line }}</li>
              </ul>
              <p v-else class="text-muted small mb-0">No credit cards with a limit set.</p>
            </div>
          </div>
        </div>

        <div class="col">
          <div class="card rounded-3 shadow-sm h-100">
            <div class="card-header py-3">
              <h4 class="my-0 fw-normal">Accounts</h4>
            </div>
            <div class="card-body">
              <h1 class="card-title pricing-card-title">{{ accounts.length }}</h1>
              <p class="text-muted small mb-3">Total linked accounts</p>
              <ul class="list-unstyled mt-3 mb-4 text-start">
                <li v-for="b in overviewBadges" :key="b.type">
                  {{ b.label }}: {{ b.count }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div class="row justify-content-center mb-4">
        <div class="col-12 col-md-8 col-lg-6">
          <div class="d-grid gap-2 d-sm-flex justify-content-sm-center">
            <RouterLink to="/accounts" class="w-100 btn btn-lg btn-outline-primary">
              View all accounts
            </RouterLink>
            <RouterLink to="/transactions" class="w-100 btn btn-lg btn-outline-secondary">
              View transactions
            </RouterLink>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* Mirrors Bootstrap’s pricing example headline scale (see https://getbootstrap.com/docs/5.3/examples/pricing/) */
.pricing-header {
  max-width: 700px;
}

.pricing-card-title {
  font-size: 2rem;
  font-weight: 600;
  line-height: 1.2;
  margin-bottom: 0;
}

@media (min-width: 992px) {
  .pricing-card-title {
    font-size: 2.5rem;
  }
}

.dashboard {
  width: 100%;
}
</style>
