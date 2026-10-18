import type { InjectionKey, Ref } from 'vue'
import type { MediaItem } from '@/types'

/** The game's stored files, one item per file, offered for reuse by every media list in the editor. */
export const GAME_MEDIA: InjectionKey<Ref<MediaItem[]>> = Symbol('game-media')
