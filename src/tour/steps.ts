import type { Scene, TourStep } from './engine'

/** The tour, in order; the copy of each step lives under `tour.steps.<id>`. */
export const TOUR_STEPS: TourStep[] = [
  { id: 'welcome', page: 'home' },
  { id: 'actions', page: 'home', target: 'home-actions' },
  { id: 'card', page: 'home', target: 'game-card', game: true },
  { id: 'tools', page: 'home', target: 'home-tools' },

  { id: 'board', page: 'editor', target: 'board-cell', click: true },
  { id: 'questionText', page: 'editor', target: 'q-text', scene: 'question' },
  { id: 'questionMedia', page: 'editor', target: 'q-media', scene: 'question' },
  { id: 'questionKind', page: 'editor', target: 'q-settings', scene: 'question' },
  { id: 'rounds', page: 'editor', target: 'rounds' },
  { id: 'gameSettings', page: 'editor', target: 'game-settings' },
  { id: 'checks', page: 'editor', target: ['issues', 'history'] },
  { id: 'export', page: 'editor', target: 'export' },
  { id: 'play', page: 'editor', target: 'play' },

  { id: 'players', page: 'play', target: 'players' },
  { id: 'phones', page: 'play', target: 'phones-toggle', desktopOnly: true },
  { id: 'hostWindow', page: 'play', target: 'host-window' },
  { id: 'start', page: 'play', target: 'stage-start', click: true },
  { id: 'stageBoard', page: 'play', target: 'board-grid', scene: 'stage', noBack: true },
  { id: 'chooser', page: 'play', target: 'chooser', scene: 'stage', noBack: true },
  { id: 'hotkeys', page: 'play', target: 'board-actions', scene: 'stage', noBack: true },
]

/** UI the steps need on screen besides the page itself. */
export const TOUR_SCENES: Record<string, Scene> = {
  question: {
    marker: '[data-tour="q-dialog"]',
    open: ['[data-tour="board-cell"]'],
    close: '[data-tour="q-dialog"] [data-slot="dialog-close"]',
  },
  // the game under way: the title screen's Start, then the round intro, lead to the board
  stage: {
    marker: '[data-tour="board-grid"]',
    open: ['[data-tour="stage-start"]', '[data-tour="intro"]'],
  },
}
