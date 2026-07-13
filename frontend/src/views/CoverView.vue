<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { RouterLink } from "vue-router"

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
          v-for="petal in 20"
          :key="petal"
          :class="`cover-petal petal-${petal}`"
          viewBox="0 0 200 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient :id="'petalGrad' + petal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffffff" />
              <stop offset="50%" stop-color="#f8f4ea" />
              <stop offset="100%" stop-color="#ddd5c5" />
            </linearGradient>
            <filter :id="'petalGlow' + petal" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4.2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g :filter="'url(#petalGlow' + petal + ')'">
            <path
              class="petal-outline"
              d="M100 8
                 C138 8, 178 55, 172 120
                 C168 185, 152 240, 130 275
                 C115 298, 100 310, 100 310
                 C100 310, 85 298, 70 275
                 C48 240, 32 185, 28 120
                 C22 55, 62 8, 100 8 Z"
              :fill="'url(#petalGrad' + petal + ')'"
              stroke="rgba(255,240,210,0.7)"
              stroke-width="1.1"
            />

            <path
              class="petal-outline-inner"
              d="M100 25
                 C128 25, 158 60, 155 110
                 C152 165, 140 210, 125 245
                 C115 268, 105 280, 100 285
                 C95 280, 85 268, 75 245
                 C60 210, 48 165, 45 110
                 C42 60, 72 25, 100 25 Z"
              fill="rgba(255,255,255,0.2)"
              stroke="rgba(255,240,210,0.55)"
              stroke-width="0.6"
            />
            <path
              class="petal-glass-highlight"
              d="M100 18 C132 24, 158 68, 151 122 C144 177, 126 234, 105 276 C112 218, 119 163, 116 107 C113 62, 106 34, 100 18 Z"
              fill="rgba(255,255,255,0.34)"
              stroke="rgba(255,255,255,0.52)"
              stroke-width="0.55"
            />
          </g>

          <g :filter="'url(#petalGlow' + petal + ')'">
            <path
              class="petal-vein-main"
              d="M100 18 L100 295"
              fill="none"
              stroke="rgba(232,224,208,0.64)"
              stroke-width="0.8"
            />

            <path
              class="petal-vein"
              d="M100 55 Q72 70 48 105"
              fill="none"
              stroke="rgba(255,245,225,0.4)"
              stroke-width="0.5"
            />
            <path
              class="petal-vein"
              d="M100 95 Q68 115 42 160"
              fill="none"
              stroke="rgba(255,245,225,0.35)"
              stroke-width="0.5"
            />
            <path
              class="petal-vein"
              d="M100 135 Q62 160 38 210"
              fill="none"
              stroke="rgba(255,245,225,0.3)"
              stroke-width="0.5"
            />
            <path
              class="petal-vein"
              d="M100 175 Q68 200 50 250"
              fill="none"
              stroke="rgba(255,245,225,0.25)"
              stroke-width="0.45"
            />

            <path
              class="petal-vein"
              d="M100 65 Q130 82 152 118"
              fill="none"
              stroke="rgba(255,245,225,0.4)"
              stroke-width="0.5"
            />
            <path
              class="petal-vein"
              d="M100 105 Q135 128 158 172"
              fill="none"
              stroke="rgba(255,245,225,0.35)"
              stroke-width="0.5"
            />
            <path
              class="petal-vein"
              d="M100 145 Q132 172 155 220"
              fill="none"
              stroke="rgba(255,245,225,0.3)"
              stroke-width="0.5"
            />
            <path
              class="petal-vein"
              d="M100 185 Q128 212 145 258"
              fill="none"
              stroke="rgba(255,245,225,0.25)"
              stroke-width="0.45"
            />

            <path
              class="petal-vein-tip"
              d="M100 250 Q90 270 80 285"
              fill="none"
              stroke="rgba(255,245,225,0.2)"
              stroke-width="0.4"
            />
            <path
              class="petal-vein-tip"
              d="M100 250 Q110 270 120 285"
              fill="none"
              stroke="rgba(255,245,225,0.2)"
              stroke-width="0.4"
            />
          </g>

          <circle class="petal-sparkle" cx="100" cy="35" r="1.5" fill="rgba(255,225,160,0.95)">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle class="petal-sparkle" cx="70" cy="120" r="1" fill="rgba(255,235,190,0.8)">
            <animate attributeName="opacity" values="0.2;0.8;0.2" dur="4s" begin="0.5s" repeatCount="indefinite" />
          </circle>
          <circle class="petal-sparkle" cx="135" cy="160" r="1.2" fill="rgba(255,230,180,0.85)">
            <animate attributeName="opacity" values="0.25;0.9;0.25" dur="3.5s" begin="1s" repeatCount="indefinite" />
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
