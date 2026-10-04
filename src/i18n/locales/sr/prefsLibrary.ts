import type ru from '../ru/prefsLibrary'

export default {
  newGames: {
    title: 'Nove igre',
    hint: 'Svaka nova igra počinje sa ovim podešavanjima. Igre koje već imate ili uvezete ostaju kakve jesu.',
    answerSeconds: 'Vreme za odgovor',
    noTimer: 'Ne',
    seconds: '{n} s',
    autoStart: 'Pokreni tajmer čim se pojavi pitanje',
    accent: 'Boja',
  },
  data: {
    title: 'Igre i podaci',
    imageQuality: 'Kompresija slika',
    quality: {
      original: 'Bez kompresije',
      normal: 'Obična',
      strong: 'Jaka',
    },
    qualityHint: {
      original: 'Slike se čuvaju kakve jesu. Igre su teže.',
      normal: 'Velike fotografije se smanjuju na 2560 piksela po dužoj strani. Dovoljno za projektor.',
      strong: 'Fotografije se smanjuju na 1600 piksela i jače sabijaju. Igre su lakše, a kvalitet malo slabiji.',
    },
    backup: 'Rezervna kopija',
    saveAll: 'Sačuvaj sve igre',
    restore: 'Učitaj iz kopije',
    backupHint: 'Sve igre sa slikama i zvucima u jednom fajlu. Igre iz kopije se dodaju postojećim, ništa se ne briše niti zamenjuje.',
  },
  toast: {
    packing: 'Pravimo kopiju…',
    packingProgress: 'Pravimo kopiju: {done} od {total}',
    nothingToSave: 'Još nema šta da se sačuva',
    saved: 'Sačuvana {n} igra | Sačuvane {n} igre | Sačuvano {n} igara',
    saveFailed: 'Kopija nije sačuvana',
    unpacking: 'Čitamo kopiju…',
    unpackingProgress: 'Učitavamo igre: {done} od {total}',
    restored: 'Učitana {n} igra | Učitane {n} igre | Učitano {n} igara',
    someFailed: '{n} igra nije pročitana | {n} igre nisu pročitane | {n} igara nije pročitano',
    emptyBackup: 'U kopiji nema igara',
    restoreFailed: 'Kopija nije učitana',
  },
  errors: {
    notBackup: 'Ovo nije rezervna kopija igara',
  },
} satisfies typeof ru
