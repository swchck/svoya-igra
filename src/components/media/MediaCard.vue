<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  ArrowDown, ArrowUp, AudioLines, Check, ChevronDown, Clapperboard, EllipsisVertical, FolderOpen, GripVertical, Image as ImageIcon,
  Link as LinkIcon, Crop, Trash2, Video,
} from '@lucide/vue'
import type { MediaItem, MediaKind, MediaMode } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import IconButton from '@/components/IconButton.vue'
import MediaElement from '@/components/MediaElement.vue'
import { parseYoutubeUrl } from '@/game/youtube'
import { detectKind } from '@/media/kind'
import { isStoredMedia } from '@/media/ref'
import { formatTime, segmentOf } from '@/media/segment'
import MediaThumb from './MediaThumb.vue'
import SegmentEditor from './SegmentEditor.vue'
import CropDialog from './CropDialog.vue'
import { DRAG_TYPE } from './drag'
import { isWebLink, useMediaIngest } from './useMediaIngest'

const { t } = useI18n()
const props = defineProps<{ item: MediaItem; index: number; count: number; expanded: boolean }>()

// one event per user action: separate url/kind/mode events would each be merged
// into the same stale props snapshot and overwrite one another
const emit = defineEmits<{
  (e: 'update', v: MediaItem): void
  (e: 'toggle'): void
  (e: 'remove'): void
  (e: 'move', dir: -1 | 1): void
  (e: 'dragstart'): void
  (e: 'dragend'): void
}>()

const { fromFiles } = useMediaIngest()

const KIND_ICONS = { image: ImageIcon, audio: AudioLines, video: Clapperboard, youtube: Video } as const
const stored = computed(() => isStoredMedia(props.item.url))
const youtube = computed(() => (props.item.kind === 'youtube' ? parseYoutubeUrl(props.item.url) : null))
const timed = computed(() => props.item.kind !== 'image')
const segment = computed(() => segmentOf(props.item))
const hasSegment = computed(() => props.item.start !== undefined || props.item.end !== undefined)

const title = computed(() => {
  const { url, kind } = props.item
  if (youtube.value) return `YouTube · ${youtube.value.id}`
  if (stored.value) return t(`media.card.stored.${kind}`)
  try {
    const u = new URL(url)
    const path = u.pathname === '/' ? '' : u.pathname
    return u.host + path
  } catch {
    return url || t(`media.kind.${kind}`)
  }
})

const autoKind = computed(() => stored.value || detectKind({ url: props.item.url }) === props.item.kind)
const kindMenuLabel = computed(() => (autoKind.value ? t('media.kind.auto') : t(`media.kind.${props.item.kind}`)))

function patch(p: Partial<MediaItem>) {
  emit('update', { ...props.item, ...p })
}

function modeFor(kind: MediaKind): MediaMode | undefined {
  return kind === 'youtube' ? props.item.mode ?? 'video' : undefined
}

function setKind(v: unknown) {
  const kind = (v !== 'auto' && (v as MediaKind)) || detectKind({ url: props.item.url }) || props.item.kind
  patch({ kind, mode: modeFor(kind) })
}

const fileInput = ref<HTMLInputElement | null>(null)
async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const [next] = await fromFiles([file])
  if (next) patch({ url: next.url, kind: next.kind, mode: undefined, start: undefined, end: undefined })
}

const cropping = ref(false)
function onCropped(url: string) {
  patch({ url })
}

const editingLink = ref(false)
const linkDraft = ref('')
const linkInput = ref<InstanceType<typeof Input> | null>(null)
const linkInvalid = ref(false)

async function startLink() {
  linkDraft.value = stored.value ? '' : props.item.url
  linkInvalid.value = false
  editingLink.value = true
  await nextTick()
  ;(linkInput.value?.$el as HTMLInputElement | undefined)?.focus()
}

function applyLink() {
  const url = linkDraft.value.trim()
  if (!isWebLink(url)) {
    linkInvalid.value = true
    return
  }
  const kind = detectKind({ url }) ?? props.item.kind
  editingLink.value = false
  if (url !== props.item.url) patch({ url, kind, mode: modeFor(kind), start: undefined, end: undefined })
}

// the native drag starts on the whole card, so it is only armed while the grip is held
const armed = ref(false)
function onDragStart(e: DragEvent) {
  e.dataTransfer?.setData(DRAG_TYPE, props.item.id)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
  emit('dragstart')
}
function onDragEnd() {
  armed.value = false
  emit('dragend')
}

const segmentText = computed(
  () => `${formatTime(segment.value.start)} – ${segment.value.end === undefined ? t('media.card.toEnd') : formatTime(segment.value.end)}`,
)
</script>

<template>
  <div
    class="card"
    :class="{ open: expanded }"
    :draggable="armed"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
  >
    <div class="head">
      <button type="button" class="main" :aria-expanded="expanded" :aria-label="`${title}, ${t(`media.kind.${item.kind}`)}`" @click="emit('toggle')">
        <MediaThumb :item="item" />
        <span class="min-w-0 flex-1 text-left">
          <span class="title">{{ title }}</span>
          <span class="chips">
            <span class="chip"><component :is="KIND_ICONS[item.kind]" class="size-3" />{{ t(`media.kind.${item.kind}`) }}</span>
            <span v-if="item.kind === 'youtube'" class="chip">{{ item.mode === 'audio' ? t('media.mode.audioOnly') : t('media.mode.video') }}</span>
            <span v-if="timed && hasSegment" class="chip gold tabular-nums">{{ segmentText }}</span>
          </span>
        </span>
        <ChevronDown class="chevron size-4 text-muted-foreground" aria-hidden="true" />
      </button>
      <span
        class="grip"
        aria-hidden="true"
        @pointerdown="armed = true"
        @pointerup="armed = false"
        @pointercancel="armed = false"
      ><GripVertical class="size-5" /></span>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="icon-sm" :aria-label="t('media.card.more')"><EllipsisVertical /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-auto min-w-44">
          <DropdownMenuItem :disabled="index === 0" @select="emit('move', -1)"><ArrowUp />{{ t('media.card.moveUp') }}</DropdownMenuItem>
          <DropdownMenuItem :disabled="index === count - 1" @select="emit('move', 1)"><ArrowDown />{{ t('media.card.moveDown') }}</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" @select="emit('remove')"><Trash2 />{{ t('media.card.remove') }}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <IconButton :label="t('media.card.remove')" @click="emit('remove')"><Trash2 /></IconButton>
    </div>

    <div v-if="expanded" class="panel">
      <div class="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" @click="fileInput?.click()"><FolderOpen />{{ t('media.card.replaceFile') }}</Button>
        <Button size="sm" variant="secondary" @click="startLink"><LinkIcon />{{ t('media.card.changeLink') }}</Button>
        <Button v-if="item.kind === 'image'" size="sm" variant="secondary" @click="cropping = true"><Crop />{{ t('media.card.crop') }}</Button>
        <input ref="fileInput" type="file" class="hidden" accept="image/*,audio/*,video/*" @change="onFile" />

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button size="sm" variant="ghost" class="ml-auto text-muted-foreground">
              {{ t('media.card.type', { kind: kindMenuLabel }) }}<ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-auto min-w-40">
            <DropdownMenuRadioGroup :model-value="autoKind ? 'auto' : item.kind" @update:model-value="setKind">
              <DropdownMenuRadioItem value="auto">{{ t('media.kind.auto') }}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem v-for="k in (['image', 'audio', 'video', 'youtube'] as const)" :key="k" :value="k">
                {{ t(`media.kind.${k}`) }}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <form v-if="editingLink" class="flex items-center gap-2" @submit.prevent="applyLink" @keydown.esc.stop="editingLink = false">
        <Input
          ref="linkInput"
          v-model="linkDraft"
          name="media-url"
          type="url"
          class="flex-1"
          :placeholder="t('media.card.linkPlaceholder')"
          :aria-label="t('media.card.linkLabel')"
          :aria-invalid="linkInvalid || undefined"
          @update:model-value="linkInvalid = false"
        />
        <IconButton :label="t('media.card.applyLink')" variant="secondary" size="icon" type="submit"><Check /></IconButton>
      </form>

      <div v-if="item.kind === 'youtube'" class="flex items-center gap-3">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          class="mode-toggle"
          :aria-label="t('media.mode.label')"
          :model-value="item.mode ?? 'video'"
          @update:model-value="(v) => v && patch({ mode: v as MediaMode })"
        >
          <ToggleGroupItem value="video"><Video />{{ t('media.mode.video') }}</ToggleGroupItem>
          <ToggleGroupItem value="audio"><AudioLines />{{ t('media.mode.audioOnly') }}</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <SegmentEditor v-if="timed" :item="item" @patch="patch" />
      <div v-else class="image-preview"><MediaElement :item="item" preview /></div>
    </div>

    <CropDialog v-if="cropping" v-model:open="cropping" :item="item" @apply="onCropped" />
  </div>
</template>

<style scoped>
.card {
  border-radius: 14px;
  border: 1px solid oklch(1 0 0 / 0.1);
  background: oklch(0.14 0.1 274 / 0.55);
  transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
}
.card:hover {
  border-color: oklch(1 0 0 / 0.2);
}
.card.open {
  border-color: color-mix(in oklch, var(--gold) 55%, transparent);
  background: oklch(0.16 0.1 274 / 0.75);
}
.head {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 6px 6px 6px 6px;
}
.main {
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: center;
  gap: 12px;
  padding: 2px;
  border-radius: 10px;
  cursor: pointer;
  outline: none;
}
.main:focus-visible {
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--ring) 50%, transparent);
}
.title {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 500;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  background: oklch(1 0 0 / 0.08);
  color: var(--muted-foreground);
  font-size: 12px;
  line-height: 18px;
}
.chip.gold {
  background: color-mix(in oklch, var(--gold) 16%, transparent);
  color: var(--gold);
}
.mode-toggle :deep([data-state='on']) {
  background: color-mix(in oklch, var(--gold) 20%, transparent);
  color: var(--gold);
  border-color: color-mix(in oklch, var(--gold) 60%, transparent);
}
.chevron {
  flex: none;
  transition: transform 0.2s ease;
}
.open .chevron {
  transform: rotate(180deg);
}
.grip {
  display: grid;
  place-items: center;
  width: 24px;
  height: 32px;
  color: var(--muted-foreground);
  cursor: grab;
  touch-action: none;
}
.grip:hover {
  color: var(--foreground);
}
.panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 14px 14px;
  border-top: 1px solid oklch(1 0 0 / 0.08);
  animation: panel-in 0.2s ease;
}
.image-preview {
  display: flex;
  justify-content: center;
  padding: 8px;
  border-radius: 12px;
  background: oklch(0 0 0 / 0.25);
}
.image-preview :deep(img) {
  max-height: 240px;
  max-width: 100%;
  border-radius: 8px;
}
@keyframes panel-in {
  from { opacity: 0; transform: translateY(-4px); }
}
@media (prefers-reduced-motion: reduce) {
  .panel { animation: none; }
  .card, .chevron { transition: none; }
}
</style>
