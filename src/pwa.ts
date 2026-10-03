import { toast } from 'vue-sonner'
import { isDesktop } from './platform'
import { t } from './i18n'

/**
 * Registers the offline worker of the web build. A new version waits for the user's
 * go-ahead: reloading on its own could wipe a game in the middle of a round.
 */
export async function registerServiceWorker(): Promise<void> {
  if (isDesktop || !import.meta.env.PROD || !('serviceWorker' in navigator)) return
  const { registerSW } = await import('virtual:pwa-register')
  const update = registerSW({
    onNeedRefresh() {
      toast(t('pwa.updateReady'), {
        duration: Infinity,
        action: { label: t('pwa.update'), onClick: () => update(true) },
      })
    },
    onOfflineReady() {
      toast.success(t('pwa.offlineReady'))
    },
  })
}
