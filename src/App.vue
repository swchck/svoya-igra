<script setup lang="ts">
import { RouterView } from 'vue-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import ConfirmHost from '@/components/ConfirmHost.vue'
import 'vue-sonner/style.css'
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
