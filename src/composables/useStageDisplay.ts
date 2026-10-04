import { onMounted, onUnmounted } from 'vue'
import { prefs } from '@/prefs'
import { isDesktop, isMainWindow } from '@/platform'
import { findScreen, fitCentered, sameScreen } from '@/play/monitors'

type Restore = () => Promise<void>

const FULLSCREEN_SETTLE_MS = 1500

/**
 * Desktop: moves the window onto the monitor chosen for the stage (and full screen, if asked)
 * while the calling component is mounted, then puts it back where it was.
 */
export function useStageDisplay(): void {
  if (!isDesktop || !isMainWindow()) return
  let restore: Restore | null = null
  let left = false

  onMounted(async () => {
    const undo = await placeStage().catch(() => null)
    // the stage may already be gone by the time the window finished moving
    if (left) await undo?.().catch(() => {})
    else restore = undo
  })
  onUnmounted(() => {
    left = true
    void restore?.().catch(() => {})
    restore = null
  })
}

async function placeStage(): Promise<Restore | null> {
  const wantFullscreen = prefs.stageFullscreen
  if (prefs.stageMonitor === null && !wantFullscreen) return null
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  const { PhysicalPosition, PhysicalSize } = await import('@tauri-apps/api/dpi')
  const { loadScreens } = await import('@/play/desktopScreens')
  const win = getCurrentWindow()
  const { screens, current } = await loadScreens()
  const target = findScreen(screens, prefs.stageMonitor)
  const move = !!target && !sameScreen(target, current)

  const [position, size, scale, wasFullscreen, wasMaximized] = await Promise.all([
    win.outerPosition(),
    win.innerSize(),
    win.scaleFactor(),
    win.isFullscreen(),
    win.isMaximized(),
  ])
  if (!move && (!wantFullscreen || wasFullscreen)) return null

  if (move && target) {
    // macOS ignores moves of a full-screen window and a maximized one snaps back
    if (wasFullscreen) await setFullscreen(false)
    if (wasMaximized) await win.unmaximize()
    const rect = fitCentered((size.width / scale) * target.scaleFactor, (size.height / scale) * target.scaleFactor, target.workArea)
    await win.setPosition(new PhysicalPosition(rect.x, rect.y))
    await win.setSize(new PhysicalSize(rect.width, rect.height))
  }
  if (wantFullscreen) await setFullscreen(true)

  return async () => {
    if (await win.isFullscreen()) await setFullscreen(false)
    if (move) {
      // back on the old monitor first, so the size is read in its scale factor
      await win.setPosition(new PhysicalPosition(position.x, position.y))
      await win.setSize(new PhysicalSize(size.width, size.height))
    }
    if (move && wasMaximized) await win.maximize()
    if (wasFullscreen) await setFullscreen(true)
  }

  // full screen animates on macOS; moving or resizing mid-animation is dropped
  async function setFullscreen(on: boolean) {
    await win.setFullscreen(on)
    const until = Date.now() + FULLSCREEN_SETTLE_MS
    while ((await win.isFullscreen()) !== on && Date.now() < until) await new Promise((r) => setTimeout(r, 50))
  }
}
