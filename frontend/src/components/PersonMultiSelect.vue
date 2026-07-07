<script setup lang="ts">
import { computed } from "vue"

import type { Person } from "../types"

const props = defineProps<{
  persons: Person[]
  selectedPersonIds: number[]
}>()

const emit = defineEmits<{
  "update:selectedPersonIds": [personIds: number[]]
}>()

const selectedNames = computed(() =>
  props.persons
    .filter((person) => props.selectedPersonIds.includes(person.id))
    .map((person) => person.name),
)

const summaryText = computed(() => {
  if (selectedNames.value.length === 0) {
    return "全部成员"
  }

  if (selectedNames.value.length <= 2) {
    return selectedNames.value.join("、")
  }

  return `${selectedNames.value.slice(0, 2).join("、")} 等 ${selectedNames.value.length} 人`
})

function togglePerson(personId: number) {
  emit(
    "update:selectedPersonIds",
    props.selectedPersonIds.includes(personId)
      ? props.selectedPersonIds.filter((id) => id !== personId)
      : [...props.selectedPersonIds, personId],
  )
}

function clearSelectedPersons() {
  emit("update:selectedPersonIds", [])
}
</script>

<template>
  <div class="person-multi-select">
    <details class="person-select-menu">
      <summary class="person-select-trigger">
        <span class="person-select-label">{{ summaryText }}</span>
        <span class="person-select-count">
          {{ selectedPersonIds.length > 0 ? `${selectedPersonIds.length} 已选` : "全部" }}
        </span>
      </summary>

      <div class="person-select-panel">
        <button
          class="person-select-option person-select-clear"
          type="button"
          @click="clearSelectedPersons"
        >
          全部成员
        </button>

        <label
          v-for="person in persons"
          :key="person.id"
          class="person-select-option"
        >
          <input
            type="checkbox"
            :checked="selectedPersonIds.includes(person.id)"
            @change="togglePerson(person.id)"
          />
          <span>{{ person.name }}</span>
        </label>

        <p v-if="persons.length === 0" class="person-select-empty">暂无成员</p>
      </div>
    </details>
  </div>
</template>
