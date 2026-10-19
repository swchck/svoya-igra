<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { History, Play, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { useGamesStore } from '@/stores/games'
import { clearSession, inProgress, lastSession, loadSession, savedGameIds } from '@/play/savedSession'

const { t } = useI18n()
const router = useRouter()
const store = useGamesStore()

// read once: the library is left for the stage before anything saved can change
const candidates = ref([...new Set([lastSession()?.gameId, ...savedGameIds()].filter((id): id is string => !!id))])
const offer = computed(() => {
  for (const id of candidates.value) {
    const session = loadSession(id)
    const game = store.games.find((g) => g.id === id)
    if (!session || !game || !inProgress(session)) continue
    const leader = [...session.players].sort((a, b) => b.score - a.score)[0]
    return { game, leader }
  }
  return null
})

function resume() {
  if (offer.value) void router.push({ name: 'play', params: { id: offer.value.game.id }, query: { resume: '1' } })
}

function forget() {
  if (!offer.value) return
  const { id } = offer.value.game
  clearSession(id)
  candidates.value = candidates.value.filter((c) => c !== id)
}
</script>

<template>
  <section v-if="offer" class="glass banner" role="status">
    <History class="icon" />
    <div class="text">
      <p class="title">{{ t('home.resume.bannerTitle') }}</p>
      <p class="meta">
        {{ offer.game.title || t('home.untitled') }}<template v-if="offer.leader"> · {{ t('home.resume.leader', { name: offer.leader.name, score: offer.leader.score }) }}</template>
      </p>
    </div>
    <Button @click="resume"><Play />{{ t('home.resume.confirm') }}</Button>
    <Button variant="ghost" size="icon" :aria-label="t('home.resume.forget')" :title="t('home.resume.forget')" @click="forget"><X /></Button>
  </section>
</template>

<style scoped>
.banner {
  display: flex;
  align-items: center;
  gap: 14px;
  width: min(760px, 100%);
  margin: 0 auto;
  padding: 12px 14px 12px 18px;
  border-radius: 16px;
  border-color: color-mix(in oklch, var(--gold) 45%, transparent);
}
.icon {
  flex: none;
  width: 26px;
  height: 26px;
  color: var(--gold);
}
.text {
  flex: 1;
  min-width: 0;
}
.title {
  margin: 0;
  font-weight: 600;
}
.meta {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  color: var(--muted-foreground);
}
</style>
