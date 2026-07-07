<script setup lang="ts">
import { ref } from "vue"

import { createPerson, listPersons, removePerson } from "../api/client"
import { useAutoRefresh } from "../composables/useAutoRefresh"
import type { Person } from "../types"

const persons = ref<Person[]>([])
const name = ref("")
const loading = ref(false)
const deletingPersonId = ref<number | null>(null)
const hasLoaded = ref(false)
const refreshing = ref(false)

async function fetchPersons() {
  persons.value = await listPersons()
}

async function addPerson() {
  const cleanName = name.value.trim()

  if (!cleanName) {
    alert("请输入成员名字")
    return
  }

  const exists = persons.value.some((person) => person.name.trim() === cleanName)
  if (exists) {
    alert("该成员已存在，不能重复添加")
    return
  }

  try {
    loading.value = true
    await createPerson(cleanName)
    name.value = ""
    await fetchPersons()
  } catch (error) {
    alert(error instanceof Error ? error.message : "新增成员失败，请稍后再试")
  } finally {
    loading.value = false
  }
}

async function deletePerson(person: Person) {
  const confirmed = window.confirm(`确定删除成员「${person.name}」吗？照片不会被删除。`)
  if (!confirmed) {
    return
  }

  try {
    deletingPersonId.value = person.id
    await removePerson(person.id)
    await fetchPersons()
  } catch (error) {
    alert(error instanceof Error ? error.message : "删除成员失败，请稍后再试")
  } finally {
    deletingPersonId.value = null
  }
}

useAutoRefresh(async () => {
  refreshing.value = true
  try {
    await fetchPersons()
    hasLoaded.value = true
  } finally {
    refreshing.value = false
  }
}, (error) => {
  alert(error instanceof Error ? error.message : "获取成员失败，请稍后再试")
})
</script>

<template>
  <div class="page-stack">
    <section class="hero-card">
      <h1>成员管理</h1>
      <p>维护 RFZ 固定成员。成员名称不能重复。</p>
    </section>

    <section class="panel-card">
      <h2>新增成员</h2>
      <div class="inline-form">
        <input
          v-model="name"
          class="text-input"
          placeholder="输入成员名字"
          @keydown.enter="addPerson"
        />
        <button class="primary-btn" :disabled="loading" @click="addPerson">
          {{ loading ? "添加中..." : "新增成员" }}
        </button>
      </div>
    </section>

    <section class="panel-card">
      <div class="section-title-row">
        <h2>成员列表</h2>
        <span class="badge">{{ persons.length }} 人</span>
      </div>

      <p v-if="!hasLoaded || refreshing && persons.length === 0" class="empty-text">
        正在加载成员...
      </p>

      <p v-else-if="persons.length === 0" class="empty-text">暂无成员。</p>

      <div v-else class="member-grid">
        <div v-for="person in persons" :key="person.id" class="member-card">
          <div class="member-avatar">{{ person.name.slice(0, 1) }}</div>
          <div class="member-info">
            <div class="member-name">{{ person.name }}</div>
            <div class="member-meta">RFZ 成员</div>
          </div>
          <button
            class="danger-outline-btn small-btn"
            :disabled="deletingPersonId === person.id"
            @click="deletePerson(person)"
          >
            {{ deletingPersonId === person.id ? "删除中" : "删除" }}
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
