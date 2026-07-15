<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"

import { listPersons, listPhotos } from "../api/client"
import type { Person, Photo } from "../types"

const photos = ref<Photo[]>([])
const persons = ref<Person[]>([])
const loading = ref(true)
const currentIndex = ref(0)
const loadError = ref("")
let carouselTimer: number | null = null

const featuredPhotos = computed(() => photos.value.slice(0, 8))
const activePhoto = computed(() => featuredPhotos.value[currentIndex.value] ?? null)
const imageCount = computed(
  () => photos.value.filter((photo) => photo.media_type === "image").length,
)
const videoCount = computed(
  () => photos.value.filter((photo) => photo.media_type === "video").length,
)

type PetalShape = {
  outline: string
  inner: string
  highlight: string
  foldShadow?: string
  veins: { d: string; w: number; o: number }[]
  sparkles: { cx: number; cy: number; r: number }[]
}

const petalShapes: PetalShape[] = [
  {
    outline: "M100 8 C158 12,195 75,182 150 C170 215,148 265,120 295 C105 312,100 318,100 318 C100 318,92 308,78 282 C52 238,22 172,20 110 C18 52,48 8,100 8 Z",
    inner: "M100 30 C142 33,172 85,163 140 C155 195,138 240,118 268 C106 288,101 293,100 293 C97 290,88 272,76 248 C56 205,36 152,34 108 C32 62,58 30,100 30 Z",
    highlight: "M102 18 C145 24,175 90,165 155 C155 210,135 252,116 280 C122 215,130 150,124 92 C120 50,110 26,102 18 Z",
    veins: [
      { d: "M100 18 L100 298", w: 0.7, o: 0.48 },
      { d: "M100 52 Q55 72,22 120", w: 0.42, o: 0.28 },
      { d: "M100 100 Q48 128,18 185", w: 0.4, o: 0.22 },
      { d: "M100 152 Q45 182,22 240", w: 0.35, o: 0.18 },
      { d: "M100 58 Q148 78,182 130", w: 0.45, o: 0.32 },
      { d: "M100 108 Q152 135,180 195", w: 0.42, o: 0.26 },
      { d: "M100 158 Q148 188,172 245", w: 0.38, o: 0.2 },
    ],
    sparkles: [{ cx: 100, cy: 28, r: 1.8 }, { cx: 55, cy: 120, r: 1.1 }, { cx: 148, cy: 160, r: 1.3 }],
  },
  {
    outline: "M95 10 C108 2,130 30,145 100 C158 160,152 220,128 270 C112 302,100 318,95 315 C88 300,72 275,55 235 C30 175,18 115,28 70 C40 32,68 12,95 10 Z",
    inner: "M94 32 C104 26,122 48,134 105 C144 155,140 208,122 250 C110 278,100 292,96 288 C90 275,78 252,64 218 C44 168,36 115,44 78 C52 45,72 34,94 32 Z",
    highlight: "M88 22 C98 16,118 42,130 100 C140 152,132 200,115 242 C108 182,100 125,92 72 C86 42,82 26,88 22 Z",
    foldShadow: "M88 50 Q72 140,58 220 Q48 272,46 300",
    veins: [
      { d: "M95 22 L88 302", w: 0.65, o: 0.45 },
      { d: "M92 60 Q58 82,28 130", w: 0.38, o: 0.25 },
      { d: "M90 115 Q50 145,22 200", w: 0.35, o: 0.2 },
      { d: "M88 165 Q48 198,25 255", w: 0.3, o: 0.15 },
      { d: "M98 62 Q128 82,152 128", w: 0.4, o: 0.28 },
      { d: "M100 118 Q135 148,160 202", w: 0.38, o: 0.22 },
      { d: "M102 170 Q132 200,155 258", w: 0.32, o: 0.18 },
    ],
    sparkles: [{ cx: 90, cy: 32, r: 1.5 }, { cx: 138, cy: 115, r: 1 }, { cx: 55, cy: 175, r: 0.9 }],
  },
  {
    outline: "M105 6 C85 2,60 50,120 80 C175 110,195 170,170 230 C150 278,118 305,105 315 C92 310,78 288,60 250 C32 190,18 125,32 70 C48 22,75 6,105 6 Z",
    inner: "M102 28 C88 25,70 62,112 86 C156 112,172 162,154 212 C138 258,116 282,106 290 C95 285,82 262,68 228 C46 178,36 122,46 78 C60 40,80 28,102 28 Z",
    highlight: "M78 20 C68 16,50 52,90 82 C132 110,150 158,130 208 C116 248,100 272,95 280 C102 215,108 148,98 85 C92 48,84 26,78 20 Z",
    foldShadow: "M95 60 Q85 140,80 210 Q75 268,78 300",
    veins: [
      { d: "M98 18 L92 300", w: 0.7, o: 0.5 },
      { d: "M95 55 Q62 78,30 125", w: 0.4, o: 0.28 },
      { d: "M92 105 Q55 135,25 188", w: 0.38, o: 0.22 },
      { d: "M90 158 Q50 190,30 245", w: 0.32, o: 0.18 },
      { d: "M105 52 Q140 72,175 120", w: 0.42, o: 0.3 },
      { d: "M108 108 Q150 138,180 192", w: 0.4, o: 0.25 },
      { d: "M110 160 Q148 192,172 248", w: 0.35, o: 0.2 },
    ],
    sparkles: [{ cx: 95, cy: 26, r: 1.7 }, { cx: 150, cy: 130, r: 1.1 }, { cx: 58, cy: 185, r: 1 }],
  },
  {
    outline: "M100 15 C72 8,32 62,38 135 C44 200,68 255,105 295 C125 280,155 235,162 170 C168 108,145 50,115 25 C108 18,100 15,100 15 Z",
    inner: "M98 35 C78 30,50 70,55 128 C60 182,78 230,106 265 C122 252,146 215,152 165 C156 118,138 72,115 50 C108 42,98 35,98 35 Z",
    highlight: "M82 30 C66 26,46 62,52 118 C58 168,72 210,96 242 C112 228,132 195,138 155 C142 112,128 68,108 45 C100 36,82 30,82 30 Z",
    foldShadow: "M78 80 Q60 160,65 240",
    veins: [
      { d: "M92 28 L85 265", w: 0.55, o: 0.4 },
      { d: "M86 65 Q52 95,28 150", w: 0.32, o: 0.2 },
      { d: "M83 120 Q48 155,30 210", w: 0.3, o: 0.15 },
      { d: "M95 60 Q125 82,152 130", w: 0.35, o: 0.22 },
      { d: "M98 118 Q132 148,158 200", w: 0.32, o: 0.18 },
      { d: "M100 170 Q128 200,148 248", w: 0.28, o: 0.12 },
    ],
    sparkles: [{ cx: 88, cy: 35, r: 1.3 }, { cx: 140, cy: 120, r: 0.9 }, { cx: 52, cy: 165, r: 0.8 }],
  },
  {
    outline: "M100 4 C148 8,188 68,175 140 C165 200,145 255,118 288 C102 308,98 312,92 305 C78 285,58 252,42 210 C22 155,20 95,32 52 C48 16,72 4,100 4 Z",
    inner: "M98 26 C136 30,166 75,157 132 C148 185,132 232,114 262 C102 280,98 284,94 278 C84 262,70 232,58 195 C42 148,40 98,50 62 C62 32,80 26,98 26 Z",
    highlight: "M108 14 C144 20,175 78,165 142 C155 198,135 245,115 275 C122 210,130 145,124 88 C118 42,112 20,108 14 Z",
    veins: [
      { d: "M100 14 L100 295", w: 0.72, o: 0.5 },
      { d: "M100 48 Q62 68,32 108", w: 0.42, o: 0.3 },
      { d: "M100 95 Q58 120,28 172", w: 0.4, o: 0.25 },
      { d: "M100 148 Q55 178,30 230", w: 0.35, o: 0.2 },
      { d: "M100 52 Q140 72,172 120", w: 0.45, o: 0.32 },
      { d: "M100 100 Q145 130,175 185", w: 0.42, o: 0.26 },
      { d: "M100 152 Q142 185,168 238", w: 0.38, o: 0.22 },
    ],
    sparkles: [{ cx: 98, cy: 22, r: 1.6 }, { cx: 60, cy: 105, r: 1 }, { cx: 145, cy: 165, r: 1.2 }],
  },
]

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value)
}

function resetCarouselTimer() {
  if (carouselTimer !== null) {
    window.clearInterval(carouselTimer)
    carouselTimer = null
  }

  if (featuredPhotos.value.length <= 1) {
    return
  }

  carouselTimer = window.setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % featuredPhotos.value.length
  }, 4500)
}

function pauseCarousel() {
  if (carouselTimer !== null) {
    window.clearInterval(carouselTimer)
    carouselTimer = null
  }
}

function setSlide(index: number) {
  currentIndex.value = index
  resetCarouselTimer()
}

function showPrevious() {
  if (featuredPhotos.value.length === 0) {
    return
  }

  currentIndex.value =
    (currentIndex.value - 1 + featuredPhotos.value.length) % featuredPhotos.value.length
  resetCarouselTimer()
}

function showNext() {
  if (featuredPhotos.value.length === 0) {
    return
  }

  currentIndex.value = (currentIndex.value + 1) % featuredPhotos.value.length
  resetCarouselTimer()
}

function getPersonNames(photo: Photo) {
  return photo.persons.map((person) => person.name).join(" · ") || "未标记人物"
}

async function loadCoverData() {
  loading.value = true
  loadError.value = ""

  try {
    const [resolvedPhotos, resolvedPersons] = await Promise.all([
      listPhotos("wall"),
      listPersons(),
    ])

    photos.value = resolvedPhotos
    persons.value = resolvedPersons
    currentIndex.value = 0
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : "封面数据加载失败，请稍后再试"
  } finally {
    loading.value = false
  }
}

watch(
  featuredPhotos,
  (items) => {
    if (items.length === 0) {
      currentIndex.value = 0
      resetCarouselTimer()
      return
    }

    if (currentIndex.value >= items.length) {
      currentIndex.value = 0
    }

    resetCarouselTimer()
  },
  { immediate: true },
)

onMounted(() => {
  loadCoverData()
})

onBeforeUnmount(() => {
  if (carouselTimer !== null) {
    window.clearInterval(carouselTimer)
  }
})
</script>

<template>
  <div class="page-stack">
    <section class="cover-hero">
      <div class="cover-glow-layer" aria-hidden="true">
        <i class="cover-glow glow-one" />
        <i class="cover-glow glow-two" />
        <i class="cover-glow glow-three" />
        <i class="cover-glow glow-four" />
        <i class="cover-glow glow-five" />
        <i class="cover-glow glow-six" />
      </div>
      <div class="cover-starlight" aria-hidden="true">
        <i class="star star-one" />
        <i class="star star-two" />
        <i class="star star-three" />
        <i class="star star-four" />
        <i
          v-for="star in 28"
          :key="star"
          :class="`star star-dust star-dust-${star}`"
          :style="{
            left: `${52 + (star * 13) % 45}%`,
            top: `${3 + (star * 17) % 62}%`,
            animationDelay: `${-(star % 8) * 0.65}s`,
            '--twinkle-time': `${3.5 + (star % 6) * 0.7}s`,
            '--star-size': `${1.1 + (star % 5) * 0.55}px`,
          }"
        />
      </div>
      <div class="cover-petal-layer" aria-hidden="true">
        <svg
          v-for="idx in 20"
          :key="idx"
          :class="`cover-petal petal-${idx}`"
          viewBox="0 0 200 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient :id="'petalGrad' + idx" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="rgba(255,245,237,0.4)" />
              <stop offset="40%" stop-color="rgba(240,217,192,0.3)" />
              <stop offset="70%" stop-color="rgba(217,184,149,0.25)" />
              <stop offset="100%" stop-color="rgba(184,149,108,0.2)" />
            </linearGradient>
            <linearGradient :id="'petalStroke' + idx" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#fff5ed" />
              <stop offset="35%" stop-color="#f0d9c0" />
              <stop offset="65%" stop-color="#e0c0a0" />
              <stop offset="100%" stop-color="#c9a07a" />
            </linearGradient>
            <radialGradient :id="'petalFold' + idx" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stop-color="rgba(180,140,100,0)" />
              <stop offset="60%" stop-color="rgba(180,140,100,0.08)" />
              <stop offset="100%" stop-color="rgba(160,120,80,0.15)" />
            </radialGradient>
            <filter :id="'petalGlow' + idx" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g :filter="'url(#petalGlow' + idx + ')'">
            <path
              :d="petalShapes[(idx - 1) % petalShapes.length].outline"
              :fill="'url(#petalGrad' + idx + ')'"
              fill-opacity="0.8"
              stroke="none"
            />
            <ellipse
              v-if="petalShapes[(idx - 1) % petalShapes.length].foldShadow"
              cx="100" cy="150" rx="55" ry="120"
              :fill="'url(#petalFold' + idx + ')'"
              opacity="0.5"
            />
            <path
              :d="petalShapes[(idx - 1) % petalShapes.length].highlight"
              fill="rgba(255,255,255,0.55)"
              stroke="none"
              class="petal-glass-highlight"
            />
          </g>

          <g>
            <path
              :d="petalShapes[(idx - 1) % petalShapes.length].outline"
              fill="none"
              :stroke="'url(#petalStroke' + idx + ')'"
              stroke-width="1.3"
              stroke-linejoin="round"
            />
            <path
              :d="petalShapes[(idx - 1) % petalShapes.length].inner"
              fill="rgba(255,252,248,0.2)"
              stroke="rgba(240,217,192,0.45)"
              stroke-width="0.5"
            />
            <path
              v-if="petalShapes[(idx - 1) % petalShapes.length].foldShadow"
              :d="petalShapes[(idx - 1) % petalShapes.length].foldShadow"
              fill="none"
              stroke="rgba(180,140,100,0.12)"
              stroke-width="1.2"
              stroke-linecap="round"
            />
            <path
              v-for="(vein, vi) in petalShapes[(idx - 1) % petalShapes.length].veins"
              :key="vi"
              :d="vein.d"
              fill="none"
              :stroke="`rgba(220,190,160,${vein.o * 0.85})`"
              :stroke-width="vein.w * 0.85"
              stroke-linecap="round"
            />
          </g>

          <circle
            v-for="(sp, si) in petalShapes[(idx - 1) % petalShapes.length].sparkles"
            :key="si"
            class="petal-sparkle"
            :cx="sp.cx"
            :cy="sp.cy"
            :r="sp.r"
            fill="rgba(255,230,190,0.9)"
          >
            <animate
              attributeName="opacity"
              :values="si === 0 ? '0.4;1;0.4' : '0.2;0.7;0.2'"
              :dur="si === 0 ? '3s' : `${3.5 + si * 0.5}s`"
              :begin="`${si * 0.5 + (idx % 4) * 0.3}s`"
              repeatCount="indefinite"
            />
          </circle>
        </svg>
      </div>
      <div class="cover-copy">
        <h1>Enjoy your<br />memories here</h1>
        <div class="cover-divider" aria-hidden="true">
          <span class="cover-divider-star">+</span>
          <span class="cover-divider-line" />
        </div>
        <p>
          还有回忆记得
        </p>

        <div class="cover-stats">
          <article class="cover-stat-card">
            <span class="cover-stat-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 7.5h5l1.6-2h2.8l1.6 2H20v11H4z"/><circle cx="12" cy="13" r="3.2"/></svg></span>
            <strong>{{ formatCount(photos.length) }}</strong>
            <span class="cover-stat-label">全部</span>
          </article>
          <article class="cover-stat-card">
            <span class="cover-stat-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="8.2" cy="9.4" r="1.2"/><path d="m5.5 17 4.4-4.3 3.1 2.7 2.3-2.1 3.1 3"/></svg></span>
            <strong>{{ formatCount(imageCount) }}</strong>
            <span class="cover-stat-label">图片</span>
          </article>
          <article class="cover-stat-card">
            <span class="cover-stat-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="m10 8.7 5 3.3-5 3.3z"/></svg></span>
            <strong>{{ formatCount(videoCount) }}</strong>
            <span class="cover-stat-label">视频</span>
          </article>
          <article class="cover-stat-card">
            <span class="cover-stat-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="7.6" r="3.1"/><path d="M5 19.2c.8-3.5 3.1-5.3 7-5.3s6.2 1.8 7 5.3"/><path d="M17 8.5c2.1.3 3.4 1.7 3.8 3.8"/></svg></span>
            <strong>{{ formatCount(persons.length) }}</strong>
            <span class="cover-stat-label">成员</span>
          </article>
        </div>
      </div>

      <div
        class="cover-carousel"
        @mouseenter="pauseCarousel()"
        @mouseleave="resetCarouselTimer()"
      >
        <div v-if="loading" class="cover-carousel-state">封面加载中...</div>
        <div v-else-if="loadError" class="cover-carousel-state">
          <p>{{ loadError }}</p>
          <button class="secondary-btn" @click="loadCoverData">重新加载</button>
        </div>
        <div v-else-if="featuredPhotos.length === 0" class="cover-carousel-state">
          还没有可展示的媒体，先去上传页补内容。
        </div>
        <template v-else>
          <div class="cover-slide-stage">
            <article
              v-for="(photo, index) in featuredPhotos"
              :key="photo.id"
              :class="index === currentIndex ? 'cover-slide active' : 'cover-slide'"
            >
              <img
                v-if="photo.media_type === 'image' || photo.poster_url"
                :src="photo.poster_url || photo.image_url"
                :alt="photo.title || '封面轮播媒体'"
                class="cover-slide-media"
              />
              <video
                v-else
                :src="photo.image_url"
                class="cover-slide-media"
                autoplay
                muted
                loop
                playsinline
              />

              <div class="cover-slide-overlay">
                <span class="cover-slide-badge">
                  {{ photo.media_type === "video" ? "视频" : "图片" }}
                </span>
                <h2>{{ photo.title || "未命名内容" }}</h2>
                <p>{{ getPersonNames(photo) }}</p>
                <span class="cover-slide-meta">
                  {{ photo.shot_month || "未填写时间" }}
                </span>
              </div>
            </article>
          </div>

          <button
            v-if="featuredPhotos.length > 1"
            type="button"
            class="cover-nav-btn cover-nav-prev"
            aria-label="上一张"
            @click="showPrevious"
          >
            ‹
          </button>
          <button
            v-if="featuredPhotos.length > 1"
            type="button"
            class="cover-nav-btn cover-nav-next"
            aria-label="下一张"
            @click="showNext"
          >
            ›
          </button>

          <div v-if="activePhoto" class="cover-caption">
            <strong>{{ activePhoto.title || "未命名内容" }}</strong>
            <span>{{ getPersonNames(activePhoto) }}</span>
          </div>

          <div v-if="featuredPhotos.length > 1" class="cover-dots">
            <button
              v-for="(photo, index) in featuredPhotos"
              :key="photo.id"
              type="button"
              :class="index === currentIndex ? 'cover-dot active' : 'cover-dot'"
              :aria-label="`切换到第 ${index + 1} 张`"
              @click="setSlide(index)"
            />
          </div>
        </template>
      </div>
    </section>
  </div>
</template>
