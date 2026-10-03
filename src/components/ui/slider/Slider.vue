<script setup lang="ts">
import type { SliderRootEmits, SliderRootProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { SliderRange, SliderRoot, SliderThumb, SliderTrack, useForwardPropsEmits } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<SliderRootProps & {
  class?: HTMLAttributes['class']
  /** Accessible name per thumb, in value order. */
  thumbLabels?: string[]
}>()
const emits = defineEmits<SliderRootEmits>()

const delegatedProps = reactiveOmit(props, 'class', 'thumbLabels')
const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <SliderRoot
    v-slot="{ modelValue }"
    data-slot="slider"
    :class="cn('relative flex h-6 w-full touch-none items-center select-none data-disabled:opacity-50', props.class)"
    v-bind="forwarded"
  >
    <SliderTrack data-slot="slider-track" class="relative h-1.5 w-full grow overflow-hidden rounded-full bg-white/15">
      <SliderRange data-slot="slider-range" class="absolute h-full rounded-full bg-gold" />
    </SliderTrack>
    <SliderThumb
      v-for="(_, i) in modelValue"
      :key="i"
      data-slot="slider-thumb"
      :aria-label="thumbLabels?.[i]"
      class="block size-4 shrink-0 rounded-full border-2 border-gold bg-night shadow-md transition-[box-shadow,transform] outline-none hover:scale-110 focus-visible:ring-4 focus-visible:ring-ring/40 disabled:pointer-events-none"
    />
  </SliderRoot>
</template>
