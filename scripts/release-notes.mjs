// Writes the GitHub release text for a version from src/changelog.json, in Russian and English.
//
//   node scripts/release-notes.mjs <version>  > notes.md
//
// Exits with no output when the changelog has no entry for the version.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const [version] = process.argv.slice(2)
const changelog = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../src/changelog.json'), 'utf8'))
const entry = changelog.find((e) => e.version === version)

if (entry) {
  const list = (notes) => notes.map((n) => `- ${n}`).join('\n')
  process.stdout.write(`## Что нового\n\n${list(entry.notes.ru)}\n\n## What's new\n\n${list(entry.notes.en)}\n`)
}
