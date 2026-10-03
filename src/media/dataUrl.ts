const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  svg: 'image/svg+xml',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
}

const EXT_BY_MIME: Record<string, string> = {
  ...Object.fromEntries(Object.entries(MIME_BY_EXT).map(([ext, mime]) => [mime, ext])),
  'image/jpg': 'jpg',
  'audio/mp3': 'mp3',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
}

/** Returns a file extension for the MIME type, `bin` when unknown. */
export function extFromMime(mime: string): string {
  const m = mime.split(';')[0].trim().toLowerCase()
  return EXT_BY_MIME[m] ?? (/^[a-z]+\/([a-z0-9]+)$/.exec(m)?.[1] || 'bin')
}

/** Returns the MIME type for a file name, `application/octet-stream` when unknown. */
export function mimeFromName(name: string): string {
  return MIME_BY_EXT[name.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream'
}

/** Decodes a data: URL synchronously. */
export function dataUrlToBlob(url: string): Blob {
  const match = /^data:([^;,]+)?((?:;[^;,]+)*?)(;base64)?,(.*)$/s.exec(url)
  if (!match) throw new Error('Некорректный data URL')
  const payload = match[4]
  const bytes = match[3]
    ? Uint8Array.from(atob(payload), (c) => c.charCodeAt(0))
    : new TextEncoder().encode(decodeURIComponent(payload))
  return new Blob([bytes], { type: match[1] ?? 'application/octet-stream' })
}

/** Encodes a blob as a data: URL. */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  // String.fromCharCode(...bytes) overflows the call stack on large files
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(bin)}`
}
