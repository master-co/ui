/**
 * Portable previews use the same static markup as the page, including a template
 * exported once and passed to several previews. Never execute an MDX expression.
 */
export function previewMarkdown(source: string, options: { example?: (id: string) => string } = {}): string {
  const specimens = new Map<string, string>()
  const body = source.replace(/^export const (\w+) = `((?:\\.|[^`])*)`[ \t]*;?[ \t]*(?:\r?\n|$)/gm, (_, name, html) => {
    specimens.set(name, html)
    return ''
  })

  // Quoted strings and templates are single units, so an SVG's /> or an HTML
  // attribute inside the specimen cannot end the preview or supply its title.
  return body.replace(/<(?:ComponentPreview|PagePreview)\b((?:`(?:\\.|[^`])*`|"[^"]*"|'[^']*'|[^"'`>])*)\/>/g, (_, props: string) => {
    // A working example is files, not one string: its owner writes them out, with what it needs to run.
    const example = /\bexample="([^"]+)"/.exec(props)?.[1]
    if (example) {
      if (!options.example) throw new Error(`Markdown previews of an example need its files: ${example}`)
      const title = /\btitle="([^"]*)"/.exec(props)?.[1]
      const caption = /\bcaption="([^"]*)"/.exec(props)?.[1]
      return [title && `**${title}**`, options.example(example), caption].filter(Boolean).join('\n\n')
    }
    const markup = /\bhtml=\{(?:`((?:\\.|[^`])*)`|(\w+))\}/.exec(props)
    const html = markup?.[1] ?? (markup?.[2] ? specimens.get(markup[2]) : undefined)
    if (html === undefined || /(?<!\\)\$\{/.test(html)) {
      throw new Error('Markdown previews need static html: use a template literal or an exported template constant.')
    }
    const attributes = props.replace(markup![0], '')
    const title = /\btitle="([^"]*)"/.exec(attributes)?.[1]
    const caption = /\bcaption="([^"]*)"/.exec(attributes)?.[1]
    return [title && `**${title}**`, `\`\`\`html\n${html}\n\`\`\``, caption].filter(Boolean).join('\n\n')
  })
}
