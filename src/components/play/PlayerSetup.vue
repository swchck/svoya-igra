<script setup lang="ts">
import { Plus, Smartphone, X } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import type { Player } from '@/types'
import { PLAYER_AVATARS, PLAYER_COLORS, playerColor } from '@/play/palette'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import IconButton from '@/components/IconButton.vue'

const { t } = useI18n()
const players = defineModel<Player[]>({ required: true })
const teams = defineModel<boolean>('teams', { default: false })
defineProps<{
  /** Phones online per player id, while phone buzzers are on. */
  phones?: Record<string, number>
}>()
defineEmits<{ (e: 'add'): void; (e: 'remove', player: Player): void }>()

function setMode(value: unknown) {
  // a toggle group lets go of the pressed item on a second click; one mode is always on
  if (value === 'players' || value === 'teams') teams.value = value === 'teams'
}
</script>

<template>
  <Card class="w-full max-w-md gap-3 px-5 text-left">
    <ToggleGroup
      type="single"
      variant="outline"
      class="w-full"
      :aria-label="t('play.setup.mode')"
      :model-value="teams ? 'teams' : 'players'"
      @update:model-value="setMode"
    >
      <ToggleGroupItem value="players" class="flex-1">{{ t('play.setup.modePlayers') }}</ToggleGroupItem>
      <ToggleGroupItem value="teams" class="flex-1">{{ t('play.setup.modeTeams') }}</ToggleGroupItem>
    </ToggleGroup>

    <div v-for="(p, i) in players" :key="p.id" class="flex items-center gap-2" :style="{ '--pc': playerColor(p, i) }">
      <Popover>
        <PopoverTrigger as-child>
          <Button
            variant="outline"
            size="icon"
            class="shrink-0 border-2 border-(--pc) text-lg"
            :aria-label="t('play.setup.avatar')"
            :title="t('play.setup.avatar')"
          >
            <span v-if="p.avatar" aria-hidden="true">{{ p.avatar }}</span>
            <span v-else class="size-3.5 rounded-full bg-(--pc)" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" class="w-64">
          <div class="mb-3 flex flex-wrap gap-2" role="group" :aria-label="t('play.setup.colorTitle')">
            <button
              v-for="c in PLAYER_COLORS"
              :key="c.id"
              type="button"
              class="swatch"
              :class="{ on: playerColor(p, i) === c.css }"
              :style="{ background: c.css }"
              :aria-label="t('play.setup.color', { name: t(`play.setup.colors.${c.id}`) })"
              :aria-pressed="playerColor(p, i) === c.css"
              @click="p.color = c.id"
            />
          </div>
          <div class="grid grid-cols-8 gap-1" role="group" :aria-label="t('play.setup.avatar')">
            <button
              v-for="a in PLAYER_AVATARS"
              :key="a"
              type="button"
              class="avatar"
              :class="{ on: p.avatar === a }"
              :aria-pressed="p.avatar === a"
              @click="p.avatar = a"
            >{{ a }}</button>
          </div>
          <Button variant="ghost" size="sm" class="mt-2 w-full" :disabled="!p.avatar" @click="p.avatar = undefined">{{ t('play.setup.noAvatar') }}</Button>
        </PopoverContent>
      </Popover>
      <Input v-model="p.name" :aria-label="teams ? t('play.setup.teamNameLabel') : t('play.setup.nameLabel')" />
      <Smartphone v-if="phones?.[p.id]" class="size-4 shrink-0 text-cyan" :aria-label="t('lan.phoneConnected')" />
      <IconButton :label="teams ? t('play.setup.removeTeam') : t('play.setup.remove')" :disabled="players.length <= 1" @click="$emit('remove', p)"><X /></IconButton>
    </div>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <Button variant="outline" @click="$emit('add')"><Plus />{{ teams ? t('play.setup.addTeam') : t('play.setup.add') }}</Button>
      <slot name="footer" />
    </div>
  </Card>
</template>

<style scoped>
.swatch {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 2px solid transparent;
  outline-offset: 2px;
  cursor: pointer;
}
.swatch.on {
  border-color: var(--foreground);
}
.swatch:focus-visible,
.avatar:focus-visible {
  outline: 2px solid var(--ring);
}
.avatar {
  display: grid;
  place-items: center;
  height: 28px;
  border-radius: 8px;
  font-size: 18px;
  cursor: pointer;
}
.avatar:hover {
  background: oklch(1 0 0 / 0.12);
}
.avatar.on {
  background: oklch(1 0 0 / 0.2);
  outline: 1px solid var(--gold);
}
</style>
