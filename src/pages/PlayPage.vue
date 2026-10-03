<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Game } from '@/types'
import type { SessionSnapshot } from '@/composables/usePlaySession'
import { confirmAction } from '@/composables/useConfirm'
import { getGame } from '@/storage'
import { clearSession, loadSession } from '@/play/savedSession'
import PlayStage from '@/components/play/PlayStage.vue'

const props = defineProps<{ id: string }>()
const router = useRouter()

const game = ref<Game | null>(null)
const restored = ref<SessionSnapshot | undefined>()

async function load() {
  const g = await getGame(props.id)
  if (!g) {
    router.replace({ name: 'home' })
    return
  }
  const saved = loadSession(g.id)
  if (saved && saved.phase !== 'title' && saved.phase !== 'results') {
    const leader = [...saved.players].sort((a, b) => b.score - a.score)[0]
    const resume = await confirmAction({
      title: 'Продолжить партию?',
      description: `Сохранена незаконченная игра${leader ? `: лидирует ${leader.name} (${leader.score})` : ''}.`,
      confirmLabel: 'Продолжить',
      cancelLabel: 'Начать заново',
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
