// Regenerates the sample game's pictures and melodies into assets/sample/media.
// Needs sharp and ffmpeg, neither of which the app depends on:
//   SHARP_FROM=/dir/with/node_modules/sharp FFMPEG=/path/to/ffmpeg node assets/sample/generate-media.mjs
// SHARP_FROM defaults to the working directory, FFMPEG to `ffmpeg` on PATH.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { Buffer } from 'node:buffer'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'media')
const sharp = createRequire(join(process.env.SHARP_FROM ?? process.cwd(), 'noop.js'))('sharp')
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg'

mkdirSync(OUT, { recursive: true })

const BG = '#f4efe6'

function svg(w, h, body, bg = BG) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    (bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : '') + body + '</svg>'
}

function polygon(cx, cy, r, n, rotation = -Math.PI / 2) {
  return Array.from({ length: n }, (_, i) => {
    const a = rotation + (i * 2 * Math.PI) / n
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`
  }).join(' ')
}

async function picture(name, width, markup) {
  await sharp(Buffer.from(markup)).resize({ width }).webp({ quality: 88 }).toFile(join(OUT, name))
}

function flag(w, h, body) {
  const pad = 60
  return svg(w + 2 * pad, h + 2 * pad, `<g transform="translate(${pad} ${pad})">${body}</g>`)
}

// official proportions; colours are the commonly published sRGB values
await picture('flag-japan.webp', 1200, flag(900, 600, '<rect width="900" height="600" fill="#fff"/><circle cx="450" cy="300" r="180" fill="#bc002d"/>'))
await picture('flag-france.webp', 1200, flag(900, 600, '<rect width="300" height="600" fill="#0055a4"/><rect x="300" width="300" height="600" fill="#fff"/><rect x="600" width="300" height="600" fill="#ef4135"/>'))
await picture('flag-italy.webp', 1200, flag(900, 600, '<rect width="300" height="600" fill="#009246"/><rect x="300" width="300" height="600" fill="#f4f5f0"/><rect x="600" width="300" height="600" fill="#ce2b37"/>'))
await picture('flag-germany.webp', 1200, flag(1000, 600, '<rect width="1000" height="200" fill="#000"/><rect y="200" width="1000" height="200" fill="#dd0000"/><rect y="400" width="1000" height="200" fill="#ffce00"/>'))
// 32-unit grid: cross arms 6 units wide, 20 long end to end
await picture('flag-switzerland.webp', 1200, flag(640, 640, '<rect width="640" height="640" fill="#da291c"/><rect x="120" y="260" width="400" height="120" fill="#fff"/><rect x="260" y="120" width="120" height="400" fill="#fff"/>'))

await picture('hexagon.webp', 1200, svg(1200, 900, `<polygon points="${polygon(600, 450, 330, 6, 0)}" fill="#2f6f9f" stroke="#1d4766" stroke-width="10" stroke-linejoin="round"/>`))

// deliberately different source widths: the stage has to even them out
await picture('shape-triangle.webp', 1200, svg(800, 600, `<polygon points="${polygon(400, 340, 250, 3)}" fill="#d9822b" stroke="#8a4d12" stroke-width="8" stroke-linejoin="round"/>`))
await picture('shape-square.webp', 600, svg(800, 600, '<rect x="210" y="110" width="380" height="380" fill="#3a9d6b" stroke="#22603f" stroke-width="8"/>'))
await picture('shape-pentagon.webp', 300, svg(800, 600, `<polygon points="${polygon(400, 315, 240, 5)}" fill="#8e5bb5" stroke="#553370" stroke-width="8" stroke-linejoin="round"/>`))

{
  // right triangle with legs 3 and 4, a square on each side
  const u = 64, x0 = 470, y0 = 500
  const P = [x0, y0], Q = [x0 + 4 * u, y0], R = [x0, y0 - 3 * u]
  const pts = (...ps) => ps.map((p) => p.join(',')).join(' ')
  const body =
    `<polygon points="${pts(P, Q, [Q[0], Q[1] + 4 * u], [P[0], P[1] + 4 * u])}" fill="#e7b04a" stroke="#7a5a17" stroke-width="5"/>` +
    `<polygon points="${pts(P, R, [R[0] - 3 * u, R[1]], [P[0] - 3 * u, P[1]])}" fill="#5fa8d3" stroke="#22516e" stroke-width="5"/>` +
    `<polygon points="${pts(Q, R, [R[0] + 3 * u, R[1] - 4 * u], [Q[0] + 3 * u, Q[1] - 4 * u])}" fill="#d96c6c" stroke="#7a2c2c" stroke-width="5"/>` +
    `<polygon points="${pts(P, Q, R)}" fill="#fffaf0" stroke="#333" stroke-width="6" stroke-linejoin="round"/>` +
    `<polyline points="${pts([x0 + 28, y0], [x0 + 28, y0 - 28], [x0, y0 - 28])}" fill="none" stroke="#333" stroke-width="4"/>`
  await picture('pythagoras.webp', 1200, svg(1100, 825, body))
}

{
  const sq = 80, x = 230, y = 50
  let cells = ''
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      cells += `<rect x="${x + c * sq}" y="${y + r * sq}" width="${sq}" height="${sq}" fill="${(r + c) % 2 ? '#b58863' : '#f0d9b5'}"/>`
    }
  }
  await picture('chessboard.webp', 1200, svg(1100, 740, `<rect x="${x - 16}" y="${y - 16}" width="${8 * sq + 32}" height="${8 * sq + 32}" rx="10" fill="#6b4226"/>${cells}`))
}

{
  // sizes are only roughly ordered, not to scale
  const planets = [
    { r: 12, fill: '#9a8f86' },
    { r: 21, fill: '#d8b46a' },
    { r: 22, fill: '#3f7fc4' },
    { r: 17, fill: '#c1440e', mark: true },
    { r: 60, fill: '#c9a27a' },
    { r: 48, fill: '#e2c784', ring: true },
    { r: 33, fill: '#8fd3dc' },
    { r: 32, fill: '#3f5fd0' },
  ]
  let x = 190
  let body = '<rect width="1200" height="500" fill="#10142a"/><circle cx="-110" cy="250" r="250" fill="#ffc533"/><circle cx="-110" cy="250" r="272" fill="#ffc533" opacity="0.25"/>'
  for (const p of planets) {
    x += p.r + 44
    const muted = p.mark ? '' : ' opacity="0.55"'
    if (p.ring) body += `<ellipse cx="${x}" cy="250" rx="${p.r * 1.9}" ry="${p.r * 0.5}" fill="none" stroke="#d8c99a" stroke-width="6"${muted}/>`
    body += `<circle cx="${x}" cy="250" r="${p.r}" fill="${p.fill}"${muted}/>`
    if (p.mark) body += `<circle cx="${x}" cy="250" r="${p.r + 18}" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="8 7"/>`
    x += p.r + (p.ring ? 44 : 0)
  }
  await picture('solar-system.webp', 1200, svg(1200, 500, body, null))
}

// axis tilted by ~98 degrees, so the rings stand almost upright
await picture('uranus.webp', 1200, svg(1200, 800,
  '<rect width="1200" height="800" fill="#0d1226"/>' +
  '<line x1="596" y1="60" x2="624" y2="740" stroke="#fff" stroke-width="3" stroke-dasharray="10 10" opacity="0.5"/>' +
  '<circle cx="610" cy="400" r="190" fill="#9fdbe3"/>' +
  '<path d="M610 210 a190 190 0 0 1 0 380 a120 190 0 0 0 0 -380z" fill="#7fc3cd"/>' +
  '<ellipse cx="610" cy="400" rx="80" ry="310" transform="rotate(-2.4 610 400)" fill="none" stroke="#d6eef2" stroke-width="7" opacity="0.8"/>' +
  '<ellipse cx="610" cy="400" rx="98" ry="335" transform="rotate(-2.4 610 400)" fill="none" stroke="#d6eef2" stroke-width="3" opacity="0.5"/>', null))

await picture('pyramids.webp', 1200, svg(1200, 700,
  '<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6c87a"/><stop offset="1" stop-color="#f9e6c2"/></linearGradient></defs>' +
  '<rect width="1200" height="700" fill="url(#sky)"/><circle cx="930" cy="170" r="70" fill="#fff3d0"/>' +
  '<rect y="540" width="1200" height="160" fill="#d9a35b"/>' +
  '<polygon points="130,540 330,330 530,540" fill="#c58b45"/><polygon points="330,330 530,540 420,540" fill="#a8722f"/>' +
  '<polygon points="380,540 640,230 900,540" fill="#d39a52"/><polygon points="640,230 900,540 760,540" fill="#b27a35"/>' +
  '<polygon points="820,540 950,400 1080,540" fill="#c58b45"/><polygon points="950,400 1080,540 1010,540" fill="#a8722f"/>', null))

// --- melodies: additive synthesis with a plucked envelope, mixed to mono 16-bit WAV, encoded to MP3

const RATE = 44100
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

function freq(name) {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name)
  const semis = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) + 1) * 12
  return 440 * 2 ** ((semis - 69) / 12)
}

/** Voice notes: [[note | null, beats], ...]; null is a rest. `legato` is the sounding share of each note. */
function render(voices, bpm, { decay = 2.2, legato = 1, tail = 1.2 } = {}) {
  const beat = 60 / bpm
  const release = 0.25
  const total = Math.max(...voices.map((v) => v.notes.reduce((s, [, b]) => s + b, 0))) * beat + tail
  const buf = new Float64Array(Math.ceil(total * RATE))
  for (const { notes, gain, octave = 0 } of voices) {
    let t = 0
    for (const [note, beats] of notes) {
      if (note) {
        const f = freq(note) * 2 ** octave
        const held = beats * beat * legato
        const start = Math.floor(t * RATE)
        const len = Math.min(held + release, total - t) * RATE
        for (let i = 0; i < len; i++) {
          const s = i / RATE
          const env = Math.min(1, s / 0.006) * Math.exp(-s * decay) * (s < held ? 1 : 1 - (s - held) / release)
          const w = Math.sin(2 * Math.PI * f * s) + 0.45 * Math.exp(-s * 3) * Math.sin(4 * Math.PI * f * s) +
            0.2 * Math.exp(-s * 5) * Math.sin(6 * Math.PI * f * s) + 0.08 * Math.exp(-s * 8) * Math.sin(8 * Math.PI * f * s)
          buf[start + i] += gain * env * w
        }
      }
      t += beats * beat
    }
  }
  return buf
}

function concat(...parts) {
  const out = new Float64Array(parts.reduce((s, p) => s + p.length, 0))
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

function encode(name, samples) {
  const peak = samples.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1
  const pcm = Buffer.alloc(44 + samples.length * 2)
  pcm.write('RIFF', 0)
  pcm.writeUInt32LE(36 + samples.length * 2, 4)
  pcm.write('WAVEfmt ', 8)
  pcm.writeUInt32LE(16, 16)
  pcm.writeUInt16LE(1, 20)
  pcm.writeUInt16LE(1, 22)
  pcm.writeUInt32LE(RATE, 24)
  pcm.writeUInt32LE(RATE * 2, 28)
  pcm.writeUInt16LE(2, 32)
  pcm.writeUInt16LE(16, 34)
  pcm.write('data', 36)
  pcm.writeUInt32LE(samples.length * 2, 40)
  samples.forEach((v, i) => pcm.writeInt16LE(Math.round((v / peak) * 0.85 * 32767), 44 + i * 2))
  const dir = mkdtempSync(join(tmpdir(), 'sample-audio-'))
  const wav = join(dir, 'in.wav')
  writeFileSync(wav, pcm)
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '96k', '-ac', '1', join(OUT, name)])
  rmSync(dir, { recursive: true })
  return samples.length / RATE
}

const seq = (s) => s.split(/\s+/).filter(Boolean).map((tok) => {
  const [n, b] = tok.split(':')
  return [n === '-' ? null : n, Number(b ?? 1)]
})

// Beethoven, Symphony No. 9, "Ode to Joy" theme in C major
const ode = encode('ode-to-joy.mp3', render([
  { gain: 1, notes: seq('E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4:1.5 D4:0.5 D4:2 E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4:1.5 C4:0.5 C4:2') },
  { gain: 0.45, notes: seq('C3:4 G2:4 C3:4 G2:4 C3:4 G2:4 C3:4 G2:2 C3:2') },
], 140))

// Mozart, Eine kleine Nachtmusik K. 525, opening bars, played in octaves as written
const mozartTheme = 'G4 -:0.5 D4:0.5 G4 -:0.5 D4:0.5 G4:0.5 D4:0.5 G4:0.5 B4:0.5 D5 - C5 -:0.5 A4:0.5 C5 -:0.5 A4:0.5 C5:0.5 A4:0.5 F#4:0.5 A4:0.5 D4 -'
const mozart = encode('eine-kleine-nachtmusik.mp3', render([
  { gain: 1, notes: seq(mozartTheme) },
  { gain: 0.5, octave: -1, notes: seq(mozartTheme) },
], 116))

// Grieg, "In the Hall of the Mountain King": the theme three times, speeding up as in the score
const grieg = 'B3:0.5 C#4:0.5 D4:0.5 E4:0.5 F#4:0.5 D4:0.5 F#4 F4:0.5 C#4:0.5 F4 E4:0.5 C4:0.5 E4 B3:0.5 C#4:0.5 D4:0.5 E4:0.5 F#4:0.5 D4:0.5 F#4:0.5 B4:0.5 A4:0.5 F#4:0.5 D4:0.5 F#4:0.5 A4:2'
const griegBass = 'B2:2 B2:2 B2:2 B2:2 B2:2 B2:2 F#2:2 F#2:2'
// each pass is padded to whole seconds so the segment bounds read cleanly in the editor
const griegParts = [104, 138, 176].map((bpm) => {
  const pass = render([
    { gain: 1, notes: seq(grieg) },
    { gain: 0.5, notes: seq(griegBass) },
  ], bpm, { decay: 3, legato: 0.6, tail: 0.25 })
  const padded = new Float64Array(Math.ceil(pass.length / RATE) * RATE)
  padded.set(pass)
  return padded
})
encode('mountain-king.mp3', concat(...griegParts))
const griegSegment = {
  start: griegParts[0].length / RATE,
  end: (griegParts[0].length + griegParts[1].length) / RATE,
}

// Beethoven, "Für Elise", opening phrase twice; beats are sixteenths here
const eliseRight = 'E5 D#5 E5 D#5 E5 B4 D5 C5 A4:3 C4 E4 A4 B4:3 E4 G#4 B4 C5:3 E4 E5 D#5 E5 D#5 E5 B4 D5 C5 A4:3 C4 E4 A4 B4:3 E4 C5 B4 A4:4'
const eliseLeft = '-:8 A2 E3 A3 -:3 E2 E3 G#3 -:3 A2 E3 A3 -:9 A2 E3 A3 -:3 E2 E3 G#3 -:3 A2 E3 A3:2'
const eliseOnce = render([{ gain: 1, notes: seq(eliseRight) }, { gain: 0.55, notes: seq(eliseLeft) }], 380, { decay: 2.5, tail: 0.6 })
const elise = encode('fur-elise.mp3', concat(eliseOnce, eliseOnce))

console.log(JSON.stringify({ ode, mozart, griegSegment, elise }))
