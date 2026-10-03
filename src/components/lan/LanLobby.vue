<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Loader2, Smartphone } from '@lucide/vue'
import type { Player } from '@/types'
import { qrSvg, type LanInfo } from '@/play/lan'
import { playerColor } from '@/play/palette'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  info: LanInfo | null
  players: Player[]
  teams: boolean
  /** Phones online per player id. */
  phones: Record<string, number>
  /** Names given on phones, per player id. */
  people?: Record<string, string[]>
}>()
defineEmits<{ (e: 'back'): void; (e: 'start'): void }>()
const { t } = useI18n()

const svg = ref('')
watch(
  () => props.info?.url,
  async (url) => {
    if (!url) return (svg.value = '')
    const rendered = await qrSvg(url)
    if (url === props.info?.url) svg.value = rendered
  },
  { immediate: true },
)

const total = computed(() => Object.values(props.phones).reduce((a, b) => a + b, 0))
</script>

<template>
  <div class="lobby">
    <h2 class="title-shine lobby-title">{{ t('lan.lobby.title') }}</h2>

    <div class="body">
      <div class="join">
        <div class="qr" role="img" :aria-label="info?.url ?? t('lan.starting')">
          <!-- eslint-disable-next-line vue/no-v-html -- the SVG comes from the qrcode library, built from our own URL -->
          <div v-if="svg" class="qr-img" v-html="svg" />
          <Loader2 v-else class="size-10 animate-spin text-indigo-900" />
        </div>
        <div v-if="info" class="room">
          <span class="room-label">{{ t('lan.room') }}</span>
          <strong class="room-code">{{ info.code }}</strong>
        </div>
        <p v-if="info" class="url">{{ info.url }}</p>
      </div>

      <div class="roster glass">
        <p class="steps">{{ t('lan.lobby.steps') }}</p>
        <div class="roster-head">
          <span>{{ teams ? t('lan.lobby.teams') : t('lan.lobby.players') }}</span>
          <span class="total" :class="{ on: total > 0 }"><Smartphone class="size-4" />{{ total }}</span>
        </div>
        <ul class="seats">
          <li v-for="(p, i) in players" :key="p.id" class="seat" :class="{ on: phones[p.id] }" :style="{ '--pc': playerColor(p, i) }">
            <span class="mark" aria-hidden="true">
              <template v-if="p.avatar">{{ p.avatar }}</template>
              <span v-else class="dot" />
            </span>
            <span class="name">
              {{ p.name }}
              <small v-if="teams && people?.[p.id]?.length" class="people">{{ people[p.id]!.join(', ') }}</small>
            </span>
            <span class="state">
              <template v-if="teams && phones[p.id]">{{ t('lan.lobby.teamPhones', phones[p.id]!) }}</template>
              <template v-else-if="phones[p.id]">{{ t('lan.lobby.ready') }}</template>
              <template v-else>{{ t('lan.lobby.waiting') }}</template>
            </span>
          </li>
        </ul>
      </div>
    </div>

    <p class="note">{{ t('lan.note') }}</p>

    <div class="actions">
      <Button variant="ghost" size="lg" @click="$emit('back')"><ArrowLeft />{{ t('lan.lobby.back') }}</Button>
      <Button size="lg" class="start" :disabled="!info" @click="$emit('start')">{{ t('play.stage.start') }}</Button>
    </div>
  </div>
</template>

<style scoped>
.lobby {
  --qr: clamp(160px, min(38vh, 30vw), 380px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: safe center;
  gap: clamp(10px, 2.4vh, 28px);
  padding: 1vh 4vw 2vh;
  text-align: center;
  overflow-y: auto;
}
.lobby > * {
  flex-shrink: 0;
}
.lobby-title {
  margin: 0;
  font-size: clamp(32px, min(6vw, 8vh), 88px);
  line-height: 1;
}
.body {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: clamp(16px, 3vw, 48px);
  width: min(100%, 1100px);
}
.join {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.qr {
  display: grid;
  place-items: center;
  width: var(--qr);
  height: var(--qr);
  padding: calc(var(--qr) * 0.05);
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 30px 80px -30px oklch(0.05 0.1 280 / 0.9);
}
.qr-img,
.qr-img :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}
.room {
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.room-label {
  color: var(--muted-foreground);
  font-size: clamp(14px, 2vh, 20px);
}
.room-code {
  font-family: var(--font-display);
  font-size: clamp(32px, 6vh, 64px);
  line-height: 1;
  letter-spacing: 0.14em;
  color: var(--gold);
}
.url {
  margin: 0;
  font-family: ui-monospace, monospace;
  font-size: clamp(13px, 1.8vh, 17px);
  color: var(--muted-foreground);
  user-select: all;
}
.roster {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1 1 320px;
  max-width: 520px;
  max-height: calc(var(--qr) + 120px);
  min-width: 0;
  padding: 20px;
  border-radius: 22px;
  text-align: left;
}
.steps {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 15px;
  line-height: 1.45;
}
.roster-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: var(--font-display);
  font-size: 18px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--gold);
}
.total {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}
.total.on {
  color: var(--cyan);
}
.seats {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  overflow-y: auto;
  min-height: 0;
}
.seat {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 14px;
  border-left: 4px solid var(--pc);
  background: oklch(1 0 0 / 0.05);
  transition: background 0.3s;
}
.seat.on {
  background: oklch(1 0 0 / 0.12);
}
.mark {
  display: grid;
  place-items: center;
  width: 28px;
  font-size: 20px;
}
.dot {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: var(--pc);
}
.name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 18px;
}
.people {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  color: var(--cyan);
}
.state {
  font-size: 14px;
  color: var(--muted-foreground);
  white-space: nowrap;
}
.seat.on .state {
  color: var(--cyan);
}
.note {
  margin: 0;
  max-width: 60ch;
  font-size: 13px;
  color: var(--muted-foreground);
}
.actions {
  display: flex;
  gap: 12px;
  align-items: center;
}
.start {
  height: 56px;
  padding: 0 40px;
  font-size: 20px;
}
</style>
