import type { Language } from './examples'

/**
 * A small highlighter for the homepage's framework examples: TSX, Svelte and Vue single-file components. It
 * reads tags with their attributes, `{…}` expressions inside markup and plain TypeScript in `<script>` and in
 * a TSX file, which is all those examples hold. Each line comes out as one `.ui-frameworks-line` span, with
 * `.k` keywords, `.s` strings, `.n` numbers, `.c` comments, `.t` tag names, `.a` attribute names and `.p` the
 * punctuation of a tag.
 */
type Kind = 'k' | 's' | 'n' | 'c' | 't' | 'a' | 'p' | ''

const keywords = new Set(['as', 'const', 'default', 'else', 'export', 'false', 'from', 'function', 'if', 'import', 'let', 'new', 'null', 'return', 'true', 'type', 'undefined'])

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function highlightSource(source: string, language: Language) {
  const tokens: { kind: Kind, text: string }[] = []
  let at = 0
  const push = (kind: Kind, text: string) => {
    if (!text) return
    at += text.length
    tokens.push({ kind, text })
  }
  const match = (pattern: RegExp) => {
    pattern.lastIndex = at
    return pattern.exec(source)?.[0] ?? ''
  }

  /** A quoted string, from its opening quote to the same quote. */
  const string = () => {
    const quote = source[at]
    const end = source.indexOf(quote, at + 1)
    push('s', source.slice(at, end < 0 ? source.length : end + 1))
  }

  /** TypeScript, until the brace that closes an expression or the closing tag of a `<script>`. */
  const code = (until: 'brace' | 'close' | 'end') => {
    let depth = 0
    /** Whether a `<` here opens a tag rather than comparing or opening type arguments. */
    let tagCanStart = true
    while (at < source.length) {
      const character = source[at]
      if (source.startsWith('//', at)) push('c', match(/\/\/[^\n]*/y))
      else if (character === '\'' || character === '"' || character === '`') { string(); tagCanStart = false }
      else if (/\s/.test(character)) push('', match(/\s+/y))
      else if (/\d/.test(character)) { push('n', match(/\d+(?:\.\d+)?/y)); tagCanStart = false }
      else if (/[A-Za-z_$]/.test(character)) {
        const word = match(/[\w$]+/y)
        push(keywords.has(word) ? 'k' : '', word)
        tagCanStart = word === 'return'
      }
      else if (until === 'close' && source.startsWith('</script', at)) return
      else if (character === '<' && tagCanStart && /[A-Za-z/>]/.test(source[at + 1] ?? '')) {
        if (source[at + 1] === '/') tag()
        else element()
        tagCanStart = false
      }
      else if (character === '{') { depth++; push('', '{'); tagCanStart = true }
      else if (character === '}') {
        if (depth === 0 && until === 'brace') return
        depth--
        push('', '}')
        tagCanStart = false
      }
      else {
        push('', character)
        tagCanStart = /[(\[,=:?&|!{;]/.test(character)
      }
    }
  }

  /** An expression in braces, braces included. */
  const expression = () => {
    push('', '{')
    code('brace')
    push('', source[at] === '}' ? '}' : '')
  }

  /** One tag, open or closing; says its name and whether it closes itself. */
  const tag = () => {
    const closing = source.startsWith('</', at)
    push('p', closing ? '</' : '<')
    const name = match(/[\w.:-]*/y)
    push('t', name)
    while (at < source.length) {
      const character = source[at]
      if (source.startsWith('/>', at)) { push('p', '/>'); return { name, closing, closed: true } }
      if (character === '>') { push('p', '>'); return { name, closing, closed: closing } }
      if (/\s/.test(character)) push('', match(/\s+/y))
      else if (character === '\'' || character === '"') string()
      else if (character === '{') expression()
      else if (character === '=') push('p', '=')
      else {
        const attribute = match(/[^\s=>/{'"]+/y)
        if (attribute) push('a', attribute)
        else push('', character)
      }
    }
    return { name, closing, closed: true }
  }

  /** Text and elements, until the closing tag of the element they are in. */
  const children = () => {
    while (at < source.length) {
      if (source.startsWith('</', at)) { tag(); return }
      const character = source[at]
      if (character === '<' && /[A-Za-z>]/.test(source[at + 1] ?? '')) element()
      else if (character === '{') expression()
      else push('', match(/[^<{]+/y) || character)
    }
  }

  /** An element: its open tag, then its script or its children up to its closing tag. */
  const element = () => {
    const { name, closed } = tag()
    if (closed) return
    if (name === 'script') {
      code('close')
      if (at < source.length) tag()
    }
    else children()
  }

  if (language === 'tsx') code('end')
  else children()

  /* One span per line: a token that crosses a line break is cut in two. */
  const lines: string[] = ['']
  for (const { kind, text } of tokens) {
    text.split('\n').forEach((part, index) => {
      if (index) lines.push('')
      if (part) lines[lines.length - 1] += kind ? `<span class="${kind}">${escape(part)}</span>` : escape(part)
    })
  }
  return lines.map(line => `<span class="ui-frameworks-line">${line || ' '}</span>`).join('\n')
}
