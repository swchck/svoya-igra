import type ru from '../ru/settings'

export default {
  open: 'Podešavanja igre',
  title: 'Podešavanja igre',
  description: 'Tajmer i izgled scene za ovu igru.',
  done: 'Gotovo',
  tabs: { timer: 'Tajmer', look: 'Izgled' },
  timer: {
    answerSeconds: 'Vreme za odgovor, sekundi',
    answerHint: 'Nula ili prazno: bez tajmera. Voditelj ga pokreće u prozoru voditelja.',
    autoStart: 'Pokreni tajmer sa pitanjem',
  },
  look: {
    accent: 'Boja akcenta',
    accents: { gold: 'Zlato', ruby: 'Rubin', emerald: 'Smaragd', sapphire: 'Safir' },
    logo: 'Logo',
    logoHint: 'Prikazuje se na uvodnom ekranu i u uglu scene.',
    logoAdd: 'Otpremi logo',
    logoRemove: 'Ukloni logo',
    logoAlt: 'Logo',
    introText: 'Tekst na uvodnom ekranu',
    introPlaceholder: 'Na primer: Kviz veče, sala 3',
  },
} satisfies typeof ru
