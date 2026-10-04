import type ru from '../ru/prefsLibrary'

export default {
  newGames: {
    title: 'New games',
    hint: 'Every new game starts with these settings. Games you already have or import stay as they are.',
    answerSeconds: 'Time to answer',
    noTimer: 'Off',
    seconds: '{n} s',
    autoStart: 'Start the timer as soon as a question appears',
    accent: 'Color',
  },
  data: {
    title: 'Games and data',
    imageQuality: 'Picture compression',
    quality: {
      original: 'None',
      normal: 'Normal',
      strong: 'Strong',
    },
    qualityHint: {
      original: 'Pictures are kept as they are. Games get heavier.',
      normal: 'Large photos are scaled down to 2560 px on the long side. Plenty for a projector.',
      strong: 'Photos are scaled down to 1600 px and compressed harder. Lighter games, slightly lower quality.',
    },
    backup: 'Backup',
    saveAll: 'Save all games',
    restore: 'Load from backup',
    backupHint: 'All games with their pictures and sounds in one file. Games from a backup are added to the ones you have; nothing is deleted or replaced.',
  },
  toast: {
    packing: 'Packing the backup…',
    packingProgress: 'Packing the backup: {done} of {total}',
    nothingToSave: 'Nothing to save yet',
    saved: 'Saved {n} game | Saved {n} games',
    saveFailed: 'Could not save the backup',
    unpacking: 'Reading the backup…',
    unpackingProgress: 'Loading games: {done} of {total}',
    restored: 'Loaded {n} game | Loaded {n} games',
    someFailed: "{n} game couldn't be read | {n} games couldn't be read",
    emptyBackup: 'The backup has no games',
    restoreFailed: 'Could not load the backup',
  },
  errors: {
    notBackup: 'This is not a game backup',
  },
} satisfies typeof ru
