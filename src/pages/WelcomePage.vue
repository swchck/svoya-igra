<script setup lang="ts">
import { useRouter } from 'vue-router'
import StageBackdrop from '@/components/play/StageBackdrop.vue'
import LanguagePicker from '@/components/prefs/LanguagePicker.vue'

const router = useRouter()
</script>

<!-- nobody has picked a language yet, so the page speaks all three at once -->
<template>
  <StageBackdrop />
  <main class="welcome" data-tauri-drag-region>
    <h1 class="title-shine title">Своя игра</h1>
    <p class="ask">
      <span lang="ru">Выберите язык</span>
      <span lang="en">Choose your language</span>
      <span lang="sr">Izaberite jezik</span>
    </p>
    <LanguagePicker size="large" @pick="router.replace({ name: 'home' })" />
  </main>
</template>

<style scoped>
.welcome {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(16px, 4vh, 40px);
  height: 100dvh;
  padding: 24px;
  text-align: center;
}
.title {
  margin: 0;
  font-size: clamp(48px, min(10vw, 14vh), 130px);
  line-height: 0.9;
}
.ask {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px 18px;
  margin: 0;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: clamp(18px, 2.6vh, 24px);
  color: var(--muted-foreground);
}
.ask span + span::before {
  content: '·';
  margin-right: 18px;
  font-style: normal;
  opacity: 0.6;
}
</style>
