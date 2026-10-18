import { onScopeDispose, ref } from 'vue'

/** Reports whether this browser or webview can record from a microphone. */
export const canRecord = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'

/** Longest recording; a question needs a phrase or a hummed tune, not a podcast. */
export const MAX_RECORDING_SECONDS = 120

/**
 * Records sound from the microphone into a file. The microphone is released as soon as the
 * recording stops, so the system's recording light goes out.
 */
export function useRecorder(onDone: (file: File) => void) {
  const recording = ref(false)
  const seconds = ref(0)
  const error = ref<string | null>(null)
  let recorder: MediaRecorder | null = null
  let ticker: ReturnType<typeof setInterval> | undefined

  async function start() {
    if (recording.value) return
    error.value = null
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      error.value = (err as Error).name === 'NotAllowedError' ? 'denied' : 'failed'
      return
    }
    const chunks: Blob[] = []
    recorder = new MediaRecorder(stream)
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop())
      const type = recorder?.mimeType || 'audio/webm'
      const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'
      if (chunks.length) onDone(new File(chunks, `recording.${ext}`, { type: type.split(';')[0] }))
      recorder = null
    }
    recorder.start()
    recording.value = true
    seconds.value = 0
    ticker = setInterval(() => {
      seconds.value += 1
      if (seconds.value >= MAX_RECORDING_SECONDS) stop()
    }, 1000)
  }

  function stop() {
    clearInterval(ticker)
    recording.value = false
    if (recorder?.state === 'recording') recorder.stop()
  }

  onScopeDispose(stop)

  return { recording, seconds, error, start, stop }
}
