import type ru from '../ru/system'

export default {
  appName: 'Svoja igra',
  confirm: { cancel: 'Otkaži', yes: 'Da' },
  desktop: {
    gameOpened: 'Igra je otvorena',
    edit: 'Uredi',
    openFailed: 'Nije uspelo otvaranje: {name}',
    updateAvailable: 'Izašla je verzija {version}',
    update: 'Ažuriraj',
    downloading: 'Preuzimamo ažuriranje…',
    updateFailed: 'Ažuriranje nije uspelo',
  },
  defaults: {
    game: 'Nova igra',
    round: 'Runda {n}',
    theme: 'Tema',
    themeN: 'Tema {n}',
    final: 'Finale',
  },
  errors: {
    invalidGame: 'Fajl je oštećen ili nije igra',
    noGameJson: 'U arhivi nema opisa igre (game.json)',
    notGameFile: 'Ovo nije fajl igre. Odgovaraju .gamezip, .json i SIGame paketi .siq',
    sampleFailed: 'primer se nije učitao, greška {status}',
    embeddedUnreadable: 'Nije uspelo čitanje ugrađenog fajla',
    siqBroken: 'Datoteka je oštećena ili nije SIGame paket (.siq)',
    siqNoContent: 'Paket nema content.xml',
    siqEmpty: 'Paket nema nijedno pitanje',
  },
  siq: { catTheme: 'Kategorija: {theme}' },
  fileFilterName: 'Svoja igra',
  hostWindowTitle: 'Voditelj · {title}',
} satisfies typeof ru
