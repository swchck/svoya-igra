import { describe, expect, it } from 'vitest'
import { strToU8, zipSync } from 'fflate'
import { escapeMarkdown, importSiq } from './siq'

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])
const MP3 = new Uint8Array([0x49, 0x44, 0x33, 4, 5])
const MP4 = new Uint8Array([0, 0, 0, 0x18, 6, 7])

function siq(contentXml: string, files: Record<string, Uint8Array> = {}): Blob {
  const zipped = zipSync({ 'content.xml': strToU8(contentXml), ...files })
  return new Blob([zipped.slice().buffer])
}

function fakeStore() {
  const blobs: Blob[] = []
  return {
    blobs,
    store: async (blob: Blob) => {
      blobs.push(blob)
      return `media://m${blobs.length}`
    },
  }
}

const V4 = `<?xml version="1.0" encoding="utf-8"?>
<package name="Пакет v4" version="4" xmlns="http://ur-quan1986.narod.ru/siq_5.xsd">
  <info><authors><author>Иван</author><author>Пётр</author></authors></info>
  <rounds>
    <round name="Первый">
      <themes>
        <theme name="Кино">
          <questions>
            <question price="100">
              <scenario>
                <atom>Что &lt;b-like&gt; *важно* 1. тест?</atom>
                <atom type="image">@%D0%BA%D0%B0%D1%80%D1%82%D0%B8%D0%BD%D0%BA%D0%B0.png</atom>
                <atom type="marker"/>
                <atom type="voice">@ответ.mp3</atom>
              </scenario>
              <right><answer>Первый</answer><answer>Второй</answer></right>
            </question>
            <question price="200">
              <type name="auction"/>
              <scenario><atom>Аукцион</atom></scenario>
              <right><answer>А</answer></right>
            </question>
            <question price="300">
              <type name="sponsored"/>
              <scenario><atom>Спонсор</atom></scenario>
              <right><answer>Б</answer></right>
            </question>
          </questions>
        </theme>
        <theme name="Музыка">
          <questions>
            <question price="100">
              <type name="bagcat"><param name="theme">Животные</param><param name="cost">250</param></type>
              <scenario>
                <atom type="video">@clip.mp4</atom>
                <atom type="video">@https://example.com/a.mp4</atom>
                <atom type="image">@missing.png</atom>
              </scenario>
              <right><answer>Кот</answer></right>
            </question>
          </questions>
        </theme>
      </themes>
    </round>
    <round name="Финал" type="final">
      <themes>
        <theme name="Первая"><questions><question price="0"><scenario><atom>Финальный</atom></scenario><right><answer>Да</answer></right></question></questions></theme>
        <theme name="Вторая"><questions><question price="0"><scenario><atom>Лишний</atom></scenario><right><answer>Нет</answer></right></question></questions></theme>
      </themes>
    </round>
  </rounds>
</package>`

const V5 = `<package name="Пакет v5" version="5" xmlns="https://github.com/VladimirKhil/SI/blob/master/assets/siq_5.xsd">
  <rounds>
    <round name="Раунд" type="standart">
      <themes>
        <theme name="Тема">
          <questions>
            <question price="500">
              <params>
                <param name="question" type="content">
                  <item type="text">Вопрос</item>
                  <item type="image" isRef="True">карт инка.png</item>
                  <item type="audio" isRef="True">звук.mp3</item>
                </param>
                <param name="answer" type="content">
                  <item type="image" isRef="True">карт инка.png</item>
                </param>
              </params>
              <right><answer>Ответ</answer></right>
            </question>
            <question price="100" type="stake"><params><param name="question" type="content"><item>Ставка</item></param></params><right><answer>х</answer></right></question>
            <question price="200" type="secret">
              <params>
                <param name="theme">Космос</param>
                <param name="price" type="numberSet"><numberSet minimum="300" maximum="500" step="100"/></param>
                <param name="question" type="content"><item type="text">Секрет</item></param>
              </params>
              <right><answer>у</answer></right>
            </question>
            <question price="400" type="secretNoQuestion"><params><param name="price" type="numberSet"><numberSet minimum="150" maximum="150" step="1"/></param></params><right><answer>-</answer></right></question>
          </questions>
        </theme>
      </themes>
    </round>
    <round name="Финал" type="final">
      <themes><theme name="Одна"><questions><question price="0"><params><param name="question" type="content"><item>Ф</item></param></params><right><answer>О</answer></right></question></questions></theme></themes>
    </round>
  </rounds>
</package>`

describe('importSiq v4', () => {
  const files = {
    'Images/%D0%BA%D0%B0%D1%80%D1%82%D0%B8%D0%BD%D0%BA%D0%B0.png': PNG,
    'Audio/%D0%BE%D1%82%D0%B2%D0%B5%D1%82.mp3': MP3,
    'Video/clip.mp4': MP4,
  }

  it('maps package info, rounds, themes and prices', async () => {
    const { game } = await importSiq(siq(V4, files), '', fakeStore().store)
    expect(game.title).toBe('Пакет v4')
    expect(game.subtitle).toBe('Иван, Пётр')
    expect(game.rounds).toHaveLength(1)
    expect(game.rounds[0].name).toBe('Первый')
    expect(game.rounds[0].themes.map((th) => th.name)).toEqual(['Кино', 'Музыка'])
    expect(game.rounds[0].themes[0].questions.map((q) => q.value)).toEqual([100, 200, 300])
  })

  it('escapes markdown, joins answers and splits question from answer at the marker', async () => {
    const { game } = await importSiq(siq(V4, files), '', fakeStore().store)
    const q = game.rounds[0].themes[0].questions[0]
    expect(q.text).toBe('Что \\<b-like\\> \\*важно\\* 1. тест?')
    expect(q.answer).toBe('Первый / Второй')
    expect(q.media).toMatchObject([{ kind: 'image', url: 'media://m1' }])
    expect(q.answerMedia).toMatchObject([{ kind: 'audio', url: 'media://m2' }])
  })

  it('stores decoded Cyrillic files with their MIME type', async () => {
    const store = fakeStore()
    await importSiq(siq(V4, files), '', store.store)
    expect(store.blobs.map((b) => b.type)).toEqual(['image/png', 'audio/mpeg', 'video/mp4'])
    expect(new Uint8Array(await store.blobs[0].arrayBuffer())).toEqual(PNG)
  })

  it('maps auction, sponsored and cat-in-bag with cost and theme', async () => {
    const { game } = await importSiq(siq(V4, files), '', fakeStore().store)
    const [, auction, sponsored] = game.rounds[0].themes[0].questions
    expect(auction.kind).toBe('auction')
    expect(sponsored.kind).toBe('normal')
    const cat = game.rounds[0].themes[1].questions[0]
    expect(cat).toMatchObject({ kind: 'cat-in-bag', catValue: 250, text: '**Тема: Животные**' })
  })

  it('keeps external links, drops missing files', async () => {
    const { game } = await importSiq(siq(V4, files), '', fakeStore().store)
    const media = game.rounds[0].themes[1].questions[0].media
    expect(media).toMatchObject([
      { kind: 'video', url: 'media://m3' },
      { kind: 'video', url: 'https://example.com/a.mp4' },
    ])
  })

  it('takes the first final theme and counts the rest', async () => {
    const { game, droppedFinalThemes } = await importSiq(siq(V4, files), '', fakeStore().store)
    expect(game.finalRound).toMatchObject({ theme: 'Первая', text: 'Финальный', answer: 'Да' })
    expect(droppedFinalThemes).toBe(1)
  })
})

describe('importSiq v5', () => {
  const files = { 'Images/карт инка.png': PNG, 'Audio/%D0%B7%D0%B2%D1%83%D0%BA.mp3': MP3 }

  it('reads content parameters, matching plain and encoded file names', async () => {
    const store = fakeStore()
    const { game, droppedFinalThemes } = await importSiq(siq(V5, files), '', store.store)
    const q = game.rounds[0].themes[0].questions[0]
    expect(q).toMatchObject({ value: 500, text: 'Вопрос', answer: 'Ответ' })
    expect(q.media?.map((m) => m.kind)).toEqual(['image', 'audio'])
    expect(q.answerMedia).toMatchObject([{ kind: 'image', url: 'media://m1' }])
    expect(store.blobs).toHaveLength(2)
    expect(droppedFinalThemes).toBe(0)
    expect(game.finalRound).toMatchObject({ theme: 'Одна', text: 'Ф', answer: 'О' })
  })

  it('maps stake and secret types, using the lowest price of a number set', async () => {
    const { game } = await importSiq(siq(V5, files), '', fakeStore().store)
    const [, stake, secret, noQuestion] = game.rounds[0].themes[0].questions
    expect(stake.kind).toBe('auction')
    expect(secret).toMatchObject({ kind: 'cat-in-bag', catValue: 300, text: '**Тема: Космос**\n\nСекрет' })
    expect(noQuestion).toMatchObject({ kind: 'cat-in-bag', catValue: 150, text: '' })
  })
})

describe('importSiq errors and fallbacks', () => {
  it('rejects a file that is not a zip', async () => {
    await expect(importSiq(new Blob(['nope']))).rejects.toThrow('.siq')
  })

  it('rejects a zip without content.xml', async () => {
    const blob = new Blob([zipSync({ 'a.txt': strToU8('x') }).slice().buffer])
    await expect(importSiq(blob)).rejects.toThrow('content.xml')
  })

  it('rejects malformed xml and foreign xml', async () => {
    await expect(importSiq(siq('<package><rounds></package>'))).rejects.toThrow('.siq')
    await expect(importSiq(siq('<html/>'))).rejects.toThrow('.siq')
  })

  it('rejects a package with no questions', async () => {
    await expect(importSiq(siq('<package name="x"><rounds><round name="r"><themes/></round></rounds></package>'))).rejects.toThrow()
  })

  it('falls back to the file name for an unnamed package and skips a long author list', async () => {
    const authors = `<info><authors><author>${'А'.repeat(90)}</author></authors></info>`
    const xml = `<package>${authors}<rounds><round><themes><theme name="т"><questions><question price="1"><right><answer>о</answer></right></question></questions></theme></themes></round></rounds></package>`
    const { game } = await importSiq(siq(xml), 'мой файл')
    expect(game.title).toBe('мой файл')
    expect(game.subtitle).toBeUndefined()
    expect(game.rounds[0].name).toBe('Раунд 1')
  })
})

describe('escapeMarkdown', () => {
  it('neutralises inline and line-start markdown', () => {
    expect(escapeMarkdown('a_b *c* `d` [e]')).toBe('a\\_b \\*c\\* \\`d\\` \\[e\\]')
    expect(escapeMarkdown('# h\n- i\n2) j')).toBe('\\# h\n\\- i\n2\\) j')
  })

  it('leaves plain prose alone', () => {
    expect(escapeMarkdown('Кто написал «Войну и мир»?')).toBe('Кто написал «Войну и мир»?')
  })
})
