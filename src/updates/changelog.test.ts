import { describe, expect, it } from 'vitest'
import { version } from '../../package.json'
import { LOCALES } from '../i18n'
import { APP_VERSION, CHANGELOG, compareVersions, entriesSince, notesIn, parseFeedNotes } from './changelog'

describe('changelog.json', () => {
  it('describes the version being built, so a release never ships without notes', () => {
    expect(APP_VERSION).toBe(version)
    expect(CHANGELOG.map((e) => e.version)).toContain(version)
  })

  it('lists unique versions newest first, each dated and written in every language', () => {
    const versions = CHANGELOG.map((e) => e.version)
    expect(new Set(versions).size).toBe(versions.length)
    expect([...versions].sort((a, b) => compareVersions(b, a))).toEqual(versions)
    for (const entry of CHANGELOG) {
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      for (const { code } of LOCALES) {
        expect(entry.notes[code]?.length, `${entry.version} ${code}`).toBeGreaterThan(0)
        expect(entry.notes[code].length, `${entry.version} ${code}`).toBe(entry.notes.ru.length)
      }
    }
  })
})

describe('versions', () => {
  it('compares numerically, ignoring a leading v and a pre-release tag', () => {
    expect(compareVersions('0.10.0', '0.9.9')).toBeGreaterThan(0)
    expect(compareVersions('v1.2.0', '1.2')).toBe(0)
    expect(compareVersions('1.0.0-rc1', '1.0.0')).toBe(0)
    expect(compareVersions('0.4.0', '0.4.1')).toBeLessThan(0)
  })

  it('picks the releases after the one seen, up to the current one', () => {
    const log = ['0.6.0', '0.5.0', '0.4.0', '0.3.0'].map((v) => ({ version: v, date: '2026-01-01', notes: { ru: [v], en: [], sr: [] } }))
    expect(entriesSince('0.3.0', '0.5.0', log).map((e) => e.version)).toEqual(['0.5.0', '0.4.0'])
    expect(entriesSince('0.5.0', '0.5.0', log)).toEqual([])
    expect(notesIn(log[0], 'en')).toEqual(['0.6.0'])
  })
})

describe('parseFeedNotes', () => {
  it('reads the language from the JSON the release writes, falling back to Russian', () => {
    const body = JSON.stringify({ ru: ['Новое'], en: ['New'], sr: [] })
    expect(parseFeedNotes(body, 'en')).toEqual(['New'])
    expect(parseFeedNotes(body, 'sr')).toEqual(['Новое'])
  })

  it('shows plain text line by line and nothing for an empty body', () => {
    expect(parseFeedNotes('- Faster\n\n* Fixed sound\n', 'ru')).toEqual(['Faster', 'Fixed sound'])
    expect(parseFeedNotes('  ', 'ru')).toEqual([])
    expect(parseFeedNotes(undefined, 'ru')).toEqual([])
  })
})
