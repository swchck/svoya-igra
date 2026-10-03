import { config } from '@vue/test-utils'
import { i18n, setLocale } from '.'

// tests assert the reference (Russian) copy whatever language the test runner reports
setLocale('ru')
config.global.plugins.push(i18n)
