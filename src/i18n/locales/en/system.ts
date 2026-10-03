import type ru from '../ru/system'

export default {
  appName: 'Svoya Igra',
  confirm: { cancel: 'Cancel', yes: 'Yes' },
  desktop: {
    gameOpened: 'Game opened',
    edit: 'Edit',
    openFailed: 'Could not open {name}',
    updateAvailable: 'Version {version} is out',
    update: 'Update',
    downloading: 'Downloading the update…',
    updateFailed: 'Could not update',
  },
  defaults: {
    game: 'New game',
    round: 'Round {n}',
    theme: 'Category',
    themeN: 'Category {n}',
    final: 'Final',
  },
  errors: {
    invalidGame: 'The file is damaged or is not a game',
    noGameJson: 'The archive has no game description (game.json)',
    notGameFile: 'This is not a game file. Use .gamezip, .json or a SIGame .siq package',
    sampleFailed: 'the sample failed to load, error {status}',
    embeddedUnreadable: 'Could not read the embedded file',
    siqBroken: 'The file is damaged or is not a SIGame package (.siq)',
    siqNoContent: 'The package has no content.xml',
    siqEmpty: 'The package has no questions',
  },
  siq: { catTheme: 'Category: {theme}' },
  fileFilterName: 'Svoya Igra',
  hostWindowTitle: 'Host · {title}',
} satisfies typeof ru
