<script setup lang="ts">
import type { Question } from '../../types'
import MediaList from '../MediaList.vue'

const question = defineModel<Question>({ required: true })
defineEmits<{ (e: 'remove'): void }>()
</script>

<template>
  <div class="q-form">
    <div class="si-row fields">
      <div>
        <label class="si-label">Стоимость</label>
        <input v-model.number="question.value" type="number" class="si-input" min="0" step="100" />
      </div>
      <div>
        <label class="si-label">Тип</label>
        <select v-model="question.kind" class="si-select">
          <option value="normal">Обычный</option>
          <option value="auction">Вопрос-аукцион</option>
          <option value="cat-in-bag">Кот в мешке</option>
        </select>
      </div>
      <div v-if="question.kind === 'cat-in-bag'">
        <label class="si-label">Цена «кота»</label>
        <input v-model.number="question.catValue" type="number" class="si-input" min="0" step="100" />
      </div>
    </div>

    <div>
      <label class="si-label">Вопрос</label>
      <textarea v-model="question.text" class="si-textarea" placeholder="Текст вопроса..." />
    </div>
    <MediaList v-model="question.media" label="Медиа к вопросу" />

    <div>
      <label class="si-label">Ответ</label>
      <textarea v-model="question.answer" class="si-textarea" placeholder="Правильный ответ..." />
    </div>
    <MediaList v-model="question.answerMedia" label="Медиа к ответу" />

    <div class="si-row">
      <button class="si-button danger" @click="$emit('remove')">Удалить вопрос</button>
    </div>
  </div>
</template>

<style scoped>
.q-form { display: flex; flex-direction: column; gap: 14px; }
.fields > div { flex: 1; }
</style>
