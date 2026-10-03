import { invoke } from '@tauri-apps/api/core'
import type { SessionSnapshot } from '@/composables/usePlaySession'
import { isDesktop } from '@/platform'

/*
 * Phones as buzzers over the local network, served by the desktop shell. The web build
 * has no server to talk to, so every entry point here is gated on `lanAvailable`.
 */

/** Whether this build can host phones at all. */
export const lanAvailable = isDesktop

/** Where phones reach the server, and the room code in that URL. */
export interface LanInfo {
  url: string
  code: string
}

export type BuzzState = 'closed' | 'open' | 'locked'

/** What the server reports about the phones in the room. */
export interface LanStatus {
  /** Phones online per player id. */
  phones: Record<string, number>
  buzz: {
    state: BuzzState
    /** Player ids in the order they pressed; the first one answers. */
    order: string[]
    /** Players shut out of this question after answering wrong. */
    excluded: string[]
  }
  /** Final bets sent from phones, already capped by score. */
  bets: Record<string, number>
  /** Final answers sent from phones. */
  answers: Record<string, string>
}

/** A player a phone created by joining under a new name. */
export interface LanJoin {
  playerId: string
  name: string
}

export type FinalMode = 'bet' | 'answer'

/** What the stage tells the phones. */
export interface LanStageInfo {
  title: string
  roster: { id: string; name: string; score: number }[]
  /** Phones may add players by name; only while players are being set up. */
  allowJoin: boolean
  finalMode: FinalMode | null
  /** Final round: the most each competitor may bet; those with nothing sit it out. */
  caps: Record<string, number>
}

/** The status of a room nobody has joined yet. */
export function emptyLanStatus(): LanStatus {
  return { phones: {}, buzz: { state: 'closed', order: [], excluded: [] }, bets: {}, answers: {} }
}

/** Derives what phones should show from the session. */
export function stageInfo(snapshot: Pick<SessionSnapshot, 'phase' | 'players'>, title: string): LanStageInfo {
  const finalMode: FinalMode | null =
    snapshot.phase === 'final-bets' ? 'bet' : snapshot.phase === 'final-question' ? 'answer' : null
  return {
    title,
    roster: snapshot.players.map((p) => ({ id: p.id, name: p.name, score: p.score })),
    allowJoin: snapshot.phase === 'title',
    finalMode,
    caps: finalMode ? Object.fromEntries(snapshot.players.filter((p) => p.score > 0).map((p) => [p.id, p.score])) : {},
  }
}

/**
 * The question the buttons are open for, or null when they should be closed. Auctions and
 * cats in the bag go to one player, so nobody races for them.
 */
export function buzzWindow(snapshot: Pick<SessionSnapshot, 'phase' | 'activeQuestionId' | 'stake'>): string | null {
  return snapshot.phase === 'question' && !snapshot.stake ? snapshot.activeQuestionId : null
}

/** The player who pressed first while the buttons are locked on them. */
export function buzzWinner(status: LanStatus): string | undefined {
  return status.buzz.state === 'locked' ? status.buzz.order[0] : undefined
}

/** Turns the buzzers on, starting the server if needed. */
export function startLan(): Promise<LanInfo> {
  return invoke<LanInfo>('lan_start')
}

/** Turns the buzzers off; the server stops unless it shares a file. */
export function stopLan(): Promise<void> {
  return invoke('lan_stop')
}

export function syncLan(stage: LanStageInfo): Promise<void> {
  return invoke('lan_sync', { stage })
}

/** Opens the buttons for a question; another key starts a fresh order. */
export function armBuzz(key: string): Promise<void> {
  return invoke('lan_buzz_arm', { key })
}

export function closeBuzz(): Promise<void> {
  return invoke('lan_buzz_close')
}

/** Opens the buttons again, shutting out whoever pressed first when `exclude` is set. */
export function reopenBuzz(exclude: boolean): Promise<void> {
  return invoke('lan_buzz_reopen', { exclude })
}

/** Offers a game file for download to devices on the network; returns its URL. */
export function shareFile(bytes: Uint8Array, filename: string): Promise<LanInfo> {
  return invoke<LanInfo>('lan_share_start', bytes, { headers: { 'x-file-name': encodeURIComponent(filename) } })
}

/** Stops offering the shared file. */
export function stopSharing(): Promise<void> {
  return invoke('lan_share_stop')
}

/** Delivers every change of the room. Returns a function that stops listening. */
export async function onLanStatus(handle: (status: LanStatus) => void): Promise<() => void> {
  const { listen } = await import('@tauri-apps/api/event')
  return listen<LanStatus>('lan://status', (e) => handle(e.payload))
}

/** Delivers players created by phones joining under a new name. */
export async function onLanJoin(handle: (join: LanJoin) => void): Promise<() => void> {
  const { listen } = await import('@tauri-apps/api/event')
  return listen<LanJoin>('lan://join', (e) => handle(e.payload))
}

/** Renders a QR code as an SVG string, offline. */
export async function qrSvg(text: string): Promise<string> {
  const { toString } = await import('qrcode')
  return toString(text, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0b0a4aff', light: '#ffffffff' } })
}
