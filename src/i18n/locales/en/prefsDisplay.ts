import type ru from '../ru/prefsDisplay'

export default {
  title: 'Screen',
  hint: 'Where the stage moves when a game starts. The host console opens on another screen.',
  keep: 'As it is',
  keepHint: 'The stage opens where the app window is',
  unnamed: 'Screen {n}',
  primary: 'main',
  current: 'window is here',
  missing: 'not connected',
  show: 'Identify',
  single: 'One screen is connected. Plug in a projector or a TV and it shows up here.',
  fullscreen: 'Open the stage full screen',
} satisfies typeof ru
