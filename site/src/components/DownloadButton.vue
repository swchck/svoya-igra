<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Download } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { detectPlatform, DOWNLOADS, downloadUrl, isAvailable, latestRelease, type PlatformId } from '~site/downloads'

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
      <a :href="downloadUrl(target)"><Download />Скачать для {{ target.label }}</a>
    </Button>
    <Button v-else as-child size="lg" class="h-12 px-6 text-base">
      <a href="#download"><Download />Скачать</a>
    </Button>
    <p class="text-sm text-muted-foreground">
      <template v-if="latestRelease && released">Версия {{ latestRelease.version }} · {{ latestRelease.date }} · бесплатно</template>
      <template v-else-if="latestRelease !== undefined">Первая версия ещё не опубликована</template>
      <template v-else>Бесплатно · macOS, Windows, Linux</template>
    </p>
  </div>
</template>
