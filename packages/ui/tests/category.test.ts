import { test } from 'node:test'
import assert from 'node:assert/strict'
import { contrast, over, parse, schemes, srgb } from '../scripts/oklch.ts'
import { block, categories } from '../scripts/category.ts'
import { code, read } from './support.ts'

/**
 * Category colors are data, not status, and they are read: their text must read on their own surface and on
 * every face a category part stands on, in both schemes of Moonstone and of Paper, and a mark must be found.
 */
const theme = code('theme.css')
const paper = code('themes/paper.css')

function token(source: string, name: string) {
  return new RegExp(`--${name}:\\s*([^;]+);`).exec(source)?.[1].trim()
}

function faces(source: string) {
  return ['color-surface-base', 'color-surface-raised', 'color-surface-tray'].map(name => {
    const value = token(source, name) ?? token(theme, name)!
    return schemes(value).map(color => srgb(parse(color)))
  })
}

test('theme.css holds the category block scripts/category.ts writes', () => {
  assert.ok(read('theme.css').includes(block()), 'run "node --import tsx scripts/category.ts --write" in packages/ui')
})

test('category.css sets the four roles for every named palette', () => {
  const source = code('components/category.css')
  for (const name of categories) {
    for (const role of ['surface', 'text', 'line', 'mark']) {
      assert.ok(source.includes(`--category-${role}: var(--color-category-${name}-${role});`), `category-${name} sets no ${role}`)
    }
  }
})

for (const [label, source] of [['Moonstone / Obsidian', theme], ['Paper', paper]] as const) {
  test(`every category reads on its surfaces in ${label}`, () => {
    const grounds = faces(source)
    for (const name of categories) {
      const [surface, text, line, mark] = ['surface', 'text', 'line', 'mark'].map(role => schemes(token(theme, `color-category-${name}-${role}`)!))
      for (const scheme of [0, 1]) {
        const own = srgb(parse(surface[scheme]))
        const words = srgb(parse(text[scheme]))
        const dot = srgb(parse(mark[scheme]))
        const where = `${name} (${scheme ? 'dark' : 'light'})`
        assert.ok(contrast(words, own) >= 4.5, `${where}: text on its surface is ${contrast(words, own).toFixed(2)}:1`)
        assert.ok(contrast(dot, own) >= 3, `${where}: the mark on its surface is ${contrast(dot, own).toFixed(2)}:1`)
        for (const face of grounds) {
          assert.ok(contrast(words, face[scheme]) >= 4.5, `${where}: text on a face is ${contrast(words, face[scheme]).toFixed(2)}:1`)
          assert.ok(contrast(dot, face[scheme]) >= 3, `${where}: the mark on a face is ${contrast(dot, face[scheme]).toFixed(2)}:1`)
        }
        // The line is decoration: it only has to be seen against the surface it outlines.
        assert.ok(contrast(over(parse(line[scheme]), own), own) > 1.1, `${where}: the line disappears`)
      }
    }
  })
}

test('red is a category and danger is a status, so they are different colors', () => {
  assert.notEqual(token(theme, 'color-category-red-text'), token(theme, 'color-danger'))
})
