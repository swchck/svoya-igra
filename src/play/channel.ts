import { isTauri } from '@tauri-apps/api/core'
import { t } from '@/i18n'
import type { Phase, SessionSnapshot } from '@/composables/usePlaySession'
import type { MediaAction, MediaStatus } from './mediaControl'
import type { LanStatus } from './lan'
import { fitCentered, pickHostScreen } from './monitors'

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
  'openBuzz',
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

/** Desktop: a spot for the host window on a monitor other than the stage's, if there is one. */
async function hostPlacement(width: number, height: number): Promise<{ x?: number; y?: number }> {
  try {
    const { loadScreens } = await import('./desktopScreens')
    const { screens, primary, current } = await loadScreens()
    const screen = pickHostScreen(screens, current, primary)
    if (!screen) return {}
    const scale = screen.scaleFactor
    const rect = fitCentered(width * scale, height * scale, screen.workArea)
    // window options take logical pixels; the monitor is reported in physical ones
    return { x: Math.round(rect.x / scale), y: Math.round(rect.y / scale) }
  } catch {
    // without the monitor list the OS picks the spot, which is fine
    return {}
  }
}

/** Opens (or focuses) the host window for the game, away from the stage's monitor when possible. */
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
    const width = 960
    const height = 780
    new WebviewWindow(label, {
      url: `index.html${route}`,
      title: t('system.hostWindowTitle', { title }),
      ...(await hostPlacement(width, height)),
      width,
      height,
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
