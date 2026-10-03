<script setup lang="ts">
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { useI18n } from 'vue-i18n'
import { ImagePlus, Settings, Trash2 } from '@lucide/vue'
import { ACCENT_NAMES, type GameSettings } from '@/types'
import { MAX_ANSWER_SECONDS } from '@/game/parse'
import { ACCENTS } from '@/play/accents'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import NumberInput from '@/components/NumberInput.vue'
import StageLogo from '@/components/play/StageLogo.vue'
import { useMediaIngest } from '@/components/media/useMediaIngest'

const { t } = useI18n()
const settings = defineModel<GameSettings | undefined>()
const { fromFiles } = useMediaIngest()
const fileInput = ref<HTMLInputElement>()

/** Applies a change; a game with no settings left carries none. */
function update(patch: Partial<GameSettings>) {
  const next: GameSettings = { ...settings.value, ...patch }
  for (const key of Object.keys(next) as (keyof GameSettings)[]) {
    if (next[key] === undefined || next[key] === false || next[key] === '' || next[key] === 0) delete next[key]
  }
  settings.value = Object.keys(next).length ? next : undefined
}

async function pickLogo(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const [item] = await fromFiles([file])
  if (!item) return
  if (item.kind !== 'image') toast.error(t('media.list.rejected', { name: file.name }), { description: t('media.list.unsupportedHint') })
  else update({ logo: item })
}
</script>

<template>
  <Dialog>
    <DialogTrigger as-child>
      <Button variant="secondary"><Settings />{{ t('settings.open') }}</Button>
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
              <input ref="fileInput" type="file" accept="image/*" class="sr-only" tabindex="-1" aria-hidden="true" @change="pickLogo" />
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
  border: 1px solid oklch(1 0 0 / 0.2);
  cursor: pointer;
}
.accent:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
.accent.on {
  border-color: var(--foreground);
  background: oklch(1 0 0 / 0.1);
}
.chip {
  width: 22px;
  height: 22px;
  border-radius: 999px;
}
.logo-box {
  padding: 6px 10px;
  border-radius: 10px;
  background: var(--night);
  border: 1px solid oklch(1 0 0 / 0.15);
}
</style>
