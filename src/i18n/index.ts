import { createI18n } from 'vue-i18n'
import ru from './locales/ru'
import en from './locales/en'
import sr from './locales/sr'

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
  messages: { ru, en, sr },
  pluralRules: { ru: slavicPlural, sr: slavicPlural },
  missingWarn: false,
  fallbackWarn: false,
})

/** Translates outside components: stores, composables, error messages. */
export const t = i18n.global.t

/** Returns the current interface language. */
export function currentLocale(): Locale {
  return i18n.global.locale.value
}

/** Switches the interface language and remembers it for every window of the app. */
export function setLocale(locale: Locale): void {
  i18n.global.locale.value = locale
  if (typeof document !== 'undefined') document.documentElement.lang = locale
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
    if (e.key === STORAGE_KEY && isLocale(e.newValue)) {
      i18n.global.locale.value = e.newValue
      document.documentElement.lang = e.newValue
    }
  })
}
