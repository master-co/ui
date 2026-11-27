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
 * @typedef {{ specifier: string, scope: 'library' | 'stylesheet', from: 'css' | 'script', line: number, column: number }} LibraryImport
 *   scope: `library` is all of Master UI (`@master/ui`, `@master/ui/master.css`); `stylesheet` is one component
 *   or layout stylesheet. from: a CSS `@import`, which includes the file again wherever it is written, or a
 *   module import, which a bundler loads once.
 */

const voidElements = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'])
const rawText = new Set(['script', 'style'])
/** Elements a word may run straight into, as in `Save<kbd>`. Any other `word<name` is read as a generic or a comparison. */
const inlineElements = new Set(['a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'button', 'cite', 'code', 'data', 'del', 'dfn', 'em', 'i', 'img', 'input', 'ins', 'kbd', 'label', 'mark', 'q', 's', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'svg', 'time', 'u', 'var', 'wbr', 'div', 'p', 'ul', 'ol', 'li', 'select', 'textarea'])
/** Attributes whose value is a list of tokens, so a required value is one of them. */
/** What follows the name of a component that a word runs straight into: an attribute with a value, or the end of an empty tag. */
const componentAfter = /\s+[A-Za-z_:@][\w:.-]*=["'{]|\s*\/>/y
const tokenLists = new Set(['rel'])
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
    // by the word character right before it and a name that is no inline element. Inside an element, a name that
    // goes on as a tag does (an attribute with a value, or `/>`) is one: a component a word runs into, as in
    // `Next<ArrowRightIcon className="icon" />`.
    componentAfter.lastIndex = index + 1 + (tag?.length ?? 0)
    if (!tag || (/[\w)\]]/.test(source[index - 1] ?? '') && !inlineElements.has(tag) && !(stack.length && componentAfter.test(source)))) {
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
          // Astro's `class:list={[…]}` and Svelte's `class={[…]}` name their classes in an expression too.
          if (name === 'class' || name === 'className' || name === 'class:list') {
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
  // A <label for> names its control only when it has words of its own.
  const labelled = new Set(elements.filter(element => element.tag === 'label' && element.text).map(element => element.attributes.get('for')).filter(value => typeof value === 'string'))

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
        if (other) report(element, { code: 'exclusive', severity: 'error', className, contract: contract.name, message: `"${other}" and "${className}" are both in the "${entry.exclusive}" group of ${contract.name}: keep one.` })
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
          // `rel` is a list of tokens: rel="next nofollow" is a rel="next".
          const values = typeof actual === 'string' && tokenLists.has(name) ? actual.trim().split(/\s+/) : [actual === true ? '' : actual]
          if (actual === undefined || (allowed && !values.some(value => allowed.includes(value)))) {
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
          report(element, { code: 'label', severity: 'error', className, contract: contract.name, message: `"${className}" needs an accessible name: text of its own, aria-label, aria-labelledby, title, or a <label> that wraps or points at it.` })
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

const stylesheetFile = /\.(?:css|scss|sass|less|pcss|postcss)$/i
const scriptFile = /\.(?:[cm]?[jt]sx?|astro|svelte|vue)$/i
const styleBlockFile = /\.(?:html?|astro|svelte|vue)$/i
/** Comments become spaces, so a line and a column stay where they were. */
const blank = (/** @type {string} */ text) => text.replace(/[^\n]/g, ' ')
const cssImport = /@(?:import|use|forward)\s+(?:url\(\s*)?(['"]?)(@master\/ui(?:\/[\w./-]+)?)\1/g
const scriptImport = /^[ \t]*(?:import|export)\s+(?:[^'"\n;]*?\bfrom\s*)?(['"])(@master\/ui(?:\/[\w./-]+)?)\1|\b(?:import|require)\s*\(\s*(['"])(@master\/ui(?:\/[\w./-]+)?)\3\s*\)/gm

/**
 * Read where a stylesheet or a module imports Master UI's styles: all of the library, or one stylesheet of it.
 * A comment is not an import, `@import '…' layer(…)` is one, and a specifier with a query (`?raw`, `?inline`)
 * is left alone because it delivers no stylesheet to the page. Markdown is not read: its imports are examples.
 * @param {string} source
 * @param {string} file Its name: the extension says whether it is a stylesheet, a module, or markup with both.
 * @returns {LibraryImport[]}
 */
export function imports(source, file) {
  /** @type {LibraryImport[]} */
  const found = []
  const add = (/** @type {string} */ specifier, /** @type {'css' | 'script'} */ from, /** @type {number} */ at) => {
    const scope = /^@master\/ui(?:\/master\.css)?$/.test(specifier) ? 'library' : /^@master\/ui\/(?:components|layouts)\/[\w-]+\.css$/.test(specifier) ? 'stylesheet' : null
    if (!scope) return
    const lineStart = source.lastIndexOf('\n', at - 1) + 1
    found.push({ specifier, scope, from, line: source.slice(0, at).split('\n').length, column: at - lineStart + 1 })
  }
  const css = (/** @type {string} */ text) => {
    for (const match of text.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/(^|\s)\/\/.*$/gm, blank).matchAll(cssImport)) {
      // What follows the specifier decides whether it is one: `?raw` or a longer path is something else.
      if (/[\w?./-]/.test(text[match.index + match[0].length] ?? '') && !match[1]) continue
      add(match[2], 'css', match.index)
    }
  }
  if (stylesheetFile.test(file)) css(source)
  else if (styleBlockFile.test(file)) {
    // Only the text of a <style> element is CSS; everything else keeps its place and is not read as one.
    css(source.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)|[^\n]/gi, (whole, open, body) => body === undefined ? ' ' : `${blank(open)}${body}${blank('</style>')}`))
  }
  if (scriptFile.test(file)) {
    const script = source.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/(^|\s)\/\/.*$/gm, blank)
    for (const match of script.matchAll(scriptImport)) add(match[2] ?? match[4], 'script', match.index + match[0].search(/\S/))
  }
  return found.sort((a, b) => a.line - b.line || a.column - b.column)
}

/**
 * Check how a project loads the library's stylesheets. There are two routes and a project takes one: all of
 * `@master/ui` from one stylesheet, or one module import per stylesheet. A CSS `@import` is an include, so a
 * stylesheet imported by two files, or by the whole library and again on its own, is delivered twice, and which
 * copy comes last differs from page to page. A bundler loads a module import once.
 * @param {{ file: string, imports: LibraryImport[] }[]} files Every file of the project that imports the library.
 * @param {{ entry?: string }} [options]
 *   entry: the project's own entry, written by `master-ui init`. It stands for the whole library and is the one
 *   stylesheet that imports the others.
 * @returns {{ file: string, diagnostics: Diagnostic[] }[]}
 */
export function checkImports(files, options = {}) {
  /** @type {Map<string, Diagnostic[]>} */
  const reported = new Map()
  const report = (/** @type {string} */ file, /** @type {LibraryImport} */ { line, column }, /** @type {Omit<Diagnostic, 'line' | 'column'>} */ diagnostic) => {
    reported.set(file, [...reported.get(file) ?? [], { ...diagnostic, line, column }])
  }
  const isEntry = (/** @type {string} */ file) => options.entry !== undefined && file.replaceAll('\\', '/') === options.entry.replaceAll('\\', '/').replace(/^\.\//, '')
  // The project's entry is the whole library when it imports the library's stylesheets.
  const whole = files.flatMap(({ file, imports: found }) => isEntry(file)
    ? found.filter(item => item.scope === 'stylesheet' && item.from === 'css').slice(0, 1).map(item => ({ file, item }))
    : found.filter(item => item.scope === 'library').map(item => ({ file, item })))

  for (const { file, imports: found } of files) {
    if (isEntry(file)) continue
    const single = found.filter(item => item.scope === 'stylesheet')
    for (const item of single.filter(item => item.from === 'css')) {
      report(file, item, { code: 'stylesheet-import', severity: 'error', message: `"${item.specifier}" is imported with a CSS @import in ${file}. A CSS @import includes the file again in every stylesheet that names it. Import it from the module that renders the component: import '${item.specifier}'.` })
    }
    const modules = single.filter(item => item.from === 'script')
    if (whole.length && modules.length) {
      const more = modules.length > 1 ? ` (and ${modules.length - 1} more in this file)` : ''
      report(file, modules[0], { code: 'mixed-imports', severity: 'error', message: `"${modules[0].specifier}" is imported on its own${more}, and ${whole[0].file} imports all of Master UI, so the stylesheet is delivered twice. Take one route: all of '@master/ui' from one stylesheet, or one module import per stylesheet.` })
    }
  }
  if (whole.length > 1) {
    for (const { file, item } of whole) {
      const others = [...new Set(whole.filter(other => other.item !== item).map(other => other.file))]
      report(file, item, { code: 'repeated-import', severity: 'warning', message: `All of Master UI is imported here and in ${others.join(', ')}. Two imports that reach the same page deliver it twice: import it from one stylesheet.` })
    }
  }
  return [...reported].map(([file, diagnostics]) => ({ file, diagnostics: diagnostics.sort((a, b) => a.line - b.line || a.column - b.column) }))
}

/**
 * @typedef {{ property: string, value: string, line: number, column: number }} Declaration
 * @typedef {{ selectors: string[], declarations: Declaration[], applies: { name: string, line: number, column: number }[], line: number, column: number }} StyleRule
 *   selectors: the selector list with nesting resolved, `&` replaced by the rule it is nested in.
 *   applies: the mixins the rule brings in with `@apply`.
 * @typedef {{ rules: StyleRule[], mixins: Map<string, Declaration[]> }} Styles
 */

/** At-rules whose block holds rules or declarations of the rule around it. Every other block is not read. */
const transparentAt = new Set(['media', 'supports', 'container', 'layer', 'scope', 'starting-style', 'document'])
/** Wrappers a framework puts around a selector: what is inside them is the selector. */
const wrappers = /:(?:global|local|deep)\(|::v-deep\(/g

/** Split at commas that are not inside parentheses, brackets or strings. */
function list(/** @type {string} */ text) {
  const parts = []
  let depth = 0
  let start = 0
  for (let at = 0; at < text.length; at++) {
    const char = text[at]
    if (char === '"' || char === '\'') {
      for (at++; at < text.length && text[at] !== char; at++) if (text[at] === '\\') at++
    } else if (char === '(' || char === '[') depth++
    else if (char === ')' || char === ']') depth--
    else if (char === ',' && depth === 0) {
      parts.push(text.slice(start, at))
      start = at + 1
    }
  }
  parts.push(text.slice(start))
  return parts.map(part => part.trim().replace(/\s+/g, ' ')).filter(Boolean)
}

/** A nested selector list with `&` replaced by the rule around it, and a bare one read as its descendant. */
function nest(/** @type {string[]} */ parents, /** @type {string} */ prelude) {
  const children = list(prelude)
  if (!parents.length) return children.map(child => child.replaceAll('&', ':root'))
  return children.flatMap(child => parents.map(parent => child.includes('&') ? child.replaceAll('&', parent) : `${parent} ${child}`)).slice(0, 64)
}

/** The last compound of a selector: the element a rule styles, with what it is inside of left out. */
export function subject(/** @type {string} */ selector) {
  const text = selector.trim()
  let depth = 0
  let start = 0
  for (let at = 0; at < text.length; at++) {
    const char = text[at]
    if (char === '"' || char === '\'') {
      for (at++; at < text.length && text[at] !== char; at++) if (text[at] === '\\') at++
    } else if (char === '(' || char === '[') depth++
    else if (char === ')' || char === ']') depth--
    else if (depth === 0 && (char === '>' || char === '+' || char === '~' || /\s/.test(char))) start = at + 1
  }
  return text.slice(start).trim()
}

/**
 * The classes a compound selects by: those inside `:not()`, `:has()` and an attribute selector are conditions
 * on the element, not what it is, so they are left out. `:is()`, `:where()` and a framework's `:global()` stay.
 */
export function compoundClasses(/** @type {string} */ compound) {
  let text = compound.replace(wrappers, '(')
  const drop = (/** @type {RegExp} */ opening) => {
    for (let match = opening.exec(text); match; match = opening.exec(text)) {
      let depth = 0
      let at = match.index + match[0].length - 1
      for (; at < text.length; at++) {
        if (text[at] === '(' || text[at] === '[') depth++
        else if ((text[at] === ')' || text[at] === ']') && --depth === 0) break
      }
      text = `${text.slice(0, match.index)}${text.slice(at + 1)}`
      opening.lastIndex = 0
    }
  }
  drop(/\[/g)
  drop(/:(?:not|has)\(/g)
  return [...text.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map(match => match[1])
}

/**
 * Read the rules of a stylesheet, or of the `<style>` elements of a template, with their nesting resolved,
 * and the mixins it defines. Comments are skipped, `@media`, `@supports`, `@container`, `@layer` and the like
 * are read through, and blocks that hold no rules of the page (`@keyframes`, `@font-face`, `@theme`) are not read.
 * @param {string} source
 * @param {string} file Its name: the extension says whether it is a stylesheet or markup with `<style>` in it.
 * @returns {Styles}
 */
export function styles(source, file) {
  /** @type {Styles} */
  const result = { rules: [], mixins: new Map() }
  let text = stylesheetFile.test(file) ? source : styleBlockFile.test(file)
    ? source.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)|[^\n]/gi, (whole, open, body) => body === undefined ? ' ' : `${blank(open)}${body}${blank('</style>')}`)
    : ''
  if (!text.trim()) return result
  text = text.replace(/\/\*[\s\S]*?\*\//g, blank)
  if (!/\.css$/i.test(file)) text = text.replace(/(^|\s)\/\/.*$/gm, (whole, before) => `${before}${blank(whole.slice(before.length))}`)
  const starts = [0]
  for (let at = text.indexOf('\n'); at !== -1; at = text.indexOf('\n', at + 1)) starts.push(at + 1)
  const position = (/** @type {number} */ at) => {
    let low = 0
    let high = starts.length - 1
    while (low < high) {
      const middle = (low + high + 1) >> 1
      if (starts[middle] <= at) low = middle
      else high = middle - 1
    }
    return { line: low + 1, column: at - starts[low] + 1 }
  }

  /** @typedef {{ kind: 'rule' | 'at' | 'mixin' | 'skip', selectors: string[], rule?: StyleRule, mixin?: Declaration[], at: number }} Block */
  /** @type {Block[]} */
  const stack = []
  const selectors = () => stack.at(-1)?.selectors ?? []
  /** The rule a declaration belongs to: the one open, or one made for the block of an at-rule inside it. */
  const owner = () => {
    const open = stack.at(-1)
    if (!open || open.kind === 'skip') return undefined
    if (open.kind === 'mixin') return open
    if (!open.selectors.length) return undefined
    if (!open.rule) open.rule = { selectors: open.selectors, declarations: [], applies: [], ...position(open.at) }
    if (!result.rules.includes(open.rule)) result.rules.push(open.rule)
    return open
  }
  const statement = (/** @type {number} */ from, /** @type {number} */ to) => {
    const raw = text.slice(from, to)
    const offset = from + raw.search(/\S|$/)
    const body = raw.trim()
    if (!body) return
    if (body.startsWith('@apply')) {
      const open = owner()
      if (open?.rule) for (const name of body.slice(6).trim().split(/\s+/).filter(word => word.startsWith('--'))) open.rule.applies.push({ name, ...position(offset) })
      return
    }
    if (body.startsWith('@')) return
    const colon = body.indexOf(':')
    if (colon <= 0) return
    const property = body.slice(0, colon).trim()
    if (!/^(?:--|-?[a-zA-Z])[\w-]*$/.test(property)) return
    const open = owner()
    if (!open) return
    /** @type {Declaration} */
    const declaration = { property: property.startsWith('--') ? property : property.toLowerCase(), value: body.slice(colon + 1).trim(), ...position(offset) }
    if (open.mixin) open.mixin.push(declaration)
    else open.rule?.declarations.push(declaration)
  }

  let from = 0
  let parens = 0
  for (let at = 0; at < text.length; at++) {
    const char = text[at]
    if (char === '"' || char === '\'') {
      for (at++; at < text.length && text[at] !== char && text[at] !== '\n'; at++) if (text[at] === '\\') at++
    } else if (char === '(') parens++
    else if (char === ')') parens = Math.max(0, parens - 1)
    else if (parens) continue
    else if (char === ';') {
      statement(from, at)
      from = at + 1
    } else if (char === '{') {
      const prelude = text.slice(from, at).trim()
      const start = from + text.slice(from, at).search(/\S|$/)
      const outer = stack.at(-1)
      if (outer?.kind === 'skip' || outer?.kind === 'mixin') stack.push({ kind: 'skip', selectors: [], at: start })
      else if (prelude.startsWith('@')) {
        const name = /^@([\w-]+)/.exec(prelude)?.[1] ?? ''
        if (name === 'mixin') {
          const declarations = /** @type {Declaration[]} */ ([])
          const mixin = /^@mixin\s+(--[\w-]+)/.exec(prelude)?.[1]
          if (mixin) result.mixins.set(mixin, declarations)
          stack.push({ kind: 'mixin', selectors: [], mixin: declarations, at: start })
        } else if (transparentAt.has(name)) stack.push({ kind: 'at', selectors: selectors(), at: start })
        else stack.push({ kind: 'skip', selectors: [], at: start })
      } else stack.push({ kind: 'rule', selectors: nest(selectors(), prelude), at: start })
      from = at + 1
    } else if (char === '}') {
      statement(from, at)
      stack.pop()
      from = at + 1
    }
  }
  return result
}

/**
 * For each class of the project's own, the classes of components it shares an element with in markup:
 * `class="btn action-outline"` makes a rule for `.action-outline` a rule for the button.
 * @param {Element[][]} documents The elements of each markup file.
 * @param {ReturnType<typeof createIndex>} index
 */
export function beside(documents, index) {
  /** @type {Map<string, Set<string>>} */
  const found = new Map()
  for (const elements of documents) {
    for (const element of elements) {
      const library = element.classes.filter(name => {
        const contract = index.classes.get(name)?.contract
        return contract && contract.tier !== 'layout'
      })
      if (!library.length) continue
      for (const name of element.classes) {
        if (index.classes.has(name)) continue
        const set = found.get(name) ?? new Set()
        for (const known of library) set.add(known)
        found.set(name, set)
      }
    }
  }
  return found
}

/** The pseudo-element a compound selects, such as `before` in `.segmented::before`, or an empty string. */
export function pseudoElement(/** @type {string} */ compound) {
  let depth = 0
  for (let at = 0; at < compound.length; at++) {
    const char = compound[at]
    if (char === '(' || char === '[') depth++
    else if (char === ')' || char === ']') depth--
    else if (depth === 0 && char === ':') {
      const legacy = /^:(before|after|first-line|first-letter)\b/.exec(compound.slice(at))
      if (compound[at + 1] === ':') return /^::([\w-]+)/.exec(compound.slice(at))?.[1] ?? ''
      if (legacy) return legacy[1]
    }
  }
  return ''
}

/** A property in logical terms, so `padding-left` and `padding-inline-start` are one. */
const logical = (/** @type {string} */ property) => property
  .replace(/^border-(top|bottom)-(left|right)-radius$/, (whole, block, inline) => `border-${block === 'top' ? 'start' : 'end'}-${inline === 'left' ? 'start' : 'end'}-radius`)
  .replace(/^(padding|margin|inset|border)-(top|bottom|left|right)(?=$|-)/, (whole, box, side) => `${box}-${{ top: 'block-start', bottom: 'block-end', left: 'inline-start', right: 'inline-end' }[/** @type {'top'} */ (side)]}`)
  .replace(/^(top|bottom|left|right)$/, side => `inset-${{ top: 'block-start', bottom: 'block-end', left: 'inline-start', right: 'inline-end' }[/** @type {'top'} */ (side)]}`)

/** Whether one property sets what another does: they are one, or one is the shorthand of the other. */
export function overlaps(/** @type {string} */ a, /** @type {string} */ b) {
  if (a === 'all' || b === 'all') return true
  const covers = (/** @type {string} */ wide, /** @type {string} */ narrow) => {
    if (wide === narrow) return true
    if (wide === 'border-radius') return /^border-[a-z-]*radius$/.test(narrow)
    if (/radius$/.test(wide) !== /radius$/.test(narrow)) return false
    if (narrow.startsWith(`${wide}-`)) return true
    if (wide === 'font') return narrow === 'line-height'
    // border-color covers the color of every side, and the same for style and width.
    const part = /^border-(color|style|width)$/.exec(wide)?.[1]
    return Boolean(part && narrow.startsWith('border-') && narrow.endsWith(`-${part}`))
  }
  const [x, y] = [logical(a), logical(b)]
  return covers(x, y) || covers(y, x)
}

/**
 * What the library's stylesheets declare on each class: the properties of every rule whose element has the
 * class, under any state, with what its mixins bring in. A pseudo-element is its own entry, `segmented::before`.
 * @param {Styles[]} stylesheets The library's stylesheets, read by `styles()`.
 * @param {Map<string, Declaration[]>} [mixins] The theme's mixins.
 */
export function declared(stylesheets, mixins = new Map()) {
  /** @type {Map<string, Set<string>>} */
  const found = new Map()
  for (const { rules } of stylesheets) {
    for (const rule of rules) {
      // A property the component hands to its context (`font: inherit`) is not one it draws.
      const properties = [...rule.declarations, ...rule.applies.flatMap(apply => mixins.get(apply.name) ?? [])].filter(declaration => !/^(?:inherit|unset|revert|revert-layer)$/i.test(declaration.value)).map(declaration => declaration.property)
      if (!properties.length) continue
      for (const selector of rule.selectors) {
        const compound = subject(selector)
        const pseudo = pseudoElement(compound)
        for (const name of compoundClasses(compound)) {
          const key = pseudo ? `${name}::${pseudo}` : name
          const set = found.get(key) ?? new Set()
          for (const property of properties) set.add(property)
          found.set(key, set)
        }
      }
    }
  }
  return found
}

/**
 * What a component draws: its face, its edge, its shadow, its corners, its type and its padding. Where it stands
 * and how much room it takes (margin, position, size, the grid and flex it sits in, display) are the page's.
 */
const drawn = /^(?:color|background(?:-.+)?|border(?:-(?!collapse$|spacing$).+)?|outline(?:-.+)?|box-shadow|text-shadow|opacity|filter|backdrop-filter|mix-blend-mode|fill|stroke(?:-.+)?|accent-color|corner-(?:[a-z-]+-)?shape|font(?:-.+)?|letter-spacing|line-height|text-transform|text-decoration(?:-.+)?|-webkit-text-stroke(?:-.+)?|padding(?:-.+)?|content|all|appearance|-webkit-appearance|mask(?:-.+)?|-webkit-mask(?:-.+)?)$/
const edge = /^(?:border(?:-(?!collapse$|spacing$).+)?|outline(?:-.+)?|box-shadow)$/
/** Library mixins that draw a surface; a rule of the project's own that applies one makes a surface by hand. */
const surfaceMixin = /^--surface-/

/**
 * Check the project's own stylesheets, and the `<style>` of its templates, against the components they style.
 *
 * - `material-override`: a rule whose element is a component (one of its classes, or a class of the project's
 *   own that shares an element with one in markup) and that redeclares what the component's stylesheet draws
 *   there (its face, edge, shadow, corners, type or padding), applies a mixin of the library to it, or sets a
 *   custom property the library keeps internal. A project rule may set tokens, public custom properties and
 *   where a component stands; anything else is an untracked fork. With `strict` it is an error.
 * - `hand-made-material`: a rule for no component that paints a box with the theme's surface tokens or mixins
 *   and gives it an edge or a corner of its own: a sheet, a tray or a well made by hand. Always a warning.
 *
 * @param {{ file: string, styles: Styles, beside?: Map<string, Set<string>> }[]} files
 *   beside: for a template whose `<style>` is scoped to it (Svelte, Astro, Vue's `scoped`), what `beside()` found
 *   in its own markup; a selector inside `:global()` still reads the project's.
 * @param {ReturnType<typeof createIndex>} index
 * @param {{ beside?: Map<string, Set<string>>, declared?: Map<string, Set<string>>, internal?: Set<string>, mixins?: Iterable<string>, own?: Iterable<string>, strict?: boolean }} [options]
 *   beside: what `beside()` found in the project's markup.
 *   own: the project's own components, written with a contract of its own: a rule may draw them anywhere.
 *   declared: what `declared()` found in the library's stylesheets. Without it, every property of a material is
 *   taken to redraw the component.
 *   internal: custom properties the library's stylesheets use that are neither a theme token nor listed in a contract.
 *   mixins: the names of the library's mixins; a project mixin of the same name is a theme's recipe.
 *   strict: report a material override as an error.
 * @returns {{ file: string, diagnostics: Diagnostic[] }[]}
 */
export function checkStyles(files, index, options = {}) {
  const mixins = new Map(files.flatMap(({ styles: found }) => [...found.mixins]))
  const library = new Set(options.mixins ?? [])
  const own = new Set(options.own ?? [])
  /** @type {{ file: string, diagnostics: Diagnostic[] }[]} */
  const results = []
  for (const { file, styles: found, beside: local } of files) {
    /** @type {Diagnostic[]} */
    const diagnostics = []
    for (const rule of found.rules) {
      // A project mixin is judged as if its declarations were written in the rule; one of the library's draws.
      const declarations = [...rule.declarations, ...rule.applies.flatMap(apply => (mixins.get(apply.name) ?? []).map(declaration => ({ ...declaration, line: apply.line, column: apply.column })))]
      const theirs = rule.applies.filter(apply => !mixins.has(apply.name) && (!library.size || library.has(apply.name)))
      /** @type {{ component: string, selector: string, drawn?: Set<string> }[]} */
      const targets = []
      let pseudo = true
      let theirOwn = false
      for (const selector of rule.selectors) {
        const compound = subject(selector)
        const element = pseudoElement(compound)
        if (!element) pseudo = false
        const near = local && !/:global\b/.test(selector) ? local : options.beside
        for (const name of compoundClasses(compound)) {
          for (const known of index.classes.has(name) ? [name] : [...near?.get(name) ?? []]) {
            const contract = index.classes.get(known)?.contract
            if (contract && own.has(contract.name)) theirOwn = true
            if (!contract || contract.tier === 'layout' || own.has(contract.name)) continue
            targets.push({ component: contract.name, selector, drawn: options.declared?.get(element ? `${known}::${element}` : known) })
          }
        }
      }
      if (targets.length) {
        const redraws = (/** @type {Declaration} */ declaration) => drawn.test(declaration.property) && targets.some(target => !options.declared || [...target.drawn ?? []].some(property => overlaps(property, declaration.property)))
        const redeclared = declarations.filter(redraws)
        const internal = declarations.filter(declaration => options.internal?.has(declaration.property))
        const first = [...redeclared, ...internal, ...theirs].sort((a, b) => a.line - b.line || a.column - b.column)[0]
        if (!first) continue
        const components = [...new Set(targets.map(target => target.component))]
        const hit = targets.find(target => redeclared.some(declaration => !options.declared || [...target.drawn ?? []].some(property => overlaps(property, declaration.property)))) ?? targets[0]
        const what = [
          redeclared.length ? `redeclares ${[...new Set(redeclared.map(declaration => declaration.property))].join(', ')}` : '',
          internal.length ? `sets the internal ${[...new Set(internal.map(declaration => declaration.property))].join(', ')}` : '',
          theirs.length ? `applies ${theirs.map(apply => apply.name).join(', ')}` : '',
        ].filter(Boolean).join(', ')
        const more = components.length > 1 ? ` (and ${components.filter(name => name !== hit.component).join(', ')})` : ''
        diagnostics.push({
          code: 'material-override',
          severity: options.strict ? 'error' : 'warning',
          contract: hit.component,
          line: first.line,
          column: first.column,
          message: `"${hit.selector}" ${what}, which ${hit.component}${more} draws itself. A project rule sets a component's tokens, its public custom properties and where it stands, not what it draws: give it the project's material with a token or a public property ("master-ui contract ${hit.component}"), a utility on the one element, or own it ("master-ui own ${hit.component}").`,
        })
        continue
      }
      if (pseudo || theirOwn) continue
      const surface = declarations.find(declaration => /^background(?:-color)?$/.test(declaration.property) && /var\(\s*--color-surface-/.test(declaration.value)) ?? rule.applies.find(apply => surfaceMixin.test(apply.name) && !mixins.has(apply.name))
      const shaped = declarations.some(declaration => edge.test(declaration.property) || /^border(?:-[a-z]+)*-radius$/.test(declaration.property))
      if (surface && shaped) {
        diagnostics.push({
          code: 'hand-made-material',
          severity: 'warning',
          line: surface.line,
          column: surface.column,
          message: `"${rule.selectors[0]}" paints a surface by hand: a face of the theme's surfaces with an edge or a corner of its own. Use the component that has that material (sheet, tray, well, card, or the overlay the box is) with the project's tokens and public properties, or write a component with a contract.`,
        })
      }
    }
    if (diagnostics.length) results.push({ file, diagnostics: diagnostics.sort((a, b) => a.line - b.line || a.column - b.column) })
  }
  return results
}

/**
 * A project with a material of its own adopts each component once: it gives the component the project's face
 * through tokens and public properties, shows it on the project's samples, and lists it in `material.adopted`.
 *
 * - `first-use`: markup uses a component the project has not adopted. An error: design it first.
 * - `unsampled`: an adopted name is no contract, or none of the samples shows a class of it.
 *
 * Layouts own no material and are left out; a component the project wrote itself is its material already.
 * @param {{ file: string, elements: Element[] }[]} files The markup to check; the samples are not among them.
 * @param {ReturnType<typeof createIndex>} index
 * @param {{ adopted: Iterable<string>, own?: Iterable<string>, samples: { file: string, elements: Element[] }[], stylesheets?: string[], config?: { file: string, source: string } }} material
 *   own: the project's own components, adopted by being written.
 *   samples: the files that show the adopted components, with the markup they import.
 *   stylesheets: where the project gives components its face, named in the message.
 *   config: master-ui.json, so an adopted name is reported where it is written.
 * @returns {{ file: string, diagnostics: Diagnostic[] }[]}
 */
export function checkMaterial(files, index, material) {
  const adopted = new Set([...material.adopted, ...material.own ?? []])
  const contracts = new Map([...index.classes.values()].map(({ contract }) => [contract.name, contract]))
  /** @type {{ file: string, diagnostics: Diagnostic[] }[]} */
  const results = []
  for (const { file, elements } of files) {
    /** @type {Diagnostic[]} */
    const diagnostics = []
    const reported = new Set()
    for (const element of elements) {
      for (const name of element.classes) {
        const contract = index.classes.get(name)?.contract
        if (!contract || contract.tier === 'layout' || adopted.has(contract.name) || reported.has(contract.name)) continue
        reported.add(contract.name)
        diagnostics.push({
          code: 'first-use',
          severity: 'error',
          className: name,
          contract: contract.name,
          line: element.line,
          column: element.column,
          message: `${contract.name} is used here for the first time in this project's material. Design it once before using it: read "master-ui contract ${contract.name}", give it the project's face with tokens and its public properties${material.stylesheets?.length ? ` in ${material.stylesheets.join(' or ')}` : ''}, show it in the samples (${material.samples.length ? material.samples[0].file : 'material.samples'}) in each state its contract lists, then add "${contract.name}" to material.adopted in master-ui.json.`,
        })
      }
    }
    if (diagnostics.length) results.push({ file, diagnostics })
  }
  const shown = new Set(material.samples.flatMap(({ elements }) => elements.flatMap(element => element.classes)))
  /** @type {Diagnostic[]} */
  const config = []
  for (const name of material.adopted) {
    const at = material.config ? material.config.source.indexOf(`"${name}"`) : -1
    const place = at === -1 ? { line: 1, column: 1 } : { line: material.config?.source.slice(0, at).split('\n').length ?? 1, column: at - (material.config?.source.lastIndexOf('\n', at) ?? -1) }
    const contract = contracts.get(name)
    if (!contract) config.push({ code: 'unsampled', severity: 'error', contract: name, ...place, message: `"${name}" is in material.adopted but is no contract. Run "master-ui list".` })
    else if (!contract.classes.some(entry => shown.has(entry.name))) {
      config.push({ code: 'unsampled', severity: 'error', contract: name, ...place, message: `${name} is adopted, but no sample shows it. Show it in ${material.samples.length ? material.samples.map(sample => sample.file).slice(0, 2).join(' or ') : 'the files material.samples names'}, in each state its contract lists, so the project's face of it is seen in one place.` })
    }
  }
  if (config.length) results.push({ file: material.config?.file ?? 'master-ui.json', diagnostics: config })
  return results
}
