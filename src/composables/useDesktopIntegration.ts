import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { useGamesStore } from '@/stores/games'
import { importGameFile } from '@/io/gameFile'
import { findUpdate, isDesktop, isMainWindow, onOpenedFiles } from '@/platform'

/** Desktop-only wiring of the main window: files opened through the OS and update offers. */
export function useDesktopIntegration() {
  // host windows run the same app; they must not race the main one for opened files
  if (!isDesktop || !isMainWindow()) return
  const router = useRouter()
  const store = useGamesStore()
  let stop: (() => void) | undefined

  async function importOpened(files: File[]) {
    for (const file of files) {
      try {
        const game = await store.save(await importGameFile(file))
        toast.success('Игра открыта', {
          description: game.title,
          action: { label: 'Редактировать', onClick: () => router.push({ name: 'editor', params: { id: game.id } }) },
        })
      } catch (err) {
        toast.error(`Не удалось открыть ${file.name}`, { description: (err as Error).message })
      }
    }
  }

  onMounted(async () => {
    stop = await onOpenedFiles(importOpened)
    const update = await findUpdate()
    if (update) {
      toast.info(`Вышла версия ${update.version}`, {
        duration: Infinity,
        action: {
          label: 'Обновить',
          onClick: () => {
            toast.promise(update.install(), { loading: 'Скачиваем обновление…', error: 'Не удалось обновить' })
          },
        },
      })
    }
  })
  onUnmounted(() => stop?.())
}
