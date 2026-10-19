import { watch } from 'vue'
import type { Router } from 'vue-router'
import { toast } from 'vue-sonner'
import { currentLocale, t } from './i18n'
import { isMainWindow, overlayTitleBar } from './platform'
import { lastSession } from './play/savedSession'

/*
 * The macOS menu bar: the system's default menus plus a Game menu that picks up the last
 * unfinished game from anywhere in the app. Other systems have no app menu bar to extend.
 */

/** Opens the most recently saved unfinished game; returns false when there is none. */
export function continueLastGame(router: Router): boolean {
  const last = lastSession()
  if (!last) return false
  void router.push({ name: 'play', params: { id: last.gameId }, query: { resume: '1' } })
  return true
}

async function build(router: Router) {
  const { Menu, Submenu } = await import('@tauri-apps/api/menu')
  const menu = await Menu.default()
  const game = await Submenu.new({
    text: t('system.menu.game'),
    items: [
      {
        id: 'continue-last',
        text: t('system.menu.continueLast'),
        accelerator: 'CmdOrCtrl+Shift+P',
        action: () => {
          if (!continueLastGame(router)) toast.info(t('system.menu.nothingToContinue'))
        },
      },
      { id: 'library', text: t('system.menu.library'), accelerator: 'CmdOrCtrl+Shift+L', action: () => void router.push({ name: 'home' }) },
    ],
  })
  // right after the menu named after the app, before File and Edit
  await menu.insert(game, 1)
  await menu.setAsAppMenu()
}

/** Installs the menu in the library window and rebuilds it when the language changes. */
export function installAppMenu(router: Router): void {
  if (!overlayTitleBar || !isMainWindow()) return
  watch(currentLocale, () => build(router).catch(() => {}), { immediate: true })
}
