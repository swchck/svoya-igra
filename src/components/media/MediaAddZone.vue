<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, FolderOpen, ImagePlus, Link as LinkIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import IconButton from '@/components/IconButton.vue'

const { t } = useI18n()
defineProps<{ dropping?: boolean }>()
const emit = defineEmits<{
  (e: 'files', files: File[]): void
  (e: 'link', url: string): void
}>()

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
  <div class="zone" :class="{ dropping }" tabindex="0" role="group" :aria-label="t('media.add.label')">
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
    <template v-else>
      <ImagePlus class="size-5 text-muted-foreground" aria-hidden="true" />
      <p class="hint">{{ t('media.add.hint', { key: pasteKey }) }}</p>
      <div class="flex gap-2">
        <Button size="sm" variant="secondary" @click="fileInput?.click()"><FolderOpen />{{ t('media.add.file') }}</Button>
        <Button size="sm" variant="secondary" @click="openLink"><LinkIcon />{{ t('media.add.link') }}</Button>
      </div>
    </template>
    <input ref="fileInput" type="file" multiple class="hidden" accept="image/*,audio/*,video/*" @change="onFiles" />
  </div>
</template>

<style scoped>
.zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px;
  border-radius: 14px;
  border: 1.5px dashed oklch(1 0 0 / 0.2);
  text-align: center;
  outline: none;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.zone:hover,
.zone:focus-visible {
  border-color: color-mix(in oklch, var(--gold) 70%, transparent);
  background: oklch(1 0 0 / 0.03);
}
.zone:focus-visible {
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--ring) 40%, transparent);
}
.zone.dropping {
  border-color: var(--cyan);
}
.hint {
  margin: 0;
  max-width: 34ch;
  color: var(--muted-foreground);
  font-size: 13px;
  line-height: 1.4;
}
</style>
