<script setup lang="ts">
import { RouterView, useRoute } from "vue-router"

import AppNavbar from "./components/AppNavbar.vue"

const route = useRoute()
</script>

<template>
  <div class="ambient-grid" aria-hidden="true" />
  <AppNavbar />
  <main class="page-container">
    <RouterView :key="route.fullPath" />
  </main>
</template>
