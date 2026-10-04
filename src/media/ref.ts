/** URL scheme for attachments kept in the media store: media://<id>. */
const MEDIA_PROTO = 'media://'

export function isStoredMedia(url: string): boolean {
  return url.startsWith(MEDIA_PROTO)
}

export function mediaId(url: string): string {
  return url.slice(MEDIA_PROTO.length)
}

export function mediaRef(id: string): string {
  return MEDIA_PROTO + id
}
