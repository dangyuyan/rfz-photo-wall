<script setup lang="ts">
import { computed } from "vue"

import type { Photo } from "../types"
import { buildMediaSummary } from "../utils/media"

type PhotoPreview = {
  title: string | null
  image_url: string
  media_type: "image" | "video"
  poster_url?: string | null
  duration_seconds?: number | null
  width?: number | null
  height?: number | null
  shot_month?: string | null
  personNames?: string
}

const emit = defineEmits<{
  close: []
}>()

const props = defineProps<{
  photo: PhotoPreview | null
}>()

const mediaSummary = computed(() => {
  if (!props.photo) {
    return ""
  }

  return buildMediaSummary(props.photo as Photo)
})
</script>

<template>
  <div v-if="props.photo" class="preview-mask" @click="emit('close')">
    <div class="preview-panel" @click.stop>
      <button class="preview-close" @click="emit('close')">×</button>

      <img
        v-if="props.photo.media_type === 'image'"
        :src="props.photo.image_url"
        :alt="props.photo.title || '大图预览'"
        class="preview-image"
      />
      <video
        v-else
        :src="props.photo.image_url"
        :poster="props.photo.poster_url || undefined"
        class="preview-image"
        controls
        playsinline
        preload="metadata"
      />

      <div class="preview-info">
        <h3>{{ props.photo.title || "未命名照片" }}</h3>
        <p>{{ props.photo.personNames || "未标记人物" }}</p>
        <p>{{ props.photo.shot_month || "未填写时间" }}</p>
        <p v-if="mediaSummary">{{ mediaSummary }}</p>
      </div>
    </div>
  </div>
</template>
