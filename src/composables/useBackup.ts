import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { useGamesStore } from '@/stores/games'
import { loadGames } from '@/storage'
import { backupFileName, exportBackup, importBackup } from '@/io/backup'
import { saveFile } from '@/platform'

/** Saves the whole library to one file and restores it, reporting progress as toasts. */
export function useBackup() {
  const { t } = useI18n()
  const store = useGamesStore()
  const busy = ref(false)

  function errorText(err: unknown): string {
    return err instanceof Error ? err.message : String(err)
  }

  /** Writes every game with its media into one .gamebackup file. */
  async function saveAll(): Promise<void> {
    if (busy.value) return
    busy.value = true
    const id = toast.loading(t('prefsLibrary.toast.packing'))
    try {
      const games = await loadGames()
      if (!games.length) {
        toast.info(t('prefsLibrary.toast.nothingToSave'), { id })
        return
      }
      const blob = await exportBackup(games, (done, total) => toast.loading(t('prefsLibrary.toast.packingProgress', { done, total }), { id }))
      if (await saveFile(blob, backupFileName())) toast.success(t('prefsLibrary.toast.saved', { n: games.length }, games.length), { id })
      else toast.dismiss(id)
    } catch (err) {
      toast.error(t('prefsLibrary.toast.saveFailed'), { id, description: errorText(err) })
    } finally {
      busy.value = false
    }
  }

  /** Adds every game from a .gamebackup file to the library, next to the games already there. */
  async function restore(file: File): Promise<void> {
    if (busy.value) return
    busy.value = true
    const id = toast.loading(t('prefsLibrary.toast.unpacking'))
    try {
      const { games, failed } = await importBackup(file, (done, total) =>
        toast.loading(t('prefsLibrary.toast.unpackingProgress', { done, total }), { id }),
      )
      // saving stamps each game as just edited; go oldest first so the library keeps its order
      for (const game of [...games].reverse()) await store.save(game)
      const description = failed ? t('prefsLibrary.toast.someFailed', { n: failed }, failed) : undefined
      if (games.length) toast.success(t('prefsLibrary.toast.restored', { n: games.length }, games.length), { id, description })
      else if (failed) toast.error(t('prefsLibrary.toast.restoreFailed'), { id, description })
      else toast.info(t('prefsLibrary.toast.emptyBackup'), { id })
    } catch (err) {
      toast.error(t('prefsLibrary.toast.restoreFailed'), { id, description: errorText(err) })
    } finally {
      busy.value = false
    }
  }

  return { busy, saveAll, restore }
}
