<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listAccounts, createAccount, deleteAccount } from '@/api/accounts'
import type { AccountResponse, AccountType } from '@/types/api'

const accounts = ref<AccountResponse[]>([])
const loading = ref(true)
const error = ref('')
const showForm = ref(false)
const form = ref({
  name: '',
  type: 'CHECKING' as AccountType,
  currency: 'USD',
  creditLimit: undefined as number | undefined,
  paymentDueDay: undefined as number | undefined,
  closingDay: 1,
})
const submitting = ref(false)
const deleteId = ref<string | null>(null)

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

async function submitAccount() {
  if (form.value.type === 'CREDIT_CARD') {
    const d = form.value.closingDay
    if (d == null || d < 1 || d > 31) {
      error.value = 'Closing day must be between 1 and 31'
      return
    }
  }
  submitting.value = true
  error.value = ''
  try {
    await createAccount({
      name: form.value.name,
      type: form.value.type,
      currency: form.value.currency,
      creditLimit: form.value.creditLimit,
      paymentDueDay: form.value.type === 'CREDIT_CARD' ? form.value.paymentDueDay : undefined,
      closingDay: form.value.closingDay ?? 1,
    })
    form.value = { name: '', type: 'CHECKING', currency: 'USD', creditLimit: undefined, paymentDueDay: undefined, closingDay: 1 }
    showForm.value = false
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to create'
  } finally {
    submitting.value = false
  }
}

async function remove(id: string) {
  if (!confirm('Delete this account?')) return
  deleteId.value = id
  try {
    await deleteAccount(id)
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete'
  } finally {
    deleteId.value = null
  }
}
</script>

<template>
  <div class="accounts">
    <h1>Accounts</h1>
    <p v-if="error" class="error">{{ error }}</p>
    <button type="button" class="btn" @click="showForm = true">Add account</button>

    <form v-if="showForm" @submit.prevent="submitAccount" class="form">
      <div class="field">
        <label>Name</label>
        <input v-model="form.name" required />
      </div>
      <div class="field">
        <label>Type</label>
        <select v-model="form.type">
          <option value="CHECKING">Checking</option>
          <option value="CASH">Cash</option>
          <option value="CREDIT_CARD">Credit card</option>
        </select>
      </div>
      <div class="field">
        <label>Currency (3 letters)</label>
        <input v-model="form.currency" maxlength="3" required />
      </div>
      <div class="field" v-if="form.type === 'CREDIT_CARD'">
        <label>Credit limit (optional)</label>
        <input v-model.number="form.creditLimit" type="number" step="0.01" />
      </div>
      <div class="field" v-if="form.type === 'CREDIT_CARD'">
        <label>Payment due day (1–31, optional)</label>
        <input v-model.number="form.paymentDueDay" type="number" min="1" max="31" placeholder="e.g. 15" />
      </div>
      <div class="field" v-if="form.type === 'CREDIT_CARD'">
        <label>Closing day (1–31) *</label>
        <input v-model.number="form.closingDay" type="number" min="1" max="31" required />
      </div>
      <div class="actions">
        <button type="submit" :disabled="submitting">{{ submitting ? 'Saving…' : 'Save' }}</button>
        <button type="button" @click="showForm = false">Cancel</button>
      </div>
    </form>

    <ul v-if="accounts.length" class="list">
      <li v-for="a in accounts" :key="a.id" class="row">
        <span>
          <strong>{{ a.name }}</strong> — {{ a.type }} — {{ a.currency }}<template v-if="a.creditLimit != null"> — limit {{ a.creditLimit }}</template><template v-if="a.type === 'CREDIT_CARD' && (a.paymentDueDay != null || a.closingDay != null)"> — </template><template v-if="a.type === 'CREDIT_CARD' && a.paymentDueDay != null">due day {{ a.paymentDueDay }}</template><template v-if="a.type === 'CREDIT_CARD' && a.paymentDueDay != null && a.closingDay != null">, </template><template v-if="a.type === 'CREDIT_CARD' && a.closingDay != null">closes day {{ a.closingDay }}</template>
        </span>
        <button type="button" class="btn-sm danger" :disabled="deleteId === a.id" @click="remove(a.id)">{{ deleteId === a.id ? '…' : 'Delete' }}</button>
      </li>
    </ul>
    <p v-else-if="!loading">No accounts.</p>
    <p v-else>Loading…</p>
  </div>
</template>

<style scoped>
.accounts h1 {
  margin-bottom: 1rem;
}
.btn {
  padding: 0.5rem 1rem;
  background: #1a1a2e;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 1rem;
}
.form {
  max-width: 400px;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #ddd;
}
.field {
  margin-bottom: 0.75rem;
}
.field label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 500;
}
.field input,
.field select {
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
.error {
  color: #c00;
  margin-bottom: 0.5rem;
}
</style>
