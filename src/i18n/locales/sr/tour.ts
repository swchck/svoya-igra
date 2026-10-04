import type ru from '../ru/tour'

export default {
  restart: 'Obilazak ovog ekrana',
  progress: 'Korak {n} od {total}',
  clickHint: 'Kliknite na označeno mesto ili na „Dalje“.',
  back: 'Nazad',
  next: 'Dalje',
  done: 'Gotovo',
  skip: 'Preskoči',
  later: 'Kasnije',
  show: 'Pokaži',
  demo: 'Demo',
  home: {
    welcome: {
      title: 'Kratak obilazak',
      text: 'Ukratko ćemo pokazati šta ima na početnom ekranu.',
    },
    actions: {
      title: 'Početak rada',
      text: '„Nova igra“ pravi praznu, „Uvoz“ otvara .siq, .gamezip, .json i rezervne kopije, „Otvori primer“ dodaje gotovu igru.',
    },
    card: {
      title: 'Kartica igre',
      text: '„Igraj“ pokreće igru, „Uredi“ otvara uređivač. Meni „⋯“ čuva igru u fajl ili je briše.',
      textDesktop: '„Igraj“ pokreće igru, „Uredi“ otvara uređivač. Meni „⋯“ čuva igru u fajl, deli je preko Wi-Fi mreže ili je briše.',
    },
    tools: {
      title: 'Podešavanja',
      text: 'Zupčanik otvara podešavanja. Znak pitanja postoji na svakom ekranu i ponavlja njegov obilazak.',
    },
  },
  editor: {
    board: {
      title: 'Tabla',
      text: 'Red je tema, polje je pitanje sa vrednošću. Kliknite na označeno polje.',
    },
    question: {
      title: 'Pitanje i odgovor',
      text: 'Levo je pitanje, desno odgovor. Tekst se može oblikovati, a uz oba se dodaje slika, zvuk ili video.',
    },
    kind: {
      title: 'Vrsta i vrednost',
      text: 'Pitanje je „Obično“, „Aukcija“ ili „Mačka u džaku“. Vrednost upišite ili izaberite iz gotovih.',
    },
    rounds: {
      title: 'Runde i finale',
      text: 'Dugme „Runda“ dodaje rundu, prevlačenje menja redosled. Finale se dodaje na kraju.',
    },
    checks: {
      title: 'Provere i istorija',
      text: 'Značka pokazuje gde nedostaje odgovor ili je veza pokvarena. „Istorija“ čuva ranije verzije igre.',
    },
    export: {
      title: 'Izvoz',
      text: 'Meni „Izvoz“ čuva igru u fajl. U njemu je i „Šalabahter za voditelja“ sa pitanjima i odgovorima za štampu.',
      textDesktop: 'Meni „Izvoz“ čuva igru u fajl ili je deli preko Wi-Fi mreže. U njemu je i „Šalabahter za voditelja“ za štampu.',
    },
  },
  stage: {
    players: {
      title: 'Igrači',
      text: 'Upišite imena i izaberite boje. Prekidač gore određuje da li se igra pojedinačno ili u timovima.',
    },
    phones: {
      title: 'Telefoni',
      text: 'Uz „Igraj sa telefonima“ igrači pritiskaju dugme na svojim telefonima preko Wi-Fi mreže. Bez njih onoga ko odgovara beleži voditelj.',
    },
    hostWindow: {
      title: 'Prozor voditelja',
      text: 'Otvara konzolu sa odgovorima i rezultatom u posebnom prozoru. Publika je ne vidi.',
    },
    start: {
      title: 'Početak igre',
      text: '„Počni igru“ pokreće prvu rundu, a zatim obilazak pokazuje scenu.',
    },
    chooser: {
      title: 'Ko bira',
      text: 'Oznaka „Bira pitanje“ stoji kod igrača čiji je red da kaže polje. Voditelj je menja na konzoli.',
    },
    hotkeys: {
      title: 'Prečice',
      text: 'Razmak vodi igru dalje, B otvara dugmad na telefonima, Ctrl/⌘+Z poništava poslednju radnju. „Preskoči rundu“ je ispod table.',
    },
  },
  host: {
    chooser: {
      title: 'Primer igre',
      text: 'Ovo je demo, ništa ne ide na scenu. Istaknuti igrač bira polje, klik na drugog prenosi izbor.',
    },
    question: {
      title: 'Pitanje i odgovor',
      text: 'Tačan odgovor vidite samo vi. „Prikaži odgovor na sceni“ ga otkriva publici.',
    },
    buzz: {
      title: 'Telefoni',
      text: 'Pokazuje ko je prvi pritisnuo. Dugmad se mogu ponovo otvoriti, i sa greškom.',
    },
    timer: {
      title: 'Tajmer',
      text: 'Pokreće vreme za odgovor, pauzira ga i vraća na početak.',
    },
    verdict: {
      title: 'Odluka',
      text: 'Označite ko je odgovorio tačno ili pogrešno. Ako niko nije odgovorio, pritisnite „Niko nije odgovorio“.',
    },
    scores: {
      title: 'Rezultat',
      text: 'Broj bira igrača (tasteri 1–9), „+“ i „−“ menjaju njegov rezultat. „Poništi“ vraća poslednju radnju.',
    },
    top: {
      title: 'Gornja traka',
      text: 'Tu su faza igre, spisak prečica i zvuk. Znak pitanja ponavlja ovaj obilazak.',
    },
  },
} satisfies typeof ru
