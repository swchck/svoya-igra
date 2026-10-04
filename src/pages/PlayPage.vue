<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { Game } from '@/types'
import { fitsGame, type SessionSnapshot } from '@/composables/usePlaySession'
import { confirmAction } from '@/composables/useConfirm'
import { useStageDisplay } from '@/composables/useStageDisplay'
import { getGame } from '@/storage'
import { clearSession, loadSession } from '@/play/savedSession'
import PlayStage from '@/components/play/PlayStage.vue'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { t } = useI18n()
useStageDisplay()

const game = ref<Game | null>(null)
const restored = ref<SessionSnapshot | undefined>()

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
  if (saved && saved.phase !== 'title' && saved.phase !== 'results') {
    const leader = [...saved.players].sort((a, b) => b.score - a.score)[0]
    const resume = await confirmAction({
      title: t('home.resume.title'),
      description: leader
        ? t('home.resume.descriptionLeader', { name: leader.name, score: leader.score })
        : t('home.resume.description'),
      confirmLabel: t('home.resume.confirm'),
      cancelLabel: t('home.resume.restart'),
    })
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
