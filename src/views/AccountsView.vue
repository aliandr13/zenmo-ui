<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { listAccounts, createAccount, deleteAccount } from '@/api/accounts'
import type { AccountResponse, AccountType } from '@/types/api'
import {
  closingCell,
  currentBalanceCell,
  dueCell,
  limitCell,
  statementBalanceCell,
  typeLabel,
} from '@/composables/useAccountTableFormatters'
import { BAlert, BButton, BForm, BFormGroup, BFormInput } from 'bootstrap-vue-next'

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

async function openAddForm() {
  showForm.value = true
  await nextTick()
  document.getElementById('account-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

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

async function removeAccount(id: string) {
  if (!confirm('Delete this account?')) return
  deleteId.value = id
  error.value = ''
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
  <div class="accounts-page">
    <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pb-2 mb-3 border-bottom gap-2">
      <h1 class="h2 mb-0">Accounts</h1>
      <BButton variant="primary" @click="openAddForm">Add account</BButton>
    </div>

    <BAlert v-if="error" variant="danger" class="mb-3" show>{{ error }}</BAlert>

    <template v-if="loading">
      <p class="text-muted">Loading…</p>
    </template>
    <template v-else>
      <section class="mb-4">
        <h2 class="h4">All accounts</h2>
        <div v-if="accounts.length" class="table-responsive">
          <table class="table table-striped table-sm table-hover align-middle">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Type</th>
                <th scope="col" class="text-end">Current balance</th>
                <th scope="col" class="text-end">Statement balance</th>
                <th scope="col" class="text-end">Limit</th>
                <th scope="col">Payment due date</th>
                <th scope="col">Next closing date</th>
                <th scope="col" class="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in accounts" :key="a.id">
                <td>{{ a.name }}</td>
                <td>{{ typeLabel(a.type) }}</td>
                <td class="text-end">{{ currentBalanceCell(a) }}</td>
                <td class="text-end">{{ statementBalanceCell(a) }}</td>
                <td class="text-end">{{ limitCell(a) }}</td>
                <td>{{ dueCell(a) }}</td>
                <td>{{ closingCell(a) }}</td>
                <td class="text-end text-nowrap">
                  <BButton
                    variant="outline-secondary"
                    size="sm"
                    class="me-1"
                    @click="openAddForm"
                  >
                    Edit
                  </BButton>
                  <BButton
                    variant="outline-danger"
                    size="sm"
                    :disabled="deleteId === a.id"
                    @click="removeAccount(a.id)"
                  >
                    {{ deleteId === a.id ? '…' : 'Delete' }}
                  </BButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="text-muted">No accounts.</p>
      </section>

      <section
        v-if="showForm"
        id="account-form"
        class="card border mb-4"
      >
        <div class="card-body">
          <h2 class="h5 card-title">New account</h2>
          <BForm @submit.prevent="submitAccount" class="account-form">
            <BFormGroup label="Name" label-for="acc-name" class="mb-3">
              <BFormInput id="acc-name" v-model="form.name" required />
            </BFormGroup>
            <BFormGroup label="Type" label-for="acc-type" class="mb-3">
              <select id="acc-type" v-model="form.type" class="form-select" required>
                <option value="CHECKING">Checking</option>
                <option value="CASH">Cash</option>
                <option value="CREDIT_CARD">Credit card</option>
              </select>
            </BFormGroup>
            <BFormGroup label="Currency (3 letters)" label-for="acc-currency" class="mb-3">
              <BFormInput id="acc-currency" v-model="form.currency" maxlength="3" required />
            </BFormGroup>
            <BFormGroup
              v-if="form.type === 'CREDIT_CARD'"
              label="Credit limit (optional)"
              label-for="acc-limit"
              class="mb-3"
            >
              <input
                id="acc-limit"
                v-model.number="form.creditLimit"
                type="number"
                step="0.01"
                class="form-control"
              />
            </BFormGroup>
            <BFormGroup
              v-if="form.type === 'CREDIT_CARD'"
              label="Payment due day (1–31, optional)"
              label-for="acc-due"
              class="mb-3"
            >
              <input
                id="acc-due"
                v-model.number="form.paymentDueDay"
                type="number"
                min="1"
                max="31"
                placeholder="e.g. 15"
                class="form-control"
              />
            </BFormGroup>
            <BFormGroup
              v-if="form.type === 'CREDIT_CARD'"
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
            <div class="d-flex gap-2">
              <BButton type="submit" variant="primary" :disabled="submitting">
                {{ submitting ? 'Saving…' : 'Save' }}
              </BButton>
              <BButton type="button" variant="outline-secondary" @click="showForm = false">
                Cancel
              </BButton>
            </div>
          </BForm>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.accounts-page {
  width: 100%;
}
.account-form {
  max-width: 28rem;
}
</style>
