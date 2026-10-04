<script setup lang="ts">
import { watchEffect } from 'vue'
import { RouterView } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import ConfirmHost from '@/components/ConfirmHost.vue'
import { useDesktopIntegration } from '@/composables/useDesktopIntegration'
import { syncMotionClass } from '@/lib/motion'
import 'vue-sonner/style.css'

const { t } = useI18n()

watchEffect(() => {
  document.title = t('system.appName')
})

useDesktopIntegration()
syncMotionClass()
</script>

<template>
  <TooltipProvider :delay-duration="300">
    <div class="flex min-h-screen flex-col">
      <RouterView />
    </div>
    <ConfirmHost />
    <Toaster position="bottom-right" rich-colors close-button />
  </TooltipProvider>
</template>
