import type { Game, MediaItem, MediaKind, Question, Round, Theme } from './types'
import { dbDelete, dbGet, dbGetAll, dbPut } from './db'

const LEGACY_KEY = 'svoya-igra:games:v1'

export function uid(prefix = ''): string {
  return prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

/* === Миграция legacy single-media полей в массив media[] === */
function migrateMediaArray(
  arr: MediaItem[] | undefined,
  legacy: { url?: string; kind?: MediaKind; mode?: 'video' | 'audio'; duration?: number },
): MediaItem[] {
  const list: MediaItem[] = arr && arr.length ? arr.map((m) => ({ ...m, id: m.id || uid('mi_') })) : []
  if (legacy.url && !list.some((m) => m.url === legacy.url)) {
    list.unshift({
      id: uid('mi_'),
      url: legacy.url,
      kind: legacy.kind || 'image',
      mode: legacy.mode,
      duration: legacy.duration,
    })
  }
  return list
}

export function migrateGame(g: Game): Game {
  for (const r of g.rounds) {
    for (const t of r.themes) {
      for (const q of t.questions) {
        const m = migrateMediaArray(q.media, {
          url: q.mediaUrl, kind: q.mediaKind, mode: q.mediaMode, duration: q.mediaDuration,
        })
        if (m.length) q.media = m
        const am = migrateMediaArray(q.answerMedia, {
          url: q.answerMediaUrl, kind: q.answerMediaKind, mode: q.answerMediaMode, duration: q.answerMediaDuration,
        })
        if (am.length) q.answerMedia = am
        delete q.mediaUrl; delete q.mediaKind; delete q.mediaMode; delete q.mediaDuration
        delete q.answerMediaUrl; delete q.answerMediaKind; delete q.answerMediaMode; delete q.answerMediaDuration
      }
    }
  }
  if (g.finalRound) {
    const m = migrateMediaArray(g.finalRound.media, {
      url: g.finalRound.mediaUrl, kind: g.finalRound.mediaKind, mode: g.finalRound.mediaMode, duration: g.finalRound.mediaDuration,
    })
    if (m.length) g.finalRound.media = m
    delete g.finalRound.mediaUrl; delete g.finalRound.mediaKind; delete g.finalRound.mediaMode; delete g.finalRound.mediaDuration
  }
  return g
}

/* === Однократная миграция localStorage → IndexedDB === */
let migrationDone = false
async function migrateLegacyOnce(): Promise<void> {
  if (migrationDone) return
  migrationDone = true
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return
    for (const g of data as Game[]) {
      try { await dbPut(migrateGame(g)) } catch { /* ignore */ }
    }
    localStorage.removeItem(LEGACY_KEY)
  } catch { /* ignore */ }
}

export async function loadGames(): Promise<Game[]> {
  await migrateLegacyOnce()
  const all = (await dbGetAll<Game>()) ?? []
  return all.map(migrateGame).sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getGame(id: string): Promise<Game | undefined> {
  await migrateLegacyOnce()
  const g = await dbGet<Game>(id)
  return g ? migrateGame(g) : undefined
}

/** Plain deep copy: IndexedDB can't structured-clone Vue proxies (DataCloneError). */
function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/**
 * Persists a snapshot of the game and returns it. The argument is left untouched,
 * so saving a reactive game never re-triggers watchers on it.
 */
export async function upsertGame(game: Game): Promise<Game> {
  const snapshot = { ...toPlain(game), updatedAt: Date.now() }
  await dbPut(snapshot)
  return snapshot
}

export async function deleteGame(id: string): Promise<void> {
  await dbDelete(id)
}

const DEFAULT_VALUES = [100, 200, 300, 400, 500]

export function makeEmptyQuestion(value: number): Question {
  return {
    id: uid('q_'),
    value,
    kind: 'normal',
    text: '',
    answer: '',
  }
}

export function makeEmptyTheme(name = 'Тема'): Theme {
  return {
    id: uid('t_'),
    name,
    questions: DEFAULT_VALUES.map(makeEmptyQuestion),
  }
}

export function makeEmptyRound(name = 'РАУНД 1', themeCount = 5): Round {
  return {
    id: uid('r_'),
    name,
    themes: Array.from({ length: themeCount }, (_, i) => makeEmptyTheme(`Тема ${i + 1}`)),
  }
}

export function makeEmptyGame(title = 'Новая игра'): Game {
  const now = Date.now()
  return {
    id: uid('g_'),
    title,
    subtitle: '',
    rounds: [makeEmptyRound('РАУНД 1'), makeEmptyRound('РАУНД 2')],
    finalRound: {
      id: uid('f_'),
      theme: 'Финал',
      text: '',
      answer: '',
    },
    createdAt: now,
    updatedAt: now,
  }
}

export function exportGameJson(game: Game): string {
  return JSON.stringify(game, null, 2)
}

export function importGameJson(json: string): Game {
  const data = JSON.parse(json) as Game
  if (!data.id || !Array.isArray(data.rounds)) {
    throw new Error('Некорректный формат файла')
  }
  data.id = uid('g_')
  data.rounds = data.rounds.map((r) => ({
    ...r,
    id: uid('r_'),
    themes: r.themes.map((t) => ({
      ...t,
      id: uid('t_'),
      questions: t.questions.map((q) => ({ ...q, id: uid('q_') })),
    })),
  }))
  if (data.finalRound) data.finalRound.id = uid('f_')
  data.createdAt = data.createdAt || Date.now()
  data.updatedAt = Date.now()
  return migrateGame(data)
}
