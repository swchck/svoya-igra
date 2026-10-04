import type { Scene, TourStep } from './engine'
import type { TourId } from './state'

/** The tours; the copy of each step lives under `tour.<tour id>.<step id>`. */
export const TOURS: Record<TourId, TourStep[]> = {
  home: [
    { id: 'welcome', invite: true },
    { id: 'actions', target: 'home-actions' },
    { id: 'card', target: 'game-card', wait: 0 },
    { id: 'tools', target: 'home-tools' },
  ],
  editor: [
    { id: 'board', target: 'board-cell', click: true },
    { id: 'question', target: ['q-text', 'q-media'], scene: 'question' },
    { id: 'kind', target: 'q-settings', scene: 'question' },
    { id: 'rounds', target: 'rounds' },
    { id: 'checks', target: ['issues', 'history'] },
    { id: 'export', target: 'export' },
  ],
  stage: [
    { id: 'players', target: 'players' },
    { id: 'phones', target: 'phones-toggle', desktopOnly: true },
    { id: 'hostWindow', target: 'host-window' },
    { id: 'start', target: 'stage-start', click: true },
    { id: 'chooser', target: 'chooser', scene: 'stage', noBack: true },
    { id: 'hotkeys', target: 'board-actions', scene: 'stage', noBack: true },
  ],
  host: [
    { id: 'chooser', target: 'host-chooser', demo: 'board' },
    { id: 'question', target: 'host-question', demo: 'question' },
    { id: 'buzz', target: 'host-buzz', demo: 'question', wait: 400 },
    { id: 'timer', target: 'host-timer', demo: 'question', wait: 400 },
    { id: 'verdict', target: 'host-verdict', demo: 'answer' },
    { id: 'scores', target: 'host-scores', demo: 'answer' },
    { id: 'top', target: 'host-top', demo: 'answer' },
  ],
}

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
