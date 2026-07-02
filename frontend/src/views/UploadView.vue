<script setup lang="ts">
import exifr from "exifr"
import { computed, onBeforeUnmount, onMounted, ref } from "vue"

import { listPersons, uploadPhotos } from "../api/client"
import type { MediaType, Person, UploadPhotoPayload } from "../types"

type PendingPhoto = {
  id: string
  file: File
  previewUrl: string
  mediaType: MediaType
  title: string
  shotMonth: string
  selectedPersons: number[]
}

const imageExtensions = new Set([
  "avif",
  "gif",
  "heic",
  "heif",
  "jpeg",
  "jpg",
  "png",
  "webp",
])
const videoExtensions = new Set(["m4v", "mov", "mp4", "webm"])

const persons = ref<Person[]>([])
const pendingPhotos = ref<PendingPhoto[]>([])
const uploading = ref(false)
const uploadNotice = ref("")

const defaultShotMonth = ref("")
const defaultSelectedPersons = ref<number[]>([])
const defaultTitle = ref("")

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

function getTotalFileSize(files: File[]) {
  return files.reduce((total, file) => total + file.size, 0)
}

function getMediaType(file: File): MediaType | null {
  const contentType = file.type.toLowerCase()
  if (contentType.startsWith("image/")) return "image"
  if (contentType.startsWith("video/")) return "video"

  const extension = file.name.split(".").pop()?.toLowerCase() || ""
  if (imageExtensions.has(extension)) return "image"
  if (videoExtensions.has(extension)) return "video"

  return null
}

async function getShotMonth(file: File, mediaType: MediaType) {
  try {
    const date =
      mediaType === "image"
        ? (() => {
            return exifr
              .parse(file)
              .then((exif) => exif?.DateTimeOriginal || exif?.CreateDate || exif?.ModifyDate)
          })()
        : Promise.resolve(null)

    const resolvedDate = await date

    if (resolvedDate) {
      const parsedDate = new Date(resolvedDate)
      if (!Number.isNaN(parsedDate.getTime())) {
        const year = parsedDate.getFullYear()
        const month = String(parsedDate.getMonth() + 1).padStart(2, "0")
        return `${year}-${month}`
      }
    }

    if (file.lastModified) {
      const lastModifiedDate = new Date(file.lastModified)
      const year = lastModifiedDate.getFullYear()
      const month = String(lastModifiedDate.getMonth() + 1).padStart(2, "0")
      return `${year}-${month}`
    }

    return ""
  } catch (error) {
    console.log("读取媒体时间失败:", error)

    if (file.lastModified) {
      const lastModifiedDate = new Date(file.lastModified)
      const year = lastModifiedDate.getFullYear()
      const month = String(lastModifiedDate.getMonth() + 1).padStart(2, "0")
      return `${year}-${month}`
    }

    return ""
  }
}

async function fetchPersons() {
  persons.value = await listPersons()
}

function revokePreviewUrl(url: string) {
  URL.revokeObjectURL(url)
}

function getSelectedPersonNames(personIds: number[]) {
  return persons.value
    .filter((person) => personIds.includes(person.id))
    .map((person) => person.name)
}

async function handleFilesChange(event: Event) {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  if (files.length === 0) return

  const supportedFiles = files
    .map((file) => ({ file, mediaType: getMediaType(file) }))
    .filter((item): item is { file: File; mediaType: MediaType } => item.mediaType !== null)

  if (supportedFiles.length === 0) {
    uploadNotice.value = "请选择图片或视频文件"
    alert("请选择图片或视频文件")
    target.value = ""
    return
  }

  if (supportedFiles.length < files.length) {
    uploadNotice.value = `已忽略 ${files.length - supportedFiles.length} 个不支持的文件，仅支持图片或视频。`
  }

  const newItems: PendingPhoto[] = []

  for (const { file, mediaType } of supportedFiles) {
    const autoMonth = await getShotMonth(file, mediaType)

    newItems.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      mediaType,
      title: file.name.replace(/\.[^/.]+$/, ""),
      shotMonth: autoMonth || defaultShotMonth.value,
      selectedPersons: [...defaultSelectedPersons.value],
    })
  }

  pendingPhotos.value = [...pendingPhotos.value, ...newItems]
  uploadNotice.value = `已选择 ${pendingPhotos.value.length} 个文件，总大小 ${formatBytes(
    getTotalFileSize(pendingPhotos.value.map((item) => item.file)),
  )}。`
  target.value = ""
}

function updatePendingField(id: string, field: "title" | "shotMonth", value: string) {
  pendingPhotos.value = pendingPhotos.value.map((item) =>
    item.id === id ? { ...item, [field]: value } : item,
  )
}

function handlePendingTitleInput(id: string, event: Event) {
  const target = event.target as HTMLInputElement
  updatePendingField(id, "title", target.value)
}

function handlePendingShotMonthInput(id: string, event: Event) {
  const target = event.target as HTMLInputElement
  updatePendingField(id, "shotMonth", target.value)
}

function toggleDefaultPerson(personId: number) {
  defaultSelectedPersons.value = defaultSelectedPersons.value.includes(personId)
    ? defaultSelectedPersons.value.filter((id) => id !== personId)
    : [...defaultSelectedPersons.value, personId]
}

function togglePendingPerson(photoId: string, personId: number) {
  pendingPhotos.value = pendingPhotos.value.map((item) => {
    if (item.id !== photoId) return item

    return {
      ...item,
      selectedPersons: item.selectedPersons.includes(personId)
        ? item.selectedPersons.filter((id) => id !== personId)
        : [...item.selectedPersons, personId],
    }
  })
}

function applyDefaultMonthToAll() {
  pendingPhotos.value = pendingPhotos.value.map((item) => ({
    ...item,
    shotMonth: defaultShotMonth.value,
  }))
}

function applyDefaultTitleToAll() {
  pendingPhotos.value = pendingPhotos.value.map((item) => ({
    ...item,
    title: defaultTitle.value,
  }))
}

function applyDefaultPersonsToAll() {
  pendingPhotos.value = pendingPhotos.value.map((item) => ({
    ...item,
    selectedPersons: [...defaultSelectedPersons.value],
  }))
}

function applyDefaultsToAll() {
  pendingPhotos.value = pendingPhotos.value.map((item) => ({
    ...item,
    title: defaultTitle.value || item.title,
    shotMonth: defaultShotMonth.value,
    selectedPersons: [...defaultSelectedPersons.value],
  }))
}

function removePendingPhoto(id: string) {
  const target = pendingPhotos.value.find((item) => item.id === id)
  if (target) revokePreviewUrl(target.previewUrl)
  pendingPhotos.value = pendingPhotos.value.filter((item) => item.id !== id)
}

function clearAllPending() {
  pendingPhotos.value.forEach((item) => revokePreviewUrl(item.previewUrl))
  pendingPhotos.value = []
  uploadNotice.value = ""
}

async function handleBatchUpload() {
  if (pendingPhotos.value.length === 0) {
    alert("请先选择要上传的文件")
    return
  }

  const uploadQueue = [...pendingPhotos.value]
  const totalCount = uploadQueue.length

  try {
    uploading.value = true

    for (const [index, item] of uploadQueue.entries()) {
      uploadNotice.value = `正在上传 ${index + 1} / ${totalCount}：${item.file.name}`

      const payload: UploadPhotoPayload = {
        title: item.title.trim() || null,
        shot_month: item.shotMonth || null,
        person_ids: item.selectedPersons,
      }

      await uploadPhotos([item.file], [payload], (progress) => {
        uploadNotice.value = `正在上传 ${index + 1} / ${totalCount}：${item.file.name} · ${progress.percent}% (${formatBytes(progress.loaded)} / ${formatBytes(progress.total)})`
      })
      removePendingPhoto(item.id)
    }

    uploadNotice.value = ""
    alert("批量上传成功！")
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "上传失败，请稍后再试。若图片较大，请尝试压缩或分批上传。"
    uploadNotice.value = message
    alert(message)
  } finally {
    uploading.value = false
  }
}

const defaultPersonNames = computed(() =>
  getSelectedPersonNames(defaultSelectedPersons.value),
)

onMounted(() => {
  fetchPersons().catch((error) => {
    alert(error instanceof Error ? error.message : "获取成员失败，请稍后再试")
  })
})

onBeforeUnmount(() => {
  pendingPhotos.value.forEach((item) => revokePreviewUrl(item.previewUrl))
})
</script>

<template>
  <div class="page-stack">
    <section class="hero-card">
      <h1>上传照片 / 视频</h1>
      <p>支持图片和视频批量上传、批量套用默认月份和人物，也可以逐个微调。</p>
    </section>

    <section class="panel-card">
      <div class="section-title-row">
        <h2>选择文件</h2>
        <span class="badge">{{ pendingPhotos.length }} 个待上传</span>
      </div>

      <input
        type="file"
        accept="image/*,video/*,.avif,.gif,.heic,.heif,.jpeg,.jpg,.m4v,.mov,.mp4,.png,.webm,.webp"
        multiple
        :disabled="uploading"
        @change="handleFilesChange"
      />

      <p class="helper-text">
        选择后不会立刻上传。图片会优先尝试读取 EXIF 拍摄月份，视频默认回退到文件修改时间。
      </p>
      <p class="helper-text">若上传失败请尝试分批上传。</p>
      <p v-if="uploadNotice" class="upload-notice">{{ uploadNotice }}</p>
    </section>

    <div class="form-block">
      <label class="form-label">默认照片标题</label>
      <div class="action-row">
        <input
          v-model="defaultTitle"
          class="text-input full-input"
          placeholder="例如：2024年五一聚会"
          :disabled="uploading"
        />

        <button
          class="secondary-btn"
          :disabled="uploading || pendingPhotos.length === 0"
          @click="applyDefaultTitleToAll"
        >
          应用标题到全部
        </button>
      </div>
    </div>

    <section class="panel-card">
      <div class="section-title-row">
        <h2>批量默认设置</h2>
        <span class="badge">先套用默认值，再逐张微调</span>
      </div>

      <div class="form-block">
        <label class="form-label">默认拍摄月份</label>
        <div class="action-row">
          <input
            v-model="defaultShotMonth"
            class="text-input month-input"
            type="month"
            :disabled="uploading"
          />
          <button
            class="secondary-btn"
            :disabled="uploading || pendingPhotos.length === 0"
            @click="applyDefaultMonthToAll"
          >
            应用月份到全部
          </button>
        </div>
      </div>

      <div class="form-block">
        <label class="form-label">默认人物</label>

        <p v-if="persons.length === 0" class="helper-text">
          暂无成员，请先到“成员管理”页面添加。
        </p>

        <div v-else class="checkbox-wrap">
          <label
            v-for="person in persons"
            :key="person.id"
            class="checkbox-tag"
          >
            <input
              type="checkbox"
              :checked="defaultSelectedPersons.includes(person.id)"
              :disabled="uploading"
              @change="toggleDefaultPerson(person.id)"
            />
            <span>{{ person.name }}</span>
          </label>
        </div>

        <p class="helper-text">
          默认已选：{{ defaultPersonNames.length > 0 ? defaultPersonNames.join("、") : "未选择" }}
        </p>

        <div class="action-row">
          <button
            class="secondary-btn"
            :disabled="uploading || pendingPhotos.length === 0"
            @click="applyDefaultPersonsToAll"
          >
            应用人物到全部
          </button>

          <button
            class="primary-btn"
            :disabled="uploading || pendingPhotos.length === 0"
            @click="applyDefaultsToAll"
          >
            标题、月份和人物一起应用到全部
          </button>
        </div>
      </div>
    </section>

    <section class="panel-card">
      <div class="section-title-row">
        <div>
          <h2>上传预览</h2>
          <p class="helper-text">每张照片都可以单独设置标题、拍摄月份和人物。</p>
        </div>
      </div>

      <p v-if="pendingPhotos.length === 0" class="empty-text">还没有选择照片。</p>

      <div v-else class="upload-grid">
        <div v-for="item in pendingPhotos" :key="item.id" class="upload-card">
          <img
            v-if="item.mediaType === 'image'"
            :src="item.previewUrl"
            :alt="item.title || '待上传文件'"
            class="upload-preview"
          />
          <video
            v-else
            :src="item.previewUrl"
            class="upload-preview"
            controls
            muted
            playsinline
            preload="metadata"
          />

          <div class="form-block">
            <label class="form-label">{{ item.mediaType === "video" ? "视频标题" : "照片标题" }}</label>
            <input
              :value="item.title"
              class="text-input full-input"
              :placeholder="item.mediaType === 'video' ? '视频标题' : '照片标题'"
              :disabled="uploading"
              @input="handlePendingTitleInput(item.id, $event)"
            />
          </div>

          <div class="form-block">
            <label class="form-label">拍摄月份</label>
            <input
              :value="item.shotMonth"
              class="text-input month-input"
              type="month"
              :disabled="uploading"
              @input="handlePendingShotMonthInput(item.id, $event)"
            />
          </div>

          <div class="form-block">
            <label class="form-label">{{ item.mediaType === "video" ? "视频人物" : "照片人物" }}</label>

            <p v-if="persons.length === 0" class="helper-text">暂无成员。</p>

            <div v-else class="checkbox-wrap">
              <label
                v-for="person in persons"
                :key="person.id"
                class="checkbox-tag"
              >
                <input
                  type="checkbox"
                  :checked="item.selectedPersons.includes(person.id)"
                  :disabled="uploading"
                  @change="togglePendingPerson(item.id, person.id)"
                />
                <span>{{ person.name }}</span>
              </label>
            </div>

            <p class="helper-text">
              已选：{{
                getSelectedPersonNames(item.selectedPersons).length > 0
                  ? getSelectedPersonNames(item.selectedPersons).join("、")
                  : "未选择"
              }}
            </p>
          </div>

          <button
            class="danger-outline-btn"
            :disabled="uploading"
            @click="removePendingPhoto(item.id)"
          >
            移除这张
          </button>
        </div>
      </div>

      <div v-if="pendingPhotos.length > 0" class="upload-footer-actions">
        <button class="secondary-btn" :disabled="uploading" @click="clearAllPending">
          清空全部
        </button>

        <button class="primary-btn" :disabled="uploading" @click="handleBatchUpload">
          {{ uploading ? "上传中..." : "确认批量上传" }}
        </button>
      </div>
    </section>
  </div>
</template>
