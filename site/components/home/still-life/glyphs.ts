/**
 * The characters printed on the table: the punctuation of markup and the letters of the library's class names,
 * drawn once into an 8 × 8 atlas in the documentation's monospace face.
 */
const characters = '<>/="{}:;.-_#()[]+*~|abcdeghiklmnoprstuvwxy0123456789'.split('')
const set = Array.from({ length: 64 }, (_, index) => characters[index % characters.length])

export const atlasGrid = 8

export function drawGlyphAtlas(fontFamily: string, size = 64) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size * atlasGrid
  const context = canvas.getContext('2d')
  if (!context) return null
  context.fillStyle = '#000'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#fff'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = `500 ${Math.round(size * 0.74)}px ${fontFamily}`
  set.forEach((character, index) => {
    const x = (index % atlasGrid + 0.5) * size
    const y = (Math.floor(index / atlasGrid) + 0.53) * size
    context.fillText(character, x, y)
  })
  return canvas
}
