<script setup lang="ts">
import { ref } from 'vue'
import { ArrowLeft, Download, Loader2, RefreshCw, Sparkles, Volume2 } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import StageBackdrop from '@/components/play/StageBackdrop.vue'
import LanguagePicker from '@/components/prefs/LanguagePicker.vue'
import SettingsPlay from '@/components/prefs/SettingsPlay.vue'
import SettingsDisplay from '@/components/prefs/SettingsDisplay.vue'
import SettingsLibrary from '@/components/prefs/SettingsLibrary.vue'
import { playSound, setSoundEffects, setSoundVolume, soundEffectsOn, soundVolume } from '@/play/sounds'
import { lanAvailable, phonesPreferred, setPhonesPreferred } from '@/play/lan'
import { canSelfUpdate } from '@/platform'
import { prefs, type AppTheme } from '@/prefs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { APP_VERSION, CHANGELOG } from '@/updates/changelog'
import { checkForUpdates, offerUpdate, showChangelog, updates } from '@/updates/state'

const { t } = useI18n()
const router = useRouter()

const usePhones = ref(phonesPreferred())
function togglePhones(on: boolean) {
  usePhones.value = on
  setPhonesPreferred(on)
}


const THEMES: AppTheme[] = ['dark', 'light', 'system']

// a single-choice group emits nothing when the picked item is clicked again
function setTheme(v: unknown) {
  if (v) prefs.theme = v as AppTheme
}

function back() {
  if (window.history.state?.back) router.back()
  else void router.push({ name: 'home' })
}
</script>

<template>
  <StageBackdrop />
  <div class="settings-page">
    <header class="bar" data-tauri-drag-region>
      <Button variant="ghost" @click="back"><ArrowLeft />{{ t('prefs.back') }}</Button>
      <h1 class="title title-shine">{{ t('prefs.title') }}</h1>
    </header>

    <main class="sections">
      <section class="glass section">
        <h2 class="section-title">{{ t('prefs.language') }}</h2>
        <LanguagePicker />
      </section>

      <section class="glass section">
        <h2 class="section-title">{{ t('prefs.theme') }}</h2>
        <p class="hint">{{ t('prefs.themeHint') }}</p>
        <ToggleGroup :model-value="prefs.theme" type="single" variant="outline" class="self-start" @update:model-value="setTheme">
          <ToggleGroupItem v-for="name in THEMES" :key="name" :value="name" class="px-4">{{ t(`prefs.themes.${name}`) }}</ToggleGroupItem>
        </ToggleGroup>
      </section>

      <section class="glass section">
        <h2 class="section-title">{{ t('prefs.sound') }}</h2>
        <p class="hint">{{ t('prefs.soundHint') }}</p>
        <label class="toggle">
          <input type="checkbox" :checked="soundEffectsOn" @change="setSoundEffects(($event.target as HTMLInputElement).checked)" />
          {{ t('prefs.soundOn') }}
        </label>
        <div class="volume" :class="{ off: !soundEffectsOn }">
          <span class="volume-label">{{ t('prefs.volume') }}</span>
          <Slider
            class="flex-1"
            :model-value="[soundVolume]"
            :min="0"
            :max="100"
            :step="5"
            :disabled="!soundEffectsOn"
            :thumb-labels="[t('prefs.volume')]"
            @update:model-value="(v) => v && setSoundVolume(v[0])"
            @value-commit="playSound('correct')"
          />
          <span class="w-9 text-right tabular-nums text-muted-foreground">{{ soundVolume }}</span>
          <Button variant="secondary" size="sm" :disabled="!soundEffectsOn" @click="playSound('results')"><Volume2 />{{ t('prefs.test') }}</Button>
        </div>
      </section>

      <SettingsPlay />
      <SettingsDisplay />
      <SettingsLibrary />

      <section v-if="lanAvailable" class="glass section">
        <h2 class="section-title">{{ t('prefs.phones') }}</h2>
        <p class="hint">{{ t('prefs.phonesHint') }}</p>
        <label class="toggle">
          <input type="checkbox" :checked="usePhones" @change="togglePhones(($event.target as HTMLInputElement).checked)" />
          {{ t('prefs.phonesDefault') }}
        </label>
      </section>

      <section class="glass section">
        <h2 class="section-title">{{ t('prefs.about') }}</h2>
        <div class="about">
          <span>{{ t('prefs.version', { version: APP_VERSION }) }}</span>
          <Button variant="ghost" size="sm" @click="showChangelog([...CHANGELOG])"><Sparkles />{{ t('prefs.changelog') }}</Button>
          <span class="flex-1" />
          <template v-if="canSelfUpdate">
            <span v-if="updates.status === 'latest'" class="text-sm text-cyan">{{ t('prefs.upToDate') }}</span>
            <span v-else-if="updates.status === 'failed' && !updates.available" class="text-sm text-destructive">{{ t('prefs.checkFailed') }}</span>
            <Button v-if="updates.available" @click="offerUpdate"><Download />{{ t('prefs.updateAvailable', { version: updates.available.version }) }}</Button>
            <Button v-else variant="secondary" :disabled="updates.status === 'checking'" @click="checkForUpdates()">
              <Loader2 v-if="updates.status === 'checking'" class="animate-spin" /><RefreshCw v-else />{{ updates.status === 'checking' ? t('prefs.checking') : t('prefs.checkUpdates') }}
            </Button>
          </template>
        </div>
        <label v-if="canSelfUpdate" class="toggle">
          <input v-model="prefs.autoUpdateCheck" type="checkbox" />
          {{ t('prefs.autoUpdate') }}
        </label>
      </section>
    </main>
  </div>
</template>

<style scoped>
.settings-page {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100dvh;
}
.bar {
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 4px 20px 4px calc(20px + var(--titlebar-inset));
}
.title {
  margin: 0;
  font-size: 30px;
  line-height: 1;
}
.sections {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: min(760px, 100%);
  margin: 0 auto;
  padding: 12px 20px 24px;
}
/* the section look is shared with the Settings* sections rendered inside */
.sections :deep(.section) {
  display: grid;
  gap: 14px;
  padding: 20px 22px;
  border-radius: 20px;
}
.sections :deep(.section-title) {
  margin: 0;
  font-family: var(--font-display);
  font-size: 20px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--gold);
}
.sections :deep(.hint) {
  margin: -6px 0 0;
  font-size: 14px;
  color: var(--muted-foreground);
}
.sections :deep(.toggle) {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  cursor: pointer;
}
.sections :deep(.toggle input) {
  flex: none;
  width: 18px;
  height: 18px;
  accent-color: var(--gold);
}
.about {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.volume {
  display: flex;
  align-items: center;
  gap: 14px;
}
.volume.off {
  opacity: 0.5;
}
.volume-label {
  font-size: 14px;
  color: var(--muted-foreground);
}
</style>
