<script setup lang="ts">
import { Volume2, VolumeX } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import { playSound, setSoundEffects, setSoundVolume, soundEffectsOn, soundVolume } from '@/play/sounds'

const { t } = useI18n()

// a sample on release tells the host how loud the stage will be
function commit() {
  playSound('correct')
}
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button variant="ghost" size="icon" :aria-label="soundEffectsOn ? t('common.sound.on') : t('common.sound.off')" :title="soundEffectsOn ? t('common.sound.on') : t('common.sound.off')">
        <Volume2 v-if="soundEffectsOn" />
        <VolumeX v-else class="opacity-60" />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="end" class="flex w-60 items-center gap-3">
      <Button
        variant="ghost"
        size="icon"
        class="shrink-0"
        :aria-label="soundEffectsOn ? t('common.sound.mute') : t('common.sound.unmute')"
        :title="soundEffectsOn ? t('common.sound.mute') : t('common.sound.unmute')"
        @click="setSoundEffects(!soundEffectsOn)"
      >
        <Volume2 v-if="soundEffectsOn" />
        <VolumeX v-else />
      </Button>
      <Slider
        :model-value="[soundVolume]"
        :min="0"
        :max="100"
        :step="5"
        :disabled="!soundEffectsOn"
        :thumb-labels="[t('common.sound.volume')]"
        @update:model-value="(v) => v && setSoundVolume(v[0])"
        @value-commit="commit"
      />
      <span class="w-9 shrink-0 text-right text-sm tabular-nums text-muted-foreground" aria-hidden="true">{{ soundVolume }}</span>
    </PopoverContent>
  </Popover>
</template>
