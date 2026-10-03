// Packs assets/sample into public/samples/sample-<locale>.gamezip, one archive per interface language.
// The layout matches exportGameZip in src/io/archive.ts.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { strToU8, zipSync } from 'fflate'
import { LOCALES, sample } from '../assets/sample/content.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MEDIA = join(ROOT, 'assets/sample/media')
const OUT = join(ROOT, 'public/samples')
const icon = readFileSync(join(ROOT, 'assets/app-icon.svg'))

function build(locale) {
  let n = 0
  const id = (prefix) => `${prefix}${++n}`
  const files = {}
  const text = (value) => value[locale]
  const media = (list) => list?.map(({ file, ...item }) => {
    if (!file) return { id: id('mi_'), ...item }
    // pictures and sounds are compressed already, as in the app's own export
    files[`media/${file}`] ??= [readFileSync(join(MEDIA, file)), { level: 0 }]
    return { id: id('mi_'), url: `media://${file}`, ...item }
  })

  const game = {
    id: `g_sample_${locale}`,
    title: text(sample.title),
    subtitle: text(sample.subtitle),
    createdAt: 0,
    updatedAt: 0,
    rounds: sample.rounds.map((round) => ({
      id: id('r_'),
      name: text(round.name),
      themes: round.themes.map((theme) => ({
        id: id('t_'),
        name: text(theme.name),
        questions: theme.questions.map((q) => ({
          id: id('q_'),
          value: q.value,
          kind: q.kind ?? 'normal',
          ...(q.catValue ? { catValue: q.catValue } : {}),
          text: text(q.text),
          media: media(q.media),
          answer: text(q.answer),
          answerMedia: media(q.answerMedia),
        })),
      })),
    })),
    finalRound: {
      id: id('f_'),
      theme: text(sample.finalRound.theme),
      text: text(sample.finalRound.text),
      media: media(sample.finalRound.media),
      answer: text(sample.finalRound.answer),
      answerMedia: media(sample.finalRound.answerMedia),
    },
  }

  files['game.json'] = strToU8(JSON.stringify(game, null, 2))
  files['meta.json'] = strToU8(
    JSON.stringify({ app: 'svoya-igra', format: 'gamezip', version: 1, exportedAt: new Date().toISOString() }, null, 2),
  )
  files['icon.svg'] = icon
  const out = join(OUT, `sample-${locale}.gamezip`)
  writeFileSync(out, zipSync(files, { level: 6 }))
  return out
}

for (const locale of LOCALES) console.log(build(locale))
