import type ru from '../ru/lan'

export default {
  toggle: 'Buzzers on phones',
  toggleHint: 'Players buzz in with their own phones.',
  turnOff: 'Turn off',
  starting: 'Starting…',
  scan: 'Point a phone camera at the code',
  room: 'Room code',
  note: 'Phones must be on the same Wi‑Fi. macOS may ask about incoming connections — allow them.',
  noPhones: 'No phones connected yet',
  connected: '{n} phone connected | {n} phones connected',
  phones: 'Phones',
  phoneConnected: 'Phone connected',
  errors: {
    noNetwork: 'This computer is not on a local network. Connect it to the same Wi‑Fi as the phones.',
    failed: 'Could not start the buzzers',
  },
  buzz: {
    title: 'Buzzers',
    open: 'Open',
    closed: 'Closed',
    locked: 'Buzzed',
    nobody: 'Nobody has buzzed yet.',
    wrong: 'Wrong (−{value}), reopen',
    reopen: 'Reopen',
    excluded: 'Already answered: {names}',
  },
  final: {
    answers: 'Answers from phones',
    noAnswer: 'no answer',
  },
  share: {
    menu: 'Share over Wi‑Fi',
    title: 'Share over Wi‑Fi',
    description: 'Open the link on a device on the same network to download the game file.',
    preparing: 'Preparing the file…',
    failed: 'Could not share the game',
    done: 'Done',
  },
} satisfies typeof ru
