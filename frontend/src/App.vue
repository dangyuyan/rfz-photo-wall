<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { RouterView, useRoute } from "vue-router"

import AppNavbar from "./components/AppNavbar.vue"

const route = useRoute()

const depthX = ref(0)
const depthY = ref(0)
const targetDepth = { x: 0, y: 0 }
let depthAnimationFrame: number | null = null

const isCoverPage = computed(() => route.path === "/cover")

const ambientStyle = computed(() => ({
  "--depth-x": `${depthX.value}px`,
  "--depth-y": `${depthY.value}px`,
  "--depth-foreground-x": `${depthX.value * -1.65}px`,
  "--depth-foreground-y": `${depthY.value * -1.65}px`,
  "--depth-midground-x": `${depthX.value * -0.95}px`,
  "--depth-midground-y": `${depthY.value * -0.95}px`,
  "--depth-background-x": `${depthX.value * -0.35}px`,
  "--depth-background-y": `${depthY.value * -0.35}px`,
  "--depth-bokeh-x": `${depthX.value * -1.25}px`,
  "--depth-bokeh-y": `${depthY.value * -1.25}px`,
}))

let deviceDepthEnabled = false
let lastOrientationUpdate = 0

function setDepthTarget(x: number, y: number) {
  targetDepth.x = Math.max(-28, Math.min(28, x))
  targetDepth.y = Math.max(-22, Math.min(22, y))

  if (depthAnimationFrame !== null) return

  const animateDepth = () => {
    depthX.value += (targetDepth.x - depthX.value) * 0.12
    depthY.value += (targetDepth.y - depthY.value) * 0.12

    if (Math.abs(targetDepth.x - depthX.value) < 0.05 && Math.abs(targetDepth.y - depthY.value) < 0.05) {
      depthX.value = targetDepth.x
      depthY.value = targetDepth.y
      depthAnimationFrame = null
      return
    }

    depthAnimationFrame = window.requestAnimationFrame(animateDepth)
  }

  depthAnimationFrame = window.requestAnimationFrame(animateDepth)
}

function updateDeviceDepth(event: DeviceOrientationEvent) {
  if (event.gamma === null || event.beta === null) return

  lastOrientationUpdate = Date.now()
  setDepthTarget(event.gamma / 45 * 28, (event.beta - 45) / 45 * 22)
}

function updateMotionDepth(event: DeviceMotionEvent) {
  if (Date.now() - lastOrientationUpdate < 300) return

  const gravity = event.accelerationIncludingGravity
  if (typeof gravity?.x !== "number" || typeof gravity.y !== "number") return

  setDepthTarget(gravity.x / 9.81 * 28, gravity.y / 9.81 * 22)
}

function enableDeviceDepth() {
  if (deviceDepthEnabled || typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return

  const orientationEvent = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
    requestPermission?: () => Promise<"granted" | "denied">
  }

  if (orientationEvent.requestPermission) {
    void orientationEvent.requestPermission().then((permission) => {
      if (permission === "granted") {
        window.addEventListener("deviceorientation", updateDeviceDepth)
        window.addEventListener("devicemotion", updateMotionDepth)
        deviceDepthEnabled = true
      }
    }).catch(() => undefined)
    return
  }

  window.addEventListener("deviceorientation", updateDeviceDepth)
  window.addEventListener("devicemotion", updateMotionDepth)
  deviceDepthEnabled = true
}

function updateDepth(event: MouseEvent) {
  const x = event.clientX / window.innerWidth - 0.5
  const y = event.clientY / window.innerHeight - 0.5

  setDepthTarget(x * 28, y * 22)
}

function resetDepth() {
  setDepthTarget(0, 0)
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
  enableDeviceDepth()
})

onBeforeUnmount(() => {
  window.removeEventListener("deviceorientation", updateDeviceDepth)
  window.removeEventListener("devicemotion", updateMotionDepth)
  if (depthAnimationFrame !== null) window.cancelAnimationFrame(depthAnimationFrame)
  depthAnimationFrame = null
  depthX.value = 0
  depthY.value = 0
})

const globalPetals = [
  { id: 1, size: 260, left: "-6%", top: "12%", rotate: -15, opacity: 0.32, blur: 0.6 },
  { id: 2, size: 200, right: "-5%", top: "8%", rotate: 18, opacity: 0.28, blur: 0.8 },
  { id: 3, size: 220, left: "38%", bottom: "-6%", rotate: 8, opacity: 0.24, blur: 1 },
  { id: 4, size: 170, right: "12%", bottom: "4%", rotate: -10, opacity: 0.26, blur: 1 },
  { id: 5, size: 150, left: "18%", top: "58%", rotate: 12, opacity: 0.2, blur: 1.2 },
]

const globalStars = Array.from({ length: 22 }, (_, index) => {
  const step = index + 1
  return {
    id: step,
    left: `${(step * 37) % 96}%`,
    top: `${(step * 53) % 92}%`,
    size: 1.4 + (step % 4) * 0.7,
    delay: -((step % 9) * 0.7),
    duration: 3.6 + (step % 6) * 0.8,
  }
})
</script>

<template>
  <div class="ambient-grid" :style="ambientStyle" aria-hidden="true" />
  <div v-if="route.path !== '/cover'" class="global-star-layer" aria-hidden="true">
    <i
      v-for="star in globalStars"
      :key="star.id"
      class="global-star"
      :style="{
        left: star.left,
        top: star.top,
        width: star.size + 'px',
        height: star.size + 'px',
        animationDelay: star.delay + 's',
        '--twinkle-time': star.duration + 's',
      }"
    />
  </div>
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
        filter: 'blur(' + petal.blur + 'px) drop-shadow(0 0 6px rgba(224,192,160,0.3))',
      }"
      viewBox="0 0 200 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient :id="'innerPetalStroke' + petal.id" x1="30" y1="10" x2="170" y2="310" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#fff5ed" />
          <stop offset="40%" stop-color="#f0d9c0" />
          <stop offset="100%" stop-color="#d9a88a" />
        </linearGradient>
        <linearGradient :id="'innerPetalFill' + petal.id" x1="100" y1="8" x2="100" y2="310" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#fff5ed" stop-opacity="0.3" />
          <stop offset="50%" stop-color="#f0d9c0" stop-opacity="0.2" />
          <stop offset="100%" stop-color="#d9a88a" stop-opacity="0.12" />
        </linearGradient>
      </defs>
      <path
        d="M100 8
           C138 8, 178 55, 172 120
           C168 185, 152 240, 130 275
           C115 298, 100 310, 100 310
           C100 310, 85 298, 70 275
           C48 240, 32 185, 28 120
           C22 55, 62 8, 100 8 Z"
        :stroke="'url(#innerPetalStroke' + petal.id + ')'"
        stroke-width="1.2"
        :fill="'url(#innerPetalFill' + petal.id + ')'"
        stroke-linecap="round"
      />
      <path
        d="M100 22 C130 25, 162 65, 158 120 C154 175, 140 225, 122 265"
        :stroke="'url(#innerPetalStroke' + petal.id + ')'"
        stroke-width="0.6"
        opacity="0.5"
        fill="none"
      />
      <path
        d="M100 22 C70 25, 42 70, 40 125 C38 175, 52 225, 72 265"
        :stroke="'url(#innerPetalStroke' + petal.id + ')'"
        stroke-width="0.5"
        opacity="0.35"
        fill="none"
      />
      <path
        d="M100 30 L100 290"
        stroke="#f0d9c0"
        stroke-width="0.5"
        opacity="0.45"
      />
    </svg>
  </div>
  <AppNavbar />
  <main
    :class="route.path === '/cover' ? 'page-container cover-page-container' : 'page-container inner-page-container'"
    :style="ambientStyle"
    @mousemove="updateDepth"
    @mouseleave="resetDepth"
    @pointerdown="enableDeviceDepth"
  >
    <RouterView :key="route.fullPath" />
  </main>
</template>
