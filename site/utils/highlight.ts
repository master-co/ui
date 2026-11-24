import highlight from '@master/internal-site/css/highlight.ts'
import type { Element, Root } from 'hast'

// These names recur thousands of times per preview. Their palette lives in globals.css.
const colors = new Map(Object.entries({
  text: 'ht', punctuation: 'hp', property: 'ha', string: 'hs', function: 'hf',
  keyword: 'hk', number: 'hn', comment: 'hc'
}).map(([token, name]) => [`color:var(--ui-code-${token})`, name]))

function compactTokens(parent: Root | Element, merge: boolean) {
  let previous: Element | undefined
  parent.children = parent.children.filter(child => {
    if (child.type !== 'element') { previous = undefined; return true }
    const style = child.properties.style
    const color = child.tagName === 'span' && typeof style === 'string' && colors.get(style)
    if (!color || Object.keys(child.properties).length !== 1 || child.children.some(node => node.type !== 'text')) {
      compactTokens(child, merge)
      previous = undefined
      return true
    }
    delete child.properties.style
    child.properties.className = [color]
    if (merge && previous && Array.isArray(previous.properties.className) && previous.properties.className[0] === color) {
      previous.children.push(...child.children)
      return false
    }
    previous = child
    return true
  }) as typeof parent.children
}

export default async function highlightSource(...args: Parameters<typeof highlight>) {
  const tree = await highlight(...args)
  // Shell spans also supply hanging indents; preserve their individual boxes.
  if (!args[1].inline) compactTokens(tree, !['sh', 'shell', 'bash'].includes(args[1].lang))
  return tree
}
