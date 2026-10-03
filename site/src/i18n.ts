import { watchEffect } from 'vue'
import { currentLocale, i18n, LOCALES, t } from '@/i18n'
import ru from './locales/ru'
import en from './locales/en'
import sr from './locales/sr'

// the site shares the app's i18n instance: the playable board is an app component,
// and a language picked here carries over to the web app on the same origin
const SITE = { ru, en, sr }
for (const { code } of LOCALES) i18n.global.mergeLocaleMessage(code, { site: SITE[code] })

/** Keeps the page title, description and lang attribute in the current language. */
export function syncDocumentLocale(): void {
  watchEffect(() => {
    document.documentElement.lang = currentLocale()
    document.title = t('site.meta.title')
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('site.meta.description'))
  })
}

/** Returns the BCP 47 tag for Intl formatting; Serbian copy is written in Latin script. */
export function intlLocale(): string {
  const locale = currentLocale()
  return locale === 'sr' ? 'sr-Latn' : locale
}
