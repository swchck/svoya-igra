import { describe, expect, it } from 'vitest'
import { gameFromTable, parseDelimited } from './table'

describe('parseDelimited', () => {
  it('reads CSV with quoted cells, doubled quotes and line breaks, picking the delimiter', () => {
    expect(parseDelimited('\uFEFFa;"b;c";"say ""hi"""\r\n"multi\nline";2;\n\n')).toEqual([
      ['a', 'b;c', 'say "hi"'],
      ['multi\nline', '2', ''],
    ])
    expect(parseDelimited('x\ty, z\n1\t2')).toEqual([
      ['x', 'y, z'],
      ['1', '2'],
    ])
  })
})

describe('gameFromTable', () => {
  it('groups rows into rounds and themes in order, skipping the header', () => {
    const game = gameFromTable(
      [
        'Раунд,Тема,Стоимость,Вопрос,Ответ,Заметка',
        'Первый,Кино,100,Кто снял «Сталкера»?,Тарковский,Фильм 1979 года',
        'Первый,Кино,200,Кто сыграл Шарапова?,Конкин',
        'Первый,Спорт,,Сколько игроков в футбольной команде?,11',
        'Второй,Кино,300,Вопрос,*Ответ*',
        'Первый,Кино,,,',
      ].join('\n'),
      'Таблица',
    )
    expect(game.title).toBe('Таблица')
    expect(game).not.toHaveProperty('finalThemes')
    expect(game.rounds.map((r) => [r.name, r.themes.map((th) => [th.name, th.questions.map((q) => q.value)])])).toEqual([
      ['Первый', [['Кино', [100, 200]], ['Спорт', [100]]]],
      ['Второй', [['Кино', [300]]]],
    ])
    expect(game.rounds[0].themes[0].questions[0]).toMatchObject({ text: 'Кто снял «Сталкера»?', answer: 'Тарковский', notes: 'Фильм 1979 года' })
    expect(game.rounds[1].themes[0].questions[0].answer).toBe('\\*Ответ\\*')
  })

  it('refuses a table without questions', () => {
    expect(() => gameFromTable('Раунд,Тема\n,,', '')).toThrow()
  })
})
