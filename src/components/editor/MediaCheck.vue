<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CircleCheck, CirclePlay, Loader2, TriangleAlert } from '@lucide/vue'
import type { Game } from '@/types'
import { Button } from '@/components/ui/button'
import { probeGame, type ProbeProblem } from '@/media/probe'
import MediaThumb from '@/components/media/MediaThumb.vue'

const props = defineProps<{ game: Game }>()
const emit = defineEmits<{ (e: 'open', problem: ProbeProblem): void }>()
const { t } = useI18n()

const state = ref<'idle' | 'running' | 'done'>('idle')
const progress = ref({ done: 0, total: 0 })
const problems = ref<ProbeProblem[]>([])

async function run() {
  state.value = 'running'
  problems.value = await probeGame(props.game, (done, total) => (progress.value = { done, total }))
  state.value = 'done'
}
</script>

<template>
  <section class="media-check" :aria-label="t('editor.mediaCheck.title')">
    <div class="head">
      <div>
        <h3 class="title">{{ t('editor.mediaCheck.title') }}</h3>
        <p class="hint">{{ t('editor.mediaCheck.hint') }}</p>
      </div>
      <Button variant="secondary" size="sm" :disabled="state === 'running'" @click="run">
        <Loader2 v-if="state === 'running'" class="animate-spin" /><CirclePlay v-else />
        {{ state === 'running' ? t('editor.mediaCheck.running', progress) : t('editor.mediaCheck.run') }}
      </Button>
    </div>
    <template v-if="state === 'done'">
      <p v-if="!problems.length" class="ok" role="status"><CircleCheck class="size-4" />{{ t('editor.mediaCheck.ok', { n: progress.total }) }}</p>
      <ul v-else class="problems">
        <li v-for="(p, i) in problems" :key="i">
          <button type="button" class="problem" @click="emit('open', p)">
            <MediaThumb :item="p.item" class="thumb" />
            <span class="text">
              <span class="msg"><TriangleAlert class="size-4" />{{ t(`editor.mediaCheck.failure.${p.failure}`) }}</span>
              <span class="where">{{ p.where }}</span>
            </span>
          </button>
        </li>
      </ul>
    </template>
  </section>
</template>

<style scoped>
.media-check {
  display: grid;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  background: oklch(var(--tint) 0 0 / 0.04);
}
.head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}
.hint {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--muted-foreground);
}
.ok {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: var(--cyan);
  font-size: 14px;
}
.problems {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.problem {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 6px 8px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.problem:hover {
  background: oklch(var(--tint) 0 0 / 0.06);
}
.thumb {
  flex: none;
  width: 44px;
  height: 44px;
}
.text {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.msg {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--destructive);
  font-size: 14px;
}
.where {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--muted-foreground);
}
</style>
