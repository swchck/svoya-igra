import type { GameResult } from './history'
import { intlTag } from '@/i18n'

/*
 * The results as a picture to send to a chat: a portrait card in the studio colors with
 * the game's title, the date and every competitor's place and score. Drawn on a canvas
 * from the recorded result, so it looks the same whatever the stage looked like.
 */

/** Card size in pixels, the 4:5 portrait chats and feeds show uncropped. */
export const CARD_WIDTH = 1080
export const CARD_HEIGHT = 1350
/** Rows that fit on the card; the rest are summed up in one line. */
export const CARD_ROWS = 10

const DISPLAY = "'Oswald Variable', 'Arial Narrow', sans-serif"
const SANS = "'Golos Text Variable', system-ui, sans-serif"
const GOLD = '#ffc531'
const MEDAL = ['#ffc531', '#d7dce6', '#e0995e']

/** The words on the card, in the viewer's language. */
export interface CardLabels {
  heading: string
  date: string
  /** "and 3 more" for the rows that don't fit. */
  more: (n: number) => string
  footer: string
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let s = text
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxWidth) s = s.slice(0, -1)
  return `${s.trimEnd()}…`
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/** Draws the card for a result onto a new canvas. */
export async function drawResultsCard(result: GameResult, labels: CardLabels): Promise<HTMLCanvasElement> {
  // the display face is a web font; drawing before it loads falls back to the system one
  await Promise.all([document.fonts.load(`700 64px ${DISPLAY}`), document.fonts.load(`600 40px ${SANS}`)]).catch(() => {})
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')!
  const W = CARD_WIDTH

  const bg = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT)
  bg.addColorStop(0, '#2a2fb8')
  bg.addColorStop(0.85, '#0b0b3a')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, CARD_HEIGHT)
  const glow = ctx.createRadialGradient(W / 2, -120, 40, W / 2, -120, 900)
  glow.addColorStop(0, 'rgba(120, 110, 255, 0.55)')
  glow.addColorStop(1, 'rgba(120, 110, 255, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, CARD_HEIGHT)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = GOLD
  ctx.font = `700 92px ${DISPLAY}`
  ctx.fillText(labels.heading.toUpperCase(), W / 2, 150)
  ctx.fillStyle = '#ffffff'
  ctx.font = `600 44px ${SANS}`
  ctx.fillText(fitText(ctx, result.title, W - 140), W / 2, 225)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)'
  ctx.font = `400 32px ${SANS}`
  ctx.fillText(labels.date, W / 2, 278)

  const shown = result.rows.slice(0, CARD_ROWS)
  const room = CARD_HEIGHT - 340 - 150
  const rowH = Math.min(130, room / Math.max(shown.length, 1))
  // a short list sits a little above the middle of the free space instead of hugging the title
  const top = 340 + ((room - rowH * shown.length) / 2) * 0.7
  const left = 90
  const right = W - 90
  shown.forEach((row, i) => {
    const y = top + i * rowH
    const h = rowH - 14
    roundRect(ctx, left, y, right - left, h, 22)
    ctx.fillStyle = row.place <= 3 ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.07)'
    ctx.fill()
    ctx.fillStyle = row.color
    ctx.fillRect(left, y + 12, 8, h - 24)

    const mid = y + h / 2
    ctx.textBaseline = 'middle'
    ctx.beginPath()
    ctx.arc(left + 62, mid, h * 0.32, 0, Math.PI * 2)
    ctx.fillStyle = MEDAL[row.place - 1] ?? 'rgba(255, 255, 255, 0.18)'
    ctx.fill()
    ctx.fillStyle = row.place <= 3 ? '#14143c' : '#ffffff'
    ctx.font = `700 ${Math.round(h * 0.4)}px ${DISPLAY}`
    ctx.textAlign = 'center'
    ctx.fillText(String(row.place), left + 62, mid + 2)

    ctx.font = `700 ${Math.round(h * 0.46)}px ${DISPLAY}`
    ctx.textAlign = 'right'
    ctx.fillStyle = row.score < 0 ? '#ff5c9d' : GOLD
    const score = row.score.toLocaleString(intlTag())
    ctx.fillText(score, right - 30, mid + 2)
    const scoreWidth = ctx.measureText(score).width

    ctx.textAlign = 'left'
    ctx.fillStyle = '#ffffff'
    ctx.font = `600 ${Math.round(h * 0.38)}px ${SANS}`
    const name = row.avatar ? `${row.avatar} ${row.name}` : row.name
    ctx.fillText(fitText(ctx, name, right - 30 - scoreWidth - 40 - (left + 110)), left + 110, mid + 2)
  })

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const hidden = result.rows.length - shown.length
  if (hidden > 0) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)'
    ctx.font = `400 30px ${SANS}`
    ctx.fillText(labels.more(hidden), W / 2, top + shown.length * rowH + 30)
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
  ctx.font = `600 30px ${DISPLAY}`
  ctx.fillText(labels.footer.toUpperCase(), W / 2, CARD_HEIGHT - 60)
  return canvas
}

/** Encodes the canvas as a PNG. */
export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png'))
}
