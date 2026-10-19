import type { SoundName } from './sounds'

/*
 * 8-bit versions of the game sounds for the pixel stage, synthesized on the spot: a square
 * lead and a triangle bass, like the two pulse and one triangle channel of an old console.
 */

/** One note: frequency in Hz (0 is a rest), length in seconds. */
type Note = [number, number]

const N = (semitones: number) => 440 * 2 ** (semitones / 12)
// note names relative to A4
const C5 = N(3), D5 = N(5), E5 = N(7), G5 = N(10), A5 = N(12), C6 = N(15), E4 = N(-5), G4 = N(-2), C4 = N(-9), A4 = N(0), B4 = N(2)

const TUNES: Record<SoundName, { lead: Note[]; bass?: Note[] }> = {
  round: { lead: [[C5, 0.12], [E5, 0.12], [G5, 0.12], [C6, 0.36]], bass: [[C4 / 2, 0.72]] },
  pick: { lead: [[A5, 0.05], [E5, 0.05], [A5, 0.08]] },
  special: { lead: [[E5, 0.08], [G5, 0.08], [E5, 0.08], [G5, 0.08], [C6, 0.24]] },
  reveal: { lead: [[G4, 0.08], [C5, 0.08], [E5, 0.16]] },
  correct: { lead: [[C5, 0.08], [E5, 0.08], [G5, 0.08], [C6, 0.2]] },
  wrong: { lead: [[E4, 0.16], [0, 0.04], [E4 * 0.94, 0.3]], bass: [[E4 / 2, 0.5]] },
  final: { lead: [[A4, 0.2], [C5, 0.2], [E5, 0.2], [A5, 0.6]], bass: [[A4 / 4, 1.2]] },
  results: { lead: [[C5, 0.1], [C5, 0.1], [C5, 0.1], [C5, 0.3], [A4, 0.3], [B4, 0.3], [C5, 0.2], [0, 0.1], [B4, 0.1], [C5, 0.6]], bass: [[C4 / 2, 0.6], [A4 / 4, 0.6], [G4 / 4, 0.6], [C4 / 2, 0.6]] },
  tick: { lead: [[D5 * 2, 0.03]] },
  timeup: { lead: [[C5, 0.15], [G4, 0.15], [C4, 0.4]] },
}

let audio: AudioContext | null = null

function voice(ctx: AudioContext, notes: Note[], type: OscillatorType, gain: number, out: AudioNode) {
  let t = ctx.currentTime + 0.01
  for (const [freq, len] of notes) {
    if (freq > 0) {
      const osc = ctx.createOscillator()
      const env = ctx.createGain()
      osc.type = type
      osc.frequency.value = freq
      env.gain.setValueAtTime(gain, t)
      // a short release, so repeated notes stay separate like on the real chip
      env.gain.setValueAtTime(gain, t + len * 0.85)
      env.gain.linearRampToValueAtTime(0, t + len)
      osc.connect(env).connect(out)
      osc.start(t)
      osc.stop(t + len)
    }
    t += len
  }
}

/** Plays the 8-bit version of a sound at `volume` (0 to 1). Never throws. */
export function playChip(name: SoundName, volume: number): void {
  try {
    audio ??= new AudioContext()
    void audio.resume()
    const master = audio.createGain()
    // square waves are loud for their level; this keeps them near the mp3 effects
    master.gain.value = volume * 0.18
    master.connect(audio.destination)
    const tune = TUNES[name]
    voice(audio, tune.lead, 'square', 1, master)
    if (tune.bass) voice(audio, tune.bass, 'triangle', 1.4, master)
  } catch {
    // no audio here; the game goes on silently
  }
}
