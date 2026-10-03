// Собирает sample-1996.gamezip: пакует JSON + все картинки в один архив
// формата .gamezip (см. src/archive.ts).
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { zipSync, strToU8 } from 'fflate'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SAMPLE_JSON = join(ROOT, 'src/samples/sample-1996.json')
const IMAGES_DIR = join(ROOT, 'src/assets/sample-1996')
const OUT_DIR = process.argv[2] || join(ROOT, 'dist-portable')
const OUT_FILE = join(OUT_DIR, 'sample-1996.gamezip')

const MEDIA_PROTO = 'media://'
const MEDIA_DIR = 'media/'
const PUBLIC_PREFIX = 'images/sample-1996/'

const ICON_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3838FF"/>
      <stop offset="1" stop-color="#000091"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="36" fill="url(#bg)"/>
  <text x="128" y="120" font-family="Georgia, serif" font-size="56" font-weight="bold"
        text-anchor="middle" fill="#FFC000">СВОЯ</text>
  <text x="128" y="190" font-family="Georgia, serif" font-size="56" font-weight="bold"
        text-anchor="middle" fill="#FFC000">ИГРА</text>
</svg>
`

const json = JSON.parse(await readFile(SAMPLE_JSON, 'utf8'))

// Собрать все используемые имена файлов
const used = new Set()
function collect(u) {
  if (typeof u === 'string' && u.startsWith(PUBLIC_PREFIX)) {
    used.add(u.slice(PUBLIC_PREFIX.length))
  }
}
function rewrite(u) {
  if (typeof u === 'string' && u.startsWith(PUBLIC_PREFIX)) {
    return MEDIA_PROTO + u.slice(PUBLIC_PREFIX.length)
  }
  return u
}
function walkItems(items) {
  if (!items) return
  for (const it of items) {
    collect(it.url)
    it.url = rewrite(it.url)
  }
}
for (const r of json.rounds) {
  for (const t of r.themes) {
    for (const q of t.questions) {
      collect(q.mediaUrl); q.mediaUrl = rewrite(q.mediaUrl)
      collect(q.answerMediaUrl); q.answerMediaUrl = rewrite(q.answerMediaUrl)
      walkItems(q.media)
      walkItems(q.answerMedia)
    }
  }
}
if (json.finalRound) {
  collect(json.finalRound.mediaUrl); json.finalRound.mediaUrl = rewrite(json.finalRound.mediaUrl)
  walkItems(json.finalRound.media)
}

// Прочитать файлы и составить zip
const files = {
  'game.json': strToU8(JSON.stringify(json, null, 2)),
  'meta.json': strToU8(JSON.stringify({
    app: 'svoya-igra',
    format: 'gamezip',
    version: 1,
    exportedAt: new Date().toISOString(),
  }, null, 2)),
  'icon.svg': strToU8(ICON_SVG),
}

let total = 0
for (const name of used) {
  const path = join(IMAGES_DIR, name)
  try {
    const data = await readFile(path)
    files[MEDIA_DIR + name] = new Uint8Array(data)
    total += data.length
  } catch (err) {
    console.warn('skip', name, err.message)
  }
}

const zipped = zipSync(files, { level: 6 })
await writeFile(OUT_FILE, zipped)
console.log(`✓ ${OUT_FILE} — ${(zipped.length / 1024).toFixed(0)} KB (${used.size} файлов, исходных ${(total / 1024).toFixed(0)} KB)`)
