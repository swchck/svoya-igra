import type ru from './ru'

export default {
  meta: {
    title: 'Svoja igra: napravite i vodite svoj kviz',
    description:
      'Besplatna aplikacija za macOS, Windows i Linux. Napravite kviz sa slikama, muzikom i snimcima sa YouTube-a i vodite ga na velikom ekranu.',
  },
  brand: 'Svoja igra',
  nav: {
    features: 'Mogućnosti',
    how: 'Kako se igra',
    download: 'Preuzimanje',
    faq: 'Pitanja',
    online: 'Onlajn',
  },
  hero: {
    lede: 'Napravite svoj kviz sa slikama, muzikom i snimcima sa YouTube-a i vodite ga na velikom ekranu.',
    openInBrowser: 'Otvori u pregledaču',
    boardCaption: 'Tabla je prava: kliknite na bilo koju vrednost.',
  },
  board: {
    revealAnswer: 'Prikaži odgovor',
    backToBoard: 'Nazad na tablu',
    played: 'Tabla je odigrana',
    again: 'Ponovo',
    auction: 'Aukcija',
    cat: 'Mačka u džaku',
  },
  download: {
    button: 'Preuzmi',
    buttonFor: 'Preuzmi za {platform}',
    versionLine: 'Verzija {version} · {date} · besplatno',
    notPublished: 'Prva verzija još nije objavljena',
    freeLine: 'Besplatno · macOS, Windows, Linux',
    title: 'Preuzimanje',
    released: 'Verzija {version}, objavljena {date}.',
    notPublishedYet: 'Prva verzija još nije objavljena.',
    updates: 'Kada izađe nova verzija, aplikacija će ponuditi ažuriranje.',
    notBuilt: 'još nije napravljeno',
    onlineTitle: 'Onlajn verzija',
    onlineText: 'Ništa ne treba instalirati. Igre se čuvaju u ovom pregledaču.',
    allVersions: 'Sve verzije i spiskovi izmena',
    onGithub: 'na GitHub-u',
    hints: {
      macArm: 'Mac sa M1 i novijim',
      macX64: 'Mac sa Intel procesorom',
      windows: 'Windows 10 i 11, 64-bitni',
      appimage: 'bez instalacije',
      deb: 'Ubuntu, Debian, Mint',
      rpm: 'Fedora, openSUSE',
    },
  },
  features: {
    title: 'Šta aplikacija ume',
    editor: {
      title: 'Uređivač u obliku table',
      text: 'Igra se pravi na istoj tabli koju će videti igrači. Kliknite na polje i otvara se prozor pitanja: levo pitanje, desno odgovor, svako sa formatiranim tekstom, slikama, zvukom i videom. Runde, teme i pitanja se prevlače mišem, a izmene se odmah čuvaju i ranije verzije igre mogu da se vrate.',
      alt: 'Uređivač sa tablom runde i otvorenim pitanjem',
    },
    board: {
      title: 'Scena za publiku',
      text: 'Tabla se širi preko celog ekrana ili projektora. Izabrano polje se otvara u pitanje, a rezultati igrača na dnu se menjaju čim voditelj prizna odgovor. Igra se pojedinačno ili u timovima, svako sa svojom bojom i znakom. Tajmer za odgovor je po želji, a zvučni efekti prate izbor pitanja, odgovore i poene.',
      alt: 'Tabla runde sa rezultatima igrača',
    },
    question: {
      title: 'Slike, zvuk i YouTube',
      text: 'Uz pitanje i uz odgovor možete dodati fajlove sa računara ili linkove. Snimak sa YouTube-a ide kao video ili samo kao zvuk. Za zvuk i video se zadaje isečak, na primer od 0:30 do 1:15. Dugačko pitanje se smanjuje da stane na ekran.',
      alt: 'Pitanje sa slikama na ekranu za publiku',
    },
    host: {
      title: 'Pult voditelja',
      text: 'U drugom prozoru voditelj vidi tačan odgovor, bira pitanja, pušta zvuk i video i priznaje odgovore. Dok je pult otvoren, na sceni nema nijednog dugmeta. Greškom dodeljeni poeni se vraćaju jednim klikom, a česte radnje imaju prečice na tastaturi.',
      alt: 'Prozor voditelja sa pitanjem i tačnim odgovorom',
    },
  },
  facts: {
    special: {
      title: 'Aukcija i mačka u džaku',
      text: 'Na aukciji igrač može da uloži ceo svoj rezultat, a mačku u džaku voditelj daje drugom igraču. U finalu svako stavlja ulog.',
    },
    saved: {
      title: 'Partija se ne gubi',
      text: 'Rezultat se čuva posle svakog poteza. Ako zatvorite prozor usred igre, sledeći put nastavljate odatle.',
    },
    offline: {
      title: 'Bez interneta i naloga',
      text: 'Igre ostaju kod vas. Mreža je potrebna samo za YouTube i medije sa linkova.',
    },
    file: {
      title: 'Igra u jednom fajlu',
      text: 'Izvoz u .gamezip pakuje pitanja zajedno sa medijima. Dvoklik na fajl otvara igru u aplikaciji.',
    },
  },
  how: {
    title: 'Kako se igra',
    steps: {
      build: { title: 'Napravite igru', text: 'Napravite novu ili otvorite primer. Popunite teme, pitanja i odgovore.' },
      show: {
        title: 'Prikažite je na ekranu',
        text: 'Kliknite „Igraj“ i raširite scenu. Dugme „Prozor voditelja“ otvara pult za drugi monitor.',
      },
      host: {
        title: 'Vodite igru',
        text: 'Birajte pitanja, otkrivajte odgovore i označite ko je odgovorio tačno. Posle finala na ekranu se pojavljuju rezultati.',
      },
    },
  },
  faq: {
    title: 'Pitanja',
    screen: {
      q: 'Kako da prikažem igru na velikom ekranu?',
      a: 'Kliknite „Igraj“, prevucite prozor na televizor ili projektor i raširite ga preko celog ekrana. Dugme „Prozor voditelja“ otvara pult sa tačnim odgovorima, dugmadima za zvuk i video i rezultatom. Pult držite na laptopu, publika ga ne vidi.',
    },
    internet: {
      q: 'Da li mi treba internet?',
      a: 'Ne. Slike, zvuk i video sa računara čuvaju se u samoj igri. Mreža je potrebna samo za snimke sa YouTube-a i slike sa linkova.',
    },
    siq: {
      q: 'Mogu li da igram gotov SIGame paket?',
      a: 'Da. Kliknite „Uvoz“ na početnom ekranu i izaberite fajl .siq. Prenose se runde, teme, pitanja, slike i zvuk. Od finala ostaje prva tema, jer je naše finale jedno pitanje.',
    },
    share: {
      q: 'Kako da pošaljem igru drugom voditelju?',
      a: 'U uređivaču kliknite „Izvoz“ i sačuvajte igru kao fajl .gamezip. U njemu su sva pitanja zajedno sa slikama i zvukom. Dvoklik na fajl otvara igru u aplikaciji.',
    },
    languages: {
      q: 'Na kojim jezicima radi aplikacija?',
      a: 'Na ruskom, engleskom i srpskom. Jezik se menja u meniju na početnom ekranu, a sajt i onlajn verzija pamte izbor.',
    },
    sounds: {
      q: 'Mogu li da isključim zvučne efekte?',
      a: 'Da. Dugme sa zvučnikom postoji na ekranu igre i u pultu voditelja. Ono ne utiče na zvuk u vašim pitanjima, na primer na muziku u rundi „Pogodi melodiju“.',
    },
    online: {
      q: 'Po čemu se onlajn verzija razlikuje od aplikacije?',
      a: 'To je ista aplikacija, samo u pregledaču. Igre se čuvaju u ovom pregledaču, pa nestaju ako obrišete podatke sajta: važne igre sačuvajte u .gamezip. Pult voditelja se otvara u posebnom prozoru pregledača. Otvaranje .gamezip fajla dvoklikom radi samo u instaliranoj aplikaciji. Onlajn verziju možete da instalirate na računar ili telefon kao aplikaciju i tada se otvara i bez interneta.',
    },
    mac: {
      q: 'macOS kaže da ne može da proveri programera',
      a: 'Aplikacija nema Apple potpis, pa macOS traži dozvolu pri prvom pokretanju. Otvorite System Settings, odeljak Privacy & Security, i kliknite Open Anyway. Ako macOS kaže da je aplikacija oštećena, pokrenite u Terminalu: {command}',
    },
    windows: {
      q: 'Windows prikazuje SmartScreen upozorenje',
      a: 'Instalater nema plaćeni potpis, pa ga Windows ne prepoznaje. Kliknite More info, zatim Run anyway.',
    },
    appimage: {
      q: 'Kako da pokrenem AppImage na Linuxu?',
      a: 'Učinite fajl izvršnim komandom {command} i pokrenite ga. Ništa ne treba instalirati.',
    },
    storage: {
      q: 'Gde se čuvaju moje igre?',
      a: 'Instalirana aplikacija čuva igre na vašem računaru, a onlajn verzija u pregledaču. Nema naloga ni oblaka, pa igre ne napuštaju uređaj.',
    },
    phones: {
      q: 'Mogu li igrači da odgovaraju telefonima?',
      a: 'Da, u verziji za računar. Voditelj pokaže QR kod, igrači ga otvore u istoj Wi‑Fi mreži i telefon postaje dugme: ko prvi pritisne, odgovara. Telefonom se bira i sledeće pitanje i stavlja ulog u finalu. Na telefon ne treba ništa instalirati.',
    },
    rules: {
      q: 'Mogu li da promenim pravila?',
      a: 'Da, u podešavanjima. Možete ukinuti kaznu za pogrešan odgovor, odrediti ko prvi bira pitanje i kada se otvara dugmad na telefonima: odmah, na znak voditelja ili kad krene tajmer.',
    },
    price: {
      q: 'Koliko košta?',
      a: 'Ništa. Aplikacija je besplatna, a izvorni kod je otvoren na GitHub-u.',
    },
  },
  footer: {
    online: 'Onlajn verzija',
    source: 'Izvorni kod na GitHub-u',
  },
} satisfies typeof ru
