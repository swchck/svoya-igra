/** Turns a title into a safe file name stem. */
export function fileSlug(title: string): string {
  const s = title.trim().toLowerCase().replace(/[^a-zа-яё0-9-]+/gi, '-').replace(/^-+|-+$/g, '')
  return s || 'svoya-igra'
}

/** Hands the blob to the user as a download. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // revoking right away cancels the download in some engines
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
