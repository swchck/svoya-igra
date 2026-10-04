import { invoke, isTauri } from '@tauri-apps/api/core'
import { t } from './i18n'

/* Everything that differs between the desktop shell and a plain browser tab. */

let youtubeBridge: string | null = null
let mainWindow = true

/** True inside the desktop app. */
export const isDesktop = isTauri()

/**
 * True in the macOS app, whose windows draw the page under a transparent title bar: the
 * traffic lights sit over the page's top-left corner and top bars double as drag handles.
 */
export const overlayTitleBar = isDesktop && /Mac/.test(navigator.userAgent)

/** Resolves platform facts that the UI reads synchronously. Call once before mounting. */
export async function initPlatform(): Promise<void> {
  if (isDesktop) mainWindow = (await import('@tauri-apps/api/window')).getCurrentWindow().label === 'main'
  // app pages are served from tauri:// (or tauri.localhost on Windows), which YouTube
  // rejects with error 153; the dev server is plain http and embeds directly
  if (isDesktop && !import.meta.env.DEV) {
    youtubeBridge = await invoke<string>('youtube_bridge_url')
  } else if (!isDesktop) {
    // browsers may evict IndexedDB under storage pressure unless it is marked persistent
    navigator.storage?.persist?.().catch(() => {})
  }
}

/** Reports whether this is the library window rather than a host window. */
export function isMainWindow(): boolean {
  return mainWindow
}

/** Returns the iframe URL for a YouTube video with the given player parameters. */
export function youtubeEmbedUrl(id: string, params: URLSearchParams): string {
  if (youtubeBridge) {
    const query = new URLSearchParams(params)
    query.set('id', id)
    return `${youtubeBridge}?${query}`
  }
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?${params}`
}

const GAME_EXTENSIONS = ['gamezip', 'siq', 'json', 'gamebackup']

async function readPath(path: string): Promise<File> {
  const { readFile } = await import('@tauri-apps/plugin-fs')
  const bytes = await readFile(path)
  return new File([bytes.slice().buffer], path.split(/[\\/]/).pop() ?? 'game.gamezip')
}

/**
 * Desktop: shows the native open dialog for a game file, or only for the given extensions.
 * Returns null when cancelled.
 */
export async function pickGameFile(extensions: string[] = GAME_EXTENSIONS): Promise<File | null> {
  const { open } = await import('@tauri-apps/plugin-dialog')
  const path = await open({
    multiple: false,
    directory: false,
    filters: [{ name: t('system.fileFilterName'), extensions }],
  })
  return path ? readPath(path) : null
}

/** Saves a file: a native save dialog on desktop, a download in a browser. */
export async function saveFile(blob: Blob, filename: string): Promise<boolean> {
  if (!isDesktop) {
    const { saveBlob } = await import('./io/files')
    saveBlob(blob, filename)
    return true
  }
  const { save } = await import('@tauri-apps/plugin-dialog')
  const ext = filename.split('.').pop() ?? ''
  const path = await save({ defaultPath: filename, filters: [{ name: ext.toUpperCase(), extensions: [ext] }] })
  if (!path) return false
  const { writeFile } = await import('@tauri-apps/plugin-fs')
  await writeFile(path, new Uint8Array(await blob.arrayBuffer()))
  return true
}

/**
 * Desktop: delivers game files the OS opened with the app (double-click, "Open with"),
 * including those that launched it. Returns a function that stops listening.
 */
export async function onOpenedFiles(handle: (files: File[]) => void): Promise<() => void> {
  if (!isDesktop) return () => {}
  const { listen } = await import('@tauri-apps/api/event')
  const drain = async () => {
    const paths = await invoke<string[]>('take_opened_files')
    if (paths.length) handle(await Promise.all(paths.map(readPath)))
  }
  const unlisten = await listen('files-opened', drain)
  await drain()
  return unlisten
}

/** An update offered by the release feed. */
export interface AvailableUpdate {
  version: string
  install: () => Promise<void>
}

/** Desktop: asks the release feed for a newer version. Null when up to date or offline. */
export async function findUpdate(): Promise<AvailableUpdate | null> {
  if (!isDesktop || import.meta.env.DEV) return null
  try {
    const { check } = await import('@tauri-apps/plugin-updater')
    const update = await check()
    if (!update) return null
    return {
      version: update.version,
      install: async () => {
        await update.downloadAndInstall()
        const { relaunch } = await import('@tauri-apps/plugin-process')
        await relaunch()
      },
    }
  } catch {
    // no network or no release feed yet: nothing to offer
    return null
  }
}
