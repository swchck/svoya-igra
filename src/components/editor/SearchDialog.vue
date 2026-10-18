<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronRight, Search } from '@lucide/vue'
import type { Game } from '@/types'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { searchGame, type SearchHit } from '@/game/edit'

const props = defineProps<{ game: Game }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ (e: 'goto', hit: SearchHit): void }>()
const { t } = useI18n()

const query = ref('')
const active = ref(0)
const hits = computed(() => searchGame(props.game, query.value))
watch(hits, () => (active.value = 0))

function go(hit: SearchHit | undefined) {
  if (!hit) return
  open.value = false
  emit('goto', hit)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') active.value = Math.min(active.value + 1, hits.value.length - 1)
  else if (e.key === 'ArrowUp') active.value = Math.max(active.value - 1, 0)
  else if (e.key === 'Enter') go(hits.value[active.value])
  else return
  e.preventDefault()
}

function where(hit: SearchHit): string {
  if (hit.roundIndex === undefined) return t('editor.search.final', { theme: hit.themeName })
  const theme = hit.themeName || t('editor.dialog.unnamedTheme')
  return hit.value === undefined || hit.field === 'theme' ? `${hit.roundName} · ${theme}` : `${hit.roundName} · ${theme} · ${hit.value}`
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="top-[12vh] translate-y-0 gap-3 sm:max-w-2xl">
      <DialogTitle class="sr-only">{{ t('editor.search.title') }}</DialogTitle>
      <DialogDescription class="sr-only">{{ t('editor.search.description') }}</DialogDescription>
      <label class="field">
        <Search class="size-5 text-muted-foreground" />
        <input
          v-model="query"
          class="input"
          type="search"
          :placeholder="t('editor.search.placeholder')"
          :aria-label="t('editor.search.title')"
          aria-controls="search-hits"
          @keydown="onKeydown"
        />
      </label>
      <ul v-if="hits.length" id="search-hits" class="hits" role="listbox">
        <li v-for="(hit, i) in hits" :key="`${hit.questionId}-${hit.field}-${i}`" role="option" :aria-selected="i === active">
          <button type="button" class="hit" :class="{ active: i === active }" @click="go(hit)" @mousemove="active = i">
            <span class="where">{{ where(hit) }}<span class="field-name">{{ t(`editor.search.field.${hit.field}`) }}</span></span>
            <span class="snippet">{{ hit.snippet }}</span>
            <ChevronRight class="size-4 shrink-0 text-muted-foreground" />
          </button>
        </li>
      </ul>
      <p v-else-if="query.trim()" class="text-sm text-muted-foreground">{{ t('editor.search.empty') }}</p>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.field {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid var(--input);
  background: oklch(0.14 0.1 274 / 0.55);
}
.field:focus-within {
  border-color: var(--ring);
}
.input {
  flex: 1;
  height: 46px;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 17px;
  outline: none;
}
.hits {
  display: grid;
  gap: 4px;
  max-height: 55vh;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}
.hit {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas: 'where chev' 'snippet chev';
  align-items: center;
  gap: 2px 10px;
  width: 100%;
  padding: 8px 12px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.hit.active {
  background: oklch(1 0 0 / 0.08);
}
.where {
  grid-area: where;
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: var(--muted-foreground);
}
.field-name {
  color: var(--cyan);
}
.snippet {
  grid-area: snippet;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.hit > :last-child {
  grid-area: chev;
}
</style>
