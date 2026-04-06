<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { listAccounts, deleteAccount } from '@/api/accounts'
import { listTransactions } from '@/api/transactions'
import type { AccountResponse, TxnResponse } from '@/types/api'
import {
  closingCell,
  currentBalanceCell,
  dueCell,
  limitCell,
  statementBalanceCell,
  typeLabel,
} from '@/composables/useAccountTableFormatters'
import { BAlert, BButton } from 'bootstrap-vue-next'

const accounts = ref<AccountResponse[]>([])
const recentTxns = ref<TxnResponse[]>([])
const loading = ref(true)
const error = ref('')
const deleteId = ref<string | null>(null)

async function removeAccount(id: string) {
  if (!confirm('Delete this account?')) return
  deleteId.value = id
  error.value = ''
  try {
    await deleteAccount(id)
    accounts.value = accounts.value.filter((x) => x.id !== id)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete'
  } finally {
    deleteId.value = null
  }
}

onMounted(async () => {
  try {
    const [accs, page] = await Promise.all([
      listAccounts(),
      listTransactions({ page: 0, size: 10 }),
    ])
    accounts.value = accs
    recentTxns.value = page.content
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="dashboard">
    <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pb-2 mb-3 border-bottom">
      <h1 class="h2">Dashboard</h1>
    </div>

    <BAlert v-if="error" :model-value="true" variant="danger" class="mb-3">{{ error }}</BAlert>

    <template v-if="loading">
      <p class="text-muted">Loading…</p>
    </template>
    <template v-else>
      <section class="mb-4">
        <h2 class="h4">Accounts</h2>
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
                  <RouterLink
                    :to="{ name: 'Accounts' }"
                    class="btn btn-sm btn-outline-secondary me-1"
                  >
                    Edit
                  </RouterLink>
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
        <p v-else class="text-muted">
          No accounts yet.
          <RouterLink to="/accounts" class="link-secondary">Add one</RouterLink>.
        </p>
      </section>

      <section>
        <h2 class="h4">Recent transactions</h2>
        <ul v-if="recentTxns.length" class="list-unstyled mb-0">
          <li
            v-for="t in recentTxns"
            :key="t.id"
            class="py-2 border-bottom"
          >
            {{ t.transactionDate }} — {{ t.description }} — {{ t.amount }} {{ t.currency }}
          </li>
        </ul>
        <p v-else class="text-muted">
          No transactions.
          <RouterLink to="/transactions" class="link-secondary">Add one</RouterLink>.
        </p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.dashboard {
  width: 100%;
}
</style>
