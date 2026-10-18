import { strToU8, zip, type Zippable } from 'fflate'
import type { FinalQuestion, Game, MediaItem, Question, QuestionKind } from '../types'
import { optionLetter, revealedAnswer } from '../game/kinds'
import { markdownToPlain } from '../lib/markdown'
import { extFromMime } from '../media/dataUrl'
import { isStoredMedia } from '../media/ref'
import { getMedia } from '../media/store'
import { t } from '../i18n'

/*
 * Writes a game as a SIGame package, schema v5 (the same shape importSiq reads): content.xml
 * with Images/, Audio/ and Video/ folders. What SIGame has no place for is folded into what
 * it has: choices and hints become lines of the question, a marked choice the answer. Clip
 * segments are lost, SIGame always plays a file from the start.
 * Spec: github.com/VladimirKhil/SI, assets/siq_5.xsd.
 */

const XMLNS = 'https://github.com/VladimirKhil/SI/blob/master/assets/siq_5.xsd'

const TYPE_BY_KIND: Partial<Record<QuestionKind, string>> = {
  auction: 'stake',
  'all-in': 'stakeAll',
  'no-risk': 'noRisk',
  'for-all': 'forAll',
  'cat-in-bag': 'secret',
}

const FOLDER: Record<MediaItem['kind'], string> = { image: 'Images', audio: 'Audio', video: 'Video', youtube: 'Video' }

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function plain(markdown: string): string {
  return markdownToPlain(markdown)
}

function zipAsync(files: Zippable): Promise<Uint8Array> {
  return new Promise((resolve, reject) => zip(files, { level: 6 }, (err, data) => (err ? reject(err) : resolve(data))))
}

function today(): string {
  const d = new Date()
  const two = (n: number) => String(n).padStart(2, '0')
  return `${two(d.getDate())}.${two(d.getMonth() + 1)}.${d.getFullYear()}`
}

/** Packs the game into a .siq; `loadMedia` reads stored attachments. */
export async function exportSiq(game: Game, loadMedia: (url: string) => Promise<Blob | null> = getMedia): Promise<Blob> {
  const files: Zippable = {}
  const nameByUrl = new Map<string, string>()
  let n = 0

  async function mediaItem(m: MediaItem): Promise<string> {
    const type = m.kind === 'image' ? 'image' : m.kind === 'audio' || m.mode === 'audio' ? 'audio' : 'video'
    // links stay links; SIGame fetches them while playing
    if (!isStoredMedia(m.url) && !m.url.startsWith('data:')) return `<item type="${type}">${esc(m.url)}</item>`
    let name = nameByUrl.get(m.url)
    if (!name) {
      const blob = isStoredMedia(m.url) ? await loadMedia(m.url) : await (await fetch(m.url)).blob()
      if (!blob) return ''
      name = `${++n}.${extFromMime(blob.type)}`
      nameByUrl.set(m.url, name)
      files[`${FOLDER[m.kind]}/${name}`] = [new Uint8Array(await blob.arrayBuffer()), { level: 0 }]
    }
    return `<item type="${type}" isRef="True">${esc(name)}</item>`
  }

  async function content(name: 'question' | 'answer', lines: string[], media: MediaItem[] | undefined): Promise<string> {
    const items = [
      ...lines.filter((l) => l.trim()).map((l) => `<item>${esc(l)}</item>`),
      ...(await Promise.all((media ?? []).map(mediaItem))).filter(Boolean),
    ]
    return items.length ? `<param name="${name}" type="content">${items.join('')}</param>` : ''
  }

  async function question(card: Question | FinalQuestion, value: number, themeName: string): Promise<string> {
    const q = card as Partial<Question> & (Question | FinalQuestion)
    const kind = q.kind ?? 'normal'
    const type = TYPE_BY_KIND[kind]
    const lines = [
      plain(q.text),
      ...(q.options ?? []).map((o, i) => `${optionLetter(i)}. ${o}`),
      ...(q.hints ?? []).map((h) => plain(h.text)),
    ]
    const hintMedia = (q.hints ?? []).flatMap((h) => h.media ?? [])
    const params = [
      kind === 'cat-in-bag' ? `<param name="theme">${esc(themeName)}</param>` : '',
      kind === 'cat-in-bag'
        ? `<param name="price" type="numberSet"><numberSet minimum="${q.catValue ?? value}" maximum="${q.catValue ?? value}" step="0"/></param>`
        : '',
      await content('question', [lines.filter(Boolean).join('\n')], [...(q.media ?? []), ...hintMedia]),
      await content('answer', [], q.answerMedia),
    ].join('')
    const answer = plain('options' in q ? revealedAnswer(q as Question) : q.answer)
    const right = [answer, ...(q.accepted ?? [])].filter((a) => a.trim())
    return [
      `<question price="${value}"${type ? ` type="${type}"` : ''}>`,
      q.notes ? `<info><comments>${esc(q.notes)}</comments></info>` : '',
      params ? `<params>${params}</params>` : '',
      `<right>${(right.length ? right : ['-']).map((a) => `<answer>${esc(a)}</answer>`).join('')}</right>`,
      q.rejected?.length ? `<wrong>${q.rejected.map((a) => `<answer>${esc(a)}</answer>`).join('')}</wrong>` : '',
      `</question>`,
    ].join('')
  }

  const rounds: string[] = []
  for (const round of game.rounds) {
    const themes: string[] = []
    for (const theme of round.themes) {
      const questions = await Promise.all(theme.questions.map((q) => question(q, q.value, theme.name)))
      const info = theme.comment?.trim() ? `<info><comments>${esc(theme.comment.trim())}</comments></info>` : ''
      themes.push(`<theme name="${esc(theme.name)}">${info}<questions>${questions.join('')}</questions></theme>`)
    }
    rounds.push(`<round name="${esc(round.name)}"><themes>${themes.join('')}</themes></round>`)
  }
  if (game.finalThemes?.length) {
    const themes = await Promise.all(
      game.finalThemes.map(async (f) => `<theme name="${esc(f.theme)}"><questions>${await question(f, 0, f.theme)}</questions></theme>`),
    )
    rounds.push(`<round name="${esc(t('system.defaults.final'))}" type="final"><themes>${themes.join('')}</themes></round>`)
  }

  const author = game.subtitle?.trim() ? `<info><authors><author>${esc(game.subtitle.trim())}</author></authors></info>` : ''
  const xml =
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<package name="${esc(game.title)}" version="5" id="${crypto.randomUUID()}" date="${today()}" difficulty="5" xmlns="${XMLNS}">` +
    `${author}<rounds>${rounds.join('')}</rounds></package>`
  files['content.xml'] = strToU8(xml)
  return new Blob([(await zipAsync(files)).slice().buffer], { type: 'application/zip' })
}
