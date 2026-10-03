<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { qrSvg } from '@/play/lan'

const props = defineProps<{ url: string; code?: string; caption?: string }>()
const { t } = useI18n()
const svg = ref('')

watch(
  () => props.url,
  async (url) => {
    const rendered = await qrSvg(url)
    if (url === props.url) svg.value = rendered
  },
  { immediate: true },
)
</script>

<template>
  <div class="lan-qr">
    <!-- eslint-disable-next-line vue/no-v-html -- the SVG comes from the qrcode library, built from our own URL -->
    <div class="code-img" role="img" :aria-label="caption ?? url" v-html="svg" />
    <div class="meta">
      <p v-if="caption" class="caption">{{ caption }}</p>
      <p class="url">{{ url }}</p>
      <p v-if="code" class="room">{{ t('lan.room') }} <strong>{{ code }}</strong></p>
      <slot />
    </div>
  </div>
</template>

<style scoped>
.lan-qr {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: left;
}
.code-img {
  flex: none;
  width: 168px;
  height: 168px;
  padding: 6px;
  border-radius: 14px;
  background: #fff;
}
.code-img :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}
.meta {
  display: grid;
  gap: 6px;
  min-width: 0;
  max-width: 320px;
}
.caption {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 14px;
}
.url {
  margin: 0;
  font-family: ui-monospace, monospace;
  font-size: 15px;
  word-break: break-all;
  user-select: all;
}
.room {
  margin: 0;
  color: var(--muted-foreground);
}
.room strong {
  margin-left: 4px;
  font-family: var(--font-display);
  font-size: 26px;
  letter-spacing: 0.12em;
  color: var(--gold);
}
</style>
