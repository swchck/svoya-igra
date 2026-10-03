<script setup lang="ts">
import { Home, Trophy } from '@lucide/vue'
import type { Player } from '@/types'
import { Button } from '@/components/ui/button'

defineProps<{ ranking: Player[] }>()
defineEmits<{ (e: 'home'): void }>()
</script>

<template>
  <section class="flex flex-1 flex-col items-center justify-center gap-8 p-8 text-center">
    <h1 class="title-gold text-7xl sm:text-8xl">Итоги</h1>
    <ol class="flex w-full max-w-xl flex-col gap-2">
      <li
        v-for="(p, i) in ranking"
        :key="p.id"
        class="grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-xl border px-5 py-4"
        :class="i === 0 ? 'border-gold bg-accent' : 'border-border bg-board'"
      >
        <span class="font-display text-2xl text-gold">{{ i + 1 }}</span>
        <span class="flex items-center gap-2 text-left text-xl">
          <Trophy v-if="i === 0" class="size-5 text-gold" />{{ p.name }}
        </span>
        <span class="font-display text-3xl font-semibold text-gold tabular-nums">{{ p.score }}</span>
      </li>
    </ol>
    <Button size="lg" @click="$emit('home')"><Home />На главную</Button>
  </section>
</template>
