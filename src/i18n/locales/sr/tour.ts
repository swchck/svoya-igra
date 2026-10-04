import type ru from '../ru/tour'

export default {
  restart: 'Obiđi aplikaciju',
  progress: 'Korak {n} od {total}',
  clickHint: 'Kliknite na označeno mesto ili na „Dalje“.',
  back: 'Nazad',
  next: 'Dalje',
  done: 'Gotovo',
  skip: 'Preskoči',
  later: 'Kasnije',
  show: 'Pokaži',
  steps: {
    welcome: {
      title: 'Obilazak za voditelja',
      text: 'Proći ćemo kroz primer igre: gde se pišu pitanja, kako se pokreće igra i šta voditelj ima na raspolaganju. Traje par minuta. Izaći možete bilo kada tasterom Esc.',
    },
    actions: {
      title: 'Odakle početi',
      text: '„Nova igra“ otvara prazan uređivač. Preko „Uvoza“ se učitavaju SIGame fajlovi (.siq), igre u .gamezip i .json i rezervne kopije biblioteke. „Otvori primer“ dodaje gotovu igru, i obilazak ide kroz nju.',
    },
    card: {
      title: 'Kartica igre',
      text: '„Igraj“ pokreće igru za publiku, „Uredi“ otvara uređivač. U meniju „⋯“ igru možete sačuvati u fajl ili obrisati.',
      textDesktop: '„Igraj“ pokreće igru za publiku, „Uredi“ otvara uređivač. U meniju „⋯“ igru možete sačuvati u fajl, poslati preko Wi-Fi mreže na drugi računar ili obrisati.',
    },
    tools: {
      title: 'Podešavanja i ovaj obilazak',
      text: 'Zupčanik otvara podešavanja: jezik, zvukove, pravila i izgled. Znak pitanja ponovo pokreće obilazak.',
    },
    board: {
      title: 'Tabla runde',
      text: 'Svaki red table je tema, svako polje pitanje sa svojom vrednošću. Kliknite na polje i otvoriće se pitanje.',
    },
    questionText: {
      title: 'Pitanje i odgovor',
      text: 'Levo je pitanje, desno odgovor. Dugmad iznad teksta prave podebljano i kurziv i dodaju liste i citate. Igrači vide tekst tako uređen.',
    },
    questionMedia: {
      title: 'Slike, zvuk i video',
      text: 'Sliku, zvuk ili video dodajte kao fajl, prevlačenjem, lepljenjem ili linkom, i na YouTube. I odgovor može da ima priloge.',
    },
    questionKind: {
      title: 'Vrsta pitanja i vrednost',
      text: 'Pitanje može biti obično, „Aukcija“, gde se igrači nadmeću za pravo odgovora, ili „Mačka u džaku“, koja ide drugom igraču. Vrednost upišite bilo koju ili izaberite gotovu. Prozor se zatvara krstićem.',
    },
    rounds: {
      title: 'Runde i finale',
      text: 'Dugme „Runda“ dodaje rundu, a redosled se menja prevlačenjem. Igru možete završiti finalnim pitanjem sa ulozima.',
    },
    gameSettings: {
      title: 'Podešavanja igre',
      text: 'Ovde su tajmer za odgovor, boja izgleda, logo i tekst koji se vidi na početnom ekranu.',
    },
    checks: {
      title: 'Provera i istorija',
      text: 'Znak pokazuje gde nedostaje odgovor ili je link pokvaren. „Istorija“ čuva ranije verzije igre i na svaku se možete vratiti.',
    },
    export: {
      title: 'Izvoz i šalabahter',
      text: 'Sačuvajte igru u fajl da biste je otvorili na drugom računaru. „Šalabahter za voditelja“ štampa sva pitanja sa odgovorima.',
      textDesktop: 'Sačuvajte igru u fajl ili je pošaljite preko Wi-Fi mreže na drugi računar. „Šalabahter za voditelja“ štampa sva pitanja sa odgovorima.',
    },
    play: {
      title: 'Igraj',
      text: 'Ovo dugme otvara igru na ekranu za publiku. Sledeći koraci govore kako se vodi.',
    },
    players: {
      title: 'Igrači ili timovi',
      text: 'Upišite imena i izaberite boju i znak. Prekidač gore određuje da li se igra pojedinačno ili u timovima.',
    },
    phones: {
      title: 'Telefoni umesto dugmadi',
      text: 'Igrači se povezuju telefonima preko Wi-Fi mreže i pritiskaju dugme na ekranu, odgovara onaj ko je bio prvi. Bez telefona voditelj sam označava ko je odgovorio.',
    },
    hostWindow: {
      title: 'Prozor voditelja',
      text: 'Otvara pult u posebnom prozoru. Pitanje, odgovor i rezultat tamo vidite samo vi, a publika gleda scenu. Pult držite na laptopu, a scenu na drugom ekranu.',
    },
    start: {
      title: 'Početak igre',
      text: '„Počni igru“ otvara prvu rundu. Obilazak samo pokazuje scenu, ne morate stvarno da igrate.',
    },
    stageBoard: {
      title: 'Tabla na sceni',
      text: 'Izaberite polje i pitanje se otvara preko celog ekrana. Razmak prikazuje odgovor, a onda na panelu označite ko je odgovorio tačno, ko je pogrešio, ili „Niko nije odgovorio“.',
    },
    chooser: {
      title: 'Ko bira',
      text: 'Oznaka „Bira pitanje“ stoji kod igrača koji kaže sledeće polje. Posle tačnog odgovora bira onaj ko je odgovorio.',
    },
    hotkeys: {
      title: 'Tasteri i poništavanje',
      text: 'Razmak vodi igru dalje, B otvara dugmad na telefonima, Ctrl/⌘+Z poništava poslednju radnju. „Poništi“ i „Preskoči rundu“ postoje i kao dugmad ispod table. Posle rundi dolaze finale i tabela rezultata.',
    },
  },
} satisfies typeof ru
