<script setup lang="ts">
import { Volume2, VolumeX } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { setSoundEffects, soundEffectsOn } from '@/play/sounds'

const { t } = useI18n()
</script>

<template>
  <Button
    variant="ghost"
    size="icon"
    :aria-pressed="soundEffectsOn"
    :aria-label="soundEffectsOn ? t('common.sound.on') : t('common.sound.off')"
    :title="soundEffectsOn ? t('common.sound.on') : t('common.sound.off')"
    @click="setSoundEffects(!soundEffectsOn)"
  >
    <Volume2 v-if="soundEffectsOn" />
    <VolumeX v-else class="opacity-60" />
  </Button>
</template>
