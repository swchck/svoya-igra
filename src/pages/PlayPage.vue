<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { Game } from '@/types'
import { fitsGame, type SessionSnapshot } from '@/composables/usePlaySession'
import { confirmAction } from '@/composables/useConfirm'
import { useStageDisplay } from '@/composables/useStageDisplay'
import { getGame } from '@/storage'
import { clearSession, inProgress, loadSession } from '@/play/savedSession'
import PlayStage from '@/components/play/PlayStage.vue'

const props = defineProps<{ id: string }>()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()
useStageDisplay()

const game = ref<Game | null>(null)
const restored = ref<SessionSnapshot | undefined>()
// leaving while the resume question is open declines it, which must not count as "start over"
let left = false
onUnmounted(() => (left = true))

async function load() {
  const g = await getGame(props.id)
  if (!g) {
    router.replace({ name: 'home' })
    return
  }
  let saved = loadSession(g.id)
  // the game may have been edited since: a missing question or round can't be resumed
  if (saved && !fitsGame(saved, g)) {
    clearSession(g.id)
    saved = null
  }
  // the library's "continue" has asked already
  if (saved && inProgress(saved) && route.query.resume === '1') {
    restored.value = saved
    void router.replace({ query: {} })
  } else if (saved && inProgress(saved)) {
    const leader = [...saved.players].sort((a, b) => b.score - a.score)[0]
    const resume = await confirmAction({
      title: t('home.resume.title'),
      description: leader
        ? t('home.resume.descriptionLeader', { name: leader.name, score: leader.score })
        : t('home.resume.description'),
      confirmLabel: t('home.resume.confirm'),
      cancelLabel: t('home.resume.restart'),
    })
    if (left) return
    if (resume) restored.value = saved
    else clearSession(g.id)
  }
  game.value = g
}
load()
</script>

<template>
  <PlayStage v-if="game" :game="game" :restored="restored" />
</template>
