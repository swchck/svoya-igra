<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    text: string
    /** Share of the parent's height the text may take. */
    share?: number
    /** Font size bounds in px; the upper one is also capped by the parent's width. */
    max?: number
    min?: number
  }>(),
  { share: 0.4, max: 76, min: 14 },
)

const el = ref<HTMLElement | null>(null)

// binary search on font-size: the largest size whose wrapped text fits the budget
function fit() {
  const node = el.value
  const host = node?.parentElement
  if (!node || !host) return
  const budget = host.clientHeight * props.share
  let hi = Math.min(props.max, host.clientWidth * 0.055)
  let lo = Math.min(props.min, hi)
  node.style.fontSize = `${hi}px`
  if (node.scrollHeight <= budget) return
  for (let i = 0; i < 10; i++) {
    const mid = (lo + hi) / 2
    node.style.fontSize = `${mid}px`
    if (node.scrollHeight <= budget) lo = mid
    else hi = mid
  }
  node.style.fontSize = `${lo}px`
}

let observer: ResizeObserver | undefined
onMounted(() => {
  fit()
  document.fonts?.ready.then(fit)
  observer = new ResizeObserver(fit)
  if (el.value?.parentElement) observer.observe(el.value.parentElement)
})
watch(
  () => [props.text, props.share],
  () => nextTick(fit),
)
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div ref="el" class="fit-text">{{ text }}</div>
</template>

<style scoped>
.fit-text {
  flex: none;
  width: 100%;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  text-wrap: balance;
}
</style>
