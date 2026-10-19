<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from '@lucide/vue'

const props = defineProps<{
  label: string
  placeholder?: string
  /** Chip color: answers that count or that don't. */
  tone?: 'good' | 'bad'
}>()
/** Unset rather than empty, so games without any keep their saved shape. */
const model = defineModel<string[] | undefined>()
const { t } = useI18n()
const draft = ref('')

function add() {
  const value = draft.value.trim()
  draft.value = ''
  if (!value) return
  const list = model.value ?? []
  if (!list.some((x) => x.toLowerCase() === value.toLowerCase())) model.value = [...list, value]
}

function remove(index: number) {
  const list = (model.value ?? []).filter((_, i) => i !== index)
  model.value = list.length ? list : undefined
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || (e.key === ',' && !e.isComposing)) {
    e.preventDefault()
    add()
  } else if (e.key === 'Backspace' && !draft.value && model.value?.length) {
    remove(model.value.length - 1)
  }
}
</script>

<template>
  <div class="chips" :class="props.tone">
    <span v-for="(chip, i) in model ?? []" :key="chip" class="chip">
      {{ chip }}
      <button type="button" class="drop" :aria-label="t('common.chips.remove', { value: chip })" @click="remove(i)"><X class="size-3" /></button>
    </span>
    <input
      v-model="draft"
      class="entry"
      :aria-label="label"
      :placeholder="model?.length ? '' : placeholder"
      @keydown="onKeydown"
      @blur="add"
    />
  </div>
</template>

<style scoped>
.chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 5px 8px;
  border-radius: 12px;
  border: 1px solid var(--input);
  background: var(--well);
  cursor: text;
}
.chips:focus-within {
  border-color: var(--ring);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--ring) 40%, transparent);
}
.chip {
  --tone: var(--cyan);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px 2px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in oklch, var(--tone) 55%, transparent);
  background: color-mix(in oklch, var(--tone) 16%, transparent);
  font-size: 14px;
}
.good .chip {
  --tone: oklch(0.75 0.15 155);
}
.bad .chip {
  --tone: var(--magenta);
}
.drop {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--muted-foreground);
  cursor: pointer;
}
.drop:hover {
  color: var(--foreground);
  background: oklch(var(--tint) 0 0 / 0.1);
}
.entry {
  flex: 1 1 120px;
  min-width: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 14px;
  outline: none;
}
.entry::placeholder {
  color: var(--muted-foreground);
}
</style>
