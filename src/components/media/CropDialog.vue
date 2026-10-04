<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Check, Loader2 } from '@lucide/vue'
import type { MediaItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { isStoredMedia } from '@/media/ref'
import { getMedia, putMedia } from '@/media/store'
import { IMAGE_LEVELS, optimizeImage } from '@/media/optimize'
import { prefs } from '@/prefs'
import { applyRatio, cropBlob, moveRect, resizeRect, snapRect, type Handle, type Rect, type Size } from '@/media/crop'

const props = defineProps<{ item: MediaItem }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ (e: 'apply', url: string): void }>()

const { t } = useI18n()

const PRESETS = { free: undefined, '16:9': 16 / 9, '4:3': 4 / 3, '1:1': 1 } as const
type Preset = keyof typeof PRESETS
const PRESET_KEYS = Object.keys(PRESETS) as Preset[]

const source = ref<Blob | null>(null)
const objectUrl = ref('')
const loadFailed = ref(false)
const size = ref<Size | null>(null)
const rect = ref<Rect>({ x: 0, y: 0, w: 1, h: 1 })
const preset = ref<Preset>('free')
const busy = ref(false)
const img = ref<HTMLImageElement | null>(null)
const box = ref<HTMLElement | null>(null)

const ratio = computed(() => PRESETS[preset.value])
const animated = computed(() => source.value?.type === 'image/gif')
const whole = computed(() => !!size.value && rect.value.w >= size.value.w - 0.5 && rect.value.h >= size.value.h - 0.5)
const pixels = computed(() => {
  if (!size.value) return ''
  const r = snapRect(rect.value, size.value)
  return `${r.w} × ${r.h}`
})
const boxStyle = computed(() => {
  const s = size.value
  if (!s) return {}
  const r = rect.value
  return { left: `${(r.x / s.w) * 100}%`, top: `${(r.y / s.h) * 100}%`, width: `${(r.w / s.w) * 100}%`, height: `${(r.h / s.h) * 100}%` }
})

onMounted(async () => {
  try {
    const { url } = props.item
    // a remote picture is only readable when its host allows it, otherwise the canvas stays tainted
    const blob = isStoredMedia(url) ? await getMedia(url) : await fetch(url).then((r) => (r.ok ? r.blob() : null))
    if (!blob) throw new Error('no picture')
    source.value = blob
    objectUrl.value = URL.createObjectURL(blob)
  } catch {
    loadFailed.value = true
  }
})
onBeforeUnmount(() => {
  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
})

function onImageLoad() {
  const el = img.value
  if (!el) return
  size.value = { w: el.naturalWidth, h: el.naturalHeight }
  const w = el.naturalWidth * 0.8
  const h = el.naturalHeight * 0.8
  rect.value = { x: (el.naturalWidth - w) / 2, y: (el.naturalHeight - h) / 2, w, h }
}

function onPreset(value: unknown) {
  // clicking the active preset would deselect it
  if (typeof value !== 'string' || !size.value) return
  preset.value = value as Preset
  const r = PRESETS[preset.value]
  if (r) rect.value = applyRatio(rect.value, r, size.value)
}

interface Drag {
  pointerId: number
  handle: Handle | 'move'
  x: number
  y: number
  start: Rect
}
let drag: Drag | null = null

function onPointerDown(e: PointerEvent) {
  if (!size.value || (e.pointerType === 'mouse' && e.button !== 0)) return
  const handle = (e.target as HTMLElement).closest<HTMLElement>('[data-handle]')?.dataset.handle as Handle | undefined
  drag = { pointerId: e.pointerId, handle: handle ?? 'move', x: e.clientX, y: e.clientY, start: rect.value }
  box.value?.setPointerCapture(e.pointerId)
  // default action off to stop text selection and touch scrolling, which also skips focus: take it by hand
  e.preventDefault()
  box.value?.focus()
}

function onPointerMove(e: PointerEvent) {
  const el = img.value
  if (!drag || drag.pointerId !== e.pointerId || !el || !size.value) return
  const scale = size.value.w / el.getBoundingClientRect().width
  const dx = (e.clientX - drag.x) * scale
  const dy = (e.clientY - drag.y) * scale
  rect.value =
    drag.handle === 'move'
      ? moveRect(drag.start, dx, dy, size.value)
      : resizeRect(drag.start, drag.handle, dx, dy, size.value, ratio.value)
}

function onPointerUp(e: PointerEvent) {
  if (drag?.pointerId === e.pointerId) drag = null
}

const ARROWS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }

function onKeydown(e: KeyboardEvent) {
  const dir = ARROWS[e.key]
  if (!dir || !size.value) return
  e.preventDefault()
  const step = e.altKey ? 1 : Math.max(1, Math.round(Math.max(size.value.w, size.value.h) / 100))
  const [dx, dy] = [dir[0] * step, dir[1] * step]
  rect.value = e.shiftKey ? resizeRect(rect.value, 'se', dx, dy, size.value, ratio.value) : moveRect(rect.value, dx, dy, size.value)
}

async function apply() {
  if (!source.value || !size.value || busy.value) return
  busy.value = true
  try {
    const cropped = await cropBlob(source.value, snapRect(rect.value, size.value))
    emit('apply', await putMedia(await optimizeImage(cropped, IMAGE_LEVELS[prefs.imageQuality])))
    open.value = false
  } catch (err) {
    toast.error(t('media.crop.failed'), { description: (err as Error).message })
  } finally {
    busy.value = false
  }
}

const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="flex max-h-[94dvh] flex-col gap-3 sm:max-w-3xl" @open-auto-focus.prevent>
      <div class="pr-8">
        <DialogTitle class="title">{{ t('media.crop.title') }}</DialogTitle>
        <DialogDescription class="sr-only">{{ t('media.crop.description') }}</DialogDescription>
      </div>

      <p v-if="loadFailed" class="state" role="alert">{{ t('media.crop.loadFailed') }}</p>
      <p v-else-if="!objectUrl" class="state" role="status"><Loader2 class="size-4 animate-spin" />{{ t('media.crop.loading') }}</p>

      <template v-else>
        <ToggleGroup type="single" variant="outline" size="sm" class="presets" :aria-label="t('media.crop.shape')" :model-value="preset" @update:model-value="onPreset">
          <ToggleGroupItem v-for="key in PRESET_KEYS" :key="key" :value="key">{{ key === 'free' ? t('media.crop.free') : key }}</ToggleGroupItem>
        </ToggleGroup>

        <div class="stage">
          <div class="frame">
            <img ref="img" :src="objectUrl" alt="" draggable="false" @load="onImageLoad" />
            <div
              v-if="size"
              ref="box"
              class="box"
              tabindex="0"
              role="group"
              :aria-label="t('media.crop.area')"
              :aria-description="t('media.crop.keys')"
              :style="boxStyle"
              @pointerdown="onPointerDown"
              @pointermove="onPointerMove"
              @pointerup="onPointerUp"
              @pointercancel="onPointerUp"
              @keydown="onKeydown"
            >
              <span v-for="h in HANDLES" :key="h" class="handle" :class="h" :data-handle="h" />
            </div>
          </div>
        </div>

        <p v-if="animated" class="note">{{ t('media.crop.animated') }}</p>
      </template>

      <div class="foot">
        <span class="size tabular-nums">{{ pixels }}</span>
        <span class="flex-1" />
        <Button variant="ghost" @click="open = false">{{ t('media.crop.cancel') }}</Button>
        <Button :disabled="!size || whole || busy" @click="apply">
          <Loader2 v-if="busy" class="animate-spin" /><Check v-else />{{ t('media.crop.apply') }}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.title {
  font-family: var(--font-display);
  font-size: 22px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--gold);
}
.state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0;
  padding: 48px 8px;
  color: var(--muted-foreground);
  text-align: center;
}
.presets :deep([data-state='on']) {
  background: color-mix(in oklch, var(--gold) 20%, transparent);
  color: var(--gold);
  border-color: color-mix(in oklch, var(--gold) 60%, transparent);
}
.stage {
  display: grid;
  place-items: center;
  min-height: 0;
  padding: 16px;
  overflow: hidden;
  border-radius: 12px;
  background: oklch(0 0 0 / 0.35);
}
.frame {
  position: relative;
  width: fit-content;
  max-width: 100%;
  line-height: 0;
}
.frame img {
  display: block;
  max-width: 100%;
  max-height: min(56dvh, 520px);
  user-select: none;
  -webkit-user-drag: none;
}
.box {
  position: absolute;
  box-sizing: border-box;
  border: 1.5px solid var(--gold);
  /* dims the picture outside the box; the stage clips it */
  box-shadow: 0 0 0 9999px oklch(0 0 0 / 0.58);
  background:
    linear-gradient(oklch(1 0 0 / 0.35), oklch(1 0 0 / 0.35)) 33.33% 0 / 1px 100% no-repeat,
    linear-gradient(oklch(1 0 0 / 0.35), oklch(1 0 0 / 0.35)) 66.66% 0 / 1px 100% no-repeat,
    linear-gradient(oklch(1 0 0 / 0.35), oklch(1 0 0 / 0.35)) 0 33.33% / 100% 1px no-repeat,
    linear-gradient(oklch(1 0 0 / 0.35), oklch(1 0 0 / 0.35)) 0 66.66% / 100% 1px no-repeat;
  cursor: move;
  touch-action: none;
  outline: none;
}
.box:focus-visible {
  outline: 3px solid color-mix(in oklch, var(--ring) 60%, transparent);
  outline-offset: 2px;
}
.handle {
  position: absolute;
  width: 14px;
  height: 14px;
  margin: -7px 0 0 -7px;
  border-radius: 3px;
  background: var(--gold);
  box-shadow: 0 0 0 1.5px var(--night);
  touch-action: none;
}
/* a 36px hit area around the 14px mark, for fingers */
.handle::before {
  content: '';
  position: absolute;
  inset: -11px;
}
.handle.nw { left: 0; top: 0; cursor: nwse-resize; }
.handle.n { left: 50%; top: 0; cursor: ns-resize; }
.handle.ne { left: 100%; top: 0; cursor: nesw-resize; }
.handle.e { left: 100%; top: 50%; cursor: ew-resize; }
.handle.se { left: 100%; top: 100%; cursor: nwse-resize; }
.handle.s { left: 50%; top: 100%; cursor: ns-resize; }
.handle.sw { left: 0; top: 100%; cursor: nesw-resize; }
.handle.w { left: 0; top: 50%; cursor: ew-resize; }
.note {
  margin: 0;
  font-size: 13px;
  color: var(--muted-foreground);
}
.foot {
  display: flex;
  align-items: center;
  gap: 8px;
}
.size {
  font-size: 13px;
  color: var(--muted-foreground);
}
</style>
