import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const islandOpeningTag = /<astro-island\b[^>]*>/g
const uidAttribute = /\suid="[^"]*"/

/**
 * Astro hashes each island's absolute source path into its `uid`, so the same commit built in
 * another checkout directory (a GitHub runner, then Cloudflare Pages) differs by a few bytes on
 * every page, and the delivered output could never match the verified one. Browsers do not read
 * `uid` outside development; derive it from the island's public attributes and its occurrence
 * among identical islands on the page, so it stays unique and the output is byte-identical everywhere.
 */
export function stabilizeIslandIds(html) {
  const seen = new Map()
  return html.replace(islandOpeningTag, tag => {
    if (!uidAttribute.test(tag)) return tag
    const identity = tag.replace(uidAttribute, '')
    const occurrence = seen.get(identity) ?? 0
    seen.set(identity, occurrence + 1)
    const uid = createHash('sha256').update(`${identity}\n${occurrence}`).digest('base64url').slice(0, 8)
    return tag.replace(uidAttribute, ` uid="${uid}"`)
  })
}

/** Rewrites every built HTML page in place. */
export async function stabilizeIslandIdsIn(directory) {
  for (const file of await readdir(directory, { recursive: true })) {
    if (!file.endsWith('.html')) continue
    const path = join(directory, file)
    const html = await readFile(path, 'utf8')
    const stable = stabilizeIslandIds(html)
    if (stable !== html) await writeFile(path, stable)
  }
}
