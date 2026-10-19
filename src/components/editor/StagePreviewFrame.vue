<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { GameSettings, Player, Question, Round } from '@/types'
import { answerMedia } from '@/game/kinds'
import { useStageLook } from '@/play/useStageLook'
import { nextColorId, playerColor } from '@/play/palette'
import StageBackdrop from '@/components/play/StageBackdrop.vue'
import BoardGrid from '@/components/play/BoardGrid.vue'
import CardSlide from '@/components/play/CardSlide.vue'
import IntroSlide from '@/components/play/IntroSlide.vue'
import PlayerPodiums from '@/components/play/PlayerPodiums.vue'

/** What the preview shows: the round's opening, the board, a question or its answer. */
export type PreviewScene = 'intro' | 'board' | 'question' | 'answer'

/*
 * The stage as the audience will see it, drawn at a TV's 1280×720 and shrunk to fit, so
 * the editor shows the real board, cards and podiums in the game's own style.
 */

const STAGE_W = 1280
const STAGE_H = 720

const props = defineProps<{
  settings?: GameSettings
  round?: Round
  scene: PreviewScene
  question?: Question | null
  topic?: string
}>()
const { t } = useI18n()

const look = useStageLook(() => props.settings)

const players = computed<Player[]>(() => {
  const list: Player[] = []
  for (const [i, score] of [800, 300, -100].entries()) {
    list.push({ id: `preview-${i}`, name: t('play.setup.defaultName', { n: i + 1 }), score, color: nextColorId(list) })
  }
  return list
})
// a couple of cells already played and someone picking, like a board mid-round
const played = computed<Record<string, true>>(() => {
  const ids = props.round?.themes.flatMap((th) => th.questions.slice(0, 1).map((q) => q.id)) ?? []
  return Object.fromEntries(ids.slice(0, 2).map((id) => [id, true as const]))
})
const chooser = computed(() => ({ name: players.value[0].name, color: playerColor(players.value[0], 0) }))

const box = ref<HTMLElement>()
const scale = ref(0.5)
let observer: ResizeObserver | undefined
onMounted(() => {
  observer = new ResizeObserver(([entry]) => (scale.value = entry.contentRect.width / STAGE_W))
  if (box.value) observer.observe(box.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div ref="box" class="frame" :style="{ height: `${STAGE_H * scale}px` }">
    <div class="stage" v-bind="look" :style="{ transform: `scale(${scale})`, width: `${STAGE_W}px`, height: `${STAGE_H}px` }" inert>
      <StageBackdrop :dim="scene === 'question' || scene === 'answer'" :image="settings?.background" />
      <main class="scene">
        <IntroSlide v-if="scene === 'intro'" :title="round?.name ?? ''" :themes="round?.themes.map((th) => ({ name: th.name }))" />
        <BoardGrid v-else-if="scene === 'board' && round" :round="round" :played="played" :chooser="chooser" />
        <CardSlide
          v-else-if="scene === 'question' && question"
          variant="question"
          quiet
          :topic="topic"
          :amount="question.value"
          :text="question.text || t('editor.preview.questionFallback')"
          :media="question.media"
          :options="question.options"
        />
        <CardSlide
          v-else-if="scene === 'answer' && question"
          variant="answer"
          quiet
          :text="question.answer || t('editor.preview.answerFallback')"
          :media="answerMedia(question)"
          :options="question.options"
          :correct="question.correctOption"
        />
        <p v-else class="empty">{{ t('editor.stagePreview.empty') }}</p>
      </main>
      <PlayerPodiums :players="players" :chooser-id="scene === 'board' ? players[0].id : undefined" />
    </div>
  </div>
</template>

<style scoped>
.frame {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 12px;
  background: black;
  /* the stage's own z-indexes stay inside the preview */
  isolation: isolate;
}
.stage {
  position: absolute;
  top: 0;
  left: 0;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  overflow: hidden;
  color: var(--foreground);
  transform-origin: 0 0;
}
/* the desktop WebKit showed only the animated layers of this scaled box and lost the board
   and podiums under them; their own layers keep them on top. zoom shrinks cq text twice */
.stage :deep(.backdrop) {
  position: absolute;
}
.scene {
  will-change: transform;
  position: relative;
  z-index: 1;
  display: grid;
  min-height: 0;
  padding: 28px 40px 12px;
}
.empty {
  place-self: center;
  margin: 0;
  font-size: 24px;
  color: var(--muted-foreground);
}
.stage :deep(.podiums) {
  position: relative;
  z-index: 1;
  will-change: transform;
}
</style>
