import type ru from '../ru/print'

export default {
  back: 'Nazad',
  print: 'Štampaj',
  title: 'Šalabahter za voditelja',
  final: 'Finale',
  noText: 'Bez teksta',
  noAnswer: 'Bez odgovora',
  mediaPrefix: 'Mediji',
  kind: {
    auction: 'Aukcija',
    catInBag: 'Mačka u džaku, za {n}',
    noRisk: 'Bez rizika',
    allIn: 'Va bank',
    forAll: 'Za sve',
  },
  media: {
    image: 'slika',
    audio: 'zvuk',
    video: 'video',
    youtube: 'YouTube',
    youtubeAudio: 'YouTube, zvuk',
    from: '{label} od {start}',
    range: '{label} {start}–{end}',
  },
  accepted: 'Takođe tačno',
  rejected: 'Ne priznati',
} satisfies typeof ru
