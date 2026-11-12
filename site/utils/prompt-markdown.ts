/**
 * A copyable prompt keeps its exact text in portable Markdown, as a plain-text
 * fence titled like the rendered panel. Never execute an MDX expression.
 */
export function promptMarkdown(source: string): string {
  return source.replace(/<DocumentPrompt\b((?:`(?:\\.|[^`])*`|"[^"]*"|'[^']*'|[^"'`>])*)\/>/g, (_, props: string) => {
    const title = /\btitle="([^"]+)"/.exec(props)?.[1]
    const text = /\btext=\{`((?:\\.|[^`])*)`\}/.exec(props)?.[1]
    if (!title || text === undefined || /(?<!\\)\$\{/.test(text)) {
      throw new Error('Markdown prompts need a literal title and a static template literal text.')
    }
    const body = text.replace(/\\([`\\$])/g, '$1')
    const fence = '`'.repeat(Math.max(3, ...[...body.matchAll(/`+/g)].map(run => run[0].length + 1)))
    return `**${title}**\n\n${fence}text\n${body}\n${fence}`
  })
}
