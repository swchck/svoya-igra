<script setup lang="ts">
import type { ButtonVariants } from '@/components/ui/button'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

withDefaults(
  defineProps<{
    /** Read by screen readers and shown as the tooltip. */
    label: string
    variant?: ButtonVariants['variant']
    size?: 'icon' | 'icon-sm' | 'icon-xs' | 'icon-lg'
    disabled?: boolean
  }>(),
  { variant: 'ghost', size: 'icon-sm' },
)
defineOptions({ inheritAttrs: false })
defineEmits<{ (e: 'click', event: MouseEvent): void }>()
</script>

<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <Button v-bind="$attrs" :variant="variant" :size="size" :disabled="disabled" :aria-label="label" @click="$emit('click', $event)">
        <slot />
      </Button>
    </TooltipTrigger>
    <TooltipContent>{{ label }}</TooltipContent>
  </Tooltip>
</template>
