import { ref } from 'vue'

const REPO = 'swchck/svoya-igra'
export const REPO_URL = `https://github.com/${REPO}`
export const RELEASES_URL = `${REPO_URL}/releases`

export type PlatformId = 'mac-arm' | 'mac-x64' | 'windows' | 'appimage' | 'deb' | 'rpm'

export interface Download {
  id: PlatformId
  os: 'macOS' | 'Windows' | 'Linux'
  label: string
  hint: string
  file: string
}

// file names are fixed by scripts/release-assets.mjs, so these links survive every release
export const DOWNLOADS: Download[] = [
  { id: 'mac-arm', os: 'macOS', label: 'macOS · Apple Silicon', hint: 'M1 и новее', file: 'Svoya-Igra_macOS-arm64.dmg' },
  { id: 'mac-x64', os: 'macOS', label: 'macOS · Intel', hint: 'Mac с процессором Intel', file: 'Svoya-Igra_macOS-x64.dmg' },
  { id: 'windows', os: 'Windows', label: 'Windows', hint: 'Windows 10 и 11, 64 бит', file: 'Svoya-Igra_Windows-x64-setup.exe' },
  { id: 'appimage', os: 'Linux', label: 'Linux · AppImage', hint: 'любой дистрибутив', file: 'Svoya-Igra_Linux-x64.AppImage' },
  { id: 'deb', os: 'Linux', label: 'Linux · .deb', hint: 'Ubuntu, Debian, Mint', file: 'Svoya-Igra_Linux-x64.deb' },
  { id: 'rpm', os: 'Linux', label: 'Linux · .rpm', hint: 'Fedora, openSUSE', file: 'Svoya-Igra_Linux-x64.rpm' },
]

export function downloadUrl(d: Download): string {
  return `${RELEASES_URL}/latest/download/${d.file}`
}

/** True when the latest release ships this installer, or when that can't be checked. */
export function isAvailable(d: Download): boolean {
  return releaseUnknown.value || !!latestRelease.value?.files.has(d.file)
}

interface UADataLike {
  platform?: string
  getHighEntropyValues?: (hints: string[]) => Promise<{ architecture?: string }>
}

/** Best guess of the visitor's platform; null on phones and tablets. */
export async function detectPlatform(): Promise<PlatformId | null> {
  const ua = navigator.userAgent
  const uaData = (navigator as Navigator & { userAgentData?: UADataLike }).userAgentData
  if (/Android|iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return null
  if (/Windows/i.test(ua)) return 'windows'
  if (/Mac OS X|Macintosh/i.test(ua)) {
    // Safari reports "Intel" on every Mac; only Chromium can tell the real architecture
    try {
      const arch = (await uaData?.getHighEntropyValues?.(['architecture']))?.architecture
      if (arch === 'x86') return 'mac-x64'
    } catch {
      // no high-entropy hints: assume the common case
    }
    return 'mac-arm'
  }
  if (/Linux/i.test(ua)) return 'appimage'
  return null
}

export interface LatestRelease {
  version: string
  date: string
  files: Set<string>
}

/** The latest published release, null before the first one, undefined while loading or unknown. */
export const latestRelease = ref<LatestRelease | null | undefined>(undefined)
/** True when GitHub could not be asked (rate limit, offline): links are offered blind. */
export const releaseUnknown = ref(false)

export async function loadLatestRelease(): Promise<void> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (res.status === 404) {
      latestRelease.value = null
      return
    }
    if (!res.ok) throw new Error(`GitHub API ${res.status}`)
    const data = (await res.json()) as { tag_name: string; published_at: string; assets: { name: string }[] }
    latestRelease.value = {
      version: data.tag_name.replace(/^v/, ''),
      date: new Date(data.published_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }),
      files: new Set(data.assets.map((a) => a.name)),
    }
  } catch {
    // 60 anonymous requests an hour per IP run out fast behind an office NAT
    releaseUnknown.value = true
  }
}
