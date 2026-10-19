import { ref, watchEffect } from 'vue'
import type { Router } from 'vue-router'
import { prefs } from '@/prefs'

const LIGHT_CLASS = 'light-surface'
/** Pages that show the stage; they take the game's stage style, never the app theme. */
const STAGE_ROUTES = new Set(['play', 'host', 'flash', 'print', 'diploma'])

/** Keeps <html> light or dark by the app theme setting, the system's choice and the page. */
export function syncThemeClass(router: Router): void {
  const query = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: light)') : null
  const systemLight = ref(query?.matches ?? false)
  query?.addEventListener('change', (e) => (systemLight.value = e.matches))
  watchEffect(() => {
    const onStage = STAGE_ROUTES.has(String(router.currentRoute.value.name ?? ''))
    const light = !onStage && (prefs.theme === 'light' || (prefs.theme === 'system' && systemLight.value))
    document.documentElement.classList.toggle(LIGHT_CLASS, light)
    document.documentElement.classList.toggle('dark', !light)
  })
}
