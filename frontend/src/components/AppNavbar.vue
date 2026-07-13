<script setup lang="ts">
import { computed, ref } from "vue"
import { RouterLink, useRoute } from "vue-router"

const route = useRoute()

const navItems = [
  { href: "/cover", label: "首页" },
  { href: "/members", label: "成员管理" },
  { href: "/upload", label: "上传文件" },
  { href: "/timeline", label: "时间轴" },
  { href: "/wall", label: "照片墙" },
]

const currentPath = computed(() => route.path)
const nightMode = ref(false)

function toggleTheme() {
  nightMode.value = !nightMode.value
  document.documentElement.classList.toggle("night-mode", nightMode.value)
}
</script>

<template>
  <header class="navbar">
    <div class="navbar-inner">
      <RouterLink to="/cover" class="brand">
        <span class="brand-mark" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </span>
        <span>RFZ照片墙</span>
      </RouterLink>

      <nav class="nav-links">
        <RouterLink
          v-for="item in navItems"
          :key="item.href"
          :to="item.href"
          :class="currentPath === item.href ? 'nav-link active' : 'nav-link'"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="nav-actions" aria-label="快捷操作">
        <button type="button" class="nav-icon-btn" aria-label="搜索">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
        </button>
        <button
          type="button"
          class="nav-icon-btn"
          :aria-label="nightMode ? '切换浅色主题' : '切换深色主题'"
          @click="toggleTheme"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.4A8.6 8.6 0 1 1 8.6 4 6.8 6.8 0 0 0 20 15.4Z" /></svg>
        </button>
        <button type="button" class="nav-icon-btn" aria-label="用户中心">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20c.8-3.5 3-5.2 6.5-5.2s5.7 1.7 6.5 5.2" /></svg>
        </button>
      </div>
    </div>
  </header>
</template>
