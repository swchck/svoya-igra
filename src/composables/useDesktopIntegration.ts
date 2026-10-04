import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { t } from '@/i18n'
import { useGamesStore } from '@/stores/games'
import { endTour } from '@/tour/state'
import { findUpdate, isDesktop, isMainWindow, onOpenedFiles } from '@/platform'

/** Desktop-only wiring of the main window: files opened through the OS and update offers. */
export function useDesktopIntegration() {
  // host windows run the same app; they must not race the main one for opened files
  if (!isDesktop || !isMainWindow()) return
  const router = useRouter()
  const store = useGamesStore()
  let stop: (() => void) | undefined

  async function importOpened(files: File[]) {
    // someone who opened a game file has come for that game, not for a tour
    endTour()
    const { importGameFile } = await import('@/io/gameFile')
    for (const file of files) {
      try {
        const game = await store.save(await importGameFile(file))
        toast.success(t('system.desktop.gameOpened'), {
          description: game.title,
          action: { label: t('system.desktop.edit'), onClick: () => router.push({ name: 'editor', params: { id: game.id } }) },
        })
      } catch (err) {
        toast.error(t('system.desktop.openFailed', { name: file.name }), { description: (err as Error).message })
      }
    }
  }

  onMounted(async () => {
    stop = await onOpenedFiles(importOpened)
    const update = await findUpdate()
    if (update) {
      toast.info(t('system.desktop.updateAvailable', { version: update.version }), {
        duration: Infinity,
        action: {
          label: t('system.desktop.update'),
          onClick: () => {
            toast.promise(update.install(), { loading: t('system.desktop.downloading'), error: t('system.desktop.updateFailed') })
          },
        },
      })
    }
  })
  onUnmounted(() => stop?.())
}
