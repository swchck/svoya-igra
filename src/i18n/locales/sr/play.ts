import type ru from '../ru/play'

export default {
  board: {
    playedAria: '{theme}: odigrano',
    cellAria: '{theme}, {value}',
  },
  podiums: {
    score: 'Rezultat',
    leader: 'Lider',
  },
  results: {
    title: 'Rezultati',
    home: 'Na početnu',
  },
  setup: {
    title: 'Igrači',
    nameLabel: 'Ime igrača',
    remove: 'Ukloni igrača',
    add: 'Igrač',
    defaultName: 'Igrač {n}',
  },
  card: {
    correctAnswer: 'Tačan odgovor',
  },
  special: {
    topic: 'Tema: {topic}',
  },
  intro: {
    roundThemes: 'Teme runde',
  },
  auction: {
    winner: 'Ko je dobio licitaciju',
    stakeRange: 'Ulog (od {min} do {max})',
    allIn: 'Va-bank',
    play: 'Igraj za {amount}',
  },
  cat: {
    give: 'Ko dobija pitanje za {value}?',
  },
  verdict: {
    nobody: 'Niko nije odgovorio',
  },
  finalBets: {
    hint: 'Ulog od 0 do trenutnog rezultata. Ko nema poena, ulaže 0.',
    outOf: 'od {score}',
    show: 'Prikaži pitanje',
  },
  finalVerdict: {
    bet: 'ulog {bet}',
    correct: 'Tačno',
    incorrect: 'Netačno',
    done: 'Podvedi rezultate',
  },
  stage: {
    auction: 'Aukcija',
    catInBag: 'Mačka u džaku',
    catText: 'Pitanje ide drugom igraču',
    final: 'Finale',
    finalTopic: 'Finale: {theme}',
    finalBetsText: 'Igrači biraju ulog',
    defaultTitle: 'Svoja igra',
    leave: 'Izađi',
    hostConnected: 'Prozor voditelja je povezan',
    hostWindow: 'Prozor voditelja',
    exitFullscreen: 'Smanji',
    fullscreen: 'Preko celog ekrana',
    start: 'Počni igru',
    hintToBoard: 'Razmak ili klik: na tablu',
    hintToBets: 'Razmak ili klik: na uloge',
    skipRound: 'Preskoči rundu',
    showAnswer: 'Prikaži odgovor',
    leaveConfirm: {
      title: 'Izaći iz igre?',
      description: 'Rezultat se čuva, partiju možeš nastaviti kasnije.',
      confirm: 'Izađi',
    },
    skipConfirm: {
      title: 'Preskočiti rundu?',
      description: 'Preostala pitanja ove runde neće biti odigrana.',
      confirm: 'Preskoči',
    },
  },
} satisfies typeof ru
