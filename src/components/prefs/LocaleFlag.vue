<script setup lang="ts">
import type { Locale } from '@/i18n'

defineProps<{ locale: Locale }>()
</script>

<!-- drawn rather than emoji: Windows has no flag emoji and shows the two letters instead -->
<template>
  <svg v-if="locale === 'ru'" viewBox="0 0 9 6" class="flag" aria-hidden="true">
    <rect width="9" height="2" fill="#fff" />
    <rect y="2" width="9" height="2" fill="#0039a6" />
    <rect y="4" width="9" height="2" fill="#d52b1e" />
  </svg>
  <svg v-else-if="locale === 'sr'" viewBox="0 0 9 6" class="flag" aria-hidden="true">
    <rect width="9" height="2" fill="#c6363c" />
    <rect y="2" width="9" height="2" fill="#0c4076" />
    <rect y="4" width="9" height="2" fill="#fff" />
  </svg>
  <svg v-else viewBox="0 0 60 30" class="flag" aria-hidden="true">
    <clipPath id="uk-t"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" /></clipPath>
    <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6" />
    <path d="M0,0 L60,30 M60,0 L0,30" clip-path="url(#uk-t)" stroke="#c8102e" stroke-width="4" />
    <path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10" />
    <path d="M30,0 v30 M0,15 h60" stroke="#c8102e" stroke-width="6" />
  </svg>
</template>

<style scoped>
.flag {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
