<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    text?: string
    /** Sanitized HTML, used instead of text. */
    html?: string
    /** Share of the parent's height the text may take. */
    share?: number
    /** Font size bounds in px; the upper one is also capped by the parent's width. */
    max?: number
    min?: number
  }>(),
  { text: undefined, html: undefined, share: 0.4, max: 76, min: 14 },
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
  () => [props.text, props.html, props.share],
  () => nextTick(fit),
)
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- callers pass renderMarkdown output, sanitized by DOMPurify -->
  <div v-if="html !== undefined" ref="el" class="fit-text rich" v-html="html" />
  <div v-else ref="el" class="fit-text plain">{{ text }}</div>
</template>

<style scoped>
.fit-text {
  flex: none;
  width: 100%;
  overflow-wrap: anywhere;
  text-wrap: balance;
}
.plain {
  white-space: pre-wrap;
}
.rich :deep(> :first-child) {
  margin-top: 0;
}
.rich :deep(> :last-child) {
  margin-bottom: 0;
}
.rich :deep(p),
.rich :deep(ul),
.rich :deep(ol),
.rich :deep(blockquote),
.rich :deep(pre),
.rich :deep(h1),
.rich :deep(h2),
.rich :deep(h3) {
  margin: 0.35em 0;
}
.rich :deep(h1),
.rich :deep(h2),
.rich :deep(h3) {
  font-size: 1em;
}
/* centered card, but list markers need left-aligned text inside a shrink-wrapped block */
.rich :deep(ul),
.rich :deep(ol) {
  width: fit-content;
  max-width: 100%;
  margin-inline: auto;
  padding-left: 1.2em;
  text-align: left;
  text-wrap: wrap;
}
.rich :deep(ul) {
  list-style: disc;
}
.rich :deep(ol) {
  list-style: decimal;
}
.rich :deep(li) {
  margin: 0.15em 0;
}
.rich :deep(blockquote) {
  padding-left: 0.7em;
  border-left: 0.12em solid currentColor;
  opacity: 0.85;
}
.rich :deep(code) {
  padding: 0.05em 0.3em;
  border-radius: 0.25em;
  background: oklch(1 0 0 / 0.14);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.85em;
  text-transform: none;
}
.rich :deep(pre) {
  white-space: pre-wrap;
  text-align: left;
}
.rich :deep(pre code) {
  padding: 0;
  background: none;
}
.rich :deep(hr) {
  margin: 0.5em auto;
  width: 40%;
  border: 0;
  border-top: 0.08em solid currentColor;
  opacity: 0.4;
}
</style>
