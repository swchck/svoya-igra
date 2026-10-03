<script setup lang="ts">
import type { FinalQuestion } from '../../types'
import MediaList from '../MediaList.vue'

const final = defineModel<FinalQuestion>({ required: true })
defineEmits<{ (e: 'remove'): void }>()
</script>

<template>
  <div class="final-form">
    <div>
      <label class="si-label">Тема финала</label>
      <input v-model="final.theme" class="si-input" placeholder="Тема" />
    </div>
    <div>
      <label class="si-label">Вопрос</label>
      <textarea v-model="final.text" class="si-textarea" placeholder="Финальный вопрос..." />
    </div>
    <MediaList v-model="final.media" label="Медиа к финалу" />
    <div>
      <label class="si-label">Ответ</label>
      <textarea v-model="final.answer" class="si-textarea" placeholder="Ответ..." />
    </div>
    <div class="si-row">
      <button class="si-button danger" @click="$emit('remove')">Удалить финал</button>
    </div>
  </div>
</template>

<style scoped>
.final-form { display: flex; flex-direction: column; gap: 14px; }
</style>
