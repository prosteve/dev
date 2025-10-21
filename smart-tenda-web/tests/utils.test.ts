import { sanitizeFilename } from '~/src/lib/utils'

describe('utils', () => {
  it('sanitizes filenames', () => {
    expect(sanitizeFilename('Hello World.pdf')).toBe('Hello_World.pdf')
    expect(sanitizeFilename('weird/<>:name')).toBe('weird___name')
  })
})
