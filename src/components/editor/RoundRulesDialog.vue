<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Round } from '@/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import NumberInput from '@/components/NumberInput.vue'

defineProps<{ gameSeconds: number }>()
const round = defineModel<Round>('round', { required: true })
const open = defineModel<boolean>('open', { required: true })
const { t } = useI18n()

function setRule<K extends 'answerSeconds' | 'wrongPenalty'>(key: K, value: NonNullable<Round['rules']>[K] | undefined) {
  const rules = { ...round.value.rules }
  if (value === undefined) delete rules[key]
  else rules[key] = value
  if (Object.keys(rules).length) round.value.rules = rules
  else delete round.value.rules
}

const seconds = computed({
  get: () => round.value.rules?.answerSeconds,
  set: (v) => setRule('answerSeconds', v === undefined ? undefined : Math.max(0, Math.round(v))),
})
const penalty = computed({
  get: () => (round.value.rules?.wrongPenalty === undefined ? 'house' : round.value.rules.wrongPenalty ? 'on' : 'off'),
  set: (v: string) => setRule('wrongPenalty', v === 'house' ? undefined : v === 'on'),
})
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogTitle>{{ t('editor.roundRules.title', { name: round.name }) }}</DialogTitle>
      <DialogDescription>{{ t('editor.roundRules.description') }}</DialogDescription>
      <div class="grid gap-2">
        <Label as="span">{{ t('editor.roundRules.seconds') }}</Label>
        <NumberInput
          v-model="seconds"
          class="w-40"
          :min="0"
          :step="5"
          :placeholder="gameSeconds ? t('editor.roundRules.asGame', { n: gameSeconds }) : t('editor.roundRules.asGameNone')"
        />
        <p class="text-sm text-muted-foreground">{{ t('editor.roundRules.secondsHint') }}</p>
      </div>
      <div class="grid gap-2">
        <Label as="span">{{ t('editor.roundRules.penalty') }}</Label>
        <ToggleGroup v-model="penalty" type="single" variant="outline" class="justify-start">
          <ToggleGroupItem value="house">{{ t('editor.roundRules.penaltyHouse') }}</ToggleGroupItem>
          <ToggleGroupItem value="on">{{ t('editor.roundRules.penaltyOn') }}</ToggleGroupItem>
          <ToggleGroupItem value="off">{{ t('editor.roundRules.penaltyOff') }}</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <DialogFooter>
        <Button @click="open = false">{{ t('editor.roundRules.done') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
