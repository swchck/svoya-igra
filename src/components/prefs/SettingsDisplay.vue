<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Eye, Monitor, MonitorX, Pin } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { prefs } from '@/prefs'
import { isDesktop } from '@/platform'
import { findScreen, sameScreen, type Screen } from '@/play/monitors'
import type { ScreenLayout } from '@/play/desktopScreens'

const { t } = useI18n()

const layout = ref<ScreenLayout>({ screens: [], primary: null, current: null })

async function refresh() {
  try {
    layout.value = await (await import('@/play/desktopScreens')).loadScreens()
  } catch {
    // keep the last list; a failed read is no reason to blank the section
  }
}

onMounted(() => {
  if (!isDesktop) return
  void refresh()
  // there is no monitor-plugged event; focus is when people come back after plugging one in
  window.addEventListener('focus', refresh)
})
onUnmounted(() => window.removeEventListener('focus', refresh))

function screenName(s: Screen, index: number): string {
  return s.name || t('prefsDisplay.unnamed', { n: index + 1 })
}

const missing = computed(() =>
  prefs.stageMonitor !== null && layout.value.screens.length > 0 && !findScreen(layout.value.screens, prefs.stageMonitor),
)

function choose(name: string | null) {
  prefs.stageMonitor = name
}

async function identify(s: Screen, index: number) {
  const { flashScreen } = await import('@/play/desktopScreens')
  await flashScreen(s, String(index + 1), screenName(s, index)).catch(() => {})
}
</script>

<template>
  <section v-if="isDesktop" class="glass section">
    <h2 class="section-title">{{ t('prefsDisplay.title') }}</h2>
    <p class="hint">{{ t('prefsDisplay.hint') }}</p>

    <div class="choices" role="radiogroup" :aria-label="t('prefsDisplay.title')">
      <div class="choice" :class="{ on: prefs.stageMonitor === null }">
        <button type="button" role="radio" class="pick" :aria-checked="prefs.stageMonitor === null" @click="choose(null)">
          <Pin class="icon" />
          <span class="text">
            <span class="name">{{ t('prefsDisplay.keep') }}</span>
            <span class="meta">{{ t('prefsDisplay.keepHint') }}</span>
          </span>
        </button>
      </div>

      <div
        v-for="(s, i) in layout.screens"
        :key="`${s.name}@${s.bounds.x},${s.bounds.y}`"
        class="choice"
        :class="{ on: s.name !== null && prefs.stageMonitor === s.name }"
      >
        <button
          type="button"
          role="radio"
          class="pick"
          :disabled="s.name === null"
          :aria-checked="s.name !== null && prefs.stageMonitor === s.name"
          @click="choose(s.name)"
        >
          <span class="badge-num">{{ i + 1 }}</span>
          <span class="text">
            <span class="name">{{ screenName(s, i) }}</span>
            <span class="meta">
              {{ s.bounds.width }}×{{ s.bounds.height }}
              <span v-if="sameScreen(s, layout.primary)" class="tag">{{ t('prefsDisplay.primary') }}</span>
              <span v-if="sameScreen(s, layout.current)" class="tag">{{ t('prefsDisplay.current') }}</span>
            </span>
          </span>
        </button>
        <Button variant="ghost" size="sm" @click="identify(s, i)"><Eye />{{ t('prefsDisplay.show') }}</Button>
      </div>

      <div v-if="missing" class="choice on">
        <button type="button" role="radio" class="pick" aria-checked="true">
          <MonitorX class="icon" />
          <span class="text">
            <span class="name">{{ prefs.stageMonitor }}</span>
            <span class="meta">{{ t('prefsDisplay.missing') }}</span>
          </span>
        </button>
      </div>
    </div>

    <p v-if="layout.screens.length === 1" class="hint single"><Monitor class="inline-icon" />{{ t('prefsDisplay.single') }}</p>

    <label class="toggle">
      <input v-model="prefs.stageFullscreen" type="checkbox" />
      {{ t('prefsDisplay.fullscreen') }}
    </label>
  </section>
</template>

<style scoped>
.section {
  display: grid;
  gap: 14px;
  padding: 20px 22px;
  border-radius: 20px;
}
.section-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 20px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--gold);
}
.hint {
  margin: -6px 0 0;
  font-size: 14px;
  color: var(--muted-foreground);
}
.hint.single {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.inline-icon {
  flex: none;
  width: 16px;
  height: 16px;
}
.toggle {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  cursor: pointer;
}
.toggle input {
  width: 18px;
  height: 18px;
  accent-color: var(--gold);
}
.choices {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
}
.choice {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-right: 6px;
  border-radius: 14px;
  border: 1px solid oklch(1 0 0 / 0.12);
  background: oklch(0.2 0.14 272 / 0.5);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.choice:hover {
  border-color: color-mix(in oklch, var(--gold) 60%, transparent);
}
.choice.on {
  border-color: var(--gold);
  box-shadow: 0 0 0 1px var(--gold);
}
.pick {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 6px 12px 14px;
  border-radius: 14px;
  text-align: left;
  color: var(--foreground);
  cursor: pointer;
}
.pick:disabled {
  cursor: default;
  opacity: 0.6;
}
.pick:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}
.icon {
  flex: none;
  width: 26px;
  height: 26px;
  color: var(--gold);
}
.badge-num {
  flex: none;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  font-family: var(--font-display);
  font-size: 18px;
  color: var(--gold);
  border: 1px solid color-mix(in oklch, var(--gold) 50%, transparent);
}
.text {
  display: grid;
  min-width: 0;
}
.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}
.tag {
  padding: 0 6px;
  border-radius: 6px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--cyan);
  border: 1px solid currentColor;
}
</style>
