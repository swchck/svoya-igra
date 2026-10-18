// Builds latest.json for the Tauri updater from signed release assets.
//
//   node scripts/updater-manifest.mjs <assets-dir> <version> <tag>  > latest.json
//
// Exits quietly with no output when the build was not signed (no .sig files).
// The notes carry the version's changelog entry as JSON, which the app shows per language.

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const [dir, version, tag] = process.argv.slice(2)
const base = `https://github.com/swchck/svoya-igra/releases/download/${tag}`

// updater platform key → the asset the updater installs from
const PLATFORMS = {
  'darwin-aarch64': 'Svoya-Igra_macOS-arm64.app.tar.gz',
  'darwin-x86_64': 'Svoya-Igra_macOS-x64.app.tar.gz',
  'windows-x86_64': 'Svoya-Igra_Windows-x64-setup.exe',
  'linux-x86_64': 'Svoya-Igra_Linux-x64.AppImage',
}

const platforms = {}
for (const [key, asset] of Object.entries(PLATFORMS)) {
  const sig = join(dir, `${asset}.sig`)
  if (existsSync(sig)) platforms[key] = { signature: readFileSync(sig, 'utf8').trim(), url: `${base}/${asset}` }
}

const changelog = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../src/changelog.json'), 'utf8'))
const entry = changelog.find((e) => e.version === version)
const notes = entry ? JSON.stringify(entry.notes) : `Своя Игра ${version}`

if (Object.keys(platforms).length) {
  process.stdout.write(JSON.stringify({ version, notes, pub_date: new Date().toISOString(), platforms }, null, 2))
}
