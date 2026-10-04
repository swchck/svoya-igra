/** Accepted by the import file picker. */
export const GAME_FILE_ACCEPT = '.gamezip,.gamebackup,.zip,.json,.siq,application/json,application/zip,application/x-svoya-igra+zip'

/** The backup file's extension, without the dot. */
export const BACKUP_EXTENSION = 'gamebackup'

/** Reports whether the file name looks like a library backup. */
export function isBackupFileName(name: string): boolean {
  return name.toLowerCase().endsWith(`.${BACKUP_EXTENSION}`)
}

/** Turns a title into a safe file name stem. */
export function fileSlug(title: string): string {
  const s = title.trim().toLowerCase().replace(/[^\p{L}\p{N}-]+/gu, '-').replace(/^-+|-+$/g, '')
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
