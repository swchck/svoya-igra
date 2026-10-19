<script setup lang="ts">
import { useI18n } from 'vue-i18n'

/** One line of the list: the keys, pressed together, and what they do. */
export interface Hotkey {
  keys: string[]
  label: string
}

defineProps<{ items: Hotkey[] }>()
defineEmits<{ (e: 'close'): void }>()
const { t } = useI18n()
</script>

<template>
  <aside class="hotkeys glass" role="region" :aria-label="t('common.hotkeys.title')" @keydown.esc="$emit('close')">
    <h2 class="title">{{ t('common.hotkeys.title') }}</h2>
    <dl>
      <div v-for="(item, i) in items" :key="i">
        <dt>
          <template v-for="(key, k) in item.keys" :key="k"><kbd>{{ key }}</kbd><span v-if="k < item.keys.length - 1">+</span></template>
        </dt>
        <dd>{{ item.label }}</dd>
      </div>
    </dl>
  </aside>
</template>

<style scoped>
.hotkeys {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 50;
  width: min(360px, calc(100vw - 36px));
  padding: 14px 16px;
  border-radius: 16px;
}
.title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 18px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted-foreground);
}
dl {
  display: grid;
  gap: 6px;
  margin: 10px 0 0;
  font-size: 14px;
}
dl > div {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
}
dt {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;
}
dd {
  margin: 0;
  color: var(--muted-foreground);
}
kbd {
  min-width: 24px;
  padding: 1px 6px;
  border-radius: 6px;
  border: 1px solid oklch(var(--tint) 0 0 / 0.3);
  border-bottom-width: 2px;
  background: oklch(var(--tint) 0 0 / 0.08);
  font-family: inherit;
  font-size: 12px;
  text-align: center;
}
</style>
