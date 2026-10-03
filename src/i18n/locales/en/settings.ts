import type ru from '../ru/settings'

export default {
  open: 'Game settings',
  title: 'Game settings',
  description: 'Timer and stage look for this game.',
  done: 'Done',
  tabs: { timer: 'Timer', look: 'Look' },
  timer: {
    answerSeconds: 'Time to answer, seconds',
    answerHint: 'Zero or empty: no timer. The host starts it from the host window.',
    autoStart: 'Start the timer with the question',
  },
  look: {
    accent: 'Accent color',
    accents: { gold: 'Gold', ruby: 'Ruby', emerald: 'Emerald', sapphire: 'Sapphire' },
    logo: 'Logo',
    logoHint: 'Shown on the title screen and in a corner of the stage.',
    logoAdd: 'Upload a logo',
    logoRemove: 'Remove the logo',
    logoAlt: 'Logo',
    introText: 'Title screen text',
    introPlaceholder: 'For example: Quiz night, hall 3',
  },
} satisfies typeof ru
