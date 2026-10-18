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

const SUBTITLE_MAX = 80
const KIND_BY_TYPE: Record<string, QuestionKind> = {
  auction: 'auction',
  stake: 'auction',
  stakeall: 'all-in',
  sponsored: 'no-risk',
  forall: 'for-all',
  norisk: 'no-risk',
  cat: 'cat-in-bag',
  bagcat: 'cat-in-bag',
  secret: 'cat-in-bag',
  secretpublicprice: 'cat-in-bag',
  secretnoquestion: 'cat-in-bag',
}
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
  wrongAnswers: string[]
  /** The author's comments and sources, for the host. */
  notes: string
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

function answerList(q: Element, list: 'right' | 'wrong'): string[] {
  const el = child(q, list)
  return el ? children(el, 'answer').map((a) => text(a)).filter(Boolean) : []
}

function questionNotes(q: Element): string {
  const info = child(q, 'info')
  if (!info) return ''
  const comments = text(child(info, 'comments'))
  const sourcesEl = child(info, 'sources')
  const sources = sourcesEl ? children(sourcesEl, 'source').map((s) => text(s)).filter(Boolean) : []
  return [comments, ...sources].filter(Boolean).join('\n')
}

function readQuestion(q: Element): RawQuestion {
  const name = typeName(q)
  const kind = KIND_BY_TYPE[name] ?? 'normal'
  const isCat = kind === 'cat-in-bag'
  return {
    value: Number(q.getAttribute('price')) || 0,
    kind,
    catValue: isCat ? firstInt(paramText(q, 'cost') || paramText(q, 'price')) : undefined,
    catTheme: isCat ? paramText(q, 'theme') : '',
    fragments: readFragments(q),
    rightAnswers: answerList(q, 'right'),
    wrongAnswers: answerList(q, 'wrong'),
    notes: questionNotes(q),
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
): Promise<Game> {
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
    const [first, ...others] = raw.rightAnswers
    return {
      text: [header, question.text].filter(Boolean).join('\n\n'),
      media: question.media,
      answer: first ? escapeMarkdown(first) : answer.text,
      answerMedia: answer.media,
      ...(others.length && { accepted: others }),
      ...(raw.wrongAnswers.length && { rejected: raw.wrongAnswers }),
      ...(raw.notes && { notes: raw.notes }),
    }
  }

  const rounds: Round[] = []
  const finalThemes: FinalQuestion[] = []

  for (const roundEl of children(child(pkg, 'rounds') ?? pkg, 'round')) {
    const themeEls = children(child(roundEl, 'themes') ?? roundEl, 'theme')
    if (roundEl.getAttribute('type')?.toLowerCase() === 'final') {
      // a final theme holds one question; any more are alternates SIGame never plays
      for (const themeEl of themeEls) {
        const question = children(child(themeEl, 'questions') ?? themeEl, 'question')[0]
        if (!question) continue
        finalThemes.push({
          id: uid('f_'),
          theme: themeEl.getAttribute('name') ?? t('system.defaults.final'),
          ...(await convert(readQuestion(question))),
        })
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
      const comment = text(child(child(themeEl, 'info') ?? themeEl, 'comments'))
      themes.push({ id: uid('t_'), name: themeEl.getAttribute('name') ?? '', questions, ...(comment && { comment }) })
    }
    if (themes.length) {
      rounds.push({
        id: uid('r_'),
        name: roundEl.getAttribute('name') || t('system.defaults.round', { n: rounds.length + 1 }),
        themes,
      })
    }
  }
  if (!rounds.length && !finalThemes.length) throw new Error(t('system.errors.siqEmpty'))

  const authors = children(child(child(pkg, 'info') ?? pkg, 'authors') ?? pkg, 'author').map((a) => text(a)).filter(Boolean).join(', ')
  const now = Date.now()
  return {
    id: uid('g_'),
    title: pkg.getAttribute('name') || fallbackTitle || t('system.defaults.game'),
    ...(authors && authors.length <= SUBTITLE_MAX ? { subtitle: authors } : {}),
    rounds,
    ...(finalThemes.length && { finalThemes }),
    createdAt: now,
    updatedAt: now,
  }
}
