<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Download } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { detectPlatform, DOWNLOADS, downloadUrl, formatReleaseDate, isAvailable, latestRelease, type PlatformId } from '~site/downloads'

const { t } = useI18n()

const platform = ref<PlatformId | null>(null)
onMounted(async () => {
  platform.value = await detectPlatform()
})

const target = computed(() => DOWNLOADS.find((d) => d.id === platform.value))
const ready = computed(() => !!target.value && isAvailable(target.value))
const released = computed(() => DOWNLOADS.some(isAvailable))
</script>

<template>
  <div class="flex flex-col items-center gap-2 sm:items-start">
    <Button v-if="target && ready" as-child size="lg" class="h-12 px-6 text-base">
      <a :href="downloadUrl(target)"><Download />{{ t('site.download.buttonFor', { platform: target.label }) }}</a>
    </Button>
    <Button v-else as-child size="lg" class="h-12 px-6 text-base">
      <a href="#download"><Download />{{ t('site.download.button') }}</a>
    </Button>
    <p class="text-sm text-muted-foreground">
      <template v-if="latestRelease && released">{{ t('site.download.versionLine', { version: latestRelease.version, date: formatReleaseDate(latestRelease.publishedAt) }) }}</template>
      <template v-else-if="latestRelease !== undefined">{{ t('site.download.notPublished') }}</template>
      <template v-else>{{ t('site.download.freeLine') }}</template>
    </p>
  </div>
</template>
