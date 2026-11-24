import { fromMarkdown } from 'mdast-util-from-markdown'
import { toString } from 'mdast-util-to-string'
import { visit } from 'unist-util-visit'
import GithubSlugger from 'github-slugger'

/** MDX adapters operate on authored prose. Preserve literal examples across every transformation. */
export function preserveFences(source: string, transform: (prose: string) => string) {
  const examples: string[] = []
  const prose: string[] = []
  let marker = '', block = ''
  for (const line of source.split(/(?<=\n)/)) {
    const fence = /^ {0,3}(`{3,}|~{3,})([^\n]*)/.exec(line)
    if (!marker && !fence) {
      prose.push(line)
      continue
    }
    block += line
    if (!marker) {
      marker = fence![1]
      prose.push(`\u0000fence${examples.length}\u0000`)
    } else if (fence && fence[1][0] === marker[0] && fence[1].length >= marker.length && !fence[2].trim()) {
      examples.push(block.replace(/\n$/, ''))
      if (block.endsWith('\n')) prose.push('\n')
      marker = block = ''
    }
  }
  if (marker) examples.push(block)
  return transform(prose.join('')).replace(/\u0000fence(\d+)\u0000/g, (_, index) => examples[Number(index)])
}

export function relatedMarkdown(source: string, link: (section: string, slug: string) => string) {
  return source.replace(/^<ComponentLinks\b([^>]*?)\s*\/>[ \t]*$/gm, (tag, props: string) => {
    const section = /\bkind\s*=\s*["']([\w-]+)["']/.exec(props)?.[1] ?? 'components'
    const list = /\bslugs\s*=\s*\{\s*\[([^\]]*)\]\s*\}/.exec(props)
    if (!list || !/^\s*(?:['"][\w-]+['"]\s*,?\s*)*$/.test(list[1])) throw new Error('Expected static slugs in ' + tag)
    return [...list[1].matchAll(/['"]([\w-]+)['"]/g)].map(([, slug]) => '- ' + link(section, slug)).join('\n')
  })
}

/** Read real Markdown nodes so examples and inline code cannot create anchors or change destinations. */
export function markdownReferences(source: string) {
  const anchors = new Set<string>()
  const links: { url: string, start: number, end: number }[] = []
  const slugger = new GithubSlugger()
  visit(fromMarkdown(source), node => {
    if (node.type === 'heading') anchors.add(slugger.slug(toString(node)))
    if (node.type === 'html') for (const match of node.value.matchAll(/<a\s+id="([^"]+)"/g)) anchors.add(match[1])
    if (node.type !== 'link' && node.type !== 'definition') return
    const { start, end } = node.position!
    const text = source.slice(start.offset, end.offset)
    // Only replace a literal destination. Escaped or otherwise complex URLs stay as authored.
    const labelEnd = node.type === 'link' ? (node.children.at(-1)?.position?.end.offset ?? start.offset!) - start.offset! : 0
    const delimiter = node.type === 'definition' ? ']:' : ']('
    const at = text.indexOf(node.url, text.indexOf(delimiter, labelEnd) + 2)
    if (at >= 0 && node.url) links.push({ url: node.url, start: start.offset! + at, end: start.offset! + at + node.url.length })
  })
  return { anchors, links }
}
