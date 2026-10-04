import type { Monitor } from '@tauri-apps/api/window'

/*
 * Pure geometry for placing the stage and host windows on the desktop's monitors. Everything
 * here is in physical pixels, the unit Tauri reports monitors in.
 */

/** A rectangle in physical pixels. */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** A connected monitor, flattened from Tauri's classes so it can be compared and tested. */
export interface Screen {
  name: string | null
  bounds: Rect
  /** The bounds minus the dock, menu bar or taskbar. */
  workArea: Rect
  scaleFactor: number
}

/** Converts a Tauri monitor into a Screen. */
export function toScreen(m: Monitor): Screen {
  return {
    name: m.name,
    bounds: { x: m.position.x, y: m.position.y, width: m.size.width, height: m.size.height },
    workArea: {
      x: m.workArea.position.x,
      y: m.workArea.position.y,
      width: m.workArea.size.width,
      height: m.workArea.size.height,
    },
    scaleFactor: m.scaleFactor,
  }
}

/** Reports whether two screens are the same monitor. */
export function sameScreen(a: Screen | null, b: Screen | null): boolean {
  // two monitors of one model share a name, their place on the desktop tells them apart
  return !!a && !!b && a.name === b.name && a.bounds.x === b.bounds.x && a.bounds.y === b.bounds.y
}

/** Returns the connected screen with the given name, or null when it is unplugged. */
export function findScreen(screens: readonly Screen[], name: string | null): Screen | null {
  if (name === null) return null
  return screens.find((s) => s.name === name) ?? null
}

/** Returns a rectangle of the given size, shrunk to fit the area and centered in it. */
export function fitCentered(width: number, height: number, area: Rect): Rect {
  const w = Math.round(Math.min(width, area.width))
  const h = Math.round(Math.min(height, area.height))
  return {
    x: area.x + Math.floor((area.width - w) / 2),
    y: area.y + Math.floor((area.height - h) / 2),
    width: w,
    height: h,
  }
}

/**
 * Picks where the host window goes: the primary screen unless the stage is on it, otherwise
 * any other screen. Null when the stage has the only screen, or its screen is unknown.
 */
export function pickHostScreen(screens: readonly Screen[], stage: Screen | null, primary: Screen | null): Screen | null {
  if (!stage) return null
  if (primary && !sameScreen(primary, stage) && screens.some((s) => sameScreen(s, primary))) return primary
  return screens.find((s) => !sameScreen(s, stage)) ?? null
}
