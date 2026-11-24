import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * A preview is a document of its own (`srcdoc`), and its island keeps the same document again as hydration data.
 * Whatever a preview carries inline is therefore delivered twice per preview and never cached: the behaviors
 * bundle, 205 KB, was on a chart page eleven times over. And each preview's stylesheet is the whole library plus the
 * few utilities that preview uses, so every page downloaded the library again under a new name.
 *
 * This runs on the built site, after every page is written, and changes how the previews are delivered, not what
 * they are: a large inline script becomes a file named by its content, and each preview stylesheet is split where
 * it stops being shared, into the part every preview of that theme has (one file for the whole site) and the part
 * that is its own. Both stylesheets are linked in their original order, so the cascade is the one the preview had.
 * Names come from content alone, so a build in another directory writes the same bytes.
 */

const previewStyles = 'preview-styles'
const previewScripts = 'preview-scripts'
/** A script below this stays inline: a request would cost more than the bytes. */
const minimumExternalScript = 16 * 1024

const styleLink = /<link rel="stylesheet" href="\/preview-styles\/([0-9a-f]{64})\.css">/g
const inlineScript = /<script>([\s\S]*?)<\/script>/g
const srcdocAttribute = /(\ssrcdoc=")([^"]*)(")/g
const propsAttribute = /(\sprops=")([^"]*)(")/g

const decode = value => value.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&amp;', '&')
/** Svelte's attribute escaping, which wrote `srcdoc`. */
const encodeSrcdoc = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
/** Astro's attribute escaping, which wrote an island's `props`. */
const encodeProps = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll("'", '&#39;').replaceAll('"', '&quot;')

const sha256 = value => createHash('sha256').update(value).digest('hex')

/**
 * Where a CSS text's top-level statements end: after a `}` that closes a top-level block, or a `;` at the top
 * level (`@layer a, b;`). Strings and comments are skipped, so a brace inside them is not structure.
 */
export function topLevelBoundaries(css) {
  const boundaries = []
  let depth = 0
  for (let index = 0; index < css.length; index++) {
    const character = css[index]
    if (character === '"' || character === "'") {
      for (index++; index < css.length && css[index] !== character; index++) if (css[index] === '\\') index++
    } else if (character === '/' && css[index + 1] === '*') {
      const end = css.indexOf('*/', index + 2)
      index = end === -1 ? css.length : end + 1
    } else if (character === '{') {
      depth++
    } else if (character === '}') {
      depth--
      if (depth === 0) boundaries.push(index + 1)
    } else if (character === ';' && depth === 0) {
      boundaries.push(index + 1)
    }
  }
  return boundaries
}

/**
 * Chooses, for every stylesheet, where its shared part ends. Each top-level boundary's prefix is counted across all
 * the stylesheets. Along one stylesheet those counts only fall: every preview, then every preview of its theme, then
 * fewer and fewer as its own utilities begin. The longest stretch at one count of at least two is the part its theme
 * shares, and it ends where the count falls again. Every stylesheet of a theme walks the same counts there, so they
 * all end it at the same place and name the same shared file.
 * @param {Map<string, string>} sheets the stylesheets by name
 * @returns {Map<string, number>} the offset to split each stylesheet at; a stylesheet that shares nothing is absent
 */
export function sharedSplits(sheets) {
  const counts = new Map()
  const prefixes = new Map()
  for (const [name, css] of sheets) {
    const hash = createHash('sha256')
    let previous = 0
    const keys = []
    for (const boundary of topLevelBoundaries(css)) {
      hash.update(css.slice(previous, boundary))
      previous = boundary
      const key = hash.copy().digest('base64')
      keys.push([boundary, key])
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    prefixes.set(name, keys)
  }
  const splits = new Map()
  for (const [name, keys] of prefixes) {
    const length = sheets.get(name).length
    let best = 0
    let bestSpan = 0
    let runStart = 0
    for (let index = 0; index < keys.length; index++) {
      const [boundary, key] = keys[index]
      const count = counts.get(key)
      const next = keys[index + 1]
      if (next && counts.get(next[1]) === count) continue
      // `boundary` closes a run of prefixes that all have `count` sheets.
      if (count >= 2 && boundary - runStart > bestSpan) {
        best = boundary
        bestSpan = boundary - runStart
      }
      runStart = boundary
    }
    if (best > 0 && best < length) splits.set(name, best)
  }
  return splits
}

async function htmlFiles(directory) {
  return (await readdir(directory, { recursive: true })).filter(file => file.endsWith('.html')).sort()
}

/** Rewrites the preview documents of every built page in place and writes the files they now link. */
export async function sharePreviewAssetsIn(directory) {
  const pages = await htmlFiles(directory)
  const referenced = new Set()
  for (const page of pages) {
    const html = await readFile(join(directory, page), 'utf8')
    // A link in `srcdoc` or in `props` is escaped, but its file name is the same in either.
    for (const [, name] of html.matchAll(/\/preview-styles\/([0-9a-f]{64})\.css/g)) referenced.add(name)
  }

  const stylesDirectory = join(directory, previewStyles)
  const sheets = new Map()
  for (const name of [...referenced].sort()) sheets.set(name, await readFile(join(stylesDirectory, `${name}.css`), 'utf8'))
  const splits = sharedSplits(sheets)
  const replacements = new Map()
  const written = new Set()
  for (const [name, split] of splits) {
    const css = sheets.get(name)
    const shared = css.slice(0, split)
    const own = css.slice(split)
    const sharedName = sha256(shared)
    const ownName = sha256(own)
    written.add(sharedName).add(ownName)
    await writeFile(join(stylesDirectory, `${sharedName}.css`), shared)
    await writeFile(join(stylesDirectory, `${ownName}.css`), own)
    replacements.set(name, `<link rel="stylesheet" href="/${previewStyles}/${sharedName}.css"><link rel="stylesheet" href="/${previewStyles}/${ownName}.css">`)
  }

  const scripts = new Map()
  const transform = document => {
    if (!document.startsWith('<!doctype html>')) return document
    return document
      .replace(styleLink, (link, name) => replacements.get(name) ?? link)
      .replace(inlineScript, (script, body) => {
        if (body.length < minimumExternalScript) return script
        const name = sha256(body).slice(0, 32)
        scripts.set(name, body)
        return `<script src="/${previewScripts}/${name}.js"></script>`
      })
  }
  const visitStrings = value => {
    if (typeof value === 'string') return transform(value)
    if (Array.isArray(value)) return value.map(visitStrings)
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, visitStrings(item)]))
    return value
  }

  for (const page of pages) {
    const path = join(directory, page)
    const html = await readFile(path, 'utf8')
    // A standalone demo can serve the same preview document directly, without an iframe.
    const document = page.startsWith('demo/') ? transform(html) : html
    if (document === html && !html.includes('srcdoc=')) continue
    const rewritten = document
      .replace(srcdocAttribute, (attribute, open, value, close) => {
        const document = decode(value)
        if (encodeSrcdoc(document) !== value) throw new Error(`${page}: a preview's srcdoc is not escaped as expected`)
        return open + encodeSrcdoc(transform(document)) + close
      })
      .replace(propsAttribute, (attribute, open, value, close) => {
        if (!value.includes('&lt;!doctype html&gt;')) return attribute
        const json = decode(value)
        if (encodeProps(json) !== value) throw new Error(`${page}: an island's props are not escaped as expected`)
        const props = JSON.parse(json)
        if (JSON.stringify(props) !== json) throw new Error(`${page}: an island's props do not survive JSON`)
        return open + encodeProps(JSON.stringify(visitStrings(props))) + close
      })
    if (rewritten !== html) await writeFile(path, rewritten)
  }

  // Nothing links a split stylesheet any more; leaving it would deploy the library again under each old name.
  for (const page of pages) {
    const html = await readFile(join(directory, page), 'utf8')
    for (const [, name] of html.matchAll(/\/preview-styles\/([0-9a-f]{64})\.css/g)) {
      if (splits.has(name)) throw new Error(`${page} still links /${previewStyles}/${name}.css after it was split`)
    }
  }
  for (const name of splits.keys()) if (!written.has(name)) await rm(join(stylesDirectory, `${name}.css`))

  if (!scripts.size) return
  const scriptsDirectory = join(directory, previewScripts)
  await mkdir(scriptsDirectory, { recursive: true })
  for (const [name, body] of [...scripts].sort(([a], [b]) => a.localeCompare(b))) await writeFile(join(scriptsDirectory, `${name}.js`), body)
}
