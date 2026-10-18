import { markRaw, reactive } from 'vue'
import { canSelfUpdate, findUpdate, type AvailableUpdate, type UpdateProgress } from '../platform'
import { prefs } from '../prefs'
import { APP_VERSION, compareVersions, entriesSince, type ChangelogEntry } from './changelog'

/*
 * One copy of the update state for the library window: background checks of the release
 * feed, the offer to install, and the "what's new" note after a version has landed. Host
 * and stage windows never start any of it, so a game is never interrupted.
 */

type Status = 'idle' | 'checking' | 'latest' | 'available' | 'installing' | 'failed'

export const updates = reactive({
  status: 'idle' as Status,
  available: null as AvailableUpdate | null,
  progress: null as UpdateProgress | null,
  /** The update dialog is open. */
  offerOpen: false,
  /** A background check found an update the user has not been told about yet. */
  offerPending: false,
  /** Releases to tell about after an update, newest first; empty when there is nothing new. */
  whatsNew: [] as ChangelogEntry[],
  whatsNewOpen: false,
  /** The list tells about a version that just landed, rather than the history asked for. */
  justUpdated: false,
})

const SKIPPED_KEY = 'svoya-igra:skipped-update'
const SEEN_KEY = 'svoya-igra:seen-version'
const FIRST_CHECK_MS = 5_000
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000

function load(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function store(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // forgotten on the next start, which only means being told twice
  }
}

/**
 * Asks the feed for a newer version. A quiet check stays silent on failure and passes over a
 * version the user chose to skip; a check the user asked for reports both.
 */
export async function checkForUpdates(quiet = false): Promise<void> {
  if (!canSelfUpdate || updates.status === 'checking' || updates.status === 'installing') return
  updates.status = 'checking'
  try {
    const found = await findUpdate()
    if (found && quiet && load(SKIPPED_KEY) === found.version) {
      updates.status = 'idle'
      return
    }
    // the update object holds a native handle; Vue must not wrap it in a proxy
    updates.available = found && markRaw(found)
    updates.status = found ? 'available' : 'latest'
    if (found && quiet) updates.offerPending = true
  } catch (err) {
    console.warn('update check:', err)
    updates.status = quiet ? 'idle' : 'failed'
  }
}

/** Downloads and installs the offered update; the app restarts when it is done. */
export async function installUpdate(): Promise<void> {
  const update = updates.available
  if (!update || updates.status === 'installing') return
  updates.status = 'installing'
  updates.progress = { done: 0, total: null }
  try {
    await update.install((p) => (updates.progress = p))
  } catch (err) {
    console.warn('update install:', err)
    updates.status = 'failed'
  } finally {
    updates.progress = null
  }
}

/** Opens the update dialog for whatever was found. */
export function offerUpdate(): void {
  updates.offerPending = false
  if (updates.available) updates.offerOpen = true
}

/** Stops offering this version; a newer one will be offered again. */
export function skipUpdate(): void {
  if (updates.available) store(SKIPPED_KEY, updates.available.version)
  updates.available = null
  updates.status = 'idle'
  updates.offerOpen = false
  updates.offerPending = false
}

/** Opens the full list of changes, newest first. */
export function showChangelog(entries: ChangelogEntry[]): void {
  updates.whatsNew = entries
  updates.justUpdated = false
  updates.whatsNewOpen = true
}

/** Remembers that the notes of this version have been seen. */
export function markSeen(): void {
  store(SEEN_KEY, APP_VERSION)
  updates.whatsNewOpen = false
  updates.whatsNew = []
}

let timer: ReturnType<typeof setInterval> | undefined

/**
 * Starts the library window's update duties: notes for a version that just landed, then
 * background checks while the preference allows them. Call once.
 */
export function startUpdates(): void {
  const seen = load(SEEN_KEY)
  // a fresh install has nothing to compare with, and the notes would only be noise
  if (!seen) store(SEEN_KEY, APP_VERSION)
  else if (compareVersions(seen, APP_VERSION) < 0) {
    updates.whatsNew = entriesSince(seen, APP_VERSION)
    updates.justUpdated = updates.whatsNew.length > 0
    if (!updates.justUpdated) store(SEEN_KEY, APP_VERSION)
  }
  if (!canSelfUpdate || timer) return
  const tick = () => prefs.autoUpdateCheck && checkForUpdates(true)
  setTimeout(tick, FIRST_CHECK_MS)
  timer = setInterval(tick, CHECK_EVERY_MS)
}
