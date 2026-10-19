import { defineAsyncComponent } from 'vue'

const load = () => import('./MarkdownEditor.vue')

/** The markdown editor, fetched on first use: it carries the whole rich-text engine (~400 KB). */
export const LazyMarkdownEditor = defineAsyncComponent(load)

/** Starts fetching the editor before anyone opens a question, so the dialog opens at once. */
export function preloadMarkdownEditor(): void {
  const start = () => void load()
  if (typeof requestIdleCallback === 'function') requestIdleCallback(start, { timeout: 3000 })
  else setTimeout(start, 1000)
}
