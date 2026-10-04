import { createI18n } from 'vue-i18n'
import type ru from './locales/ru'

/** Messages of one interface language; Russian is the reference every other language must match. */
export type Messages = typeof ru

export const LOCALES = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
  { code: 'sr', label: 'Srpski' },
] as const

export type Locale = (typeof LOCALES)[number]['code']

const STORAGE_KEY = 'svoya-igra:locale'

function isLocale(value: unknown): value is Locale {
  return LOCALES.some((l) => l.code === value)
}

function initialLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isLocale(stored)) return stored
  } catch {
    // storage blocked: fall through to the browser language
  }
  const languages = typeof navigator === 'undefined' ? [] : navigator.languages ?? [navigator.language]
  for (const lang of languages) {
    const base = lang.toLowerCase().split('-')[0]
    if (isLocale(base)) return base
    // Croatian, Bosnian and Montenegrin readers get on fine with Serbian Latin
    if (['hr', 'bs', 'sh', 'cnr'].includes(base)) return 'sr'
  }
  return 'ru'
}

// one | few | many, e.g. 1 вопрос, 2 вопроса, 5 вопросов; the same rule holds for Serbian
function slavicPlural(choice: number, choicesLength: number): number {
  if (choicesLength < 3) return choice === 1 ? 0 : 1
  const n = Math.abs(choice)
  if (n % 10 === 1 && n % 100 !== 11) return 0
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) return 1
  return 2
}

export const i18n = createI18n<[Messages], Locale, false>({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: 'ru',
  // filled by loadLocale: each language is its own chunk, so startup fetches only the one in use
  messages: {} as Record<Locale, Messages>,
  pluralRules: { ru: slavicPlural, sr: slavicPlural },
  missingWarn: false,
  fallbackWarn: false,
})

const loaders: Record<Locale, () => Promise<{ default: Messages }>> = {
  ru: () => import('./locales/ru'),
  en: () => import('./locales/en'),
  sr: () => import('./locales/sr'),
}

/** Fetches the messages of a language unless they are already in place. */
export async function loadLocale(locale: Locale): Promise<void> {
  if (i18n.global.availableLocales.includes(locale)) return
  i18n.global.setLocaleMessage(locale, (await loaders[locale]()).default)
}

/** Translates outside components: stores, composables, error messages. */
export const t = i18n.global.t

/** Returns the current interface language. */
export function currentLocale(): Locale {
  return i18n.global.locale.value
}

/** Reports whether someone has picked the interface language, rather than it being guessed. */
export function localeChosen(): boolean {
  try {
    return isLocale(localStorage.getItem(STORAGE_KEY))
  } catch {
    // without storage the question would come back on every start
    return true
  }
}

let requested: Locale | undefined

// a slower load of an earlier pick must not override a later one
async function apply(locale: Locale): Promise<boolean> {
  requested = locale
  await loadLocale(locale)
  if (requested !== locale) return false
  i18n.global.locale.value = locale
  if (typeof document !== 'undefined') document.documentElement.lang = locale
  return true
}

/** Switches the interface language once its messages are loaded, and remembers it for every window of the app. */
export async function setLocale(locale: Locale): Promise<void> {
  if (!(await apply(locale))) return
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // not remembered, still applied
  }
}

/** Follows a language change made in another window (the host window and the stage). */
export function syncLocaleAcrossWindows(): void {
  if (typeof window === 'undefined') return
  document.documentElement.lang = currentLocale()
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && isLocale(e.newValue)) void apply(e.newValue)
  })
}
