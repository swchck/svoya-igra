import { Marked } from 'marked'
import DOMPurify from 'dompurify'

// questions are shown on a stage, so only text formatting gets through: no links, images or raw HTML
const ALLOWED_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'del', 's', 'u', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote', 'h1', 'h2', 'h3', 'hr']

// single newlines become line breaks: games written before markdown support relied on them
const marked = new Marked({ gfm: true, breaks: true, async: false })

/** Renders question or answer markdown to sanitized HTML for the stage and the host window. */
export function renderMarkdown(source: string): string {
  if (!source.trim()) return ''
  const html = marked.parse(source) as string
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR: ['start'] })
}

/** Returns the visible text of markdown, for tooltips, aria labels and search. */
export function markdownToPlain(source: string): string {
  const html = renderMarkdown(source)
  if (!html) return ''
  if (typeof document === 'undefined') return source
  const box = document.createElement('div')
  box.innerHTML = html.replace(/<br\s*\/?>/g, ' ').replace(/<\/(p|li|h[1-3])>/g, ' $&')
  return (box.textContent ?? '').replace(/\s+/g, ' ').trim()
}
