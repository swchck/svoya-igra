<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Eye, EyeOff, Gamepad2, Loader2, Smartphone, Wifi } from '@lucide/vue'
import { hostConsoleUrl, type LanInfo } from '@/play/lan'
import { Button } from '@/components/ui/button'
import LanQr from './LanQr.vue'

defineProps<{ info: LanInfo | null; starting: boolean; phones: number }>()
defineEmits<{ (e: 'start'): void; (e: 'stop'): void }>()
const { t } = useI18n()
// the stage is in view of the hall; the console's code shows only on request
const consoleShown = ref(false)
</script>

<template>
  <div class="phones-panel">
    <template v-if="!info">
      <Button variant="outline" :disabled="starting" @click="$emit('start')">
        <Loader2 v-if="starting" class="animate-spin" /><Smartphone v-else />{{ starting ? t('lan.starting') : t('lan.toggle') }}
      </Button>
      <p class="hint">{{ t('lan.toggleHint') }}</p>
    </template>
    <template v-else>
      <LanQr :url="info.url" :code="info.code" :caption="t('lan.scan')">
        <p class="count" :class="{ on: phones > 0 }"><Wifi class="size-4" />{{ phones ? t('lan.connected', phones) : t('lan.noPhones') }}</p>
        <Button variant="ghost" size="sm" class="justify-self-start" @click="$emit('stop')">{{ t('lan.turnOff') }}</Button>
      </LanQr>
      <p class="hint">{{ t('lan.note') }}</p>
      <p class="hint">{{ t('lan.spectators.hint') }}</p>
      <section class="console">
        <h3 class="console-title"><Gamepad2 class="size-4" />{{ t('lan.console.title') }}</h3>
        <p class="hint">{{ t('lan.console.secret') }}</p>
        <LanQr v-if="consoleShown" :url="hostConsoleUrl(info)" />
        <Button variant="secondary" size="sm" @click="consoleShown = !consoleShown">
          <template v-if="consoleShown"><EyeOff />{{ t('lan.console.hide') }}</template>
          <template v-else><Eye />{{ t('lan.console.show') }}</template>
        </Button>
      </section>
    </template>
  </div>
</template>

<style scoped>
.phones-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}
.hint {
  margin: 0;
  max-width: 52ch;
  font-size: 13px;
  color: var(--muted-foreground);
}
.count {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 14px;
  color: var(--muted-foreground);
}
.count.on {
  color: var(--cyan);
}
.console {
  display: grid;
  justify-items: center;
  gap: 8px;
  width: 100%;
  margin-top: 6px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}
.console-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}
</style>
