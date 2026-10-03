import { isTauri } from '@tauri-apps/api/core'
import { t } from '@/i18n'
import type { Phase, SessionSnapshot } from '@/composables/usePlaySession'
import type { MediaAction, MediaStatus } from './mediaControl'
import type { LanStatus } from './lan'

/** Session methods the host window may call on the stage, plus the phone buzzers' reopen. */
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
  'setChooser',
  'undo',
  'timerStart',
  'timerPause',
  'timerReset',
  'buzzReopen',
] as const
export type HostCommand = (typeof HOST_COMMANDS)[number]

export type PlayMessage =
  | { type: 'hello' }
  /** The host repeats this every HOST_PING_MS while its window is open. */
  | { type: 'ping' }
  | { type: 'state'; snapshot: SessionSnapshot }
  /** `phase` is what the host saw when it sent the command. */
  | { type: 'command'; name: HostCommand; args: unknown[]; phase: Phase }
  | { type: 'media'; status: Record<string, MediaStatus> }
  | { type: 'media-command'; id: string; action: MediaAction }
  /** The phone buzzers' room; null while they are off. */
  | { type: 'lan'; status: LanStatus | null }

export const HOST_PING_MS = 2000

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
    const { LogicalPosition } = await import('@tauri-apps/api/dpi')
    const label = `host-${gameId.replace(/[^\w-]/g, '_')}`
    const existing = await WebviewWindow.getByLabel(label)
    if (existing) {
      await existing.setFocus()
      return
    }
    new WebviewWindow(label, {
      url: `index.html${route}`,
      title: t('system.hostWindowTitle', { title }),
      width: 960,
      height: 780,
      minWidth: 720,
      minHeight: 560,
      titleBarStyle: 'overlay',
      hiddenTitle: true,
      trafficLightPosition: new LogicalPosition(18, 26),
    })
    return
  }
  window.open(route, `svoya-igra-host-${gameId}`, 'width=960,height=780')
}
