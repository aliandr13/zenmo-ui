<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listCategories, createCategory, deleteCategory } from '@/api/categories'
import type { CategoryResponse } from '@/types/api'

const categories = ref<CategoryResponse[]>([])
const loading = ref(true)
const error = ref('')
const showForm = ref(false)
const form = ref({ name: '', color: '' })
const submitting = ref(false)
const deleteId = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    categories.value = await listCategories()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load'
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function submitCategory() {
  submitting.value = true
  error.value = ''
  try {
    await createCategory({
      name: form.value.name,
      color: form.value.color || undefined,
    })
    form.value = { name: '', color: '' }
    showForm.value = false
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to create'
  } finally {
    submitting.value = false
  }
}

async function remove(id: string) {
  if (!confirm('Delete this category?')) return
  deleteId.value = id
  try {
    await deleteCategory(id)
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete'
  } finally {
    deleteId.value = null
  }
}
</script>

<template>
  <div class="categories">
    <h1>Categories</h1>
    <p v-if="error" class="error">{{ error }}</p>
    <button type="button" class="btn" @click="showForm = true">Add category</button>

    <form v-if="showForm" @submit.prevent="submitCategory" class="form">
      <div class="field">
        <label>Name *</label>
        <input v-model="form.name" required />
      </div>
      <div class="field">
        <label>Color (optional)</label>
        <input v-model="form.color" placeholder="e.g. #ff0000" />
      </div>
      <div class="actions">
        <button type="submit" :disabled="submitting">{{ submitting ? 'Saving…' : 'Save' }}</button>
        <button type="button" @click="showForm = false">Cancel</button>
      </div>
    </form>

    <ul v-if="categories.length" class="list">
      <li v-for="c in categories" :key="c.id" class="row">
        <span>
          <strong>{{ c.name }}</strong>
          <span v-if="c.color" class="color" :style="{ background: c.color }" />
        </span>
        <button type="button" class="btn-sm danger" :disabled="deleteId === c.id" @click="remove(c.id)">{{ deleteId === c.id ? '…' : 'Delete' }}</button>
      </li>
    </ul>
    <p v-else-if="!loading">No categories.</p>
    <p v-else>Loading…</p>
  </div>
</template>

<style scoped>
.categories h1 {
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
.field input {
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
.color {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  margin-left: 0.5rem;
  border-radius: 2px;
  vertical-align: middle;
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
