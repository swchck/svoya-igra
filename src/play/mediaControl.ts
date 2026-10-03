import { reactive, type InjectionKey } from 'vue'

export type MediaAction = 'play' | 'pause' | 'restart'

/** What the host sees of one clip on the stage. */
export interface MediaStatus {
  playing: boolean
  /** The player refused to start without a click inside the stage window. */
  blocked: boolean
}

export interface MediaHandle {
  run(action: MediaAction): void
}

/**
 * Clips currently mounted on the stage, keyed by media item id, so the host window
 * can see their state and drive them remotely.
 */
export interface MediaRegistry {
  readonly status: Record<string, MediaStatus>
  register(id: string, handle: MediaHandle): () => void
  report(id: string, status: Partial<MediaStatus>): void
  run(id: string, action: MediaAction): void
}

export const MEDIA_REGISTRY: InjectionKey<MediaRegistry> = Symbol('media-registry')

export function createMediaRegistry(): MediaRegistry {
  const handles = new Map<string, MediaHandle>()
  const status = reactive<Record<string, MediaStatus>>({})
  return {
    status,
    register(id, handle) {
      handles.set(id, handle)
      status[id] = { playing: false, blocked: false }
      return () => {
        if (handles.get(id) !== handle) return
        handles.delete(id)
        delete status[id]
      }
    },
    report(id, patch) {
      if (status[id]) Object.assign(status[id], patch)
    },
    run(id, action) {
      handles.get(id)?.run(action)
    },
  }
}
