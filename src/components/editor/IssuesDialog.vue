<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CircleAlert, CircleCheck, ChevronRight, ClipboardCheck, TriangleAlert } from '@lucide/vue'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { Issue } from '@/game/validate'

const props = defineProps<{ issues: Issue[] }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ (e: 'goto', issue: Issue): void }>()

const { t } = useI18n()

const errors = computed(() => props.issues.filter((i) => i.severity === 'error').length)
const warnings = computed(() => props.issues.length - errors.value)

/** Issues of one kind in one theme: the same problem across several questions reads as one row. */
interface Entry {
  key: string
  issues: Issue[]
}

interface Group {
  key: string
  title: string
  entries: Entry[]
  count: number
}

const groups = computed(() => {
  const out: Group[] = []
  for (const issue of props.issues) {
    const key = issue.final ? 'final' : issue.roundId!
    let group = out.find((g) => g.key === key)
    if (!group) {
      group = { key, title: issue.final ? t('editor.issues.final') : issue.roundName || t('editor.issues.unnamedRound'), entries: [], count: 0 }
      out.push(group)
    }
    const entryKey = `${issue.themeId ?? ''}|${issue.code}|${issue.side ?? ''}`
    let entry = group.entries.find((e) => e.key === entryKey)
    if (!entry) {
      entry = { key: entryKey, issues: [] }
      group.entries.push(entry)
    }
    entry.issues.push(issue)
    group.count++
  }
  return out
})

function message(issue: Issue): string {
  return t(`editor.issues.code.${issue.code}`, { side: issue.side ? t(`editor.issues.side.${issue.side}`) : '' })
}

function place(issue: Issue): string {
  if (!issue.themeId) return ''
  return issue.themeName?.trim() || t('editor.issues.unnamedTheme')
}

function go(issue: Issue) {
  open.value = false
  emit('goto', issue)
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="flex max-h-[85dvh] flex-col gap-4 sm:max-w-2xl">
      <div>
        <DialogTitle class="title"><ClipboardCheck class="size-5" />{{ t('editor.issues.title') }}</DialogTitle>
        <DialogDescription class="mt-1 text-muted-foreground">
          <template v-if="issues.length">
            {{ t('editor.issues.summary', { errors: t('editor.issues.errors', errors), warnings: t('editor.issues.warnings', warnings) }) }}
          </template>
          <template v-else>{{ t('editor.issues.description') }}</template>
        </DialogDescription>
      </div>

      <p v-if="!issues.length" class="clean"><CircleCheck class="size-5" />{{ t('editor.issues.clean') }}</p>
      <div v-else class="groups">
        <section v-for="g in groups" :key="g.key" class="group" :aria-label="g.title">
          <h3 class="group-title">{{ g.title }}<span class="count">{{ g.count }}</span></h3>
          <ul class="list">
            <li v-for="entry in g.entries" :key="entry.key" class="entry">
              <component
                :is="entry.issues[0].value === undefined ? 'button' : 'div'"
                class="issue"
                :class="{ action: entry.issues[0].value === undefined }"
                :type="entry.issues[0].value === undefined ? 'button' : undefined"
                @click="entry.issues[0].value === undefined && go(entry.issues[0])"
              >
                <component :is="entry.issues[0].severity === 'error' ? CircleAlert : TriangleAlert" class="icon size-4" :class="entry.issues[0].severity" aria-hidden="true" />
                <span class="sr-only">{{ t(`editor.issues.severity.${entry.issues[0].severity}`) }}:</span>
                <span class="text">
                  <span class="msg">{{ message(entry.issues[0]) }}</span>
                  <span v-if="place(entry.issues[0])" class="where">{{ place(entry.issues[0]) }}</span>
                </span>
                <span v-if="entry.issues[0].value !== undefined" class="chips">
                  <button v-for="issue in entry.issues" :key="issue.questionId" type="button" class="chip" :aria-label="t('editor.issues.open', { value: issue.value })" @click="go(issue)">
                    {{ issue.value }}
                  </button>
                </span>
                <ChevronRight v-else class="go size-4" aria-hidden="true" />
              </component>
            </li>
          </ul>
        </section>
      </div>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-display);
  font-size: 22px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--gold);
}
.clean {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0;
  padding: 28px 8px;
  color: var(--cyan);
}
.groups {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  padding-right: 4px;
  overflow-y: auto;
}
.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 6px;
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted-foreground);
}
.count {
  padding: 0 8px;
  border-radius: 999px;
  background: oklch(1 0 0 / 0.1);
  font-size: 12px;
  line-height: 18px;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.issue {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: oklch(1 0 0 / 0.04);
  text-align: left;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.issue.action {
  cursor: pointer;
}
.issue.action:hover,
.issue.action:focus-visible {
  background: oklch(1 0 0 / 0.09);
  border-color: color-mix(in oklch, var(--gold) 45%, transparent);
  outline: none;
}
.chips {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
  max-width: 55%;
}
.chip {
  min-width: 48px;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid oklch(1 0 0 / 0.16);
  background: oklch(1 0 0 / 0.06);
  font-family: var(--font-display);
  font-size: 14px;
  color: var(--gold);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.chip:hover,
.chip:focus-visible {
  background: color-mix(in oklch, var(--gold) 20%, transparent);
  border-color: var(--gold);
  outline: none;
}
.icon {
  flex: none;
}
.icon.error {
  color: var(--destructive);
}
.icon.warning {
  color: var(--gold);
}
.text {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 10px;
}
.msg {
  font-size: 14px;
}
.where {
  font-size: 12px;
  color: var(--muted-foreground);
}
.go {
  flex: none;
  color: var(--muted-foreground);
}
</style>
