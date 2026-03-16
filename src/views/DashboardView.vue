<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listAccounts } from '@/api/accounts'
import { listTransactions } from '@/api/transactions'
import type { AccountResponse, TxnResponse } from '@/types/api'

const accounts = ref<AccountResponse[]>([])
const recentTxns = ref<TxnResponse[]>([])
const loading = ref(true)
const error = ref('')

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
    <h1>Dashboard</h1>
    <p v-if="error" class="error">{{ error }}</p>
    <template v-else-if="loading">
      <p>Loading…</p>
    </template>
    <template v-else>
      <section class="summary">
        <h2>Accounts</h2>
        <ul v-if="accounts.length" class="account-list">
          <li v-for="a in accounts" :key="a.id">
            <strong>{{ a.name }}</strong> — {{ a.type }} ({{ a.currency }})<template v-if="a.creditLimit != null"> — limit {{ a.creditLimit }}</template><template v-if="a.type === 'CREDIT_CARD' && (a.paymentDueDay != null || a.closingDay != null)"> — </template><template v-if="a.type === 'CREDIT_CARD' && a.paymentDueDay != null">due day {{ a.paymentDueDay }}</template><template v-if="a.type === 'CREDIT_CARD' && a.paymentDueDay != null && a.closingDay != null">, </template><template v-if="a.type === 'CREDIT_CARD' && a.closingDay != null">closes day {{ a.closingDay }}</template>
          </li>
        </ul>
        <p v-else>No accounts yet. <router-link to="/accounts">Add one</router-link>.</p>
      </section>
      <section>
        <h2>Recent transactions</h2>
        <ul v-if="recentTxns.length" class="txn-list">
          <li v-for="t in recentTxns" :key="t.id">
            {{ t.transactionDate }} — {{ t.description }} — {{ t.amount }} {{ t.currency }}
          </li>
        </ul>
        <p v-else>No transactions. <router-link to="/transactions">Add one</router-link>.</p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.dashboard h1 {
  margin-bottom: 1rem;
}
.summary,
section {
  margin-bottom: 1.5rem;
}
.summary h2,
section h2 {
  font-size: 1rem;
  margin-bottom: 0.5rem;
  color: #555;
}
.account-list,
.txn-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.account-list li,
.txn-list li {
  padding: 0.35rem 0;
  border-bottom: 1px solid #eee;
}
.error {
  color: #c00;
}
</style>
