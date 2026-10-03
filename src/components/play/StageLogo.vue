<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import type { MediaItem } from '@/types'
import { displayUrl } from '@/media/store'

const { t } = useI18n()
const props = defineProps<{ logo: MediaItem }>()
const src = ref('')

watchEffect(async () => {
  const url = props.logo.url
  const resolved = await displayUrl(url)
  if (url === props.logo.url) src.value = resolved
})
</script>

<template>
  <!-- the box has its height from the caller, so the logo arriving later moves nothing -->
  <span class="logo"><img v-if="src" :src="src" :alt="t('play.stage.logo')" draggable="false" /></span>
</template>

<style scoped>
.logo {
  display: inline-block;
  height: var(--logo-height, 48px);
}
img {
  height: 100%;
  width: auto;
  max-width: 60vw;
  object-fit: contain;
  filter: drop-shadow(0 6px 18px oklch(0.05 0.1 280 / 0.7));
}
</style>
