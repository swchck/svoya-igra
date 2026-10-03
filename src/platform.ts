import { invoke, isTauri } from '@tauri-apps/api/core'

let youtubeBridge: string | null = null

/** Resolves platform facts that the UI reads synchronously. Call once before mounting. */
export async function initPlatform(): Promise<void> {
  // app pages are served from tauri:// (or tauri.localhost on Windows), which YouTube
  // rejects with error 153; the dev server is plain http and embeds directly
  if (isTauri() && !import.meta.env.DEV) {
    youtubeBridge = await invoke<string>('youtube_bridge_url')
  } else {
    // browsers may evict IndexedDB under storage pressure unless it is marked persistent
    navigator.storage?.persist?.().catch(() => {})
  }
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
