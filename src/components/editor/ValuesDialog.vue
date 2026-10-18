<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Round } from '@/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import NumberInput from '@/components/NumberInput.vue'
import { scaleValues, setValueLadder } from '@/game/edit'

const props = defineProps<{ round: Round }>()
const open = defineModel<boolean>('open', { required: true })
const { t } = useI18n()

const first = ref<number | undefined>(100)
const step = ref<number | undefined>(100)
const columns = computed(() => Math.max(1, ...props.round.themes.map((th) => th.questions.length)))
const ladder = computed(() => Array.from({ length: columns.value }, (_, i) => Math.max(1, (first.value ?? 100) + (step.value ?? 0) * i)))

// start from what the round already has, so a small change is a small edit
watch(open, (on) => {
  if (!on) return
  const [a, b] = props.round.themes[0]?.questions ?? []
  first.value = a?.value ?? 100
  step.value = a && b ? b.value - a.value : 100
})

function apply() {
  setValueLadder(props.round, first.value ?? 100, step.value ?? 0)
  open.value = false
}

function scale(factor: number) {
  scaleValues(props.round, factor)
  open.value = false
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogTitle>{{ t('editor.values.title') }}</DialogTitle>
      <DialogDescription>{{ t('editor.values.description') }}</DialogDescription>
      <div class="flex flex-wrap gap-4">
        <div class="grid gap-2">
          <Label as="span">{{ t('editor.values.first') }}</Label>
          <NumberInput v-model="first" class="w-36" :min="1" :step="100" :step-snapping="false" />
        </div>
        <div class="grid gap-2">
          <Label as="span">{{ t('editor.values.step') }}</Label>
          <NumberInput v-model="step" class="w-36" :min="0" :step="100" :step-snapping="false" />
        </div>
      </div>
      <p class="ladder" :aria-label="t('editor.values.preview')">
        <span v-for="(v, i) in ladder" :key="i">{{ v }}</span>
      </p>
      <div class="grid gap-2">
        <Label as="span">{{ t('editor.values.scale') }}</Label>
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" @click="scale(2)">×2</Button>
          <Button variant="outline" @click="scale(0.5)">÷2</Button>
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" @click="open = false">{{ t('editor.values.cancel') }}</Button>
        <Button @click="apply">{{ t('editor.values.apply') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.ladder {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
}
.ladder span {
  min-width: 52px;
  padding: 4px 8px;
  border-radius: 10px;
  background: linear-gradient(180deg, var(--tile), var(--tile-deep));
  color: var(--gold);
  font-family: var(--font-display);
  text-align: center;
}
</style>
