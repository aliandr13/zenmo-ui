<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { listTransactions, createTransaction, deleteTransaction } from '@/api/transactions'
import { listAccounts } from '@/api/accounts'
import { listCategories } from '@/api/categories'
import type { TxnResponse, TxnStatus } from '@/types/api'
import type { AccountResponse, CategoryResponse } from '@/types/api'

const accounts = ref<AccountResponse[]>([])
const categories = ref<CategoryResponse[]>([])
const page = ref<{ content: TxnResponse[]; totalElements: number; number: number; totalPages: number } | null>(null)
const loading = ref(true)
const error = ref('')
const filters = ref({ accountId: '', fromDate: '', toDate: '' })
const currentPage = ref(0)
const pageSize = 20
const showForm = ref(false)
const form = ref({
  accountId: '',
  categoryId: '',
  transactionDate: new Date().toISOString().slice(0, 10),
  amount: 0,
  currency: 'USD',
  description: '',
  status: 'POSTED' as TxnStatus,
  merchant: '',
  notes: '',
})
const submitting = ref(false)
const deleteId = ref<string | null>(null)

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

async function submitTxn() {
  if (!form.value.accountId) {
    error.value = 'Select an account'
    return
  }
  submitting.value = true
  error.value = ''
  try {
    await createTransaction({
      accountId: form.value.accountId,
      categoryId: form.value.categoryId || undefined,
      transactionDate: form.value.transactionDate,
      amount: form.value.amount,
      currency: form.value.currency,
      description: form.value.description,
      status: form.value.status,
      merchant: form.value.merchant || undefined,
      notes: form.value.notes || undefined,
    })
    form.value = {
      accountId: form.value.accountId,
      categoryId: '',
      transactionDate: new Date().toISOString().slice(0, 10),
      amount: 0,
      currency: 'USD',
      description: '',
      status: 'POSTED',
      merchant: '',
      notes: '',
    }
    showForm.value = false
    await loadTxns()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to create'
  } finally {
    submitting.value = false
  }
}

async function remove(id: string) {
  if (!confirm('Delete this transaction?')) return
  deleteId.value = id
  try {
    await deleteTransaction(id)
    await loadTxns()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete'
  } finally {
    deleteId.value = null
  }
}
</script>

<template>
  <div class="transactions">
    <h1>Transactions</h1>
    <p v-if="error" class="error">{{ error }}</p>
    <div class="toolbar">
      <div class="filters">
        <select v-model="filters.accountId">
          <option value="">All accounts</option>
          <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.name }}</option>
        </select>
        <input v-model="filters.fromDate" type="date" placeholder="From" />
        <input v-model="filters.toDate" type="date" placeholder="To" />
      </div>
      <button type="button" class="btn" @click="showForm = true">Add transaction</button>
    </div>

    <form v-if="showForm" @submit.prevent="submitTxn" class="form">
      <div class="field">
        <label>Account *</label>
        <select v-model="form.accountId" required>
          <option value="">Select</option>
          <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.name }}</option>
        </select>
      </div>
      <div class="field">
        <label>Category</label>
        <select v-model="form.categoryId">
          <option value="">None</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
      <div class="field">
        <label>Date *</label>
        <input v-model="form.transactionDate" type="date" required />
      </div>
      <div class="field">
        <label>Amount *</label>
        <input v-model.number="form.amount" type="number" step="0.01" required />
      </div>
      <div class="field">
        <label>Currency *</label>
        <input v-model="form.currency" maxlength="3" required />
      </div>
      <div class="field">
        <label>Description *</label>
        <input v-model="form.description" required />
      </div>
      <div class="field">
        <label>Status</label>
        <select v-model="form.status">
          <option value="PENDING">Pending</option>
          <option value="POSTED">Posted</option>
        </select>
      </div>
      <div class="field">
        <label>Merchant</label>
        <input v-model="form.merchant" />
      </div>
      <div class="field">
        <label>Notes</label>
        <input v-model="form.notes" />
      </div>
      <div class="actions">
        <button type="submit" :disabled="submitting">{{ submitting ? 'Saving…' : 'Save' }}</button>
        <button type="button" @click="showForm = false">Cancel</button>
      </div>
    </form>

    <div v-if="page" class="list-wrap">
      <ul v-if="page.content.length" class="list">
        <li v-for="t in page.content" :key="t.id" class="row">
          <span>{{ t.transactionDate }} — {{ t.description }} — {{ t.amount }} {{ t.currency }} ({{ t.status }})</span>
          <button type="button" class="btn-sm danger" :disabled="deleteId === t.id" @click="remove(t.id)">{{ deleteId === t.id ? '…' : 'Delete' }}</button>
        </li>
      </ul>
      <p v-else>No transactions.</p>
      <div v-if="page.totalPages > 1" class="pagination">
        <button type="button" :disabled="currentPage === 0" @click="currentPage--">Prev</button>
        <span>Page {{ currentPage + 1 }} of {{ page.totalPages }}</span>
        <button type="button" :disabled="currentPage >= page.totalPages - 1" @click="currentPage++">Next</button>
      </div>
    </div>
    <p v-else-if="!loading">No data.</p>
    <p v-else>Loading…</p>
  </div>
</template>

<style scoped>
.transactions h1 {
  margin-bottom: 1rem;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}
.filters {
  display: flex;
  gap: 0.5rem;
}
.filters select,
.filters input {
  padding: 0.35rem 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.btn {
  padding: 0.5rem 1rem;
  background: #1a1a2e;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.form {
  max-width: 400px;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #ddd;
}
.form .field {
  margin-bottom: 0.75rem;
}
.form label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 500;
}
.form input,
.form select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}
.actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}
.list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #eee;
}
.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid #ccc;
  background: #fff;
}
.btn-sm.danger {
  border-color: #c00;
  color: #c00;
}
.pagination {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
}
.error {
  color: #c00;
  margin-bottom: 0.5rem;
}
</style>
