<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Loader2, Wifi } from '@lucide/vue'
import type { Game } from '@/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { exportGameZip } from '@/io/archive'
import { fileSlug } from '@/io/files'
import { shareFile, stopSharing, type LanInfo } from '@/play/lan'
import LanQr from './LanQr.vue'

const props = defineProps<{ game: Game | null }>()
const open = defineModel<boolean>('open', { required: true })
const { t } = useI18n()

const info = ref<LanInfo | null>(null)
const error = ref('')
const preparing = ref(false)
let shared = false
let attempt = 0

async function share(game: Game) {
  const mine = ++attempt
  preparing.value = true
  error.value = ''
  info.value = null
  try {
    const bytes = new Uint8Array(await (await exportGameZip(game)).arrayBuffer())
    const result = await shareFile(bytes, `${fileSlug(game.title)}.gamezip`)
    shared = true
    // closed while the file was being prepared: take it down again
    if (!open.value) unshare()
    else if (mine === attempt) info.value = result
  } catch (err) {
    const message = String(err instanceof Error ? err.message : err)
    if (mine === attempt) error.value = message === 'no-network' ? t('lan.errors.noNetwork') : message
  } finally {
    if (mine === attempt) preparing.value = false
  }
}

function unshare() {
  if (!shared) return
  shared = false
  stopSharing().catch((err) => console.warn('LAN share:', err))
}

watch(open, (isOpen) => {
  if (isOpen && props.game) share(props.game)
  else {
    attempt++
    info.value = null
    unshare()
  }
})
onUnmounted(unshare)
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="flex flex-col gap-4 sm:max-w-lg">
      <div>
        <DialogTitle class="flex items-center gap-2 font-display text-xl uppercase text-gold"><Wifi class="size-5" />{{ t('lan.share.title') }}</DialogTitle>
        <DialogDescription class="mt-1 text-muted-foreground">{{ t('lan.share.description') }}</DialogDescription>
      </div>
      <p v-if="preparing" class="flex items-center gap-2 text-muted-foreground" role="status"><Loader2 class="size-4 animate-spin" />{{ t('lan.share.preparing') }}</p>
      <p v-else-if="error" class="text-destructive" role="alert">{{ t('lan.share.failed') }}: {{ error }}</p>
      <LanQr v-else-if="info" :url="info.url" />
      <p class="text-xs text-muted-foreground">{{ t('lan.note') }}</p>
      <Button class="self-end" @click="open = false">{{ t('lan.share.done') }}</Button>
    </DialogContent>
  </Dialog>
</template>
