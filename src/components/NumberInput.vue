<script setup lang="ts">
import {
  NumberField,
  NumberFieldContent,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@/components/ui/number-field'

const model = defineModel<number | undefined>()
withDefaults(defineProps<{ min?: number; step?: number; placeholder?: string; disabled?: boolean; stepSnapping?: boolean }>(), {
  min: 0,
  step: 1,
  placeholder: undefined,
  stepSnapping: true,
})
</script>

<template>
  <NumberField
    :model-value="model ?? null"
    :min="min"
    :step="step"
    :disabled="disabled"
    :step-snapping="stepSnapping"
    :format-options="{ useGrouping: false }"
    @update:model-value="(v) => (model = Number.isFinite(v) ? v : undefined)"
  >
    <NumberFieldContent>
      <NumberFieldDecrement />
      <NumberFieldInput :placeholder="placeholder" />
      <NumberFieldIncrement />
    </NumberFieldContent>
  </NumberField>
</template>
