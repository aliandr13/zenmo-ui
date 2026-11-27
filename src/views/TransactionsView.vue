<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { listTransactions, createTransaction, deleteTransaction } from '@/api/transactions'
import { listAccounts } from '@/api/accounts'
import { listCategories } from '@/api/categories'
import type { TxnResponse, TxnStatus } from '@/types/api'
import type { AccountResponse, CategoryResponse } from '@/types/api'
import { formatMoney } from '@/composables/useAccountTableFormatters'
import {
  BAlert,
  BButton,
  BForm,
  BFormGroup,
  BFormInput,
  BModal,
} from 'bootstrap-vue-next'

type TxnKind = 'EXPENSE' | 'INCOME'

/** Today's date in the user's local timezone, as `YYYY-MM-DD` (`toISOString()` would give the UTC date). */
function localToday(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

function newTxnForm() {
  return {
    accountId: '',
    categoryId: '',
    transactionDate: localToday(),
    kind: 'EXPENSE' as TxnKind,
    /** Entered as a positive number; the sign comes from `kind`. */
    amount: 0,
    description: '',
    status: 'POSTED' as TxnStatus,
    merchant: '',
  }
}

const accounts = ref<AccountResponse[]>([])
const categories = ref<CategoryResponse[]>([])
const page = ref<{ content: TxnResponse[]; totalElements: number; number: number; totalPages: number } | null>(null)
const loading = ref(true)
const error = ref('')
const filters = ref({ accountId: '', fromDate: '', toDate: '' })
const currentPage = ref(0)
const pageSize = 20
const showForm = ref(false)
const form = ref(newTxnForm())
const submitting = ref(false)
const deleting = ref(false)
const showDeleteModal = ref(false)
const pendingDeleteId = ref<string | null>(null)

/** Transactions always use the selected account's currency (the API rejects a mismatch). */
const formCurrency = computed(
  () => accounts.value.find((a) => a.id === form.value.accountId)?.currency ?? '',
)

async function loadAccountsAndCategories() {
  try {
    const [a, c] = await Promise.all([listAccounts(), listCategories()])
    accounts.value = a
    categories.value = c
  } catch {
    /* ignore */
  }
}

async function loadTxns() {
  loading.value = true
  error.value = ''
  try {
    page.value = await listTransactions({
      accountId: filters.value.accountId || undefined,
      fromDate: filters.value.fromDate || undefined,
      toDate: filters.value.toDate || undefined,
      page: currentPage.value,
      size: pageSize,
    })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadAccountsAndCategories()
  loadTxns()
})

watch([filters, currentPage], () => loadTxns(), { deep: true })

async function openAddForm() {
  error.value = ''
  form.value = newTxnForm()
  showForm.value = true
  await nextTick()
  document.getElementById('transaction-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function closeTxnForm() {
  showForm.value = false
}

async function submitTxn() {
  if (!form.value.accountId) {
    error.value = 'Select an account'
    return
  }
  const magnitude = Math.abs(Number(form.value.amount) || 0)
  if (magnitude === 0) {
    error.value = 'Amount must be greater than 0'
    return
  }
  submitting.value = true
  error.value = ''
  try {
    await createTransaction({
      accountId: form.value.accountId,
      categoryId: form.value.categoryId || undefined,
      transactionDate: form.value.transactionDate,
      amount: form.value.kind === 'EXPENSE' ? -magnitude : magnitude,
      currency: formCurrency.value,
      description: form.value.description.trim() || undefined,
      status: form.value.status,
      merchant: form.value.merchant || undefined,
    })
    const keepAccountId = form.value.accountId
    form.value = newTxnForm()
    form.value.accountId = keepAccountId
    showForm.value = false
    await loadTxns()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to create'
  } finally {
    submitting.value = false
  }
}

function openDeleteModal(id: string) {
  pendingDeleteId.value = id
  showDeleteModal.value = true
}

async function confirmDelete(hide: (trigger?: string) => void) {
  const id = pendingDeleteId.value
  if (!id) {
    hide('cancel')
    return
  }
  deleting.value = true
  error.value = ''
  try {
    await deleteTransaction(id)
    hide('ok')
    pendingDeleteId.value = null
    await loadTxns()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="transactions-page">
    <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pb-2 mb-3 border-bottom gap-2">
      <h1 class="h2 mb-0">Transactions</h1>
      <BButton variant="primary" @click="openAddForm">Add transaction</BButton>
    </div>

    <BAlert v-if="error" :model-value="true" variant="danger" class="mb-3">{{ error }}</BAlert>

    <div class="d-flex justify-content-between flex-wrap align-items-center gap-2 mb-3 transactions-toolbar">
      <div class="d-flex flex-wrap align-items-center gap-2">
        <label class="col-form-label fw-semibold mb-0 me-1">Filter:</label>
        <select
          v-model="filters.accountId"
          class="form-select form-select-sm w-auto"
          aria-label="Filter by account"
        >
          <option value="">All accounts</option>
          <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.name }}</option>
        </select>
        <input
          v-model="filters.fromDate"
          type="date"
          class="form-control form-control-sm w-auto"
          aria-label="From date"
        />
        <input
          v-model="filters.toDate"
          type="date"
          class="form-control form-control-sm w-auto"
          aria-label="To date"
        />
      </div>
    </div>

    <template v-if="loading && !page">
      <p class="text-muted">Loading…</p>
    </template>
    <template v-else>
      <section class="mb-4">
        <div v-if="page && page.content.length" class="table-responsive">
          <table class="table table-striped table-sm table-hover align-middle">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Description</th>
                <th scope="col">Merchant</th>
                <th scope="col" class="text-end">Amount</th>
                <th scope="col">Status</th>
                <th scope="col" class="text-end"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in page.content" :key="t.id">
                <td>{{ t.transactionDate }}</td>
                <td>{{ t.description || '—' }}</td>
                <td>{{ t.merchant || '—' }}</td>
                <td class="text-end">{{ formatMoney(t.amount, t.currency) }}</td>
                <td>
                  <span
                    class="badge"
                    :class="t.status === 'POSTED' ? 'text-bg-success' : 'text-bg-warning'"
                  >
                    {{ t.status }}
                  </span>
                </td>
                <td class="text-end">
                  <BButton
                    type="button"
                    size="sm"
                    variant="outline-danger"
                    :disabled="deleting && pendingDeleteId === t.id"
                    @click="openDeleteModal(t.id)"
                  >
                    Delete
                  </BButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="text-muted">No transactions.</p>

        <nav
          v-if="page && page.totalPages > 1"
          class="d-flex align-items-center justify-content-between mt-3"
          aria-label="Transactions pagination"
        >
          <BButton
            type="button"
            size="sm"
            variant="outline-secondary"
            :disabled="currentPage === 0"
            @click="currentPage--"
          >
            Previous
          </BButton>
          <span class="text-muted small">Page {{ currentPage + 1 }} of {{ page.totalPages }}</span>
          <BButton
            type="button"
            size="sm"
            variant="outline-secondary"
            :disabled="currentPage >= page.totalPages - 1"
            @click="currentPage++"
          >
            Next
          </BButton>
        </nav>
      </section>

      <section
        v-if="showForm"
        id="transaction-form"
        class="card border mb-4"
      >
        <div class="card-body">
          <h2 class="h5 card-title">New transaction</h2>
          <BForm @submit.prevent="submitTxn" class="transaction-form">
            <BFormGroup label="Account *" label-for="txn-account" class="mb-3">
              <select id="txn-account" v-model="form.accountId" class="form-select" required>
                <option value="">Select</option>
                <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.name }}</option>
              </select>
            </BFormGroup>
            <BFormGroup label="Category" label-for="txn-category" class="mb-3">
              <select id="txn-category" v-model="form.categoryId" class="form-select">
                <option value="">None</option>
                <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </BFormGroup>
            <BFormGroup label="Date *" label-for="txn-date" class="mb-3">
              <input
                id="txn-date"
                v-model="form.transactionDate"
                type="date"
                required
                class="form-control"
              />
            </BFormGroup>
            <BFormGroup label="Type" class="mb-3">
              <div class="btn-group w-100" role="group" aria-label="Transaction type">
                <input
                  id="txn-kind-expense"
                  v-model="form.kind"
                  type="radio"
                  class="btn-check"
                  value="EXPENSE"
                  autocomplete="off"
                />
                <label class="btn btn-outline-danger" for="txn-kind-expense">Expense</label>
                <input
                  id="txn-kind-income"
                  v-model="form.kind"
                  type="radio"
                  class="btn-check"
                  value="INCOME"
                  autocomplete="off"
                />
                <label class="btn btn-outline-success" for="txn-kind-income">Income / refund</label>
              </div>
            </BFormGroup>
            <BFormGroup
              label="Amount *"
              label-for="txn-amount"
              class="mb-3"
              :description="
                form.kind === 'EXPENSE'
                  ? 'Decreases the account balance when posted.'
                  : 'Increases the account balance when posted.'
              "
            >
              <div class="input-group">
                <input
                  id="txn-amount"
                  v-model.number="form.amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  class="form-control"
                />
                <span v-if="formCurrency" class="input-group-text">{{ formCurrency }}</span>
              </div>
            </BFormGroup>
            <BFormGroup label="Description" label-for="txn-description" class="mb-3">
              <BFormInput id="txn-description" v-model="form.description" />
            </BFormGroup>
            <BFormGroup label="Status" label-for="txn-status" class="mb-3">
              <select id="txn-status" v-model="form.status" class="form-select">
                <option value="PENDING">Pending</option>
                <option value="POSTED">Posted</option>
              </select>
              <div class="form-text">Only posted transactions change the account balance.</div>
            </BFormGroup>
            <BFormGroup label="Merchant" label-for="txn-merchant" class="mb-3">
              <BFormInput id="txn-merchant" v-model="form.merchant" />
            </BFormGroup>
            <div class="d-flex gap-2 transaction-form-actions">
              <BButton type="submit" variant="primary" :disabled="submitting">
                {{ submitting ? 'Saving…' : 'Save' }}
              </BButton>
              <BButton
                type="button"
                variant="outline-secondary"
                :disabled="submitting"
                @click="closeTxnForm"
              >
                Cancel
              </BButton>
            </div>
          </BForm>
        </div>
      </section>
    </template>

    <BModal
      id="transaction-delete-modal"
      v-model="showDeleteModal"
      title="Confirm Deletion"
      centered
      header-bg-variant="danger"
      header-text-variant="white"
      header-close-class="btn-close-white"
    >
      <p class="mb-0">
        Are you sure you want to delete this transaction? This action cannot be undone.
      </p>
      <template #footer="{ hide }">
        <BButton variant="secondary" :disabled="deleting" @click="hide('cancel')">
          Cancel
        </BButton>
        <BButton variant="danger" :disabled="deleting" @click="confirmDelete(hide)">
          {{ deleting ? 'Deleting…' : 'Delete' }}
        </BButton>
      </template>
    </BModal>
  </div>
</template>

<style scoped>
.transactions-page {
  width: 100%;
}
.transaction-form {
  max-width: 28rem;
}
</style>
