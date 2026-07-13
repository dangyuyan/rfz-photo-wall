<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { RouterLink } from "vue-router"

import { listPersons, listPhotos } from "../api/client"
import magnoliaPetals from "../assets/magnolia-petals-v1.png"
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
      <div class="cover-starlight" aria-hidden="true">
        <i class="star star-one" />
        <i class="star star-two" />
        <i class="star star-three" />
        <i class="star star-four" />
      </div>
      <div class="cover-petal-layer" aria-hidden="true">
        <img class="cover-petal cover-petal-left" :src="magnoliaPetals" alt="" />
        <img class="cover-petal cover-petal-bottom" :src="magnoliaPetals" alt="" />
        <img class="cover-petal cover-petal-right" :src="magnoliaPetals" alt="" />
      </div>
      <div class="cover-copy">
        <h1>Enjoy your<br />memories here</h1>
        <p>
          还有回忆记得
        </p>

        <div class="cover-stats">
          <article class="cover-stat-card">
            <span class="cover-stat-icon" aria-hidden="true">⌑</span>
            <strong>{{ photos.length }}</strong>
            <span class="cover-stat-label">全部</span>
          </article>
          <article class="cover-stat-card">
            <span class="cover-stat-icon" aria-hidden="true">▧</span>
            <strong>{{ imageCount }}</strong>
            <span class="cover-stat-label">图片</span>
          </article>
          <article class="cover-stat-card">
            <span class="cover-stat-icon" aria-hidden="true">▷</span>
            <strong>{{ videoCount }}</strong>
            <span class="cover-stat-label">视频</span>
          </article>
          <article class="cover-stat-card">
            <span class="cover-stat-icon" aria-hidden="true">♧</span>
            <strong>{{ persons.length }}</strong>
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

      <div class="cover-category-bar" aria-label="媒体分类">
        <span class="active">全部</span>
        <span>图片</span>
        <span>视频</span>
        <span>成员</span>
      </div>
    </section>
  </div>
</template>
