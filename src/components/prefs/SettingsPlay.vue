<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Slider } from '@/components/ui/slider'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { prefs, type BuzzOpen, type FirstChooser } from '@/prefs'
import { fixedRoomCode, lanAvailable } from '@/play/lan'

const { t } = useI18n()

const CHOOSERS: { value: FirstChooser; label: string }[] = [
  { value: 'random', label: 'prefsPlay.rules.chooserRandom' },
  { value: 'first', label: 'prefsPlay.rules.chooserFirst' },
  { value: 'host', label: 'prefsPlay.rules.chooserHost' },
]
const BUZZ_MODES: { value: BuzzOpen; label: string }[] = [
  { value: 'question', label: 'prefsPlay.rules.buzzQuestion' },
  { value: 'host', label: 'prefsPlay.rules.buzzHost' },
  { value: 'timer', label: 'prefsPlay.rules.buzzTimer' },
]

const buzzHint = computed(() =>
  prefs.buzzOpen === 'host' ? t('prefsPlay.rules.buzzHostHint') : prefs.buzzOpen === 'timer' ? t('prefsPlay.rules.buzzTimerHint') : '',
)
const scalePercent = computed(() => Math.round(prefs.stageScale * 100))
const roomCode = computed(() => (prefs.fixedRoomCode ? fixedRoomCode() : null))

function check(e: Event): boolean {
  return (e.target as HTMLInputElement).checked
}

// a single-choice group emits nothing when the picked item is clicked again
function setChooser(v: unknown) {
  if (v) prefs.firstChooser = v as FirstChooser
}
function setBuzzOpen(v: unknown) {
  if (v) prefs.buzzOpen = v as BuzzOpen
}
function setScale(v: number[] | undefined) {
  if (v) prefs.stageScale = v[0]! / 100
}
function setMediaVolume(v: number[] | undefined) {
  if (v) prefs.mediaVolume = v[0]!
}
</script>

<template>
  <section class="glass section">
    <h2 class="section-title">{{ t('prefsPlay.rules.title') }}</h2>
    <p class="hint">{{ t('prefsPlay.rules.hint') }}</p>

    <div class="field">
      <label class="toggle">
        <input type="checkbox" :checked="prefs.wrongPenalty" @change="prefs.wrongPenalty = check($event)" />
        {{ t('prefsPlay.rules.penalty') }}
      </label>
      <p v-if="!prefs.wrongPenalty" class="note">{{ t('prefsPlay.rules.penaltyHint') }}</p>
    </div>

    <div class="field">
      <span class="label">{{ t('prefsPlay.rules.chooser') }}</span>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        class="choices"
        :aria-label="t('prefsPlay.rules.chooser')"
        :model-value="prefs.firstChooser"
        @update:model-value="setChooser"
      >
        <ToggleGroupItem v-for="c in CHOOSERS" :key="c.value" :value="c.value">{{ t(c.label) }}</ToggleGroupItem>
      </ToggleGroup>
    </div>

    <div v-if="lanAvailable" class="field">
      <span class="label">{{ t('prefsPlay.rules.buzz') }}</span>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        class="choices"
        :aria-label="t('prefsPlay.rules.buzz')"
        :model-value="prefs.buzzOpen"
        @update:model-value="setBuzzOpen"
      >
        <ToggleGroupItem v-for="m in BUZZ_MODES" :key="m.value" :value="m.value">{{ t(m.label) }}</ToggleGroupItem>
      </ToggleGroup>
      <p v-if="buzzHint" class="note">{{ buzzHint }}</p>
    </div>
  </section>

  <section class="glass section">
    <h2 class="section-title">{{ t('prefsPlay.stage.title') }}</h2>
    <p class="hint">{{ t('prefsPlay.stage.hint') }}</p>

    <div class="row">
      <span class="label">{{ t('prefsPlay.stage.scale') }}</span>
      <Slider
        :model-value="[scalePercent]"
        :min="80"
        :max="140"
        :step="5"
        :thumb-labels="[t('prefsPlay.stage.scale')]"
        @update:model-value="setScale"
      />
      <span class="value">{{ scalePercent }}%</span>
    </div>

    <div class="field">
      <label class="toggle">
        <input type="checkbox" :checked="prefs.reducedMotion" @change="prefs.reducedMotion = check($event)" />
        {{ t('prefsPlay.stage.motion') }}
      </label>
      <p class="note">{{ t('prefsPlay.stage.motionHint') }}</p>
    </div>

    <label class="toggle">
      <input type="checkbox" :checked="prefs.hideCursor" @change="prefs.hideCursor = check($event)" />
      {{ t('prefsPlay.stage.cursor') }}
    </label>
  </section>

  <section class="glass section">
    <h2 class="section-title">{{ lanAvailable ? t('prefsPlay.sound.title') : t('prefsPlay.sound.titleWeb') }}</h2>

    <div class="row">
      <span class="label">{{ t('prefsPlay.sound.mediaVolume') }}</span>
      <Slider
        :model-value="[prefs.mediaVolume]"
        :min="0"
        :max="100"
        :step="5"
        :thumb-labels="[t('prefsPlay.sound.mediaVolume')]"
        @update:model-value="setMediaVolume"
      />
      <span class="value">{{ prefs.mediaVolume }}</span>
    </div>

    <label class="toggle">
      <input type="checkbox" :checked="prefs.tickSound" @change="prefs.tickSound = check($event)" />
      {{ t('prefsPlay.sound.tick') }}
    </label>

    <template v-if="lanAvailable">
      <div class="field">
        <label class="toggle">
          <input type="checkbox" :checked="prefs.fixedRoomCode" @change="prefs.fixedRoomCode = check($event)" />
          {{ t('prefsPlay.sound.fixedCode') }}
          <span v-if="roomCode" class="code">{{ t('prefsPlay.sound.code', { code: roomCode }) }}</span>
        </label>
        <p class="note">{{ t('prefsPlay.sound.fixedCodeHint') }}</p>
      </div>

      <label class="toggle">
        <input type="checkbox" :checked="prefs.phoneVibration" @change="prefs.phoneVibration = check($event)" />
        {{ t('prefsPlay.sound.vibration') }}
      </label>
    </template>
  </section>
</template>

<style scoped>
.field {
  display: grid;
  gap: 8px;
  justify-items: start;
}
.label {
  font-size: 15px;
}
.note {
  margin: 0;
  padding-left: 28px;
  font-size: 13px;
  color: var(--muted-foreground);
}
.field > .label + * + .note {
  padding-left: 0;
}
.choices {
  flex-wrap: wrap;
}
.choices :deep([data-state='on']) {
  background: color-mix(in oklch, var(--gold) 18%, transparent);
  color: var(--gold);
}
.row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px 14px;
}
@media (max-width: 560px) {
  .row {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .row .label {
    grid-column: 1 / -1;
  }
}
.row .label {
  font-size: 14px;
  color: var(--muted-foreground);
}
.value {
  min-width: 3em;
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--muted-foreground);
}
.code {
  padding: 1px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in oklch, var(--cyan) 60%, transparent);
  color: var(--cyan);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
</style>
