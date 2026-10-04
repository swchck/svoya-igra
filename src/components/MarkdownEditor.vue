<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import { Placeholder } from '@tiptap/extensions'
import { Bold, Code, Italic, List, ListOrdered, Quote, Strikethrough } from '@lucide/vue'

const props = defineProps<{
  placeholder?: string
  /** Larger display type, for answers. */
  display?: boolean
  label?: string
}>()
const model = defineModel<string>({ required: true })
const { t } = useI18n()

const editor = useEditor({
  content: model.value,
  contentType: 'markdown',
  extensions: [
    // the stage shows formatted text only: no headings, links or images to keep cards readable
    StarterKit.configure({ heading: false, link: false, horizontalRule: false, codeBlock: false, underline: false }),
    Markdown.configure({ markedOptions: { gfm: true, breaks: true } }),
    Placeholder.configure({ placeholder: () => props.placeholder ?? '' }),
  ],
  editorProps: { attributes: { 'aria-label': props.label ?? '', role: 'textbox', 'aria-multiline': 'true' } },
  onUpdate: ({ editor }) => {
    const md = editor.isEmpty ? '' : editor.getMarkdown()
    if (md !== model.value) model.value = md
  },
})

// external changes (undo elsewhere, switching questions) replace the content without echoing back
watch(model, (value) => {
  const e = editor.value
  if (!e || (e.isEmpty ? '' : e.getMarkdown()) === value) return
  e.commands.setContent(value, { contentType: 'markdown', emitUpdate: false })
})

onBeforeUnmount(() => editor.value?.destroy())

type Action = { key: string; icon: typeof Bold; active: string; run: () => void }
const ACTIONS: Action[] = [
  { key: 'bold', icon: Bold, active: 'bold', run: () => editor.value?.chain().focus().toggleBold().run() },
  { key: 'italic', icon: Italic, active: 'italic', run: () => editor.value?.chain().focus().toggleItalic().run() },
  { key: 'strike', icon: Strikethrough, active: 'strike', run: () => editor.value?.chain().focus().toggleStrike().run() },
  { key: 'code', icon: Code, active: 'code', run: () => editor.value?.chain().focus().toggleCode().run() },
  { key: 'bulletList', icon: List, active: 'bulletList', run: () => editor.value?.chain().focus().toggleBulletList().run() },
  { key: 'orderedList', icon: ListOrdered, active: 'orderedList', run: () => editor.value?.chain().focus().toggleOrderedList().run() },
  { key: 'quote', icon: Quote, active: 'blockquote', run: () => editor.value?.chain().focus().toggleBlockquote().run() },
]
const isActive = (a: Action) => !!editor.value?.isActive(a.active)
</script>

<template>
  <div class="md-editor" :class="{ display }">
    <div class="toolbar" role="toolbar" :aria-label="t('common.markdown.toolbar')">
      <button
        v-for="a in ACTIONS"
        :key="a.key"
        type="button"
        class="tool"
        :class="{ on: isActive(a) }"
        :aria-pressed="isActive(a)"
        :title="t(`common.markdown.${a.key}`)"
        :aria-label="t(`common.markdown.${a.key}`)"
        @mousedown.prevent
        @click="a.run"
      >
        <component :is="a.icon" class="size-4" />
      </button>
    </div>
    <EditorContent :editor="editor" class="content" />
  </div>
</template>

<style scoped>
.md-editor {
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid var(--input);
  background: oklch(0.14 0.1 274 / 0.55);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.md-editor:focus-within {
  border-color: var(--ring);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--ring) 40%, transparent);
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 4px;
  border-bottom: 1px solid oklch(1 0 0 / 0.08);
}
.tool {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--muted-foreground);
  cursor: pointer;
}
.tool:hover {
  color: var(--foreground);
  background: oklch(1 0 0 / 0.08);
}
.tool.on {
  color: var(--gold);
  background: color-mix(in oklch, var(--gold) 16%, transparent);
}
.content :deep(.tiptap) {
  min-height: 110px;
  padding: 10px 12px;
  outline: none;
  font-family: var(--font-serif);
  font-size: 18px;
  line-height: 1.4;
}
.display .content :deep(.tiptap) {
  min-height: 64px;
  font-family: var(--font-display);
  font-size: 22px;
  letter-spacing: 0.02em;
  color: var(--gold);
}
.content :deep(.tiptap p) {
  margin: 0 0 0.4em;
}
.content :deep(.tiptap ul),
.content :deep(.tiptap ol) {
  margin: 0 0 0.4em;
  padding-left: 1.3em;
}
.content :deep(.tiptap ul) { list-style: disc; }
.content :deep(.tiptap ol) { list-style: decimal; }
.content :deep(.tiptap blockquote) {
  margin: 0 0 0.4em;
  padding-left: 0.8em;
  border-left: 3px solid color-mix(in oklch, var(--gold) 60%, transparent);
}
.content :deep(.tiptap code) {
  padding: 0.05em 0.3em;
  border-radius: 4px;
  background: oklch(1 0 0 / 0.1);
  font-size: 0.9em;
}
.content :deep(.tiptap p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  height: 0;
  color: var(--muted-foreground);
  pointer-events: none;
}
</style>
