<script setup lang="ts">
import { computed } from 'vue'
import type { Question, Round } from '@/types'

const props = defineProps<{ round: Round; played: Record<string, true> }>()
defineEmits<{ (e: 'pick', question: Question): void }>()

const columns = computed(() => Math.max(0, ...props.round.themes.map((t) => t.questions.length)))
</script>

<template>
  <div class="w-full overflow-x-auto">
    <div
      class="mx-auto grid w-full max-w-7xl min-w-[720px] gap-2"
      :style="{ gridTemplateColumns: `minmax(180px, 1.6fr) repeat(${columns}, minmax(84px, 1fr))` }"
    >
      <template v-for="t in round.themes" :key="t.id">
        <div
          class="flex items-center justify-center rounded-lg border border-gold/70 bg-accent px-3 py-4 text-center font-display text-[clamp(14px,1.5vw,22px)] font-medium tracking-wide text-gold uppercase"
        >
          {{ t.name }}
        </div>
        <button
          v-for="q in t.questions"
          :key="q.id"
          class="min-h-20 rounded-lg border font-display text-[clamp(22px,3vw,44px)] font-semibold text-gold transition enabled:hover:scale-[1.03] enabled:hover:bg-accent disabled:cursor-default"
          :class="played[q.id] ? 'border-white/5 bg-board-played' : 'border-border bg-board shadow-lg'"
          :disabled="!!played[q.id]"
          :aria-label="played[q.id] ? `${t.name}: сыгран` : `${t.name}, ${q.value}`"
          @click="$emit('pick', q)"
        >
          <span v-if="!played[q.id]">{{ q.value }}</span>
        </button>
        <span
          v-for="i in columns - t.questions.length"
          :key="`${t.id}-pad-${i}`"
          class="rounded-lg border border-white/5 bg-board-played"
        />
      </template>
    </div>
  </div>
</template>
