import type ru from '../ru/prefsPlay'

export default {
  rules: {
    title: 'Pravila',
    hint: 'Kako teče igra. Promene važe odmah, čak i usred partije.',
    penalty: 'Netačan odgovor oduzima poene',
    penaltyHint: 'Ako je isključeno, greška ne košta ništa. Ulozi u finalu važe kao i inače.',
    chooser: 'Prvi bira',
    chooserRandom: 'Nasumičan igrač',
    chooserFirst: 'Prvi na spisku',
    chooserHost: 'Odlučuje voditelj',
    buzz: 'Dugmad na telefonima se otvaraju',
    buzzQuestion: 'Sa pitanjem',
    buzzHost: 'Na znak voditelja',
    buzzTimer: 'Kad krene tajmer',
    buzzHostHint: 'Voditelj ih otvara dugmetom na pultu ili tasterom B na sceni.',
    buzzTimerHint: 'Ako igra nema tajmer, dugmad se otvaraju sa pitanjem.',
  },
  stage: {
    title: 'Scena',
    hint: 'Kako izgleda tabla.',
    scale: 'Veličina teksta',
    motion: 'Manje animacija',
    motionHint: 'Bez konfeta, letećih polja i drmanja. Korisno na slabom računaru ili projektoru.',
    cursor: 'Sakrij pokazivač kad miš miruje',
  },
  sound: {
    title: 'Zvuk i telefoni',
    titleWeb: 'Zvuk u igri',
    mediaVolume: 'Jačina zvuka i videa u pitanjima',
    tick: 'Otkucaji tajmera u poslednjim sekundama',
    fixedCode: 'Stalni kod sobe',
    fixedCodeHint: 'Link i QR kod za telefone ostaju isti od igre do igre.',
    code: 'Kod: {code}',
    vibration: 'Telefon zavibrira kad njegov igrač pritisne prvi',
  },
} satisfies typeof ru
