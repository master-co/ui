import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Every navigation waits for a page from the edge, and from far away that is one long round trip. Prefetch the
 * page a link leads to once the pointer rests on it (`moderate`), so the trip is under way before the click. Only
 * pages: a link to a file (`.md`, `.json`, `.css`, `.txt`) or to the registry is left alone. Prefetch fetches the
 * document only, not what it loads, and a browser without speculation rules ignores the script.
 */
export const speculationRules = {
  prefetch: [{
    where: { and: [{ href_matches: '/*' }, { not: { href_matches: '/*.*' } }, { not: { href_matches: '/r/*' } }] },
    eagerness: 'moderate'
  }]
}

const tag = `<script type="speculationrules">${JSON.stringify(speculationRules)}</script>`

export function addSpeculationRules(html) {
  if (html.includes('<script type="speculationrules">')) return html
  const end = html.indexOf('</head>')
  return end === -1 ? html : html.slice(0, end) + tag + html.slice(end)
}

/** Adds the rules to every built page in place. */
export async function addSpeculationRulesIn(directory) {
  for (const file of await readdir(directory, { recursive: true })) {
    if (!file.endsWith('.html')) continue
    const path = join(directory, file)
    const html = await readFile(path, 'utf8')
    const ruled = addSpeculationRules(html)
    if (ruled !== html) await writeFile(path, ruled)
  }
}
