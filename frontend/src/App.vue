<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { RouterView, useRoute } from "vue-router"

import AppNavbar from "./components/AppNavbar.vue"

const route = useRoute()

const depthX = ref(0)
const depthY = ref(0)

const isCoverPage = computed(() => route.path === "/cover")

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

watch(
  isCoverPage,
  (cover) => {
    document.documentElement.classList.toggle("cover-mode", cover)
  },
  { immediate: false },
)

onMounted(() => {
  document.documentElement.classList.toggle("cover-mode", isCoverPage.value)
})

onBeforeUnmount(resetDepth)

const globalPetals = [
  { id: 1, size: 280, left: "-8%", top: "15%", rotate: -12, opacity: 0.18, blur: 1 },
  { id: 2, size: 220, right: "-6%", top: "10%", rotate: 14, opacity: 0.15, blur: 1.5 },
  { id: 3, size: 240, left: "40%", bottom: "-8%", rotate: 6, opacity: 0.12, blur: 2 },
  { id: 4, size: 180, right: "15%", bottom: "5%", rotate: -8, opacity: 0.14, blur: 1.8 },
  { id: 5, size: 160, left: "20%", top: "60%", rotate: 10, opacity: 0.1, blur: 2.5 },
]
</script>

<template>
  <div class="ambient-grid" :style="ambientStyle" aria-hidden="true" />
  <div v-if="route.path !== '/cover'" class="global-petal-layer" aria-hidden="true">
    <svg
      v-for="petal in globalPetals"
      :key="petal.id"
      class="global-petal"
      :style="{
        width: petal.size + 'px',
        height: petal.size * 1.6 + 'px',
        left: petal.left,
        right: petal.right,
        top: petal.top,
        bottom: petal.bottom,
        transform: 'rotate(' + petal.rotate + 'deg)',
        opacity: petal.opacity,
        filter: 'blur(' + petal.blur + 'px)',
      }"
      viewBox="0 0 200 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M100 8
           C138 8, 178 55, 172 120
           C168 185, 152 240, 130 275
           C115 298, 100 310, 100 310
           C100 310, 85 298, 70 275
           C48 240, 32 185, 28 120
           C22 55, 62 8, 100 8 Z"
        stroke="rgba(120, 130, 150, 0.6)"
        stroke-width="1"
        fill="none"
        stroke-dasharray="6 5"
      />
      <path
        d="M100 18 L100 295"
        stroke="rgba(120, 130, 150, 0.35)"
        stroke-width="0.6"
        fill="none"
      />
    </svg>
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
