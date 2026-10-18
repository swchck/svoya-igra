import raw from '../changelog.json'
import type { Locale } from '../i18n'

/*
 * What changed in each version, in every interface language. The release workflow puts the
 * entry of the version it builds into the updater feed, so an update can be described before
 * it is installed; the app shows its own entries after an update has landed.
 */

/** One release: its version, day and what is new in it, per language. */
export interface ChangelogEntry {
  version: string
  /** YYYY-MM-DD. */
  date: string
  notes: Record<Locale, string[]>
}

/** Every release, newest first. */
export const CHANGELOG: readonly ChangelogEntry[] = raw

/** The version this build is; from package.json, the same on desktop and on the web. */
export const APP_VERSION: string = __APP_VERSION__

function parts(version: string): number[] {
  // a pre-release tag like 1.0.0-rc1 counts as its base version
  return version.replace(/^v/, '').split('-')[0].split('.').map((n) => Number(n) || 0)
}

/** Compares two versions like 1.2.10 and 1.10.0; negative when `a` is older. */
export function compareVersions(a: string, b: string): number {
  const x = parts(a)
  const y = parts(b)
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0)
    if (d) return d
  }
  return 0
}

/** Releases after `seen` up to and including `current`, newest first. */
export function entriesSince(seen: string, current: string, log: readonly ChangelogEntry[] = CHANGELOG): ChangelogEntry[] {
  return log.filter((e) => compareVersions(e.version, seen) > 0 && compareVersions(e.version, current) <= 0)
}

/** The entry's notes in the language, falling back to Russian, the language every entry has. */
export function notesIn(entry: Pick<ChangelogEntry, 'notes'>, locale: Locale): string[] {
  return entry.notes[locale]?.length ? entry.notes[locale] : entry.notes.ru
}

/**
 * Reads the notes the updater feed carries: the release workflow writes the changelog entry
 * as JSON, any other text is shown line by line. Empty when there is nothing worth showing.
 */
export function parseFeedNotes(body: string | undefined, locale: Locale): string[] {
  const text = body?.trim()
  if (!text) return []
  try {
    const data = JSON.parse(text) as Partial<Record<Locale, unknown>>
    const pick = (l: Locale) => (Array.isArray(data[l]) ? (data[l] as unknown[]).filter((x): x is string => typeof x === 'string') : [])
    const notes = pick(locale)
    return notes.length ? notes : pick('ru')
  } catch {
    return text
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*[-*•]\s*/, '').trim())
      .filter(Boolean)
  }
}
