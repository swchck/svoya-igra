// Copies one target's installers out of the Tauri bundle tree under stable,
// version-free ASCII names, so links like releases/latest/download/<name> never change.
//
//   node scripts/release-assets.mjs <rust-target> <platform-label> <out-dir>

import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const [target, label, outDir] = process.argv.slice(2)
if (!target || !label || !outDir) {
  console.error('usage: release-assets.mjs <rust-target> <platform-label> <out-dir>')
  process.exit(2)
}

const bundle = join('src-tauri', 'target', target, 'release', 'bundle')
const stem = `Svoya-Igra_${label}`

// [bundle subdir, file suffix, published suffix]; .sig files ride along when present
const KINDS = [
  ['dmg', '.dmg', '.dmg'],
  ['macos', '.app.tar.gz', '.app.tar.gz'],
  ['nsis', '-setup.exe', '-setup.exe'],
  ['appimage', '.AppImage', '.AppImage'],
  ['deb', '.deb', '.deb'],
  ['rpm', '.rpm', '.rpm'],
]

mkdirSync(outDir, { recursive: true })
let copied = 0
for (const [dir, suffix, published] of KINDS) {
  const from = join(bundle, dir)
  if (!existsSync(from)) continue
  for (const file of readdirSync(from).filter((f) => f.endsWith(suffix))) {
    copyFileSync(join(from, file), join(outDir, stem + published))
    if (existsSync(join(from, `${file}.sig`))) copyFileSync(join(from, `${file}.sig`), join(outDir, `${stem}${published}.sig`))
    copied++
  }
}
if (!copied) {
  console.error(`no installers found under ${bundle}`)
  process.exit(1)
}
console.log(readdirSync(outDir).join('\n'))
