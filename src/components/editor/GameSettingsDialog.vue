<script setup lang="ts">
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { useI18n } from 'vue-i18n'
import { ImagePlus, Settings, Trash2 } from '@lucide/vue'
import { ACCENT_NAMES, STAGE_LOOKS, type GameSettings, type StageLook } from '@/types'
import { MAX_ANSWER_SECONDS } from '@/game/parse'
import { ACCENTS, lookAttrs, stageLook } from '@/play/accents'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import NumberInput from '@/components/NumberInput.vue'
import StageLogo from '@/components/play/StageLogo.vue'
import MediaThumb from '@/components/media/MediaThumb.vue'
import { useMediaIngest } from '@/components/media/useMediaIngest'

const { t } = useI18n()
const settings = defineModel<GameSettings | undefined>()
const { fromFiles } = useMediaIngest()
const fileInput = ref<HTMLInputElement>()
const backgroundInput = ref<HTMLInputElement>()

/** Applies a change; a game with no settings left carries none. */
function update(patch: Partial<GameSettings>) {
  const next: GameSettings = { ...settings.value, ...patch }
  for (const key of Object.keys(next) as (keyof GameSettings)[]) {
    if (next[key] === undefined || next[key] === false || next[key] === '' || next[key] === 0) delete next[key]
  }
  settings.value = Object.keys(next).length ? next : undefined
}

async function pickImage(e: Event, field: 'logo' | 'background') {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const [item] = await fromFiles([file])
  if (!item) return
  if (item.kind !== 'image') toast.error(t('media.list.rejected', { name: file.name }), { description: t('media.list.unsupportedHint') })
  else update({ [field]: item })
}

function pickLook(look: StageLook) {
  update({ look: look === 'studio' ? undefined : look })
}
</script>

<template>
  <Dialog>
    <DialogTrigger as-child>
      <Button variant="secondary" data-tour="game-settings"><Settings />{{ t('settings.open') }}</Button>
    </DialogTrigger>
    <DialogContent class="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
      <DialogTitle>{{ t('settings.title') }}</DialogTitle>
      <DialogDescription>{{ t('settings.description') }}</DialogDescription>

      <Tabs default-value="timer" class="min-w-0 flex-col">
        <TabsList class="w-full">
          <TabsTrigger value="timer">{{ t('settings.tabs.timer') }}</TabsTrigger>
          <TabsTrigger value="look">{{ t('settings.tabs.look') }}</TabsTrigger>
        </TabsList>

        <TabsContent value="timer" class="grid grid-cols-[minmax(0,1fr)] gap-4 pt-3">
          <div class="grid gap-2">
            <Label as="span">{{ t('settings.timer.answerSeconds') }}</Label>
            <NumberInput
              class="w-40"
              :model-value="settings?.answerSeconds"
              :min="0"
              :max="MAX_ANSWER_SECONDS"
              :step="5"
              :step-snapping="false"
              @update:model-value="(v) => update({ answerSeconds: v })"
            />
            <p class="hint">{{ t('settings.timer.answerHint') }}</p>
          </div>
          <label class="check">
            <input
              type="checkbox"
              :checked="!!settings?.timerAutoStart"
              :disabled="!settings?.answerSeconds"
              @change="(e) => update({ timerAutoStart: (e.target as HTMLInputElement).checked })"
            />
            {{ t('settings.timer.autoStart') }}
          </label>
        </TabsContent>

        <TabsContent value="look" class="grid grid-cols-[minmax(0,1fr)] gap-5 pt-3">
          <div class="grid gap-2" role="radiogroup" :aria-label="t('settings.look.style')">
            <Label as="span">{{ t('settings.look.style') }}</Label>
            <div class="looks">
              <button
                v-for="name in STAGE_LOOKS"
                :key="name"
                type="button"
                role="radio"
                class="look"
                :class="{ on: stageLook(settings) === name }"
                :aria-checked="stageLook(settings) === name"
                @click="pickLook(name)"
              >
                <span class="swatch" v-bind="lookAttrs({ look: name })" aria-hidden="true">
                  <span class="mini-theme" /><span class="mini-cell">200</span>
                </span>
                <span class="look-name">{{ t(`settings.look.styles.${name}`) }}</span>
              </button>
            </div>
            <p class="hint">{{ t(`settings.look.styleHints.${stageLook(settings)}`) }}</p>
          </div>

          <div class="grid gap-2">
            <Label as="span">{{ t('settings.look.background') }}</Label>
            <div class="flex flex-wrap items-center gap-3">
              <MediaThumb v-if="settings?.background" :item="settings.background" class="bg-thumb" />
              <Button variant="outline" @click="backgroundInput?.click()"><ImagePlus />{{ t('settings.look.backgroundAdd') }}</Button>
              <Button v-if="settings?.background" variant="ghost" @click="update({ background: undefined })"><Trash2 />{{ t('settings.look.backgroundRemove') }}</Button>
              <input ref="backgroundInput" type="file" accept="image/*" class="sr-only" tabindex="-1" aria-hidden="true" @change="(e) => pickImage(e, 'background')" />
            </div>
            <p class="hint">{{ t('settings.look.backgroundHint') }}</p>
          </div>

          <div class="grid gap-2" role="radiogroup" :aria-label="t('settings.look.accent')">
            <Label as="span">{{ t('settings.look.accent') }}</Label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="name in ACCENT_NAMES"
                :key="name"
                type="button"
                role="radio"
                class="accent"
                :class="{ on: (settings?.accent ?? 'gold') === name }"
                :aria-checked="(settings?.accent ?? 'gold') === name"
                @click="update({ accent: name === 'gold' ? undefined : name })"
              >
                <span class="chip" :style="{ background: `linear-gradient(135deg, ${ACCENTS[name].gold}, ${ACCENTS[name].deep})` }" />
                {{ t(`settings.look.accents.${name}`) }}
              </button>
            </div>
          </div>

          <div class="grid gap-2">
            <Label as="span">{{ t('settings.look.logo') }}</Label>
            <div class="flex flex-wrap items-center gap-3">
              <div v-if="settings?.logo" class="logo-box"><StageLogo :logo="settings.logo" style="--logo-height: 48px" /></div>
              <Button variant="outline" @click="fileInput?.click()"><ImagePlus />{{ t('settings.look.logoAdd') }}</Button>
              <Button v-if="settings?.logo" variant="ghost" @click="update({ logo: undefined })"><Trash2 />{{ t('settings.look.logoRemove') }}</Button>
              <input ref="fileInput" type="file" accept="image/*" class="sr-only" tabindex="-1" aria-hidden="true" @change="(e) => pickImage(e, 'logo')" />
            </div>
            <p class="hint">{{ t('settings.look.logoHint') }}</p>
          </div>

          <div class="grid gap-2">
            <Label for="intro-text">{{ t('settings.look.introText') }}</Label>
            <Input
              id="intro-text"
              :model-value="settings?.introText ?? ''"
              :placeholder="t('settings.look.introPlaceholder')"
              @update:model-value="(v) => update({ introText: String(v) })"
            />
          </div>
        </TabsContent>
      </Tabs>

      <DialogFooter :show-close-button="false">
        <DialogClose as-child><Button>{{ t('settings.done') }}</Button></DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.hint {
  margin: 0;
  font-size: 13px;
  color: var(--muted-foreground);
}
.check {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}
.check input {
  width: 18px;
  height: 18px;
  accent-color: var(--gold);
}
.accent {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 6px;
  border-radius: 999px;
  border: 1px solid oklch(var(--tint) 0 0 / 0.2);
  cursor: pointer;
}
.accent:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
.accent.on {
  border-color: var(--foreground);
  background: oklch(var(--tint) 0 0 / 0.1);
}
.chip {
  width: 22px;
  height: 22px;
  border-radius: 999px;
}
.looks {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.look {
  display: grid;
  gap: 6px;
  padding: 6px;
  border-radius: 12px;
  border: 1px solid oklch(var(--tint) 0 0 / 0.2);
  cursor: pointer;
  text-align: center;
}
.look:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
.look.on {
  border-color: var(--foreground);
  background: oklch(var(--tint) 0 0 / 0.1);
}
.look-name {
  font-size: 13px;
}
/* a tiny board under the style's own variables: a theme bar and one cell */
.swatch {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 4px;
  padding: 8px 6px;
  border-radius: 8px;
  background: linear-gradient(180deg, var(--stage-top), var(--stage-bottom));
}
.mini-theme,
.mini-cell {
  height: 26px;
  border-radius: 4px;
}
.mini-theme {
  background: linear-gradient(135deg, var(--theme-top), var(--theme-bottom));
  border: 1px solid color-mix(in oklch, var(--theme-ink, var(--gold)) 50%, transparent);
}
.mini-cell {
  display: grid;
  place-items: center;
  background: linear-gradient(180deg, var(--tile), var(--tile-deep));
  color: var(--gold);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 12px;
}
[data-look='neon'] .mini-cell {
  border: 1px solid var(--magenta);
  box-shadow: 0 0 8px -1px var(--magenta);
}
.bg-thumb {
  width: 96px;
  height: 54px;
  border-radius: 8px;
}
.logo-box {
  padding: 6px 10px;
  border-radius: 10px;
  background: var(--night);
  border: 1px solid oklch(var(--tint) 0 0 / 0.15);
}
</style>
