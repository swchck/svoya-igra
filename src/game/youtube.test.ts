import { describe, expect, it } from 'vitest'
import { parseYoutubeUrl } from './youtube'

describe('parseYoutubeUrl', () => {
  it.each([
    ['https://youtu.be/O4SacSbp-Rc?si=kx', { id: 'O4SacSbp-Rc', start: 0 }],
    ['https://www.youtube.com/watch?v=O4SacSbp-Rc&t=42', { id: 'O4SacSbp-Rc', start: 42 }],
    ['https://youtube.com/watch?v=O4SacSbp-Rc&t=1m30s', { id: 'O4SacSbp-Rc', start: 90 }],
    ['https://m.youtube.com/watch?v=O4SacSbp-Rc&t=1h0m5s', { id: 'O4SacSbp-Rc', start: 3605 }],
    ['https://www.youtube.com/shorts/O4SacSbp-Rc', { id: 'O4SacSbp-Rc', start: 0 }],
    ['https://www.youtube-nocookie.com/embed/O4SacSbp-Rc?start=15', { id: 'O4SacSbp-Rc', start: 15 }],
  ])('%s', (url, expected) => {
    expect(parseYoutubeUrl(url)).toEqual(expected)
  })

  it.each(['https://example.com/watch?v=O4SacSbp-Rc', 'not a url', 'https://youtube.com/watch', 'https://notyoutube.com/x'])(
    'rejects %s',
    (url) => {
      expect(parseYoutubeUrl(url)).toBeNull()
    },
  )
})
