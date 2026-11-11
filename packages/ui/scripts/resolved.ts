/**
 * Print the library as the browser resolves it: every stylesheet compiled, then each theme token replaced by
 * its value. Two runs, before and after a change to tokens or mixins, can be compared line by line, so a
 * refactor that should not change a pixel is shown not to change a declaration.
 *
 *   node --import tsx scripts/resolved.ts > before.txt
 *   node --import tsx scripts/resolved.ts themes/paper.css > paper.txt
 */
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { compileManifestSync } from '@master/css-compiler/node'
import { createRenderSessionSync } from '@master/css/node'
import preset from '@master/css-preset/default-manifest.json' with { type: 'json' }

/** UI_ROOT points at another copy of the package, such as one checked out from an older commit. */
const root = process.env.UI_ROOT ? pathToFileURL(`${process.env.UI_ROOT}/`) : new URL('../', import.meta.url)
const read = (file: string) => readFileSync(new URL(file, root), 'utf8')
const imports = [...read('master.css').matchAll(/@import\s+['"]\.\/([^'"]+)['"]/g)].map(match => match[1])
const source = [...imports, ...process.argv.slice(2)].map(read).join('\n\n')
const compiled = compileManifestSync(source, { baseManifest: preset as never })
const session = createRenderSessionSync({ manifest: compiled.manifest as never })
const theme = session.ensureStylesheetResources(compiled.css).snapshot().cssText
session.dispose()

/** Top-level declarations of the theme layer: later ones win, as in the cascade. Conditional blocks are left out. */
const tokens = new Map<string, string>()
for (const block of theme.matchAll(/:root,:host\{([^{}]*)\}/g)) {
  for (const declaration of block[1].split(/;(?![^(]*\))/)) {
    const at = declaration.indexOf(':')
    if (at > 0) tokens.set(declaration.slice(0, at).trim(), declaration.slice(at + 1).trim())
  }
}

function resolve(value: string, depth = 0): string {
  if (depth > 12) return value
  return value.replace(/var\((--[\w-]+)\)/g, (whole, name) => tokens.has(name) ? resolve(tokens.get(name)!, depth + 1) : whole)
}

const css = compiled.css.replace(/\/\*[\s\S]*?\*\//g, '')
/** Flatten nesting into `selector-path { declaration }` lines. */
const lines: string[] = []
function walk(text: string, path: string[]) {
  let at = 0
  let buffer = ''
  while (at < text.length) {
    const char = text[at]
    if (char === '{') {
      let depth = 1
      let end = at + 1
      for (; end < text.length && depth; end++) depth += text[end] === '{' ? 1 : text[end] === '}' ? -1 : 0
      walk(text.slice(at + 1, end - 1), [...path, buffer.trim().replace(/\s+/g, ' ')])
      buffer = ''
      at = end
    } else if (char === ';') {
      if (buffer.trim()) lines.push(`${path.join(' | ')} { ${resolve(buffer.trim().replace(/\s+/g, ' '))} }`)
      buffer = ''
      at++
    } else { buffer += char; at++ }
  }
  if (buffer.trim()) lines.push(`${path.join(' | ')} { ${resolve(buffer.trim().replace(/\s+/g, ' '))} }`)
}
walk(css, [])

/**
 * The compiler writes a rule that applies a mixin through another path than one it leaves alone, and the two
 * spell the same value differently. Bring both to one spelling, so only a real difference shows.
 */
const parts = (value: string, separator: string) => {
  const found: string[] = []
  let depth = 0
  let current = ''
  for (const char of value) {
    if (char === '(') depth++
    if (char === ')') depth--
    if (char === separator && depth === 0) { found.push(current.trim()); current = '' } else current += char
  }
  if (current.trim()) found.push(current.trim())
  return found
}
function normalize(line: string) {
  const at = line.indexOf(' { ')
  const selector = line.slice(0, at).split(' | ').reduce((path, part) => part.includes('&') ? part.replaceAll('&', path) : path ? `${path} | ${part}` : part, '')
    .replace(/["']/g, '').replace(/\s+/g, ' ')
  const declaration = line.slice(at + 3, -2)
  const colon = declaration.indexOf(':')
  const property = declaration.slice(0, colon).trim()
  let value = declaration.slice(colon + 1).trim().replace(/"/g, "'").replace(/linear-gradient\(180deg,\s*/g, 'linear-gradient(').replace(/\s*,\s*/g, ', ')
  if (property === 'box-shadow') {
    value = parts(value, ',').map(layer => {
      const words = parts(layer, ' ')
      const lengths = words.filter(word => /^-?[\d.]/.test(word))
      const rest = words.filter(word => !/^-?[\d.]/.test(word))
      while (lengths.length < 4) lengths.push('0')
      return [...rest.filter(word => word === 'inset'), ...lengths.map(length => /^0[a-z]*$/.test(length) ? '0' : length), ...rest.filter(word => word !== 'inset')].join(' ')
    }).join(', ')
  }
  if (property === 'background' && parts(value, ',').length === 1) value = parts(value, ' ').sort().join(' ')
  return `${selector} { ${property}: ${value} }`
}
console.log(lines.map(normalize).sort().join('\n'))
