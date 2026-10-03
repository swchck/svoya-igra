<script setup lang="ts">
import { ref, watch } from 'vue'
import { Input } from '@/components/ui/input'
import { formatTime, parseTime } from '@/media/segment'

const props = defineProps<{ modelValue?: number; placeholder?: string; label: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: number | undefined): void }>()

const text = ref('')
const invalid = ref(false)
watch(
  () => props.modelValue,
  (v) => {
    text.value = v === undefined ? '' : formatTime(v)
    invalid.value = false
  },
  { immediate: true },
)

function commit() {
  const parsed = parseTime(text.value)
  invalid.value = text.value.trim() !== '' && parsed === undefined
  if (!invalid.value) emit('update:modelValue', parsed)
}
</script>

<template>
  <Input
    v-model="text"
    class="w-24 text-center tabular-nums"
    inputmode="numeric"
    :placeholder="placeholder"
    :aria-label="label"
    :aria-invalid="invalid || undefined"
    @blur="commit"
    @keydown.enter.prevent="commit"
  />
</template>
