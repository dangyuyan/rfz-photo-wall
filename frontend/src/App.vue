<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue"
import { RouterView, useRoute } from "vue-router"

import AppNavbar from "./components/AppNavbar.vue"
import magnoliaPetals from "./assets/magnolia-petals-v1.png"

const route = useRoute()

const depthX = ref(0)
const depthY = ref(0)

const ambientStyle = computed(() => ({
  "--depth-x": `${depthX.value}px`,
  "--depth-y": `${depthY.value}px`,
}))

function updateDepth(event: PointerEvent) {
  const target = event.currentTarget as HTMLElement
  const bounds = target.getBoundingClientRect()
  const x = (event.clientX - bounds.left) / bounds.width - 0.5
  const y = (event.clientY - bounds.top) / bounds.height - 0.5

  depthX.value = x * 14
  depthY.value = y * 10
}

function resetDepth() {
  depthX.value = 0
  depthY.value = 0
}

onBeforeUnmount(resetDepth)
</script>

<template>
  <div class="ambient-grid" :style="ambientStyle" aria-hidden="true" />
  <div v-if="route.path !== '/cover'" class="global-petal-layer" aria-hidden="true">
    <img class="global-petal global-petal-one" :src="magnoliaPetals" alt="" />
    <img class="global-petal global-petal-two" :src="magnoliaPetals" alt="" />
    <img class="global-petal global-petal-three" :src="magnoliaPetals" alt="" />
  </div>
  <AppNavbar />
  <main
    :class="route.path === '/cover' ? 'page-container cover-page-container' : 'page-container inner-page-container'"
    @pointermove="updateDepth"
    @pointerleave="resetDepth"
  >
    <RouterView :key="route.fullPath" />
  </main>
</template>
