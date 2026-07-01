<script setup lang="ts">
import { RouterView } from "vue-router"

import AppNavbar from "./components/AppNavbar.vue"
</script>

<template>
  <div class="ambient-grid" aria-hidden="true" />
  <AppNavbar />
  <main class="page-container">
    <RouterView />
  </main>
</template>
