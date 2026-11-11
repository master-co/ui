/**
 * The contract checker: reads markup and reports where it breaks a Master UI contract.
 *
 * It has no dependency and does not run a browser. It reads tags, classes and attributes from HTML and from
 * templates that look like HTML (JSX, Svelte, Vue, Astro), so it is deliberately cautious: whatever it cannot
 * know, such as a class that comes from an expression or a part whose root lives in another file, it leaves alone.
 *
 * @typedef {{ name: string, kind: 'root' | 'part' | 'modifier', of?: string | string[], description: string, elements?: string[], attributes?: Record<string, true | string | string[]>, label?: true, exclusive?: string, anywhere?: true }} ContractClass
 * @typedef {{ name: string, title: string, tier: string, classes: ContractClass[], [key: string]: unknown }} Contract
 * @typedef {{ code: string, severity: 'error' | 'warning' | 'info', message: string, line: number, column: number, className?: string, contract?: string }} Diagnostic
 * @typedef {{ tag: string, attributes: Map<string, string | true | null>, classes: string[], dynamic: boolean, spread: boolean, line: number, column: number, parent: Element | null, text: boolean, opaque: boolean }} Element
 *   opaque: the element starts a piece of markup whose place is not known: one a script holds in an expression,
 *   or a template block that is rendered somewhere else.
 * @typedef {{ knows?: (className: string) => boolean, strict?: boolean }} CheckOptions
 *   knows: whether a class that is in no contract is something else the project defines, such as a utility.
 *   strict: report a class that only looks like a Master UI class as an error; use it when `knows` is complete.
 */

const voidElements = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'])
const rawText = new Set(['script', 'style'])
/** Elements a word may run straight into, as in `Save<kbd>`. Any other `word<name` is read as a generic or a comparison. */
const inlineElements = new Set(['a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'button', 'cite', 'code', 'data', 'del', 'dfn', 'em', 'i', 'img', 'input', 'ins', 'kbd', 'label', 'mark', 'q', 's', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'svg', 'time', 'u', 'var', 'wbr', 'div', 'p', 'ul', 'ol', 'li', 'select', 'textarea'])
const tagName = /[A-Za-z][\w.:-]*/y
const attributeName = /[^\s=/>{}"']+/y

/** An HTML element name: lower case, no dash, no dot. Anything else is a component or a custom element. */
const isNative = (/** @type {string} */ tag) => /^[a-z][a-z0-9]*$/.test(tag)

/** What a part or a modifier belongs to, always as a list. */
export const owners = (/** @type {ContractClass} */ entry) => entry.of === undefined ? [] : Array.isArray(entry.of) ? entry.of : [entry.of]

/**
 * Index contracts by class.
 * @param {Contract[]} contracts
 */
export function createIndex(contracts) {
  /** @type {Map<string, { entry: ContractClass, contract: Contract }>} */
  const classes = new Map()
  for (const contract of contracts) {
    for (const entry of contract.classes) classes.set(entry.name, { entry, contract })
  }
  const roots = [...classes.values()].filter(({ entry }) => entry.kind === 'root').map(({ entry }) => entry.name)
  return { classes, roots }
}

/** Stands where an expression was, so that a word it is part of (`toast-${status}`) is known to be computed. */
const computed = '\u0000'

/** String literals inside an expression: the classes it can produce. */
function literals(/** @type {string} */ expression) {
  const found = []
  for (const match of expression.matchAll(/"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|`([^`\\]*(?:\\.[^`\\]*)*)`/g)) {
    found.push((match[1] ?? match[2] ?? match[3] ?? '').replace(/\$\{[^}]*\}/g, computed))
  }
  return found.join(' ')
}

/** The class names in a value. A word with a computed part is left out: only the framework knows what it is. */
const words = (/** @type {string} */ value) => value.split(/\s+/).filter(word => /^[\w@:()./%#,!*-]+$/.test(word))

/**
 * Read the elements of a document or a template, in source order.
 * @param {string} source
 * @returns {Element[]}
 */
export function parse(source) {
  /** @type {Element[]} */
  const elements = []
  /** @type {Element[]} */
  const stack = []
  const length = source.length
  let index = 0
  let line = 1
  let lineStart = 0
  /** How deep the stack was where each open `{#snippet}` began: what it holds is rendered somewhere else. */
  const snippets = []

  const advance = (/** @type {number} */ to) => {
    for (let at = source.indexOf('\n', index); at !== -1 && at < to; at = source.indexOf('\n', at + 1)) {
      line++
      lineStart = at + 1
    }
    index = to
  }
  const mark = () => {
    for (const open of stack) {
      if (open.tag === 'svg') return
    }
    for (const open of stack) open.text = true
  }

  /** The end of a braced expression that starts at `from`, strings and nested braces skipped. */
  const braces = (/** @type {number} */ from) => {
    let depth = 0
    for (let at = from; at < length; at++) {
      const char = source[at]
      if (char === '"' || char === '\'' || char === '`') {
        for (at++; at < length && source[at] !== char; at++) if (source[at] === '\\') at++
      } else if (char === '{') depth++
      else if (char === '}' && --depth === 0) return at + 1
    }
    return length
  }

  while (index < length) {
    const open = source.indexOf('<', index)
    const text = source.slice(index, open === -1 ? length : open)
    for (const [block] of text.matchAll(/\{#snippet\b|\{\/snippet\}/g)) {
      if (block === '{/snippet}') snippets.pop()
      else snippets.push(stack.length)
    }
    if (stack.length && /[^\s{}()[\];,]/.test(text)) mark()
    if (open === -1) break
    advance(open)

    if (source.startsWith('<!--', index)) {
      const end = source.indexOf('-->', index + 4)
      advance(end === -1 ? length : end + 3)
      continue
    }

    if (source[index + 1] === '/') {
      tagName.lastIndex = index + 2
      const closing = tagName.exec(source)?.[0]
      const end = source.indexOf('>', index)
      if (closing) {
        const at = stack.findLastIndex(element => element.tag === closing)
        if (at !== -1) stack.length = at
      }
      advance(end === -1 ? length : end + 1)
      continue
    }

    tagName.lastIndex = index + 1
    const tag = tagName.exec(source)?.[0]
    // A `<` that opens no tag: a comparison or an arrow. A generic such as `Map<string, number>` is told apart
    // by the word character right before it and a name that is no inline element.
    if (!tag || (/[\w)\]]/.test(source[index - 1] ?? '') && !inlineElements.has(tag))) {
      advance(index + 1)
      continue
    }

    // Markup with no element around it that follows an operator, a bracket, `return` or the end of a template
    // block (`{/if}`, `{#snippet row()}`) is a value: a script or a template puts it where this file cannot see.
    const before = stack.length ? '' : source.slice(Math.max(0, index - 12), index).trimEnd()
    const opaque = /[(?:&|=,[}]$|=>$|\breturn$/.test(before) || snippets.at(-1) === stack.length
    /** @type {Element} */
    const element = { tag, attributes: new Map(), classes: [], dynamic: false, spread: false, line, column: index - lineStart + 1, parent: stack.at(-1) ?? null, text: false, opaque }
    let at = index + 1 + tag.length
    let closed = false
    let selfClosing = false
    while (at < length) {
      while (at < length && /\s/.test(source[at])) at++
      if (source[at] === '>') { at++; closed = true; break }
      if (source[at] === '/' && source[at + 1] === '>') { at += 2; closed = true; selfClosing = true; break }
      if (source[at] === '{') {
        element.spread = true
        at = braces(at)
        continue
      }
      attributeName.lastIndex = at
      const name = attributeName.exec(source)?.[0]
      if (!name) { at++; continue }
      at += name.length
      /** @type {string | true | null} */
      let value = true
      if (source[at] === '=') {
        at++
        const quote = source[at]
        if (quote === '"' || quote === '\'') {
          const end = source.indexOf(quote, at + 1)
          value = source.slice(at + 1, end === -1 ? length : end)
          at = end === -1 ? length : end + 1
        } else if (quote === '{') {
          const end = braces(at)
          value = null
          const expression = source.slice(at, end)
          if (name === 'class' || name === 'className') {
            element.dynamic = true
            element.classes.push(...words(literals(expression)))
          }
          at = end
        } else {
          const end = /[\s>]/.exec(source.slice(at))
          const stop = end ? at + end.index : length
          value = source.slice(at, stop)
          at = stop
        }
      }
      if (name === 'class' || name === 'className') {
        if (typeof value === 'string') {
          if (/\$\{|\{\{|\{/.test(value)) {
            element.dynamic = true
            element.classes.push(...words(value.replace(/\$?\{[^}]*\}\}?/g, computed)))
          } else element.classes.push(...words(value))
        }
      } else if (name === ':class' || name === 'v-bind:class' || name === 'class:list' || name === '[ngClass]' || name === '[class]') {
        element.dynamic = true
        if (typeof value === 'string') element.classes.push(...words(literals(value)))
      } else if (name.startsWith('class:')) {
        element.dynamic = true
        element.classes.push(name.slice(6))
      } else if (name === 'v-bind') {
        // `v-bind="$attrs"` is Vue's spread: any attribute may arrive through it.
        element.spread = true
      } else {
        // A bound attribute (`:tabindex`, `v-bind:tabindex`) is there, with a value only the framework knows.
        // Names are compared in lower case, which is how HTML reads them and what JSX's `tabIndex` stands for.
        const bound = /^(?::|v-bind:)(.+)$/.exec(name)
        const plain = bound ? bound[1] : name
        element.attributes.set(plain === 'htmlFor' ? 'for' : plain.toLowerCase(), bound ? null : value)
      }
    }
    if (!closed) {
      advance(index + 1)
      continue
    }
    advance(at)
    elements.push(element)

    if (tag === 'img' && typeof element.attributes.get('alt') === 'string' && element.attributes.get('alt') !== '') mark()
    if (selfClosing || voidElements.has(tag)) continue
    if (rawText.has(tag)) {
      const end = source.toLowerCase().indexOf(`</${tag}`, index)
      advance(end === -1 ? length : end)
      continue
    }
    stack.push(element)
  }
  return elements
}

/**
 * Check markup against contracts.
 * @param {string} source
 * @param {Contract[] | ReturnType<typeof createIndex>} contracts
 * @param {CheckOptions} [options]
 * @returns {Diagnostic[]}
 */
export function check(source, contracts, options = {}) {
  const index = Array.isArray(contracts) ? createIndex(contracts) : contracts
  const elements = parse(source)
  /** @type {Diagnostic[]} */
  const diagnostics = []
  const present = new Set(elements.flatMap(element => element.classes))
  const labelled = new Set(elements.filter(element => element.tag === 'label').map(element => element.attributes.get('for')).filter(value => typeof value === 'string'))

  const report = (/** @type {Element} */ element, /** @type {Omit<Diagnostic, 'line' | 'column'>} */ diagnostic) => {
    diagnostics.push({ ...diagnostic, line: element.line, column: element.column })
  }

  for (const element of elements) {
    const native = isNative(element.tag)
    /** @type {Map<string, string>} */
    const groups = new Map()

    for (const className of element.classes) {
      const known = index.classes.get(className)
      if (!known) {
        const root = index.roots.filter(name => className.startsWith(`${name}-`)).sort((a, b) => b.length - a.length)[0]
        if (root && !options.knows?.(className)) {
          const family = [...index.classes.values()].filter(({ entry }) => entry.name === root || owners(entry).includes(root) || entry.name.startsWith(`${root}-`)).map(({ entry }) => entry.name)
          report(element, {
            code: 'unknown-class',
            severity: options.strict ? 'error' : 'warning',
            className,
            contract: index.classes.get(root)?.contract.name,
            message: `"${className}" is not a class of ${root}. It has: ${family.join(', ')}.`,
          })
        }
        continue
      }
      const { entry, contract } = known

      const bases = owners(entry)

      // A component tag (<Button className="btn-square">) may add the base itself, so only an HTML element is judged.
      if (entry.kind === 'modifier' && bases.length && native && !element.dynamic && !element.spread && !bases.some(base => element.classes.includes(base))) {
        report(element, { code: 'missing-base', severity: 'error', className, contract: contract.name, message: `"${className}" modifies ${bases.map(base => `"${base}"`).join(' or ')}: write class="${bases[0]} ${className}".` })
      }

      if (entry.kind === 'part' && bases.length && !entry.anywhere && bases.some(base => present.has(base))) {
        let inside = bases.some(base => element.classes.includes(base))
        let unknown = element.opaque
        for (let ancestor = element.parent; ancestor && !inside; ancestor = ancestor.parent) {
          if (bases.some(base => ancestor.classes.includes(base))) inside = true
          if (!isNative(ancestor.tag) || ancestor.dynamic || ancestor.spread || ancestor.opaque) unknown = true
        }
        if (!inside && !unknown) {
          report(element, { code: 'outside-root', severity: 'error', className, contract: contract.name, message: `"${className}" is a part of ${bases.map(base => `"${base}"`).join(' or ')} and must be inside an element with that class.` })
        }
      }

      // Classes named in an expression may be alternatives: `{ 'toast-info': a, 'toast-danger': b }`.
      if (entry.exclusive && !element.dynamic) {
        const key = `${contract.name}/${entry.exclusive}`
        const other = groups.get(key)
        if (other) report(element, { code: 'exclusive', severity: 'error', className, contract: contract.name, message: `"${other}" and "${className}" are both a ${entry.exclusive} of ${contract.title.toLowerCase()}: keep one.` })
        else groups.set(key, className)
      }

      if (entry.elements && native && !entry.elements.includes(element.tag)) {
        report(element, { code: 'element', severity: 'error', className, contract: contract.name, message: `"${className}" goes on ${entry.elements.map(tag => `<${tag}>`).join(' or ')}, not <${element.tag}>.` })
      }

      if (entry.attributes && native && !element.spread) {
        for (const [name, expected] of Object.entries(entry.attributes)) {
          const actual = element.attributes.get(name)
          if (actual === null) continue
          const allowed = expected === true ? null : Array.isArray(expected) ? expected : [expected]
          if (actual === undefined || (allowed && (actual === true ? !allowed.includes('') : !allowed.includes(actual)))) {
            const wanted = allowed ? `${name}="${allowed.join('" or "')}"` : name
            report(element, { code: 'attribute', severity: 'error', className, contract: contract.name, message: `"${className}" needs ${wanted} on its element.` })
          }
        }
      }

      if (entry.label && native && !element.spread) {
        const named = ['aria-label', 'aria-labelledby', 'title'].some(name => {
          const value = element.attributes.get(name)
          return value === null || (typeof value === 'string' && value.trim() !== '')
        })
        const id = element.attributes.get('id')
        let wrapped = element.opaque
        for (let ancestor = element.parent; ancestor; ancestor = ancestor.parent) {
          if (ancestor.tag === 'label' && ancestor.text) wrapped = true
          if (!isNative(ancestor.tag) || ancestor.opaque) wrapped = true
        }
        if (!named && !element.text && !wrapped && id !== null && !(typeof id === 'string' && labelled.has(id))) {
          report(element, { code: 'label', severity: 'error', className, contract: contract.name, message: `"${className}" needs an accessible name: text of its own, aria-label, aria-labelledby, or a <label> that wraps or points at it.` })
        }
      }
    }
  }
  return diagnostics
}

/**
 * One line per diagnostic, as a compiler prints them.
 * @param {Diagnostic[]} diagnostics
 * @param {string} [file]
 */
export function format(diagnostics, file = '') {
  return diagnostics.map(({ line, column, severity, code, message }) => `${file}${file ? ':' : ''}${line}:${column} ${severity} ${code} ${message}`).join('\n')
}
