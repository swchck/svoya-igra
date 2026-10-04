import { toScreen, type Screen } from './monitors'

/* Desktop only: reads the connected monitors through Tauri. Import lazily from shared code. */

/** The connected monitors, the primary one and the one holding this window. */
export interface ScreenLayout {
  screens: Screen[]
  primary: Screen | null
  current: Screen | null
}

/** Reads the monitor layout as Tauri sees it right now. */
export async function loadScreens(): Promise<ScreenLayout> {
  const { availableMonitors, currentMonitor, primaryMonitor } = await import('@tauri-apps/api/window')
  const [all, primary, current] = await Promise.all([availableMonitors(), primaryMonitor(), currentMonitor()])
  return {
    screens: all.map(toScreen),
    primary: primary && toScreen(primary),
    current: current && toScreen(current),
  }
}

const FLASH_MS = 1800
const FLASH_LABEL = 'screen-flash'

/** Shows a big label on the screen for a moment so people can tell which monitor it is. */
export async function flashScreen(screen: Screen, label: string, detail: string): Promise<void> {
  const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
  await (await WebviewWindow.getByLabel(FLASH_LABEL))?.close()
  const scale = screen.scaleFactor
  const width = 560
  const height = 340
  const area = screen.workArea
  const query = new URLSearchParams({ label, detail })
  const win = new WebviewWindow(FLASH_LABEL, {
    url: `index.html#/flash?${query}`,
    // window options take logical pixels; the monitor is reported in physical ones
    x: Math.round(area.x / scale + (area.width / scale - width) / 2),
    y: Math.round(area.y / scale + (area.height / scale - height) / 2),
    width,
    height,
    decorations: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focus: false,
    backgroundColor: '#1a1aa8',
  })
  setTimeout(() => void win.close(), FLASH_MS)
}
