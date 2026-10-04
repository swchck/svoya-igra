// The bundled sample game in every interface language; scripts/build-samples.mjs packs it.
// Every text is { ru, en, sr }; media entries name files in ./media or carry an external url.

const img = (file) => ({ file, kind: 'image' })
const audio = (file, segment = {}) => ({ file, kind: 'audio', ...segment })

const flagQuestion = { ru: 'Флаг какой страны?', en: 'Which country’s flag is this?', sr: 'Koja država ima ovu zastavu?' }
const composerQuestion = { ru: 'Кто написал эту мелодию?', en: 'Who composed this melody?', sr: 'Ko je komponovao ovu melodiju?' }

export const LOCALES = ['ru', 'en', 'sr']

export const sample = {
  title: { ru: 'Пример: всего понемногу', en: 'Sample: a bit of everything', sr: 'Primer: od svega po malo' },
  subtitle: {
    ru: 'Короткая игра, чтобы попробовать приложение',
    en: 'A short game to try the app with',
    sr: 'Kratka igra za isprobavanje aplikacije',
  },
  rounds: [
    {
      name: { ru: 'Раунд 1', en: 'Round 1', sr: 'Runda 1' },
      themes: [
        {
          name: { ru: 'Флаги', en: 'Flags', sr: 'Zastave' },
          questions: [
            { value: 100, text: flagQuestion, media: [img('flag-japan.webp')], answer: { ru: 'Япония', en: 'Japan', sr: 'Japan' } },
            { value: 200, text: flagQuestion, media: [img('flag-france.webp')], answer: { ru: 'Франция', en: 'France', sr: 'Francuska' } },
            { value: 300, text: flagQuestion, media: [img('flag-italy.webp')], answer: { ru: 'Италия', en: 'Italy', sr: 'Italija' } },
            { value: 400, text: flagQuestion, media: [img('flag-germany.webp')], answer: { ru: 'Германия', en: 'Germany', sr: 'Nemačka' } },
            {
              value: 500,
              text: {
                ru: 'Флаг какой страны? Подсказка: это один из всего двух квадратных государственных флагов в мире.',
                en: 'Which country’s flag is this? Hint: it is one of only two square national flags in the world.',
                sr: 'Koja država ima ovu zastavu? Pomoć: to je jedna od samo dve kvadratne državne zastave na svetu.',
              },
              media: [img('flag-switzerland.webp')],
              answer: { ru: 'Швейцария', en: 'Switzerland', sr: 'Švajcarska' },
            },
          ],
        },
        {
          name: { ru: 'Фигуры', en: 'Shapes', sr: 'Oblici' },
          questions: [
            {
              value: 100,
              text: { ru: 'Как называется эта фигура?', en: 'What is this shape called?', sr: 'Kako se zove ovaj oblik?' },
              media: [img('hexagon.webp')],
              answer: { ru: 'Шестиугольник', en: 'A hexagon', sr: 'Šestougao' },
            },
            {
              value: 200,
              text: {
                ru: 'Сколько сторон у этих трёх фигур вместе?',
                en: 'How many sides do these three shapes have altogether?',
                sr: 'Koliko ukupno stranica imaju ova tri oblika?',
              },
              media: [img('shape-triangle.webp'), img('shape-square.webp'), img('shape-pentagon.webp')],
              answer: { ru: '12 (3 + 4 + 5)', en: '12 (3 + 4 + 5)', sr: '12 (3 + 4 + 5)' },
            },
            {
              value: 300,
              text: {
                ru: 'У какой из этих фигур больше всего осей симметрии?\n\n- квадрат\n- равносторонний треугольник\n- круг\n- правильный шестиугольник',
                en: 'Which of these shapes has the most lines of symmetry?\n\n- a square\n- an equilateral triangle\n- a circle\n- a regular hexagon',
                sr: 'Koji od ovih oblika ima najviše osa simetrije?\n\n- kvadrat\n- jednakostranični trougao\n- krug\n- pravilni šestougao',
              },
              answer: {
                ru: 'Круг: у него их бесконечно много',
                en: 'The circle: it has infinitely many',
                sr: 'Krug: ima ih beskonačno mnogo',
              },
            },
            {
              value: 400,
              text: {
                ru: 'Чему равна сумма внутренних углов шестиугольника?',
                en: 'What do the interior angles of a hexagon add up to?',
                sr: 'Koliki je zbir unutrašnjih uglova šestougla?',
              },
              answer: { ru: '720°', en: '720°', sr: '720°' },
            },
            {
              value: 500,
              text: {
                ru: 'Какую знаменитую теорему иллюстрирует этот рисунок?',
                en: 'Which famous theorem does this picture illustrate?',
                sr: 'Koju čuvenu teoremu ilustruje ova slika?',
              },
              media: [img('pythagoras.webp')],
              answer: { ru: 'Теорема Пифагора', en: 'The Pythagorean theorem', sr: 'Pitagorina teorema' },
            },
          ],
        },
        {
          name: { ru: 'Природа', en: 'Nature', sr: 'Priroda' },
          questions: [
            {
              value: 100,
              text: {
                ru: 'Какой газ растения поглощают из воздуха при фотосинтезе?',
                en: 'Which gas do plants take in from the air for photosynthesis?',
                sr: 'Koji gas biljke uzimaju iz vazduha za fotosintezu?',
              },
              answer: { ru: 'Углекислый газ (CO₂)', en: 'Carbon dioxide (CO₂)', sr: 'Ugljen-dioksid (CO₂)' },
            },
            {
              value: 200,
              text: { ru: 'Сколько **сердец** у осьминога?', en: 'How many **hearts** does an octopus have?', sr: 'Koliko **srca** ima hobotnica?' },
              answer: { ru: 'Три', en: 'Three', sr: 'Tri' },
            },
            {
              value: 300,
              text: { ru: 'Какой океан самый большой по площади?', en: 'Which ocean is the largest by area?', sr: 'Koji je okean najveći po površini?' },
              answer: { ru: 'Тихий', en: 'The Pacific', sr: 'Tihi okean' },
            },
            {
              value: 400,
              text: { ru: 'Какое сухопутное животное самое быстрое?', en: 'What is the fastest land animal?', sr: 'Koja je najbrža kopnena životinja?' },
              answer: { ru: 'Гепард', en: 'The cheetah', sr: 'Gepard' },
            },
            {
              value: 500,
              text: {
                ru: 'Какое животное — самое крупное из ныне живущих на Земле?',
                en: 'What is the largest animal living on Earth today?',
                sr: 'Koja je najveća životinja koja danas živi na Zemlji?',
              },
              answer: { ru: 'Синий кит', en: 'The blue whale', sr: 'Plavi kit' },
            },
          ],
        },
        {
          name: { ru: 'Угадай мелодию', en: 'Guess the melody', sr: 'Pogodi melodiju' },
          questions: [
            {
              value: 100,
              text: composerQuestion,
              media: [audio('ode-to-joy.mp3')],
              answer: {
                ru: 'Людвиг ван Бетховен, «Ода к радости»',
                en: 'Ludwig van Beethoven, “Ode to Joy”',
                sr: 'Ludvig van Betoven, „Oda radosti“',
              },
            },
            {
              value: 200,
              text: composerQuestion,
              media: [audio('eine-kleine-nachtmusik.mp3')],
              answer: {
                ru: 'Вольфганг Амадей Моцарт, «Маленькая ночная серенада»',
                en: 'Wolfgang Amadeus Mozart, Eine kleine Nachtmusik',
                sr: 'Volfgang Amadeus Mocart, „Mala noćna muzika“',
              },
            },
            {
              value: 300,
              text: composerQuestion,
              // the middle of three ever faster passes; bounds come from generate-media.mjs output
              media: [audio('mountain-king.mp3', { start: 10, end: 18 })],
              answer: {
                ru: 'Эдвард Григ, «В пещере горного короля»',
                en: 'Edvard Grieg, “In the Hall of the Mountain King”',
                sr: 'Edvard Grig, „U dvorani planinskog kralja“',
              },
            },
            {
              value: 400,
              text: {
                ru: 'Эту пьесу написал **Бетховен**. Как она называется?',
                en: 'This piece was written by **Beethoven**. What is it called?',
                sr: 'Ovu kompoziciju napisao je **Betoven**. Kako se zove?',
              },
              media: [audio('fur-elise.mp3')],
              answer: { ru: '«К Элизе»', en: 'Für Elise', sr: '„Za Elizu“' },
            },
            {
              value: 500,
              text: { ru: 'Кто исполняет эту песню?', en: 'Who performs this song?', sr: 'Ko izvodi ovu pesmu?' },
              media: [{ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', kind: 'youtube', mode: 'audio', start: 43, end: 58 }],
              answer: { ru: 'Рик Эстли', en: 'Rick Astley', sr: 'Rik Astli' },
            },
          ],
        },
        {
          name: { ru: 'Числа', en: 'Numbers', sr: 'Brojevi' },
          questions: [
            {
              value: 100,
              text: { ru: 'Сколько дней в високосном году?', en: 'How many days are there in a leap year?', sr: 'Koliko dana ima prestupna godina?' },
              answer: { ru: '366', en: '366', sr: '366' },
            },
            {
              value: 200,
              text: { ru: 'Сколько минут в сутках?', en: 'How many minutes are there in 24 hours?', sr: 'Koliko minuta ima u 24 sata?' },
              answer: { ru: '1440', en: '1,440', sr: '1440' },
            },
            {
              value: 300,
              text: { ru: 'Назовите единственное чётное простое число.', en: 'Name the only even prime number.', sr: 'Navedite jedini paran prost broj.' },
              answer: { ru: '2', en: '2', sr: '2' },
            },
            {
              value: 400,
              text: {
                ru: 'Сколько нулей в записи числа «миллиард»?',
                en: 'How many zeros does one billion (a thousand million) have?',
                sr: 'Koliko nula ima broj milijarda?',
              },
              answer: { ru: '9', en: '9', sr: '9' },
            },
            {
              value: 500,
              text: {
                ru: 'Какой год записан римскими цифрами: **MCMXC**?',
                en: 'Which year is written in Roman numerals as **MCMXC**?',
                sr: 'Koja je godina napisana rimskim brojevima kao **MCMXC**?',
              },
              answer: { ru: '1990', en: '1990', sr: '1990.' },
            },
          ],
        },
      ],
    },
    {
      name: { ru: 'Раунд 2', en: 'Round 2', sr: 'Runda 2' },
      themes: [
        {
          name: { ru: 'Космос', en: 'Space', sr: 'Svemir' },
          questions: [
            {
              value: 200,
              text: {
                ru: 'Какая планета — самая большая в Солнечной системе?',
                en: 'Which is the largest planet in the Solar System?',
                sr: 'Koja je najveća planeta Sunčevog sistema?',
              },
              answer: { ru: 'Юпитер', en: 'Jupiter', sr: 'Jupiter' },
            },
            {
              value: 400,
              text: {
                ru: 'На схеме Солнечной системы выделена одна планета. Какая?',
                en: 'One planet is marked on this diagram of the Solar System. Which one?',
                sr: 'Na ovoj šemi Sunčevog sistema označena je jedna planeta. Koja?',
              },
              media: [img('solar-system.webp')],
              answer: { ru: 'Марс', en: 'Mars', sr: 'Mars' },
            },
            {
              value: 600,
              text: {
                ru: 'Примерно за сколько минут свет Солнца долетает до Земли?',
                en: 'Roughly how many minutes does sunlight take to reach Earth?',
                sr: 'Otprilike za koliko minuta sunčeva svetlost stigne do Zemlje?',
              },
              answer: { ru: 'Около 8 минут', en: 'About 8 minutes', sr: 'Oko 8 minuta' },
            },
            {
              value: 800,
              text: {
                ru: 'Какая планета вращается «лёжа на боку»: её ось наклонена почти на 98°?',
                en: 'Which planet spins “lying on its side”, with its axis tilted by almost 98°?',
                sr: 'Koja planeta se okreće „ležeći na boku“, sa osom nagnutom za skoro 98°?',
              },
              answer: { ru: 'Уран', en: 'Uranus', sr: 'Uran' },
              answerMedia: [img('uranus.webp')],
            },
            {
              value: 1000,
              text: {
                ru: 'Кто в 1961 году стал первым человеком в космосе?',
                en: 'Who became the first person in space, in 1961?',
                sr: 'Ko je 1961. godine postao prvi čovek u svemiru?',
              },
              answer: { ru: 'Юрий Гагарин', en: 'Yuri Gagarin', sr: 'Jurij Gagarin' },
            },
          ],
        },
        {
          name: { ru: 'Наука', en: 'Science', sr: 'Nauka' },
          questions: [
            {
              value: 200,
              text: {
                ru: 'Кто сформулировал закон всемирного тяготения?',
                en: 'Who formulated the law of universal gravitation?',
                sr: 'Ko je formulisao zakon univerzalne gravitacije?',
              },
              answer: { ru: 'Исаак Ньютон', en: 'Isaac Newton', sr: 'Isak Njutn' },
            },
            {
              value: 400,
              text: {
                ru: 'Кто в 1869 году предложил периодическую систему химических элементов?',
                en: 'Who put forward the periodic table of the chemical elements in 1869?',
                sr: 'Ko je 1869. godine predložio periodni sistem hemijskih elemenata?',
              },
              answer: { ru: 'Дмитрий Менделеев', en: 'Dmitri Mendeleev', sr: 'Dmitrij Mendeljejev' },
            },
            {
              value: 600,
              text: {
                ru: 'Какой металл при комнатной температуре жидкий?',
                en: 'Which metal is liquid at room temperature?',
                sr: 'Koji metal je tečan na sobnoj temperaturi?',
              },
              answer: { ru: 'Ртуть', en: 'Mercury', sr: 'Živa' },
            },
            {
              value: 800,
              kind: 'cat-in-bag',
              catValue: 500,
              text: {
                ru: 'Кот в мешке! Тема — анатомия. Какая кость самая длинная в теле человека?',
                en: 'Cat in the bag! The topic is anatomy. What is the longest bone in the human body?',
                sr: 'Mačka u džaku! Tema je anatomija. Koja je najduža kost u ljudskom telu?',
              },
              answer: { ru: 'Бедренная кость', en: 'The femur (thigh bone)', sr: 'Butna kost' },
            },
            {
              value: 1000,
              text: {
                ru: 'Чему примерно равна скорость света в вакууме в километрах в секунду?',
                en: 'Roughly what is the speed of light in a vacuum, in kilometres per second?',
                sr: 'Kolika je otprilike brzina svetlosti u vakuumu, u kilometrima u sekundi?',
              },
              answer: { ru: 'Около 300 000 км/с', en: 'About 300,000 km/s', sr: 'Oko 300.000 km/s' },
            },
          ],
        },
        {
          name: { ru: 'География', en: 'Geography', sr: 'Geografija' },
          questions: [
            {
              value: 200,
              text: { ru: 'Какой город — столица Австралии?', en: 'What is the capital of Australia?', sr: 'Koji grad je glavni grad Australije?' },
              answer: { ru: 'Канберра', en: 'Canberra', sr: 'Kanbera' },
            },
            {
              value: 400,
              text: {
                ru: 'Как называется самый глубокий океанский жёлоб на Земле?',
                en: 'What is the deepest ocean trench on Earth called?',
                sr: 'Kako se zove najdublji okeanski rov na Zemlji?',
              },
              answer: { ru: 'Марианский жёлоб (Марианская впадина)', en: 'The Mariana Trench', sr: 'Marijanski rov' },
            },
            {
              value: 600,
              text: { ru: 'Какой пролив отделяет Европу от Африки?', en: 'Which strait separates Europe from Africa?', sr: 'Koji moreuz razdvaja Evropu od Afrike?' },
              answer: { ru: 'Гибралтарский пролив', en: 'The Strait of Gibraltar', sr: 'Gibraltarski moreuz' },
            },
            {
              value: 800,
              kind: 'auction',
              text: {
                ru: 'В какой стране находится древний город инков Мачу-Пикчу?',
                en: 'In which country is the ancient Inca city of Machu Picchu?',
                sr: 'U kojoj državi se nalazi drevni grad Inka Maču Pikču?',
              },
              answer: { ru: 'Перу', en: 'Peru', sr: 'Peru' },
            },
            {
              value: 1000,
              text: {
                ru: 'Это самый большой по площади замкнутый водоём на Земле. Его называют морем, хотя на самом деле это озеро.\n\nВода в нём солоноватая, а на его берегах лежат пять государств.',
                en: 'It is the largest enclosed body of water on Earth by area. It is called a sea, although it is really a lake.\n\nIts water is brackish, and five countries lie on its shores.',
                sr: 'To je najveća zatvorena vodena površina na Zemlji. Zove se more, iako je zapravo jezero.\n\nVoda u njemu je bočata, a na njegovim obalama leži pet država.',
              },
              answer: { ru: 'Каспийское море', en: 'The Caspian Sea', sr: 'Kaspijsko more' },
            },
          ],
        },
        {
          name: { ru: 'Спорт и игры', en: 'Sports and games', sr: 'Sport i igre' },
          questions: [
            {
              value: 200,
              text: {
                ru: 'Сколько клеток на шахматной доске?',
                en: 'How many squares does a chessboard have?',
                sr: 'Koliko polja ima šahovska tabla?',
              },
              media: [img('chessboard.webp')],
              answer: { ru: '64 (8 × 8)', en: '64 (8 × 8)', sr: '64 (8 × 8)' },
            },
            {
              value: 400,
              text: {
                ru: 'Сколько игроков одной команды одновременно находятся на поле в футболе?',
                en: 'How many players from one team are on the pitch at once in football (soccer)?',
                sr: 'Koliko igrača jedne ekipe je istovremeno na terenu u fudbalu?',
              },
              answer: { ru: '11, вместе с вратарём', en: '11, including the goalkeeper', sr: '11, zajedno sa golmanom' },
            },
            {
              value: 600,
              text: {
                ru: 'Какая шахматная фигура ходит буквой «Г»?',
                en: 'Which chess piece moves in an L shape?',
                sr: 'Koja šahovska figura se kreće u obliku slova L?',
              },
              answer: { ru: 'Конь', en: 'The knight', sr: 'Skakač (konj)' },
            },
            {
              value: 800,
              text: {
                ru: 'Сколько всего точек на гранях обычного игрального кубика?',
                en: 'How many pips are there in total on a standard six-sided die?',
                sr: 'Koliko ukupno tačkica ima na stranama obične kockice za igru?',
              },
              answer: { ru: '21 (1 + 2 + 3 + 4 + 5 + 6)', en: '21 (1 + 2 + 3 + 4 + 5 + 6)', sr: '21 (1 + 2 + 3 + 4 + 5 + 6)' },
            },
            {
              value: 1000,
              text: {
                ru: 'Как в шахматах называется положение, когда игроку не объявлен шах, но сделать ход он не может?',
                en: 'In chess, what is it called when a player is not in check but has no legal move?',
                sr: 'Kako se u šahu zove pozicija u kojoj igrač nije u šahu, ali nema nijedan dozvoljen potez?',
              },
              answer: { ru: 'Пат, это ничья', en: 'Stalemate, a draw', sr: 'Pat, to je remi' },
            },
          ],
        },
      ],
    },
  ],
  finalRound: {
    theme: { ru: 'Чудеса света', en: 'Wonders of the world', sr: 'Svetska čuda' },
    text: {
      ru: 'Это единственное из семи чудес света Древнего мира, сохранившееся до наших дней.',
      en: 'It is the only one of the Seven Wonders of the Ancient World still standing today.',
      sr: 'To je jedino od sedam svetskih čuda antičkog sveta koje je sačuvano do danas.',
    },
    answer: {
      ru: 'Великая пирамида в Гизе (пирамида Хеопса)',
      en: 'The Great Pyramid of Giza',
      sr: 'Velika piramida u Gizi (Keopsova piramida)',
    },
    answerMedia: [img('pyramids.webp')],
  },
}
