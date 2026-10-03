<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const THEMES = ['Кино 90-х', 'Хиты 1996', 'Столицы', 'Мультфильмы']
const VALUES = [100, 200, 300, 400, 500]
const PLAYED = new Set(['0-1', '1-3', '2-0', '3-2', '1-0'])

// a cell lights up now and then, like a host picking a question
const lit = ref('2-3')
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  timer = setInterval(() => {
    const open = THEMES.flatMap((_, t) => VALUES.map((_, v) => `${t}-${v}`)).filter((k) => !PLAYED.has(k))
    lit.value = open[Math.floor(Math.random() * open.length)]
  }, 1800)
})
onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div
    class="rounded-2xl border border-white/15 bg-board/60 p-3 shadow-2xl shadow-black/40 backdrop-blur sm:p-4"
    role="img"
    aria-label="Табло игры: темы и стоимости вопросов"
  >
    <div class="grid grid-cols-[minmax(0,1.5fr)_repeat(5,minmax(0,1fr))] gap-1 sm:gap-2">
      <template v-for="(theme, t) in THEMES" :key="theme">
        <div
          class="flex items-center justify-center rounded-md border border-gold/60 bg-accent px-1 py-2 text-center font-display text-[9px] leading-tight break-words hyphens-auto tracking-wide text-gold uppercase sm:text-sm"
        >
          {{ theme }}
        </div>
        <div
          v-for="(value, v) in VALUES"
          :key="value"
          class="flex aspect-[4/3] items-center justify-center rounded-md border font-display text-sm font-semibold transition-all duration-500 sm:text-2xl"
          :class="
            PLAYED.has(`${t}-${v}`)
              ? 'border-white/5 bg-board-played text-transparent'
              : lit === `${t}-${v}`
                ? 'scale-105 border-gold bg-gold text-primary-foreground shadow-lg shadow-gold/40'
                : 'border-white/15 bg-board text-gold'
          "
        >
          {{ value }}
        </div>
      </template>
    </div>
  </div>
</template>
