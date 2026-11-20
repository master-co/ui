/*
 * Keeps every icon the library draws equal to the Master Icons release pinned in package.json.
 *
 *   node --import tsx scripts/icons.ts           reports drawings that differ from the installed release
 *   node --import tsx scripts/icons.ts --write   redraws them and rewrites icons.lock.json
 *
 * @master/ui ships no icon dependency: a component, a contract example, a preview and a mask each carry the
 * drawing itself. A drawing has no name once it is inline, so icons.lock.json records, for every drawing in use,
 * a hash of its geometry and the icon it came from. After the pinned version changes, a drawing that no longer
 * equals the release is found in the lock by its hash and redrawn from the new release.
 *
 * Three forms are read:
 *   - an <svg class="icon" viewBox="0 0 N N"> in markup, in a contract's JSON and in JSX, at the master's own stroke;
 *   - a mask in a stylesheet, a data URI at the stroke its header gives;
 *   - a path a framework component passes to a helper or turns with an expression, and a path a behavior writes
 *     into an element it makes, checked path by path.
 */
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as release from '@master/icons'
import type { IconDefinition, OpticalSize } from '@master/icons'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '../../..')
const lockFile = join(here, 'icons.lock.json')
const noticesFile = join(here, '../THIRD_PARTY_NOTICES.md')

export const version: string = createRequire(import.meta.url)('@master/icons/package.json').version

/** Where a drawing may be written. Paths are relative to the repository. */
const sources: { directory: string, extensions: string[], deep?: boolean }[] = [
  { directory: 'packages/ui/components', extensions: ['.css', '.json'] },
  { directory: 'packages/ui/layouts', extensions: ['.css', '.json'] },
  { directory: 'packages/ui/frameworks', extensions: ['.tsx', '.svelte', '.vue'], deep: true },
  { directory: 'packages/ui/behaviors', extensions: ['.js'] },
  { directory: 'packages/ui', extensions: ['.md'] },
  { directory: 'skills', extensions: ['.md'], deep: true },
  { directory: 'site/content', extensions: ['.mdx'], deep: true },
  { directory: 'site/examples', extensions: ['.html'], deep: true },
]

const native: Record<number, number> = { 16: 1, 20: 1.25, 24: 1.5 }
const definitions = Object.values(release).filter((value): value is IconDefinition =>
  typeof value === 'object' && value !== null && 'variants' in value)

/**
 * The geometry of one icon at a size and a stroke, as the release serializes it. At the master's own stroke this is
 * the master itself; any other width is the release's drawing for that width, which may cut a stroke with a mask.
 */
function draw(definition: IconDefinition, size: number, stroke: number) {
  const master = release.resolveIcon(definition, { opticalSize: size as OpticalSize, corner: 'soft', ...stroke === native[size] ? {} : { strokeWidth: stroke } })
  return release.serializeNodes(master.nodes)
}

const drawn = new Map<string, Map<string, string>>()
/** Every drawing of the release at a size and a stroke, by its geometry. */
function drawings(size: number, stroke: number) {
  const id = `${size}@${stroke}`
  let found = drawn.get(id)
  if (!found) {
    found = new Map()
    for (const definition of definitions) {
      let geometry: string
      try { geometry = draw(definition, size, stroke) } catch { continue }
      if (!found.has(geometry)) found.set(geometry, definition.name)
    }
    drawn.set(id, found)
  }
  return found
}

const named = new Map(definitions.map(definition => [definition.name, definition]))
const key = (name: string, size: number, stroke: number) => stroke === native[size] ? `${size}/${name}` : `${size}/${name}@${stroke}`
const hash = (size: number, stroke: number, geometry: string) =>
  createHash('sha256').update(`${size}@${stroke}:${geometry}`).digest('hex').slice(0, 16)

/** Glyphs a component draws for itself in the masters' header, which the release has no icon for: the reaction's face with a plus. */
const own = new Set(['7bba98e0dd2a7953'])

function fromKey(entry: string) {
  const [, size, name, stroke] = /^(\d+)\/([^@]+)(?:@([\d.]+))?$/.exec(entry)!
  return { name: name!, size: Number(size), stroke: stroke ? Number(stroke) : native[Number(size)]! }
}

/** A drawing is written as markup, inside a JSON string, as JSX or inside a data URI. Each is read back to markup. */
type Form = 'markup' | 'json' | 'jsx' | 'uri'
/** The attributes of a drawing that JSX spells in camel case. An attribute SVG itself writes that way (maskUnits) is not one. */
const hyphenated = ['stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-opacity', 'fill-rule', 'fill-opacity', 'clip-rule', 'clip-path', 'mask-type']
const cased = hyphenated.map(name => name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()))
const camel = (text: string) => hyphenated.reduce((result, name, index) => result.replaceAll(` ${name}="`, ` ${cased[index]}="`), text)
const kebab = (text: string) => cased.reduce((result, name, index) => result.replaceAll(` ${name}="`, ` ${hyphenated[index]}="`), text)
const decode: Record<Form, (text: string) => string> = {
  markup: text => text,
  json: text => text.replaceAll('\\"', '"'),
  jsx: kebab,
  uri: text => text.replaceAll('%3C', '<').replaceAll('%3E', '>').replaceAll('%23', '#').replaceAll('\'', '"'),
}
const encode: Record<Form, (text: string) => string> = {
  markup: text => text,
  json: text => text.replaceAll('"', '\\"'),
  jsx: camel,
  // A filled part keeps currentColor: an image has no text color to take, so it paints black, and a mask reads only
  // where it is painted. A reference to a mask inside the drawing is escaped, or the URL would end at its hash.
  uri: text => text.replaceAll('"', '\'').replaceAll('<', '%3C').replaceAll('>', '%3E').replaceAll('#', '%23'),
}

export type Problem = { file: string, line: number, message: string }
export type Result = { problems: Problem[], redrawn: number, lock: Record<string, string>, changed: string[] }

function files() {
  const found: string[] = []
  const walk = (directory: string, extensions: string[], deep?: boolean) => {
    if (!existsSync(directory)) return
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      const path = join(directory, entry.name)
      if (entry.isDirectory()) { if (deep) walk(path, extensions, deep) }
      else if (extensions.some(extension => entry.name.endsWith(extension))) found.push(path)
    }
  }
  for (const source of sources) walk(join(root, source.directory), source.extensions, source.deep)
  return found
}

export function readLock(): Record<string, string> {
  return existsSync(lockFile) ? JSON.parse(readFileSync(lockFile, 'utf8')).drawings : {}
}

/**
 * Reads every drawing, and with `write` redraws those the lock still names. `lock` is the record to read old
 * drawings from; the result's lock is the record of what is in use now.
 */
export function sync({ write = false, lock = readLock() }: { write?: boolean, lock?: Record<string, string> } = {}): Result {
  const problems: Problem[] = []
  const used = new Map<string, string>()
  const changed: string[] = []
  let redrawn = 0

  for (const path of files()) {
    const file = relative(root, path)
    const source = readFileSync(path, 'utf8')
    const line = (index: number) => source.slice(0, index).split('\n').length
    const jsx = path.endsWith('.tsx')
    const json = path.endsWith('.json')

    /** The geometry to write for a drawing found at a size and a stroke, or undefined when it is not an icon of the release. */
    const resolve = (geometry: string, size: number, stroke: number, index: number) => {
      const current = drawings(size, stroke).get(geometry)
      if (current) {
        used.set(key(current, size, stroke), hash(size, stroke, geometry))
        return geometry
      }
      const entry = lock[hash(size, stroke, geometry)]
      const definition = entry && named.get(fromKey(entry).name)
      if (!definition) {
        problems.push({ file, line: line(index), message: `a ${size}px drawing at a ${stroke} stroke that Master Icons ${version} does not hold` })
        return
      }
      const next = draw(definition, size, stroke)
      used.set(key(definition.name, size, stroke), hash(size, stroke, next))
      redrawn++
      if (!write) problems.push({ file, line: line(index), message: `${entry} differs from Master Icons ${version}` })
      return next
    }

    let output = source.replace(/(<svg\b[^>]*>)([\s\S]*?)(<\/svg>)/g, (match, open: string, inner: string, close: string, index: number) => {
      const tag = json ? decode.json(open) : open
      if (!/\bclass(?:Name)?="icon(?: [^"]*)?"/.test(tag)) return match
      const size = Number(/viewBox="0 0 (\d+) \1"/.exec(tag)?.[1])
      if (!native[size]) {
        problems.push({ file, line: line(index), message: 'an icon whose viewBox is not a Master Icons master (16, 20 or 24)' })
        return match
      }
      // A path a component turns or lists itself is checked path by path below.
      if (/[{]|:transform=/.test(inner)) return match
      const form: Form = json ? 'json' : jsx ? 'jsx' : 'markup'
      // A component's source closes an empty element with a space before the slash; the release writes none.
      const spaced = inner.includes('" />')
      const next = resolve(decode[form](spaced ? inner.replaceAll('" />', '"/>') : inner), size, native[size]!, index)
      if (next === undefined) return match
      return open + encode[form](spaced ? next.replaceAll('"/>', '" />') : next) + close
    })

    if (path.endsWith('.css')) {
      output = output.replace(/(url\("data:image\/svg\+xml,)(%3Csvg [^%]*%3E)(.*?)(%3C\/svg%3E"\))/g, (match, start: string, open: string, inner: string, end: string, index: number) => {
        const header = /viewBox='0 0 (\d+) \1' fill='none' stroke='(?:black|%23[0-9a-f]{3,8})' stroke-width='([\d.]+)' stroke-linecap='round' stroke-linejoin='round'/.exec(open)
        const size = Number(header?.[1])
        const stroke = Number(header?.[2])
        // A mask is stroked in black; a drawing used as a background image keeps the grey it is given.
        // A glyph a component draws for itself (a star, a quote, a face) has another header and is left alone.
        if (!header || !native[size] || !Number.isInteger(stroke * 4)) return match
        const geometry = decode.uri(inner)
        if (own.has(hash(size, stroke, geometry))) return match
        const next = resolve(geometry, size, stroke, index)
        return next === undefined ? match : start + open + encode.uri(next) + end
      })
    }

    if (/frameworks|behaviors/.test(file)) {
      const paths = new Set<string>()
      for (const definition of definitions)
        for (const [, attributes] of definition.variants[16].soft.nodes) if (typeof attributes.d === 'string') paths.add(attributes.d)
      const dynamic = [...output.matchAll(/<svg\b[^>]*\bclass(?:Name)?="icon(?: [^"]*)?"[^>]*>([\s\S]*?)<\/svg>/g)]
        .filter(([, inner]) => /[{]|:transform=/.test(inner!))
      for (const found of dynamic)
        for (const [, d] of found[1]!.matchAll(/\bd="([^"]+)"/g))
          if (!paths.has(d!)) problems.push({ file, line: line(found.index), message: `a path that is not in a 16px drawing of Master Icons ${version}` })
      // Paths handed to a helper as strings: icon('M3 8L13 8', …).
      for (const found of output.matchAll(/'(M[\d.]+ [\d.]+[A-Za-z][^']*)'/g))
        if (!paths.has(found[1]!)) problems.push({ file, line: line(found.index), message: `a path that is not in a 16px drawing of Master Icons ${version}` })
    }

    if (output !== source) {
      changed.push(file)
      if (write) writeFileSync(path, output)
    }
  }

  const next = Object.fromEntries([...used].sort(([a], [b]) => a.localeCompare(b)).map(([entry, digest]) => [digest, entry]))
  if (write) {
    writeFileSync(lockFile, `${JSON.stringify({ '@master/icons': version, drawings: next }, null, 2)}\n`)
    writeFileSync(noticesFile, notices(next))
  }
  return { problems, redrawn, lock: next, changed }
}

type Source = { kind: string, author?: string, copyright?: string, license?: string, licenseFile?: string, reference?: string }
/** Which license text of the release covers a drawing made after another work. A new origin has to be named here. */
const licenses: [RegExp, string][] = [
  [/github\.com\/hugeicons\//, 'hugeicons-MIT.txt'],
  [/github\.com\/tabler\//, 'tabler.txt'],
  [/github\.com\/lucide-icons\//, 'lucide.txt'],
  [/github\.com\/phosphor-icons\//, 'phosphor.txt'],
]

/**
 * THIRD_PARTY_NOTICES.md for the drawings in use: the release's own license, then every drawing its catalog records
 * as made after another work, with that work's license in full. The package publishes the file beside its LICENSE.
 */
export function notices(lock: Record<string, string> = readLock()) {
  const require = createRequire(import.meta.url)
  const base = dirname(require.resolve('@master/icons/package.json'))
  const catalog: { icons: { name: string, source: Source }[] } = require('@master/icons/catalog')
  const names = [...new Set(Object.values(lock).map(entry => fromKey(entry).name))].sort()
  const rows: string[] = []
  const texts = new Map<string, string>()
  for (const name of names) {
    const source = catalog.icons.find(icon => icon.name === name)?.source
    if (!source) throw new Error(`Master Icons ${version} has no catalog entry for ${name}`)
    if (source.kind === 'authored') continue
    const file = source.licenseFile?.replace('licenses/', '') ?? licenses.find(([origin]) => origin.test(source.reference ?? ''))?.[1]
    if (!file) throw new Error(`No license text is named for ${name} (${source.reference})`)
    texts.set(file, readFileSync(join(base, 'licenses', file), 'utf8').trim())
    rows.push(`| \`${name}\` | ${source.copyright} | ${source.license} | [source](${source.reference}) |`)
  }
  return [
    '# Third-party notices',
    '',
    `The icons drawn in this package's components, framework components, contract examples and masks are drawings of [Master Icons](https://icons.master.co) ${version}, copied into the source. This file is written by \`scripts/icons.ts\` from that release's catalog.`,
    '',
    '## Master Icons — MIT',
    '',
    '```text',
    readFileSync(join(base, 'LICENSE'), 'utf8').trim(),
    '```',
    '',
    '## Drawings made after other works',
    '',
    `Of the ${names.length} icons in use, Master Icons records these ${rows.length} as studies or redraws of another library's icon. Their notices are kept here.`,
    '',
    '| Icon | Copyright | License | Reference |',
    '| --- | --- | --- | --- |',
    ...rows,
    ...[...texts].sort(([a], [b]) => a.localeCompare(b)).flatMap(([file, text]) => ['', `### ${file}`, '', '```text', text, '```']),
    '',
  ].join('\n')
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const write = process.argv.includes('--write')
  const { problems, redrawn, lock, changed } = sync({ write })
  for (const problem of problems) console.error(`${problem.file}:${problem.line}  ${problem.message}`)
  console.log(write
    ? `Master Icons ${version}: ${Object.keys(lock).length} drawings in use, ${redrawn} redrawn in ${changed.length} files.`
    : `Master Icons ${version}: ${Object.keys(lock).length} drawings in use, ${problems.length} problems.`)
  if (problems.length) process.exit(1)
}
