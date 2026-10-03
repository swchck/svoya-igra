import { strFromU8, unzip, type Unzipped } from 'fflate'
import { t } from '../i18n'
import type { FinalQuestion, Game, MediaItem, MediaKind, Question, QuestionKind, Round, Theme } from '../types'
import { uid } from '../game/model'
import { parseYoutubeUrl } from '../game/youtube'
import { mimeFromName } from '../media/dataUrl'
import { putMedia } from '../media/store'

/*
 * SIGame package (.siq): a zip with content.xml and Images/, Audio/, Video/ folders whose
 * file names are URL-encoded. Schema v4 keeps a question as <scenario><atom type>…, with
 * a "marker" atom splitting question from answer and "@name" atoms pointing at files.
 * Schema v5 keeps it as <params><param name="question|answer" type="content"><item …>.
 * Spec: github.com/VladimirKhil/SI, assets/siq_5.xsd.
 */

/** A package converted to a game, plus what the model had no room for. */
export interface SiqImport {
  game: Game
  /** Final-round themes beyond the first one, which the model cannot hold. */
  droppedFinalThemes: number
}

const SUBTITLE_MAX = 80
const AUCTION_TYPES = new Set(['auction', 'stake', 'stakeall'])
const CAT_TYPES = new Set(['cat', 'bagcat', 'secret', 'secretpublicprice', 'secretnoquestion'])
const FOLDER_BY_KIND: Partial<Record<MediaKind, string>> = { image: 'images', audio: 'audio', video: 'video' }

type Side = 'question' | 'answer'

interface Fragment {
  side: Side
  type: 'text' | 'image' | 'audio' | 'video'
  value: string
  isRef: boolean
}

interface RawQuestion {
  value: number
  kind: QuestionKind
  catValue?: number
  catTheme: string
  fragments: Fragment[]
  rightAnswers: string[]
}

function broken(): Error {
  return new Error(t('system.errors.siqBroken'))
}

function unzipAsync(bytes: Uint8Array): Promise<Unzipped> {
  return new Promise((resolve, reject) =>
    unzip(bytes, { filter: (f) => !f.name.endsWith('/') }, (err, data) => (err ? reject(err) : resolve(data))),
  )
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

/** Escapes text so markdown renders it literally. */
export function escapeMarkdown(text: string): string {
  return text
    .replace(/[\\`*_[\]<>~|]/g, '\\$&')
    .replace(/&(?=#?\w+;)/g, '\\&')
    .replace(/^(\s*)([#+=-])/gm, '$1\\$2')
    .replace(/^(\s*\d+)([.)])/gm, '$1\\$2')
}

function children(el: Element, name: string): Element[] {
  return Array.from(el.children).filter((c) => c.localName === name)
}

function child(el: Element, name: string): Element | undefined {
  return children(el, name)[0]
}

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? '').replace(/\r\n?/g, '\n').trim()
}

function firstInt(s: string | null | undefined): number | undefined {
  const n = Number(/\d+/.exec(s ?? '')?.[0])
  return n > 0 ? n : undefined
}

function fragmentType(raw: string | null): Fragment['type'] | 'marker' | null {
  switch ((raw ?? 'text').toLowerCase()) {
    case 'text':
    case 'say':
      return 'text'
    case 'image':
      return 'image'
    case 'voice':
    case 'audio':
      return 'audio'
    case 'video':
      return 'video'
    case 'marker':
      return 'marker'
    default:
      return null
  }
}

function typeName(q: Element): string {
  return (q.getAttribute('type') || child(q, 'type')?.getAttribute('name') || '').toLowerCase()
}

/** Returns a v4 type parameter or a v5 question parameter by name. */
function paramText(q: Element, name: string): string {
  const legacy = children(child(q, 'type') ?? q, 'param').find((p) => p.getAttribute('name') === name)
  if (legacy) return text(legacy)
  const modern = children(child(q, 'params') ?? q, 'param').find((p) => p.getAttribute('name') === name)
  if (!modern) return ''
  const set = child(modern, 'numberSet')
  return set ? (set.getAttribute('minimum') ?? text(set)) : text(modern)
}

function readFragments(q: Element): Fragment[] {
  const out: Fragment[] = []
  const scenario = child(q, 'scenario')
  if (scenario) {
    let side: Side = 'question'
    for (const atom of children(scenario, 'atom')) {
      const type = fragmentType(atom.getAttribute('type'))
      if (type === 'marker') {
        side = 'answer'
      } else if (type) {
        const raw = text(atom)
        const isRef = type !== 'text' || raw.startsWith('@')
        out.push({ side, type, value: raw.startsWith('@') ? raw.slice(1) : raw, isRef })
      }
    }
  }
  for (const param of children(child(q, 'params') ?? q, 'param')) {
    const name = param.getAttribute('name')
    if (name !== 'question' && name !== 'answer') continue
    for (const item of children(param, 'item')) {
      const type = fragmentType(item.getAttribute('type'))
      if (!type || type === 'marker') continue
      const isRef = item.getAttribute('isRef')?.toLowerCase() === 'true'
      const raw = text(item)
      out.push({ side: name, type, value: isRef && raw.startsWith('@') ? raw.slice(1) : raw, isRef })
    }
  }
  return out
}

function readQuestion(q: Element): RawQuestion {
  const name = typeName(q)
  const kind: QuestionKind = AUCTION_TYPES.has(name) ? 'auction' : CAT_TYPES.has(name) ? 'cat-in-bag' : 'normal'
  const isCat = kind === 'cat-in-bag'
  return {
    value: Number(q.getAttribute('price')) || 0,
    kind,
    catValue: isCat ? firstInt(paramText(q, 'cost') || paramText(q, 'price')) : undefined,
    catTheme: isCat ? paramText(q, 'theme') : '',
    fragments: readFragments(q),
    rightAnswers: children(child(q, 'right') ?? q, 'answer').map((a) => text(a)).filter(Boolean),
  }
}

/** Looks up package files by folder and decoded name, tolerating encoded and plain entry names. */
function mediaIndex(entries: Unzipped) {
  const exact = new Map<string, Uint8Array>()
  const byName = new Map<string, Uint8Array>()
  for (const [path, bytes] of Object.entries(entries)) {
    const parts = safeDecode(path).replace(/\\/g, '/').toLowerCase().split('/')
    if (parts.length < 2) continue
    const name = parts[parts.length - 1]
    exact.set(`${parts[parts.length - 2]}/${name}`, bytes)
    byName.set(name, bytes)
  }
  return (folder: string, ref: string): { key: string; bytes: Uint8Array } | null => {
    const name = safeDecode(ref).replace(/\\/g, '/').toLowerCase().split('/').pop() ?? ''
    const bytes = exact.get(`${folder}/${name}`) ?? byName.get(name)
    return bytes ? { key: `${folder}/${name}`, bytes } : null
  }
}

/** Converts a SIGame package into a game, storing its pictures, sounds and clips. */
export async function importSiq(
  file: Blob,
  fallbackTitle = '',
  storeMedia: (blob: Blob) => Promise<string> = putMedia,
): Promise<SiqImport> {
  let entries: Unzipped
  try {
    entries = await unzipAsync(new Uint8Array(await file.arrayBuffer()))
  } catch {
    throw broken()
  }
  const contentKey = Object.keys(entries).find((k) => k.toLowerCase() === 'content.xml')
  if (!contentKey) throw new Error(t('system.errors.siqNoContent'))

  const xml = new DOMParser().parseFromString(strFromU8(entries[contentKey]).replace(/^\u{FEFF}/u, ''), 'application/xml')
  const pkg = xml.documentElement
  if (xml.getElementsByTagName('parsererror').length || pkg?.localName !== 'package') throw broken()

  const find = mediaIndex(entries)
  const stored = new Map<string, Promise<string>>()

  async function toMedia(f: Fragment): Promise<MediaItem | null> {
    const kind = f.type as MediaKind
    if (/^https?:\/\//i.test(f.value)) {
      const yt = kind !== 'image' && parseYoutubeUrl(f.value)
      return yt
        ? { id: uid('mi_'), url: f.value, kind: 'youtube', mode: kind === 'audio' ? 'audio' : 'video' }
        : { id: uid('mi_'), url: f.value, kind }
    }
    const hit = find(FOLDER_BY_KIND[kind] ?? '', f.value)
    if (!hit) return null
    let url = stored.get(hit.key)
    if (!url) {
      url = storeMedia(new Blob([hit.bytes.slice().buffer], { type: mimeFromName(hit.key) }))
      stored.set(hit.key, url)
    }
    return { id: uid('mi_'), url: await url, kind }
  }

  async function sideContent(raw: RawQuestion, side: Side) {
    const parts = raw.fragments.filter((f) => f.side === side)
    const texts = parts.filter((f) => f.type === 'text').map((f) => escapeMarkdown(f.value)).filter(Boolean)
    const media: MediaItem[] = []
    for (const f of parts) {
      if (f.type === 'text') continue
      const item = await toMedia(f)
      if (item) media.push(item)
    }
    return { text: texts.join('\n\n'), media: media.length ? media : undefined }
  }

  async function convert(raw: RawQuestion): Promise<Omit<Question, 'id' | 'value' | 'kind'>> {
    const question = await sideContent(raw, 'question')
    const answer = await sideContent(raw, 'answer')
    const header = raw.catTheme ? `**${t('system.siq.catTheme', { theme: escapeMarkdown(raw.catTheme) })}**` : ''
    return {
      text: [header, question.text].filter(Boolean).join('\n\n'),
      media: question.media,
      answer: raw.rightAnswers.length ? raw.rightAnswers.map(escapeMarkdown).join(' / ') : answer.text,
      answerMedia: answer.media,
    }
  }

  const rounds: Round[] = []
  let finalRound: FinalQuestion | undefined
  let droppedFinalThemes = 0

  for (const roundEl of children(child(pkg, 'rounds') ?? pkg, 'round')) {
    const themeEls = children(child(roundEl, 'themes') ?? roundEl, 'theme')
    if (roundEl.getAttribute('type')?.toLowerCase() === 'final') {
      const firstTheme = themeEls[0]
      const firstQuestion = firstTheme && children(child(firstTheme, 'questions') ?? firstTheme, 'question')[0]
      if (!firstQuestion) continue
      if (finalRound) {
        droppedFinalThemes += themeEls.length
        continue
      }
      droppedFinalThemes += themeEls.length - 1
      finalRound = {
        id: uid('f_'),
        theme: firstTheme.getAttribute('name') ?? t('system.defaults.final'),
        ...(await convert(readQuestion(firstQuestion))),
      }
      continue
    }
    const themes: Theme[] = []
    for (const themeEl of themeEls) {
      const questions: Question[] = []
      for (const qEl of children(child(themeEl, 'questions') ?? themeEl, 'question')) {
        const raw = readQuestion(qEl)
        questions.push({
          id: uid('q_'),
          value: raw.value,
          kind: raw.kind,
          ...(raw.catValue ? { catValue: raw.catValue } : {}),
          ...(await convert(raw)),
        })
      }
      themes.push({ id: uid('t_'), name: themeEl.getAttribute('name') ?? '', questions })
    }
    if (themes.length) {
      rounds.push({
        id: uid('r_'),
        name: roundEl.getAttribute('name') || t('system.defaults.round', { n: rounds.length + 1 }),
        themes,
      })
    }
  }
  if (!rounds.length && !finalRound) throw new Error(t('system.errors.siqEmpty'))

  const authors = children(child(child(pkg, 'info') ?? pkg, 'authors') ?? pkg, 'author').map((a) => text(a)).filter(Boolean).join(', ')
  const now = Date.now()
  return {
    game: {
      id: uid('g_'),
      title: pkg.getAttribute('name') || fallbackTitle || t('system.defaults.game'),
      ...(authors && authors.length <= SUBTITLE_MAX ? { subtitle: authors } : {}),
      rounds,
      finalRound,
      createdAt: now,
      updatedAt: now,
    },
    droppedFinalThemes,
  }
}
