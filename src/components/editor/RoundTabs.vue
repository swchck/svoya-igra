<script setup lang="ts">
import { Plus } from '@lucide/vue'
import type { Round } from '@/types'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'

defineProps<{ rounds: Round[] }>()
const active = defineModel<number>({ required: true })
defineEmits<{ (e: 'add'): void }>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <Tabs :model-value="String(active)" @update:model-value="(v) => (active = Number(v))">
      <TabsList class="h-auto flex-wrap">
        <TabsTrigger
          v-for="(r, i) in rounds"
          :key="r.id"
          :value="String(i)"
          class="font-display tracking-wide uppercase data-[state=active]:text-gold"
        >
          {{ r.name || `Раунд ${i + 1}` }}
        </TabsTrigger>
      </TabsList>
    </Tabs>
    <Button variant="ghost" size="sm" @click="$emit('add')"><Plus />Раунд</Button>
  </div>
</template>
