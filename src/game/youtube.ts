/** A YouTube video reference with an optional start offset in seconds. */
export interface YoutubeRef {
  id: string
  start: number
}

/** Parses `t`/`start` values: `90`, `90s`, `1m30s`, `1h2m3s`. */
function parseOffset(raw: string | null): number {
  if (!raw) return 0
  if (/^\d+s?$/.test(raw)) return parseInt(raw, 10)
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(raw)
  if (!m) return 0
  return (Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0)) * 60 + Number(m[3] ?? 0)
}

/** Extracts the video id and start offset, or returns null for non-YouTube URLs. */
export function parseYoutubeUrl(raw: string): YoutubeRef | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  const host = url.hostname.replace(/^(www|m|music)\./, '')
  let id = ''
  if (host === 'youtu.be') {
    id = url.pathname.slice(1).split('/')[0]
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const [, section, segment] = url.pathname.split('/')
    id = ['embed', 'shorts', 'live', 'v'].includes(section) ? segment ?? '' : url.searchParams.get('v') ?? ''
  }
  if (!/^[\w-]{6,}$/.test(id)) return null
  return { id, start: parseOffset(url.searchParams.get('t') ?? url.searchParams.get('start')) }
}
