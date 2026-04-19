<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { listAccounts, createAccount, updateAccount, deleteAccount } from '@/api/accounts'
import type { AccountResponse, AccountType } from '@/types/api'
import {
  closingCell,
  currentBalanceCell,
  daysUntilClosingDay,
  daysUntilPaymentDue,
  dueCell,
  paymentDueUrgencyClass,
  statementBalanceCell,
} from '@/composables/useAccountTableFormatters'
import { useNarrowViewport } from '@/composables/useNarrowViewport'
import { BAlert, BButton, BForm, BFormGroup, BFormInput, BModal } from 'bootstrap-vue-next'

const isNarrowViewport = useNarrowViewport()

function newAccountForm() {
  return {
    name: '',
    type: 'CREDIT' as AccountType,
    currency: 'USD',
    creditLimit: undefined as number | undefined,
    statementBalance: undefined as number | undefined,
    paymentDueDay: undefined as number | undefined,
    closingDay: 1,
    currentBalance: 0,
  }
}

function accountToForm(a: AccountResponse) {
  const row = {
    name: a.name,
    type: a.type,
    currency: a.currency,
    closingDay: a.closingDay ?? 1,
    currentBalance: a.currentBalance ?? 0,
    creditLimit: undefined as number | undefined,
    statementBalance: undefined as number | undefined,
    paymentDueDay: undefined as number | undefined,
  }
  if (a.type === 'CREDIT') {
    row.creditLimit = a.creditLimit
    row.statementBalance = a.statementBalance
    row.paymentDueDay = a.paymentDueDay
  }
  return row
}

type SortDir = 'asc' | 'desc'
type CreditSortKey = 'name' | 'currentBalance' | 'statementBalance' | 'paymentDueDay' | 'closingDay'
type SimpleSortKey = 'name' | 'currentBalance'

function compareNullableNum(
  a: number | undefined | null,
  b: number | undefined | null,
  dir: SortDir,
): number {
  const na = a == null || Number.isNaN(Number(a)) ? null : Number(a)
  const nb = b == null || Number.isNaN(Number(b)) ? null : Number(b)
  if (na === null && nb === null) return 0
  if (na === null) return 1
  if (nb === null) return -1
  const cmp = na - nb
  return dir === 'asc' ? cmp : -cmp
}

function sortCreditRows(list: AccountResponse[], key: CreditSortKey, dir: SortDir): AccountResponse[] {
  return [...list].sort((a, b) => {
    switch (key) {
      case 'name': {
        const c = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        return dir === 'asc' ? c : -c
      }
      case 'currentBalance':
        return compareNullableNum(a.currentBalance, b.currentBalance, dir)
      case 'statementBalance':
        return compareNullableNum(a.statementBalance, b.statementBalance, dir)
      case 'paymentDueDay':
        return compareNullableNum(daysUntilPaymentDue(a), daysUntilPaymentDue(b), dir)
      case 'closingDay':
        return compareNullableNum(daysUntilClosingDay(a), daysUntilClosingDay(b), dir)
      default:
        return 0
    }
  })
}

function sortSimpleRows(list: AccountResponse[], key: SimpleSortKey, dir: SortDir): AccountResponse[] {
  return [...list].sort((a, b) => {
    if (key === 'name') {
      const c = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      return dir === 'asc' ? c : -c
    }
    return compareNullableNum(a.currentBalance, b.currentBalance, dir)
  })
}

function ariaSortFor(activeKey: string, key: string, dir: SortDir): 'ascending' | 'descending' | undefined {
  if (activeKey !== key) return undefined
  return dir === 'asc' ? 'ascending' : 'descending'
}

const accounts = ref<AccountResponse[]>([])
const creditAccounts = computed(() => accounts.value.filter((a) => a.type === 'CREDIT'))
const checkingAndCashAccounts = computed(() =>
  accounts.value.filter((a) => a.type === 'CHECKING' || a.type === 'CASH'),
)
const savingsAccounts = computed(() => accounts.value.filter((a) => a.type === 'SAVINGS'))

const creditSort = ref<{ key: CreditSortKey; dir: SortDir }>({ key: 'name', dir: 'asc' })
const checkingSort = ref<{ key: SimpleSortKey; dir: SortDir }>({ key: 'name', dir: 'asc' })
const savingsSort = ref<{ key: SimpleSortKey; dir: SortDir }>({ key: 'name', dir: 'asc' })

const sortedCreditAccounts = computed(() =>
  sortCreditRows(creditAccounts.value, creditSort.value.key, creditSort.value.dir),
)
const sortedCheckingAndCashAccounts = computed(() =>
  sortSimpleRows(checkingAndCashAccounts.value, checkingSort.value.key, checkingSort.value.dir),
)
const sortedSavingsAccounts = computed(() =>
  sortSimpleRows(savingsAccounts.value, savingsSort.value.key, savingsSort.value.dir),
)

function toggleCreditSort(key: CreditSortKey) {
  if (creditSort.value.key === key) {
    creditSort.value = { key, dir: creditSort.value.dir === 'asc' ? 'desc' : 'asc' }
  } else {
    creditSort.value = { key, dir: 'asc' }
  }
}

function toggleCheckingSort(key: SimpleSortKey) {
  if (checkingSort.value.key === key) {
    checkingSort.value = { key, dir: checkingSort.value.dir === 'asc' ? 'desc' : 'asc' }
  } else {
    checkingSort.value = { key, dir: 'asc' }
  }
}

function toggleSavingsSort(key: SimpleSortKey) {
  if (savingsSort.value.key === key) {
    savingsSort.value = { key, dir: savingsSort.value.dir === 'asc' ? 'desc' : 'asc' }
  } else {
    savingsSort.value = { key, dir: 'asc' }
  }
}
const loading = ref(true)
const error = ref('')
const showForm = ref(false)
const editingAccountId = ref<string | null>(null)
const selectedAccountId = ref<string | null>(null)
const form = ref(newAccountForm())
const submitting = ref(false)
const deleting = ref(false)
const showDeleteModal = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    accounts.value = await listAccounts()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load'
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function openAddForm() {
  editingAccountId.value = null
  selectedAccountId.value = null
  showDeleteModal.value = false
  form.value = newAccountForm()
  error.value = ''
  showForm.value = true
  await nextTick()
  document.getElementById('account-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function openEditForm(a: AccountResponse) {
  editingAccountId.value = a.id
  selectedAccountId.value = a.id
  form.value = accountToForm(a)
  error.value = ''
  showForm.value = true
  await nextTick()
  document.getElementById('account-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function closeAccountForm() {
  showForm.value = false
  editingAccountId.value = null
  selectedAccountId.value = null
  showDeleteModal.value = false
}

async function submitAccount() {
  const bal = form.value.currentBalance
  if (bal == null || Number.isNaN(bal)) {
    error.value = 'Current balance is required'
    return
  }
  if (form.value.type === 'CREDIT') {
    const lim = form.value.creditLimit
    if (lim == null || Number.isNaN(lim)) {
      error.value = 'Credit limit is required'
      return
    }
    const due = form.value.paymentDueDay
    if (due == null || Number.isNaN(due) || due < 1 || due > 31) {
      error.value = 'Payment due day must be between 1 and 31'
      return
    }
    const d = form.value.closingDay
    if (d == null || d < 1 || d > 31) {
      error.value = 'Closing day must be between 1 and 31'
      return
    }
  }
  submitting.value = true
  error.value = ''
  const stmt = form.value.type === 'CREDIT' ? form.value.statementBalance : undefined
  const statementBalance =
    form.value.type === 'CREDIT' &&
    stmt != null &&
    !Number.isNaN(stmt) &&
    Number.isFinite(stmt)
      ? stmt
      : undefined
  const payload = {
    name: form.value.name,
    type: form.value.type,
    currency: form.value.currency,
    creditLimit: form.value.type === 'CREDIT' ? form.value.creditLimit : undefined,
    statementBalance,
    paymentDueDay: form.value.type === 'CREDIT' ? form.value.paymentDueDay : undefined,
    closingDay: form.value.type === 'CREDIT' ? form.value.closingDay : undefined,
    currentBalance: bal,
  }
  try {
    const id = editingAccountId.value
    if (id) {
      await updateAccount(id, payload)
    } else {
      await createAccount(payload)
    }
    form.value = newAccountForm()
    editingAccountId.value = null
    selectedAccountId.value = null
    showForm.value = false
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save'
  } finally {
    submitting.value = false
  }
}

function openDeleteAccountModal() {
  if (!editingAccountId.value) return
  showDeleteModal.value = true
}

async function confirmDeleteAccount(hide: (trigger?: string) => void) {
  const id = editingAccountId.value
  if (!id) {
    hide('cancel')
    return
  }
  deleting.value = true
  error.value = ''
  try {
    await deleteAccount(id)
    hide('ok')
    form.value = newAccountForm()
    closeAccountForm()
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="accounts-page">
    <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pb-2 mb-3 border-bottom gap-2">
      <h1 class="h2 mb-0">Accounts</h1>
      <BButton variant="primary" @click="openAddForm">Add account</BButton>
    </div>

    <BAlert v-if="error" :model-value="true" variant="danger" class="mb-3">{{ error }}</BAlert>

    <template v-if="loading">
      <p class="text-muted">Loading…</p>
    </template>
    <template v-else>
      <template v-if="!accounts.length">
        <p class="text-muted">No accounts.</p>
      </template>
      <template v-else>
        <section class="mb-4">
          <h2 class="h4">Credit accounts</h2>
          <div v-if="creditAccounts.length" class="table-responsive">
            <table class="table table-striped table-sm table-hover align-middle text-center">
              <thead>
                <tr>
                  <th
                    scope="col"
                    :aria-sort="ariaSortFor(creditSort.key, 'name', creditSort.dir)"
                  >
                    <button type="button" class="sortable-th" @click="toggleCreditSort('name')">
                      Name
                      <span v-if="creditSort.key === 'name'" class="sort-indicator" aria-hidden="true">
                        {{ creditSort.dir === 'asc' ? '▲' : '▼' }}
                      </span>
                    </button>
                  </th>
                  <th
                    scope="col"
                    :aria-sort="ariaSortFor(creditSort.key, 'currentBalance', creditSort.dir)"
                  >
                    <button type="button" class="sortable-th" @click="toggleCreditSort('currentBalance')">
                      Current
                      <span v-if="creditSort.key === 'currentBalance'" class="sort-indicator" aria-hidden="true">
                        {{ creditSort.dir === 'asc' ? '▲' : '▼' }}
                      </span>
                    </button>
                  </th>
                  <th
                    scope="col"
                    :aria-sort="ariaSortFor(creditSort.key, 'statementBalance', creditSort.dir)"
                  >
                    <button type="button" class="sortable-th" @click="toggleCreditSort('statementBalance')">
                      Statement
                      <span v-if="creditSort.key === 'statementBalance'" class="sort-indicator" aria-hidden="true">
                        {{ creditSort.dir === 'asc' ? '▲' : '▼' }}
                      </span>
                    </button>
                  </th>
                  <th
                    scope="col"
                    :aria-sort="ariaSortFor(creditSort.key, 'paymentDueDay', creditSort.dir)"
                  >
                    <button type="button" class="sortable-th" @click="toggleCreditSort('paymentDueDay')">
                      Payment
                      <span v-if="creditSort.key === 'paymentDueDay'" class="sort-indicator" aria-hidden="true">
                        {{ creditSort.dir === 'asc' ? '▲' : '▼' }}
                      </span>
                    </button>
                  </th>
                  <th
                    scope="col"
                    :aria-sort="ariaSortFor(creditSort.key, 'closingDay', creditSort.dir)"
                  >
                    <button type="button" class="sortable-th" @click="toggleCreditSort('closingDay')">
                      Closing
                      <span v-if="creditSort.key === 'closingDay'" class="sort-indicator" aria-hidden="true">
                        {{ creditSort.dir === 'asc' ? '▲' : '▼' }}
                      </span>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="a in sortedCreditAccounts"
                  :key="a.id"
                  class="account-table-row"
                  :class="{ 'table-active': selectedAccountId === a.id }"
                  title="Click to edit"
                  @click="openEditForm(a)"
                >
                  <td>{{ a.name }}</td>
                  <td>{{ currentBalanceCell(a) }}</td>
                  <td>{{ statementBalanceCell(a) }}</td>
                  <td :class="paymentDueUrgencyClass(a)">{{ dueCell(a, isNarrowViewport) }}</td>
                  <td>{{ closingCell(a, isNarrowViewport) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="text-muted">No credit accounts.</p>
        </section>

        <section class="mb-4">
          <h2 class="h4">Checking &amp; cash</h2>
          <div v-if="checkingAndCashAccounts.length" class="table-responsive account-compact-table-wrap">
            <table class="table table-striped table-sm table-hover align-middle text-center">
              <thead>
                <tr>
                  <th
                    scope="col"
                    :aria-sort="ariaSortFor(checkingSort.key, 'name', checkingSort.dir)"
                  >
                    <button type="button" class="sortable-th" @click="toggleCheckingSort('name')">
                      Name
                      <span v-if="checkingSort.key === 'name'" class="sort-indicator" aria-hidden="true">
                        {{ checkingSort.dir === 'asc' ? '▲' : '▼' }}
                      </span>
                    </button>
                  </th>
                  <th
                    scope="col"
                    :aria-sort="ariaSortFor(checkingSort.key, 'currentBalance', checkingSort.dir)"
                  >
                    <button type="button" class="sortable-th" @click="toggleCheckingSort('currentBalance')">
                      Current
                      <span v-if="checkingSort.key === 'currentBalance'" class="sort-indicator" aria-hidden="true">
                        {{ checkingSort.dir === 'asc' ? '▲' : '▼' }}
                      </span>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="a in sortedCheckingAndCashAccounts"
                  :key="a.id"
                  class="account-table-row"
                  :class="{ 'table-active': selectedAccountId === a.id }"
                  title="Click to edit"
                  @click="openEditForm(a)"
                >
                  <td>{{ a.name }}</td>
                  <td>{{ currentBalanceCell(a) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="text-muted">No checking or cash accounts.</p>
        </section>

        <section class="mb-4">
          <h2 class="h4">Savings</h2>
          <div v-if="savingsAccounts.length" class="table-responsive account-compact-table-wrap">
            <table class="table table-striped table-sm table-hover align-middle text-center">
              <thead>
                <tr>
                  <th
                    scope="col"
                    :aria-sort="ariaSortFor(savingsSort.key, 'name', savingsSort.dir)"
                  >
                    <button type="button" class="sortable-th" @click="toggleSavingsSort('name')">
                      Name
                      <span v-if="savingsSort.key === 'name'" class="sort-indicator" aria-hidden="true">
                        {{ savingsSort.dir === 'asc' ? '▲' : '▼' }}
                      </span>
                    </button>
                  </th>
                  <th
                    scope="col"
                    :aria-sort="ariaSortFor(savingsSort.key, 'currentBalance', savingsSort.dir)"
                  >
                    <button type="button" class="sortable-th" @click="toggleSavingsSort('currentBalance')">
                      Current
                      <span v-if="savingsSort.key === 'currentBalance'" class="sort-indicator" aria-hidden="true">
                        {{ savingsSort.dir === 'asc' ? '▲' : '▼' }}
                      </span>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="a in sortedSavingsAccounts"
                  :key="a.id"
                  class="account-table-row"
                  :class="{ 'table-active': selectedAccountId === a.id }"
                  title="Click to edit"
                  @click="openEditForm(a)"
                >
                  <td>{{ a.name }}</td>
                  <td>{{ currentBalanceCell(a) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="text-muted">No savings accounts.</p>
        </section>
      </template>

      <section
        v-if="showForm"
        id="account-form"
        class="card border mb-4"
      >
        <div class="card-body">
          <h2 class="h5 card-title">{{ editingAccountId ? 'Edit account' : 'New account' }}</h2>
          <BForm @submit.prevent="submitAccount" class="account-form">
            <BFormGroup label="Name" label-for="acc-name" class="mb-3">
              <BFormInput id="acc-name" v-model="form.name" required />
            </BFormGroup>
            <BFormGroup label="Type" label-for="acc-type" class="mb-3">
              <select
                id="acc-type"
                v-model="form.type"
                class="form-select"
                :disabled="!!editingAccountId"
                required
              >
                <option value="CREDIT">Credit</option>
                <option value="CHECKING">Checking</option>
                <option value="CASH">Cash</option>
                <option value="SAVINGS">Savings</option>
              </select>
            </BFormGroup>
            <BFormGroup label="Currency (3 letters)" label-for="acc-currency" class="mb-3">
              <BFormInput id="acc-currency" v-model="form.currency" maxlength="3" required />
            </BFormGroup>
            <BFormGroup label="Current balance *" label-for="acc-balance" class="mb-3">
              <input
                id="acc-balance"
                v-model.number="form.currentBalance"
                type="number"
                step="0.01"
                required
                class="form-control"
              />
            </BFormGroup>
            <BFormGroup
              v-if="form.type === 'CREDIT'"
              label="Statement balance (optional)"
              label-for="acc-statement"
              class="mb-3"
            >
              <input
                id="acc-statement"
                v-model.number="form.statementBalance"
                type="number"
                step="0.01"
                class="form-control"
              />
            </BFormGroup>
            <BFormGroup
              v-if="form.type === 'CREDIT'"
              label="Credit limit *"
              label-for="acc-limit"
              class="mb-3"
            >
              <input
                id="acc-limit"
                v-model.number="form.creditLimit"
                type="number"
                step="0.01"
                required
                class="form-control"
              />
            </BFormGroup>
            <BFormGroup
              v-if="form.type === 'CREDIT'"
              label="Payment due date (day 1–31) *"
              label-for="acc-due"
              class="mb-3"
            >
              <input
                id="acc-due"
                v-model.number="form.paymentDueDay"
                type="number"
                min="1"
                max="31"
                required
                placeholder="e.g. 15"
                class="form-control"
              />
            </BFormGroup>
            <BFormGroup
              v-if="form.type === 'CREDIT'"
              label="Closing day (1–31) *"
              label-for="acc-closing"
              class="mb-3"
            >
              <input
                id="acc-closing"
                v-model.number="form.closingDay"
                type="number"
                min="1"
                max="31"
                required
                class="form-control"
              />
            </BFormGroup>
            <div class="d-flex justify-content-between align-items-center gap-2 account-form-actions">
              <div class="d-flex gap-2">
                <BButton type="submit" variant="primary" :disabled="submitting || deleting">
                  {{ submitting ? 'Saving…' : 'Save' }}
                </BButton>
                <BButton
                  type="button"
                  variant="outline-secondary"
                  :disabled="submitting || deleting"
                  @click="closeAccountForm"
                >
                  Cancel
                </BButton>
              </div>
              <BButton
                v-if="editingAccountId"
                type="button"
                variant="outline-danger"
                :disabled="submitting || deleting"
                @click="openDeleteAccountModal"
              >
                Delete
              </BButton>
            </div>
          </BForm>
        </div>
      </section>
    </template>

    <BModal
      id="account-delete-modal"
      v-model="showDeleteModal"
      title="Confirm Deletion"
      centered
      header-bg-variant="danger"
      header-text-variant="white"
      header-close-class="btn-close-white"
    >
      <p class="mb-0">
        Are you sure you want to delete this account? This action cannot be undone.
      </p>
      <template #footer="{ hide }">
        <BButton variant="secondary" :disabled="deleting" @click="hide('cancel')">
          Cancel
        </BButton>
        <BButton variant="danger" :disabled="deleting" @click="confirmDeleteAccount(hide)">
          {{ deleting ? 'Deleting…' : 'Delete' }}
        </BButton>
      </template>
    </BModal>
  </div>
</template>

<style scoped>
.accounts-page {
  width: 100%;
}
.account-form {
  max-width: 28rem;
}
.sortable-th {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  width: 100%;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  text-align: center;
  color: inherit;
  cursor: pointer;
  user-select: none;
}
.sortable-th:hover {
  text-decoration: underline;
}
.sort-indicator {
  font-size: 0.65em;
  opacity: 0.85;
}
.account-table-row {
  cursor: pointer;
}
.account-compact-table-wrap {
  max-width: min(28rem, 100%);
}
</style>
