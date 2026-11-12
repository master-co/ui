import { readFileSync } from 'node:fs'

/**
 * The installation guide's "Set up Master UI" prompt, read from the page at build time so the homepage copies
 * exactly what the guide shows.
 */
export function setupPrompt() {
  const source = readFileSync(new URL('../../content/guide/installation/content.mdx', import.meta.url), 'utf8')
  const text = /<DocumentPrompt\b[^>]*?\btitle="Set up Master UI"[^>]*?\btext=\{`((?:\\.|[^`])*)`\}/.exec(source)?.[1]
  if (text === undefined || /(?<!\\)\$\{/.test(text)) throw new Error('The installation guide has no static "Set up Master UI" prompt.')
  return text.replace(/\\([`\\$])/g, '$1')
}
