<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ChevronDown, Coffee, Pause as PauseIcon, Play } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

defineProps<{ paused: boolean }>()
const emit = defineEmits<{ (e: 'pause', minutes?: number): void; (e: 'resume'): void }>()
const { t } = useI18n()

const BREAKS = [5, 10, 15]
</script>

<template>
  <Button v-if="paused" variant="ghost" aria-keyshortcuts="P" @click="emit('resume')"><Play />{{ t('play.pause.resume') }}</Button>
  <span v-else class="inline-flex">
    <Button variant="ghost" class="rounded-r-none" aria-keyshortcuts="P" @click="emit('pause')"><PauseIcon />{{ t('play.pause.pause') }}</Button>
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button variant="ghost" size="icon" class="rounded-l-none" :aria-label="t('play.pause.breakMenu')"><ChevronDown /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem v-for="m in BREAKS" :key="m" @select="emit('pause', m)"><Coffee />{{ t('play.pause.breakFor', { n: m }) }}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </span>
</template>
