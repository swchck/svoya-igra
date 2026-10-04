<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { CircleHelp } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { startTour, type TourId } from './state'

defineProps<{ id: TourId }>()
const { t } = useI18n()
</script>

<template>
  <Button variant="ghost" size="icon" :aria-label="t('tour.restart')" :title="t('tour.restart')" data-tour="help" @click="startTour(id)"><CircleHelp /></Button>
</template>
