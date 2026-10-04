import type ru from '../ru/prefsPlay'

export default {
  rules: {
    title: 'Rules',
    hint: 'How the game runs. Changes apply right away, even mid-game.',
    penalty: 'Wrong answers cost points',
    penaltyHint: 'When off, a wrong answer costs nothing. Final round bets still count as usual.',
    chooser: 'Who picks first',
    chooserRandom: 'A random player',
    chooserFirst: 'First in the list',
    chooserHost: 'The host decides',
    buzz: 'Phone buttons open',
    buzzQuestion: 'With the question',
    buzzHost: 'When the host says',
    buzzTimer: 'When the timer starts',
    buzzHostHint: 'The host opens them from the host console or with the B key on the stage.',
    buzzTimerHint: 'If the game has no timer, the buttons open with the question.',
  },
  stage: {
    title: 'Stage',
    hint: 'How the game board looks.',
    scale: 'Text size',
    motion: 'Less motion',
    motionHint: 'No confetti, flying cells or shaking. Handy on a slow computer or projector.',
    cursor: 'Hide the pointer when the mouse is still',
  },
  sound: {
    title: 'Sound and phones',
    titleWeb: 'Game sound',
    mediaVolume: 'Volume of audio and video in questions',
    tick: 'Timer ticks in the last seconds',
    fixedCode: 'Keep the same room code',
    fixedCodeHint: 'The link and QR code for phones stay the same from game to game.',
    code: 'Code: {code}',
    vibration: 'Phone vibrates when its player buzzes first',
  },
} satisfies typeof ru
