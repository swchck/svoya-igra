import { readonly, ref } from 'vue'
import type { Question, Theme } from '../types'
import { parseGame } from '../game/parse'
import { copyQuestion, copyTheme } from '../game/edit'

/** A theme or a question copied in the editor, waiting to be pasted into any game. */
export type BoardClip = { kind: 'theme'; theme: Theme } | { kind: 'question'; question: Question }

const KEY = 'svoya-igra:board-clipboard'

/** Reads a clip back through the game parser, so whatever is stored arrives in today's shape. */
function decode(raw: string | null): BoardClip | null {
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as BoardClip
    const theme = data.kind === 'theme' ? data.theme : { id: 't_clip', name: '', questions: [data.question] }
    const [parsed] = parseGame({ id: 'g_clip', rounds: [{ id: 'r_clip', themes: [theme] }] }).rounds[0].themes
    if (data.kind === 'theme') return { kind: 'theme', theme: parsed }
    return parsed.questions[0] ? { kind: 'question', question: parsed.questions[0] } : null
  } catch {
    return null
  }
}

function load(): BoardClip | null {
  try {
    return decode(localStorage.getItem(KEY))
  } catch {
    return null
  }
}

// one clipboard for every editor window; another window's copy shows up through the storage event
const clip = ref<BoardClip | null>(load())
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) clip.value = decode(e.newValue)
  })
}

/** The editor's own clipboard for themes and questions, kept across games and restarts. */
export function useBoardClipboard() {
  function copy(next: BoardClip) {
    clip.value = next.kind === 'theme' ? { kind: 'theme', theme: copyTheme(next.theme) } : { kind: 'question', question: copyQuestion(next.question) }
    try {
      localStorage.setItem(KEY, JSON.stringify(clip.value))
    } catch {
      // kept for this window only
    }
  }

  /** A fresh copy of the clipboard theme, ready to insert; null when it holds no theme. */
  function pasteTheme(): Theme | null {
    return clip.value?.kind === 'theme' ? copyTheme(clip.value.theme) : null
  }

  /** A fresh copy of the clipboard question; null when it holds no question. */
  function pasteQuestion(): Question | null {
    return clip.value?.kind === 'question' ? copyQuestion(clip.value.question) : null
  }

  return { clip: readonly(clip), copy, pasteTheme, pasteQuestion }
}
