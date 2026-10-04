<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { ArchiveRestore, Save } from '@lucide/vue'
import { ACCENT_NAMES } from '@/types'
import { ACCENTS } from '@/play/accents'
import { prefs, type ImageQuality } from '@/prefs'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { BACKUP_EXTENSION } from '@/io/files'
import { useBackup } from '@/composables/useBackup'
import { isDesktop, pickGameFile } from '@/platform'

const { t } = useI18n()
const { busy, saveAll, restore } = useBackup()
const fileInput = ref<HTMLInputElement | null>(null)

const ANSWER_SECONDS = [0, 10, 15, 20, 30, 45, 60]
const QUALITIES: ImageQuality[] = ['original', 'normal', 'strong']

function setAnswerSeconds(value: unknown) {
  if (typeof value === 'string' && value) prefs.answerSeconds = Number(value)
}

function setQuality(value: unknown) {
  if (typeof value === 'string' && (QUALITIES as string[]).includes(value)) prefs.imageQuality = value as ImageQuality
}

async function startRestore() {
  if (!isDesktop) {
    fileInput.value?.click()
    return
  }
  try {
    const file = await pickGameFile([BACKUP_EXTENSION])
    if (file) await restore(file)
  } catch (err) {
    toast.error(t('prefsLibrary.toast.restoreFailed'), { description: err instanceof Error ? err.message : String(err) })
  }
}

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) await restore(file)
}
</script>

<template>
  <section class="glass section">
    <h2 class="section-title">{{ t('prefsLibrary.newGames.title') }}</h2>
    <p class="hint">{{ t('prefsLibrary.newGames.hint') }}</p>

    <div class="field">
      <span class="label">{{ t('prefsLibrary.newGames.answerSeconds') }}</span>
      <ToggleGroup
        type="single"
        variant="outline"
        class="w-full"
        :aria-label="t('prefsLibrary.newGames.answerSeconds')"
        :model-value="String(prefs.answerSeconds)"
        @update:model-value="setAnswerSeconds"
      >
        <ToggleGroupItem v-for="s in ANSWER_SECONDS" :key="s" :value="String(s)" class="min-w-0 flex-1 px-1">
          {{ s ? t('prefsLibrary.newGames.seconds', { n: s }) : t('prefsLibrary.newGames.noTimer') }}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>

    <label class="toggle" :class="{ off: !prefs.answerSeconds }">
      <input v-model="prefs.timerAutoStart" type="checkbox" :disabled="!prefs.answerSeconds" />
      {{ t('prefsLibrary.newGames.autoStart') }}
    </label>

    <div class="field" role="radiogroup" :aria-label="t('prefsLibrary.newGames.accent')">
      <span class="label">{{ t('prefsLibrary.newGames.accent') }}</span>
      <div class="accents">
        <button
          v-for="name in ACCENT_NAMES"
          :key="name"
          type="button"
          role="radio"
          class="accent"
          :class="{ on: prefs.accent === name }"
          :aria-checked="prefs.accent === name"
          @click="prefs.accent = name"
        >
          <span class="chip" :style="{ background: `linear-gradient(135deg, ${ACCENTS[name].gold}, ${ACCENTS[name].deep})` }" />
          {{ t(`settings.look.accents.${name}`) }}
        </button>
      </div>
    </div>
  </section>

  <section class="glass section">
    <h2 class="section-title">{{ t('prefsLibrary.data.title') }}</h2>

    <div class="field">
      <span class="label">{{ t('prefsLibrary.data.imageQuality') }}</span>
      <ToggleGroup
        type="single"
        variant="outline"
        class="w-full"
        :aria-label="t('prefsLibrary.data.imageQuality')"
        :model-value="prefs.imageQuality"
        @update:model-value="setQuality"
      >
        <ToggleGroupItem v-for="q in QUALITIES" :key="q" :value="q" class="flex-1">{{ t(`prefsLibrary.data.quality.${q}`) }}</ToggleGroupItem>
      </ToggleGroup>
      <p class="hint">{{ t(`prefsLibrary.data.qualityHint.${prefs.imageQuality}`) }}</p>
    </div>

    <div class="field">
      <span class="label">{{ t('prefsLibrary.data.backup') }}</span>
      <div class="actions">
        <Button variant="secondary" :disabled="busy" @click="saveAll"><Save />{{ t('prefsLibrary.data.saveAll') }}</Button>
        <Button variant="secondary" :disabled="busy" @click="startRestore"><ArchiveRestore />{{ t('prefsLibrary.data.restore') }}</Button>
        <input ref="fileInput" type="file" class="hidden" :accept="`.${BACKUP_EXTENSION}`" @change="onFile" />
      </div>
      <p class="hint">{{ t('prefsLibrary.data.backupHint') }}</p>
    </div>
  </section>
</template>

<style scoped>
.field {
  display: grid;
  gap: 8px;
  min-width: 0;
}
.field .hint {
  margin: 0;
}
.label {
  font-size: 14px;
  color: var(--muted-foreground);
}
.toggle.off {
  opacity: 0.5;
  cursor: default;
}
.accents,
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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
</style>
