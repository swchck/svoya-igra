import { isTauri } from '@tauri-apps/api/core'
import type { SessionSnapshot } from '@/composables/usePlaySession'

/** Session methods the host window may call on the stage. */
export const HOST_COMMANDS = [
  'start',
  'pick',
  'setAuctionStake',
  'giveCat',
  'close',
  'advance',
  'nextRound',
  'setFinalBet',
  'setFinalVerdict',
  'scoreFinal',
  'adjustScore',
] as const
export type HostCommand = (typeof HOST_COMMANDS)[number]

export type PlayMessage =
  | { type: 'hello' }
  | { type: 'state'; snapshot: SessionSnapshot }
  | { type: 'command'; name: HostCommand; args: unknown[] }

export interface PlayChannel {
  post(message: PlayMessage): void
  close(): void
}

/**
 * Connects the stage and host windows of one game. Tauri windows talk through app
 * events; a browser falls back to BroadcastChannel between tabs.
 */
export async function openPlayChannel(gameId: string, onMessage: (m: PlayMessage) => void): Promise<PlayChannel> {
  const name = `play:${gameId.replace(/[^\w-]/g, '_')}`
  if (isTauri()) {
    const { emit, listen } = await import('@tauri-apps/api/event')
    const unlisten = await listen<PlayMessage>(name, (e) => onMessage(e.payload))
    return {
      post: (m) => void emit(name, m),
      close: unlisten,
    }
  }
  const bc = new BroadcastChannel(`svoya-igra:${name}`)
  bc.onmessage = (e: MessageEvent<PlayMessage>) => onMessage(e.data)
  return {
    post: (m) => bc.postMessage(m),
    close: () => bc.close(),
  }
}

/** Opens (or focuses) the host window for the game. */
export async function openHostWindow(gameId: string, title: string): Promise<void> {
  const route = `#/host/${encodeURIComponent(gameId)}`
  if (isTauri()) {
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
    const label = `host-${gameId.replace(/[^\w-]/g, '_')}`
    const existing = await WebviewWindow.getByLabel(label)
    if (existing) {
      await existing.setFocus()
      return
    }
    new WebviewWindow(label, {
      url: `index.html${route}`,
      title: `Ведущий — ${title}`,
      width: 960,
      height: 780,
      minWidth: 720,
      minHeight: 560,
    })
    return
  }
  window.open(route, `svoya-igra-host-${gameId}`, 'width=960,height=780')
}
