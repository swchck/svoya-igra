<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Gavel } from '@lucide/vue'
import type { Player } from '@/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import NumberInput from '@/components/NumberInput.vue'
import { maxStake } from '@/composables/usePlaySession'

const props = defineProps<{ players: Player[]; value: number }>()
const emit = defineEmits<{ (e: 'stake', playerId: string, amount: number): void }>()

const winner = ref<string>(props.players[0]?.id ?? '')
const bid = ref<number | undefined>(props.value)
const limit = computed(() => maxStake(props.players.find((p) => p.id === winner.value), props.value))
watch(limit, (max) => {
  if ((bid.value ?? 0) > max) bid.value = max
})
</script>

<template>
  <div class="flex w-full max-w-xl flex-col items-center gap-5">
    <div class="grid w-full gap-2">
      <Label>Кто выиграл торги</Label>
      <ToggleGroup v-model="winner" type="single" variant="outline" class="flex-wrap justify-center">
        <ToggleGroupItem v-for="p in players" :key="p.id" :value="p.id" class="px-4">
          {{ p.name }} · {{ p.score }}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
    <div class="flex flex-wrap items-end justify-center gap-3">
      <div class="grid gap-2">
        <Label>Ставка (от {{ value }} до {{ limit }})</Label>
        <NumberInput v-model="bid" class="w-44" :min="value" :step="100" />
      </div>
      <Button variant="outline" @click="bid = limit">Ва-банк</Button>
    </div>
    <Button size="lg" :disabled="!winner" @click="emit('stake', winner, bid ?? value)">
      <Gavel />Играть за {{ Math.min(Math.max(bid ?? value, value), limit) }}
    </Button>
  </div>
</template>
