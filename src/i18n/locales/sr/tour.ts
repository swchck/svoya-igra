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
      title: 'Kratak obilazak za voditelja',
      text: 'Pokazaću glavna dugmad na gotovoj primer-igri: kako se igra pravi, kako se vodi i šta sve voditelj može. Traje par minuta, a Esc zaustavlja obilazak u svakom trenutku.',
    },
    actions: {
      title: 'Odakle početi',
      text: '„Nova igra“ otvara prazan editor. „Uvoz“ prima tuđe igre: SIGame fajlove (.siq), naše .gamezip i .json, kao i rezervne kopije biblioteke. „Otvori primer“ stavlja u biblioteku gotovu igru, a obilazak ide na njoj.',
    },
    card: {
      title: 'Kartica igre',
      text: '„Igraj“ pokreće igru za publiku, „Uredi“ otvara editor. Meni „⋯“ čuva igru u fajl ili je briše.',
      textDesktop: '„Igraj“ pokreće igru za publiku, „Uredi“ otvara editor. Meni „⋯“ čuva igru u fajl, deli je preko Wi-Fi mreže na drugi računar ili je briše.',
    },
    tools: {
      title: 'Podešavanja i ovaj obilazak',
      text: 'Zupčanik otvara podešavanja: jezik, zvukove, izgled i pravila igre. Znak pitanja ponovo pokreće ovaj obilazak.',
    },
    board: {
      title: 'Tabla runde',
      text: 'Teme idu u redovima, pitanja su polja sa cenom. Kliknite na bilo koje polje da otvorite pitanje.',
    },
    questionText: {
      title: 'Pitanje i odgovor',
      text: 'Pitanje se piše levo, odgovor desno. Iznad polja je oblikovanje: podebljano, kurziv, liste i citati. Igrači sve to vide na ekranu.',
    },
    questionMedia: {
      title: 'Slike, zvuk i video',
      text: 'Pitanju se može dodati slika, zvuk ili video: fajlom, prevlačenjem, nalepljivanjem iz privremene memorije ili linkom (i YouTube). Isti prilozi postoje i za odgovor.',
    },
    questionKind: {
      title: 'Vrsta pitanja i cena',
      text: 'Obično pitanje, „Aukcija“ (igrači licitiraju za pravo da odgovore) ili „Mačka u džaku“ (pitanje se daje protivniku). Cena je bilo koji broj, a uobičajene vrednosti su pri ruci. Prozor se zatvara krstićem.',
    },
    rounds: {
      title: 'Runde i finale',
      text: 'Dugme „Runda“ dodaje rundu, prevlačenjem se menja redosled. Igra se može završiti finalnim pitanjem sa opkladama.',
    },
    gameSettings: {
      title: 'Podešavanja igre',
      text: 'Tajmer za odgovor, boja akcenta, logo i uvodni tekst daju igri sopstveni izgled na ekranu.',
    },
    checks: {
      title: 'Provere i istorija',
      text: 'Značka pokazuje šta u igri nije popunjeno ili ne radi. „Istorija“ čuva ranije verzije igre, a svaka se može vratiti.',
    },
    export: {
      title: 'Izvoz i šalabahter',
      text: 'Sačuvajte igru u fajl da biste je otvorili na drugom računaru. „Šalabahter za voditelja“ štampa sva pitanja sa odgovorima, zgodno da voditelj ima pri ruci.',
      textDesktop: 'Sačuvajte igru u fajl ili je podelite preko Wi-Fi mreže na drugi računar. „Šalabahter za voditelja“ štampa sva pitanja sa odgovorima, zgodno da voditelj ima pri ruci.',
    },
    play: {
      title: 'Igraj',
      text: 'Ovo dugme pokreće igru na sceni. Dalje ćemo videti kako se ona vodi.',
    },
    players: {
      title: 'Igrači ili timovi',
      text: 'Upišite imena, izaberite boju i avatar. Prekidač na vrhu određuje da li ljudi igraju pojedinačno ili u timovima.',
    },
    phones: {
      title: 'Telefoni umesto tastera',
      text: 'Igrači se priključuju sa telefona preko Wi-Fi mreže i pritiskaju dugme na ekranu: odgovara najbrži. Bez telefona voditelj sam označava ko je odgovorio.',
    },
    hostWindow: {
      title: 'Prozor voditelja',
      text: 'Otvara poseban prozor sa pultom: pitanje, odgovor i podsetnici vidljivi su samo vama, dok publika gleda scenu. Prozor se može prebaciti na drugi monitor.',
    },
    start: {
      title: 'Početak igre',
      text: 'Dugme „Počni igru“ pokreće igru. Obilazak će vam pokazati scenu, pa ne morate da igrate zaista.',
    },
    stageBoard: {
      title: 'Tabla igre',
      text: 'Izaberite polje i pitanje se otvara preko celog ekrana. Razmaknica otkriva odgovor, a zatim se pojavljuje panel presude: označite ko je tačno ili pogrešno odgovorio, ili „Niko nije odgovorio“.',
    },
    chooser: {
      title: 'Ko bira',
      text: 'Oznaka „Bira pitanje“ stoji kod igrača koji imenuje sledeće polje. Ko tačno odgovori, bira sledeći.',
    },
    hotkeys: {
      title: 'Tasteri i poništavanje',
      text: 'Razmaknica ide dalje, B otvara dugmad za odgovor, Ctrl/⌘+Z poništava poslednju radnju. „Poništi“ i „Preskoči rundu“ postoje i kao dugmad. Na kraju čekaju finale i tabela rezultata. Prijatno igranje!',
    },
  },
} satisfies typeof ru
