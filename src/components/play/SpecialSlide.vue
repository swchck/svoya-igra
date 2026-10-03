<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{ icon: Component; title: string; topic?: string; text?: string; motion: 'swing' | 'wobble' }>()
</script>

<template>
  <section class="special">
    <component :is="icon" class="icon" :class="motion" aria-hidden="true" />
    <h2 class="title-shine heading">{{ title }}</h2>
    <p v-if="topic" class="topic">Тема: {{ topic }}</p>
    <p v-if="text" class="text">{{ text }}</p>
    <div class="dock"><slot /></div>
  </section>
</template>

<style scoped>
.special {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(10px, 2.4vh, 26px);
  height: 100%;
  padding: 2vh 4vw;
  text-align: center;
}
.icon {
  width: clamp(80px, 14vh, 160px);
  height: auto;
  color: var(--gold);
  filter: drop-shadow(0 0 30px color-mix(in oklch, var(--gold) 55%, transparent));
}
.swing {
  transform-origin: 80% 80%;
  animation: swing 1.4s cubic-bezier(0.3, 0, 0.3, 1) 2 both;
}
.wobble {
  animation: wobble 2.2s ease-in-out infinite;
}
.heading {
  margin: 0;
  font-size: clamp(44px, 8vw, 130px);
  line-height: 1;
  animation: zoom 0.7s cubic-bezier(0.2, 0.9, 0.3, 1.3) both;
}
.topic {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(20px, 2.4vw, 38px);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.text {
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(18px, 2vw, 32px);
  color: var(--muted-foreground);
}
.dock:empty {
  display: none;
}
@keyframes swing {
  0% { transform: rotate(-40deg); }
  45% { transform: rotate(18deg); }
  55% { transform: rotate(10deg); }
  100% { transform: rotate(0); }
}
@keyframes wobble {
  0%, 100% { transform: rotate(0) scale(1); }
  20% { transform: rotate(-10deg) scale(1.05); }
  40% { transform: rotate(8deg) scale(0.97); }
  60% { transform: rotate(-4deg) scale(1.03); }
}
@keyframes zoom {
  from { opacity: 0; transform: scale(2.2); filter: blur(8px); }
}
@media (prefers-reduced-motion: reduce) {
  .swing, .wobble, .heading { animation: none; }
}
</style>
