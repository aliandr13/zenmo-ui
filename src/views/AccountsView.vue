<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { listAccounts, createAccount, deleteAccount } from '@/api/accounts'
import type { AccountResponse, AccountType } from '@/types/api'
import {
  closingCell,
  currentBalanceCell,
  dueCell,
  limitCell,
  statementBalanceCell,
} from '@/composables/useAccountTableFormatters'
import { BAlert, BButton, BForm, BFormGroup, BFormInput } from 'bootstrap-vue-next'

function newAccountForm() {
  return {
    name: '',
    type: 'CREDIT' as AccountType,
    currency: 'USD',
    creditLimit: undefined as number | undefined,
    paymentDueDay: undefined as number | undefined,
    closingDay: 1,
    currentBalance: 0,
  }
}

const accounts = ref<AccountResponse[]>([])
const creditAccounts = computed(() => accounts.value.filter((a) => a.type === 'CREDIT'))
const checkingAndCashAccounts = computed(() =>
  accounts.value.filter((a) => a.type === 'CHECKING' || a.type === 'CASH'),
)
const savingsAccounts = computed(() => accounts.value.filter((a) => a.type === 'SAVINGS'))
const loading = ref(true)
const error = ref('')
const showForm = ref(false)
const form = ref(newAccountForm())
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
  form.value = newAccountForm()
  error.value = ''
  showForm.value = true
  await nextTick()
  document.getElementById('account-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
  try {
    await createAccount({
      name: form.value.name,
      type: form.value.type,
      currency: form.value.currency,
      creditLimit: form.value.type === 'CREDIT' ? form.value.creditLimit : undefined,
      paymentDueDay: form.value.type === 'CREDIT' ? form.value.paymentDueDay : undefined,
      closingDay: form.value.closingDay ?? 1,
      currentBalance: bal,
    })
    form.value = newAccountForm()
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
            <table class="table table-striped table-sm table-hover align-middle">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col" class="text-end">Current balance</th>
                  <th scope="col" class="text-end">Statement balance</th>
                  <th scope="col" class="text-end">Limit</th>
                  <th scope="col">Payment due date</th>
                  <th scope="col">Next closing date</th>
                  <th scope="col" class="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="a in creditAccounts" :key="a.id">
                  <td>{{ a.name }}</td>
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
          <p v-else class="text-muted">No credit accounts.</p>
        </section>

        <section class="mb-4">
          <h2 class="h4">Checking &amp; cash</h2>
          <div v-if="checkingAndCashAccounts.length" class="table-responsive">
            <table class="table table-striped table-sm table-hover align-middle">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col" class="text-end">Current balance</th>
                  <th scope="col" class="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="a in checkingAndCashAccounts" :key="a.id">
                  <td>{{ a.name }}</td>
                  <td class="text-end">{{ currentBalanceCell(a) }}</td>
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
          <p v-else class="text-muted">No checking or cash accounts.</p>
        </section>

        <section class="mb-4">
          <h2 class="h4">Savings</h2>
          <div v-if="savingsAccounts.length" class="table-responsive">
            <table class="table table-striped table-sm table-hover align-middle">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col" class="text-end">Current balance</th>
                  <th scope="col" class="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="a in savingsAccounts" :key="a.id">
                  <td>{{ a.name }}</td>
                  <td class="text-end">{{ currentBalanceCell(a) }}</td>
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
          <p v-else class="text-muted">No savings accounts.</p>
        </section>
      </template>

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
