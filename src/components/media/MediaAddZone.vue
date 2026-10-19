<script setup lang="ts">
import { inject, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, FolderOpen, ImagePlus, Images, Link as LinkIcon, Mic, Square } from '@lucide/vue'
import { toast } from 'vue-sonner'
import type { MediaItem } from '@/types'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import MediaThumb from './MediaThumb.vue'
import { GAME_MEDIA } from './library'
import { canRecord, MAX_RECORDING_SECONDS, useRecorder } from './useRecorder'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import IconButton from '@/components/IconButton.vue'

const { t } = useI18n()
/** `compact` is one row of buttons; the drop hint shows only while something is dragged over. */
defineProps<{ dropping?: boolean; compact?: boolean }>()
const emit = defineEmits<{
  (e: 'files', files: File[]): void
  (e: 'link', url: string): void
  (e: 'reuse', item: MediaItem): void
}>()

const library = inject(GAME_MEDIA, null)
const libraryOpen = ref(false)
function reuse(item: MediaItem) {
  libraryOpen.value = false
  emit('reuse', item)
}

const recorder = useRecorder((file) => emit('files', [file]))
watch(recorder.error, (code) => code && toast.error(t(`media.add.record.${code}`)))
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// the hint names the paste shortcut of the user's platform
const pasteKey = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘V' : 'Ctrl+V'

const fileInput = ref<HTMLInputElement | null>(null)
const linkInput = ref<InstanceType<typeof Input> | null>(null)
const linking = ref(false)
const link = ref('')

function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const files = [...(input.files ?? [])]
  input.value = ''
  if (files.length) emit('files', files)
}

async function openLink() {
  linking.value = true
  await nextTick()
  ;(linkInput.value?.$el as HTMLInputElement | undefined)?.focus()
}

function submit() {
  if (!link.value.trim()) return
  emit('link', link.value)
  link.value = ''
  linking.value = false
}
</script>

<template>
  <div class="zone" :class="{ dropping, compact }" tabindex="0" role="group" :aria-label="t('media.add.label')" :title="compact ? t('media.add.hint', { key: pasteKey }) : undefined">
    <form v-if="linking" class="flex w-full items-center gap-2" @submit.prevent="submit" @keydown.esc.stop="linking = false">
      <Input
        ref="linkInput"
        v-model="link"
        name="media-link"
        type="url"
        class="flex-1"
        :placeholder="t('media.add.linkPlaceholder')"
        :aria-label="t('media.add.linkLabel')"
      />
      <IconButton :label="t('media.add.addLink')" variant="secondary" size="icon" type="submit"><Check /></IconButton>
    </form>
    <div v-else-if="recorder.recording.value" class="recording" role="status">
      <span class="rec-dot" aria-hidden="true" />
      <span class="tabular-nums">{{ clock(recorder.seconds.value) }} / {{ clock(MAX_RECORDING_SECONDS) }}</span>
      <Button size="sm" variant="destructive" @click="recorder.stop"><Square />{{ t('media.add.record.stop') }}</Button>
    </div>
    <template v-else>
      <template v-if="!compact || dropping">
        <ImagePlus class="size-5 text-muted-foreground" aria-hidden="true" />
        <p class="hint">{{ t('media.add.hint', { key: pasteKey }) }}</p>
      </template>
      <div v-if="!dropping || !compact" class="flex flex-wrap justify-center gap-2">
        <Button size="sm" variant="secondary" @click="fileInput?.click()"><FolderOpen />{{ t('media.add.file') }}</Button>
        <Button size="sm" variant="secondary" @click="openLink"><LinkIcon />{{ t('media.add.link') }}</Button>
        <Button v-if="canRecord" size="sm" variant="secondary" :title="t('media.add.record.hint')" @click="recorder.start"><Mic />{{ t('media.add.record.start') }}</Button>
        <Popover v-if="library?.length" v-model:open="libraryOpen">
          <PopoverTrigger as-child>
            <Button size="sm" variant="secondary"><Images />{{ t('media.add.library.open') }}</Button>
          </PopoverTrigger>
          <PopoverContent class="w-80" align="center">
            <p class="mb-2 text-sm text-muted-foreground">{{ t('media.add.library.hint') }}</p>
            <div class="library">
              <button v-for="item in library" :key="item.url" type="button" class="lib-item" :aria-label="t(`media.kind.${item.kind}`)" @click="reuse(item)">
                <MediaThumb :item="item" />
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </template>
    <input ref="fileInput" type="file" multiple class="hidden" accept="image/*,audio/*,video/*" @change="onFiles" />
  </div>
</template>

<style scoped>
.recording {
  display: flex;
  align-items: center;
  gap: 10px;
}
.rec-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--magenta);
  animation: rec 1s ease-in-out infinite;
}
@keyframes rec {
  50% { opacity: 0.3; }
}
.library {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  max-height: 260px;
  overflow-y: auto;
}
.lib-item {
  aspect-ratio: 1;
  padding: 0;
  overflow: hidden;
  border: 1px solid oklch(var(--tint) 0 0 / 0.14);
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
}
.lib-item:hover {
  border-color: var(--gold);
}
.zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px;
  border-radius: 14px;
  border: 1.5px dashed oklch(var(--tint) 0 0 / 0.2);
  text-align: center;
  outline: none;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.zone:hover,
.zone:focus-visible {
  border-color: color-mix(in oklch, var(--gold) 70%, transparent);
  background: oklch(var(--tint) 0 0 / 0.03);
}
.zone:focus-visible {
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--ring) 40%, transparent);
}
.zone.dropping {
  border-color: var(--cyan);
}
.zone.compact {
  flex-direction: row;
  justify-content: flex-start;
  padding: 6px;
  border-width: 1px;
}
.zone.compact:not(.dropping) :deep(button) {
  background: transparent;
}
.zone.compact.dropping {
  justify-content: center;
  padding: 18px;
  background: color-mix(in oklch, var(--cyan) 8%, transparent);
}
.hint {
  margin: 0;
  max-width: 34ch;
  color: var(--muted-foreground);
  font-size: 13px;
  line-height: 1.4;
}
</style>
