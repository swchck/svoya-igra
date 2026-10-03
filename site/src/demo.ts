import type { QuestionKind, Round } from '@/types'
import type { Locale } from '@/i18n'

type Row = [text: string, answer: string]
type Category = [name: string, rows: Row[]]

// one auction and one cat in the bag, so the demo shows both special cards
const KINDS: Record<string, QuestionKind> = { t0q3: 'auction', t1q4: 'cat-in-bag' }

const CONTENT: Record<Locale, Category[]> = {
  ru: [
    ['Столицы', [
      ['Столица Франции', 'Париж'],
      ['Столица Японии', 'Токио'],
      ['Столица Австралии. Не Сидней', 'Канберра'],
      ['Столица Канады', 'Оттава'],
      ['Столица Монголии', 'Улан-Батор'],
    ]],
    ['Космос', [
      ['Первый человек в космосе', 'Юрий Гагарин'],
      ['Ближайшая к Солнцу планета', 'Меркурий'],
      ['Самая большая планета Солнечной системы', 'Юпитер'],
      ['В каком году человек впервые ступил на Луну?', '1969'],
      ['Как назывался первый искусственный спутник Земли?', 'Спутник-1'],
    ]],
    ['Кино', [
      ['Мальчик-волшебник со шрамом в виде молнии', 'Гарри Поттер'],
      ['Кто снял «Титаник» 1997 года?', 'Джеймс Кэмерон'],
      ['Как зовут героя Сергея Бодрова в фильме «Брат»?', 'Данила Багров'],
      ['Кто сыграл Нео в «Матрице»?', 'Киану Ривз'],
      ['Режиссёр фильма «Иван Васильевич меняет профессию»', 'Леонид Гайдай'],
    ]],
    ['Музыка', [
      ['Сколько струн у классической гитары?', 'Шесть'],
      ['Сколько нот от «до» до «си»?', 'Семь'],
      ['Группа, записавшая «Yesterday»', 'The Beatles'],
      ['Автор балета «Лебединое озеро»', 'Пётр Чайковский'],
      ['Сколько симфоний написал Бетховен?', 'Девять'],
    ]],
  ],
  en: [
    ['Capitals', [
      ['The capital of France', 'Paris'],
      ['The capital of Japan', 'Tokyo'],
      ['The capital of Australia. Not Sydney', 'Canberra'],
      ['The capital of Canada', 'Ottawa'],
      ['The capital of Mongolia', 'Ulaanbaatar'],
    ]],
    ['Space', [
      ['The first person in space', 'Yuri Gagarin'],
      ['The planet closest to the Sun', 'Mercury'],
      ['The largest planet in the Solar System', 'Jupiter'],
      ['In what year did people first walk on the Moon?', '1969'],
      ['What was the first artificial satellite called?', 'Sputnik 1'],
    ]],
    ['Movies', [
      ['The boy wizard with a lightning-bolt scar', 'Harry Potter'],
      ['Who directed Titanic (1997)?', 'James Cameron'],
      ['Who directed Jaws (1975)?', 'Steven Spielberg'],
      ['Who played Neo in The Matrix?', 'Keanu Reeves'],
      ['Who played Forrest Gump?', 'Tom Hanks'],
    ]],
    ['Music', [
      ['How many strings does a classical guitar have?', 'Six'],
      ['How many notes are there from C to B on the white keys?', 'Seven'],
      ['The band that recorded “Yesterday”', 'The Beatles'],
      ['The composer of Swan Lake', 'Pyotr Tchaikovsky'],
      ['How many symphonies did Beethoven write?', 'Nine'],
    ]],
  ],
  sr: [
    ['Prestonice', [
      ['Glavni grad Francuske', 'Pariz'],
      ['Glavni grad Japana', 'Tokio'],
      ['Glavni grad Australije. Nije Sidnej', 'Kanbera'],
      ['Glavni grad Kanade', 'Otava'],
      ['Glavni grad Mongolije', 'Ulan Bator'],
    ]],
    ['Svemir', [
      ['Prvi čovek u svemiru', 'Jurij Gagarin'],
      ['Planeta najbliža Suncu', 'Merkur'],
      ['Najveća planeta Sunčevog sistema', 'Jupiter'],
      ['Koje godine je čovek prvi put kročio na Mesec?', '1969'],
      ['Kako se zvao prvi veštački satelit Zemlje?', 'Sputnjik 1'],
    ]],
    ['Film', [
      ['Dečak čarobnjak sa ožiljkom u obliku munje', 'Hari Poter'],
      ['Ko je režirao „Titanik“ iz 1997?', 'Džejms Kameron'],
      ['Ko je režirao „Ralje“ iz 1975?', 'Stiven Spilberg'],
      ['Ko je igrao Nea u „Matriksu“?', 'Kijanu Rivs'],
      ['Ko je igrao Foresta Gampa?', 'Tom Henks'],
    ]],
    ['Muzika', [
      ['Koliko žica ima klasična gitara?', 'Šest'],
      ['Koliko nota ima od „do“ do „si“?', 'Sedam'],
      ['Grupa koja je snimila „Yesterday“', 'The Beatles'],
      ['Autor baleta „Labudovo jezero“', 'Petar Čajkovski'],
      ['Koliko simfonija je napisao Betoven?', 'Devet'],
    ]],
  ],
}

/** Returns a small round for the board on the landing page, in the given language. */
export function demoRound(locale: Locale): Round {
  return {
    id: `demo-${locale}`,
    name: 'Demo',
    themes: CONTENT[locale].map(([name, rows], t) => ({
      id: `t${t}`,
      name,
      questions: rows.map(([text, answer], q) => ({
        id: `t${t}q${q}`,
        value: (q + 1) * 100,
        kind: KINDS[`t${t}q${q}`] ?? 'normal',
        text,
        answer,
      })),
    })),
  }
}
