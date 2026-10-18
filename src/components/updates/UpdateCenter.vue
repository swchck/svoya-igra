<script setup lang="ts">
import { watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { tour } from '@/tour/state'
import { offerUpdate, startUpdates, updates } from '@/updates/state'
import UpdateDialog from './UpdateDialog.vue'
import WhatsNewDialog from './WhatsNewDialog.vue'

const route = useRoute()
startUpdates()

// news waits for the library: never over a game, the editor or a running tour
const CALM_ROUTES = ['home', 'settings']
watchEffect(() => {
  if (!CALM_ROUTES.includes(String(route.name)) || tour.active || updates.offerOpen || updates.whatsNewOpen) return
  if (updates.whatsNew.length) updates.whatsNewOpen = true
  else if (updates.offerPending) offerUpdate()
})
</script>

<template>
  <UpdateDialog />
  <WhatsNewDialog />
</template>
