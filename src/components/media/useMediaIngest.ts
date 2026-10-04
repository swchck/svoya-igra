import { toast } from 'vue-sonner'
import { useI18n } from 'vue-i18n'
import type { MediaItem } from '@/types'
import { uid } from '@/game/model'
import { detectKind } from '@/media/kind'
import { putMedia } from '@/media/store'
import { IMAGE_LEVELS, optimizeImage } from '@/media/optimize'
import { prefs } from '@/prefs'

/** Turns dropped, picked or pasted files and links into media items, reporting rejects as toasts. */
export function useMediaIngest() {
  const { t } = useI18n()

  async function fromFiles(files: Iterable<File>): Promise<MediaItem[]> {
    const added: MediaItem[] = []
    for (const file of files) {
      const kind = detectKind({ file })
      if (!kind) {
        toast.error(t('media.list.rejected', { name: file.name }), { description: t('media.list.unsupportedHint') })
        continue
      }
      try {
        added.push({ id: uid('mi_'), url: await putMedia(kind === 'image' ? await optimizeImage(file, IMAGE_LEVELS[prefs.imageQuality]) : file), kind })
      } catch (err) {
        toast.error(t('media.list.saveFailed', { name: file.name }), { description: (err as Error).message })
      }
    }
    return added
  }

  /** Returns undefined (and a toast) unless the text is an http(s) link. */
  function fromLink(raw: string): MediaItem | undefined {
    const url = raw.trim()
    if (!isWebLink(url)) {
      toast.error(t('media.add.badLink'))
      return undefined
    }
    const kind = detectKind({ url }) ?? 'image'
    return { id: uid('mi_'), url, kind, mode: kind === 'youtube' ? 'video' : undefined }
  }

  return { fromFiles, fromLink }
}

export function isWebLink(text: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(text).protocol)
  } catch {
    return false
  }
}
