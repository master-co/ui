/**
 * A preview's markup in the syntax of each framework. Master UI is markup in every framework, so what changes from
 * HTML to React, Svelte or Vue is how the same elements are written, never which ones: the classes stay literal
 * strings on native elements, the attributes stay where they were, and `master-ui check` reads the same markup in
 * all four. This is the table of the skill's frameworks reference (`skills/master-ui/references/frameworks.md`)
 * made to run, and `packages/ui/tests/framework-markup.test.ts` holds every preview of the site to it.
 *
 * The four are printed from one tree by one printer, so they are laid out alike, and whitespace keeps its meaning in
 * each: where HTML had none between two pieces, no line break adds one, and a space that is read stays on its line.
 *
 * One thing is written otherwise. HTML has no components, so its icons are drawn inline; a framework has Master Icons
 * as a package, so there the same drawing is its component, imported at the master the markup's viewBox names. The
 * class stays on it, and an inline SVG that is not a Master Icons drawing stays inline.
 *
 * A pattern with a script is the same markup too. Its HTML ends with the module that attaches the behaviors; in a
 * framework the file is a component that attaches them to its root for as long as it is mounted. For a value the
 * application holds, the framework component of the pattern is the better start, and its page says so. A chart is the
 * one pattern a page's script feeds with data, so there the file uses that component: `<Chart>` with the same data.
 */
import * as release from '@master/icons'
import type { IconDefinition } from '@master/icons'

export type MarkupLanguage = 'html' | 'react' | 'svelte' | 'vue'

/** The languages a Code view offers, in order, with the name a reader picks and the highlighter's grammar. */
export const markupLanguages = [
  { language: 'html', title: 'HTML', lang: 'html' },
  { language: 'react', title: 'React', lang: 'tsx' },
  { language: 'svelte', title: 'Svelte', lang: 'svelte' },
  { language: 'vue', title: 'Vue', lang: 'vue' },
] as const satisfies readonly { language: MarkupLanguage, title: string, lang: string }[]

/** Markup a framework cannot be given as it stands: a script, an inline handler, React's `<template>`. */
export class UnsupportedMarkup extends Error {}

/** `raw` is an attribute a framework writes its own way, printed as it stands: `ref={root}`, `{@attach attach}`. */
interface Attribute { name: string, value: string | null, raw?: string }
/** `wide` is a component whose attributes are all `raw` and go one to a line when they do not fit on one. */
interface Element { type: 'element', tag: string, attributes: Attribute[], children: Node[], selfClosing: boolean, raw?: string, wide?: boolean }
interface Text { type: 'text', text: string }
interface Comment { type: 'comment', text: string }
type Node = Element | Text | Comment

const voidElements = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'])
/** Elements whose content is kept as it was written: whitespace means something in them, or they hold no markup. */
const verbatim = new Set(['pre', 'textarea', 'script', 'style'])
/** Elements laid out as blocks: whitespace beside them draws nothing, so a line may break there freely. */
const blocks = new Set(['address', 'article', 'aside', 'blockquote', 'body', 'dd', 'details', 'dialog', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'legend', 'li', 'main', 'menu', 'nav', 'ol', 'optgroup', 'option', 'p', 'pre', 'search', 'section', 'summary', 'table', 'tbody', 'td', 'template', 'tfoot', 'th', 'thead', 'tr', 'ul', 'caption', 'colgroup', 'datalist', 'iframe', 'video', 'audio', 'canvas', 'picture'])
/** A line holds this many columns before an element is broken over several. */
const width = 100

/* -------------------------------------------------------------------------------------------------------------- */
/* Parsing                                                                                                         */
/* -------------------------------------------------------------------------------------------------------------- */

/** Read site-authored markup into a tree, keeping every attribute's name, order and written value. */
function parse(source: string): Node[] {
  const root: Element = { type: 'element', tag: '#root', attributes: [], children: [], selfClosing: false }
  const stack: Element[] = [root]
  let at = 0
  const top = () => stack[stack.length - 1]

  while (at < source.length) {
    const open = source.slice(at).search(/<(?:[A-Za-z]|\/[A-Za-z]|!--)/)
    const next = open === -1 ? source.length : at + open
    if (next > at) top().children.push({ type: 'text', text: source.slice(at, next) })
    if (open === -1) break
    at = next

    if (source.startsWith('<!--', at)) {
      const end = source.indexOf('-->', at + 4)
      if (end === -1) throw new Error('A comment is never closed')
      top().children.push({ type: 'comment', text: source.slice(at + 4, end) })
      at = end + 3
      continue
    }

    if (source[at + 1] === '/') {
      const match = /^<\/([A-Za-z][\w:.-]*)\s*>/.exec(source.slice(at))
      if (!match) throw new Error(`An end tag is malformed at ${at}`)
      const tag = match[1]
      const index = stack.findLastIndex(element => element.tag === tag)
      if (index > 0) stack.length = index
      at += match[0].length
      continue
    }

    const name = /^<([A-Za-z][\w:.-]*)/.exec(source.slice(at))!
    const element: Element = { type: 'element', tag: name[1], attributes: [], children: [], selfClosing: false }
    at += name[0].length
    for (;;) {
      at += /^\s*/.exec(source.slice(at))![0].length
      if (source.startsWith('/>', at)) { element.selfClosing = true; at += 2; break }
      if (source[at] === '>') { at++; break }
      if (at >= source.length) throw new Error(`<${element.tag}> is never closed`)
      const attribute = /^[^\s"'>/=]+/.exec(source.slice(at))
      if (!attribute) { at++; continue }
      at += attribute[0].length
      let value: string | null = null
      const equals = /^\s*=\s*/.exec(source.slice(at))
      if (equals) {
        at += equals[0].length
        const quote = source[at]
        if (quote === '"' || quote === '\'') {
          const end = source.indexOf(quote, at + 1)
          value = source.slice(at + 1, end)
          at = end + 1
        } else {
          const unquoted = /^[^\s>]*/.exec(source.slice(at))![0]
          value = unquoted
          at += unquoted.length
        }
      }
      element.attributes.push({ name: attribute[0], value })
    }
    top().children.push(element)
    if (element.selfClosing || voidElements.has(element.tag.toLowerCase())) continue
    if (verbatim.has(element.tag)) {
      const end = source.indexOf(`</${element.tag}`, at)
      const stop = end === -1 ? source.length : end
      element.raw = source.slice(at, stop)
      if (element.tag === 'pre') element.children = parse(element.raw)
      else if (element.raw) element.children = [{ type: 'text', text: element.raw }]
      at = end === -1 ? source.length : source.indexOf('>', end) + 1
      continue
    }
    stack.push(element)
  }
  return root.children
}

/* -------------------------------------------------------------------------------------------------------------- */
/* What differs between the four                                                                                   */
/* -------------------------------------------------------------------------------------------------------------- */

interface Dialect {
  /** The element as this framework writes it: a name, attributes, maybe content moved into an attribute. */
  element(element: Element, svg: boolean): { open: string, children: Node[], empty: boolean }
  text(text: string): string
  comment(text: string): string
  /** A `pre`'s content, which this framework would otherwise reflow. */
  verbatim(element: Element): string
}

/** An element with no end tag: a void element, or one written closed, as SVG's are. */
const isVoid = (element: Element) => element.selfClosing || voidElements.has(element.tag.toLowerCase())
const htmlAttribute = ({ name, value, raw }: Attribute) => raw ?? (value === null || value === '' ? name : `${name}="${value.replaceAll('"', '&quot;')}"`)
const plainOpen = (element: Element, print = htmlAttribute) => `<${element.tag}${element.attributes.map(attribute => ` ${print(attribute)}`).join('')}${element.selfClosing ? ' />' : '>'}`
const braces = (text: string, open: string, close: string) => text.replace(/[{}]/g, brace => brace === '{' ? open : close)

const html: Dialect = {
  element: element => ({ open: plainOpen(element), children: element.children, empty: isVoid(element) }),
  text: text => text,
  comment: text => `<!--${text}-->`,
  verbatim: element => element.raw ?? '',
}

/** Svelte reads `{` as the start of an expression, in text and in attribute values alike. */
const svelte: Dialect = {
  element: element => ({ open: plainOpen(element, attribute => htmlAttribute({ ...attribute, value: attribute.value?.replaceAll('{', '&#123;').replaceAll('}', '&#125;') ?? null })), children: element.children, empty: isVoid(element) }),
  text: text => braces(text, '{\'{\'}', '{\'}\'}'),
  comment: text => `<!--${text}-->`,
  verbatim: element => braces(element.raw ?? '', '{\'{\'}', '{\'}\'}'),
}

/** Vue reads `{{` as the start of an interpolation; a template holds the markup. */
const vue: Dialect = {
  element: html.element,
  text: text => text.replaceAll('{{', '&#123;&#123;'),
  comment: text => `<!--${text}-->`,
  verbatim: element => (element.raw ?? '').replaceAll('{{', '&#123;&#123;'),
}

/* React ---------------------------------------------------------------------------------------------------------- */

/** HTML attribute names React spells otherwise. `class` and `for` are the ones every page has. */
const reactNames: Record<string, string> = Object.fromEntries([
  'accessKey', 'allowFullScreen', 'autoCapitalize', 'autoComplete', 'autoCorrect', 'autoFocus', 'autoPlay', 'cellPadding', 'cellSpacing', 'charSet', 'colSpan',
  'contentEditable', 'controlsList', 'crossOrigin', 'dateTime', 'disablePictureInPicture', 'encType', 'enterKeyHint', 'fetchPriority', 'formAction', 'formEncType',
  'formMethod', 'formNoValidate', 'formTarget', 'frameBorder', 'hrefLang', 'inputMode', 'itemProp', 'itemRef', 'itemScope', 'itemType', 'marginHeight', 'marginWidth',
  'maxLength', 'mediaGroup', 'minLength', 'noModule', 'noValidate', 'playsInline', 'popoverTarget', 'popoverTargetAction', 'readOnly', 'referrerPolicy', 'rowSpan',
  'spellCheck', 'srcDoc', 'srcLang', 'srcSet', 'tabIndex', 'useMap',
].map(name => [name.toLowerCase(), name]).concat([['class', 'className'], ['for', 'htmlFor'], ['accept-charset', 'acceptCharset'], ['http-equiv', 'httpEquiv']]))
/** Props React types as numbers, so a number is written as one. */
const numeric = new Set(['tabIndex', 'colSpan', 'rowSpan', 'maxLength', 'minLength', 'rows', 'cols', 'size', 'span', 'start', 'low', 'high', 'optimum', 'aria-colcount', 'aria-colindex', 'aria-colspan', 'aria-level', 'aria-posinset', 'aria-rowcount', 'aria-rowindex', 'aria-rowspan', 'aria-setsize', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow'])
/** Attributes React takes as a boolean, so one written bare stays bare. Any other bare attribute is an empty string. */
const booleans = new Set(['allowFullScreen', 'async', 'autoFocus', 'autoPlay', 'checked', 'contentEditable', 'controls', 'default', 'defer', 'disabled', 'disablePictureInPicture', 'download', 'formNoValidate', 'hidden', 'inert', 'itemScope', 'loop', 'multiple', 'muted', 'noModule', 'noValidate', 'open', 'playsInline', 'readOnly', 'required', 'reversed', 'selected', 'spellCheck', 'defaultChecked'])
/**
 * Attributes newer than React's types. React renders them as written, so they are spread in, as the skill's table says:
 * `{...{ commandfor: 'confirm', command: 'show-modal' }}`. `hidden="until-found"` is typed as a boolean only, and
 * `focusgroup` is newer still.
 */
const untyped = (attribute: Attribute) => ['commandfor', 'command', 'interestfor', 'focusgroup'].includes(attribute.name) || attribute.name === 'hidden' && !!attribute.value
/** Inputs whose `value` is what they are, not a starting value a reader edits. */
const fixedValue = new Set(['checkbox', 'radio', 'hidden', 'submit', 'button', 'reset', 'image'])

const quote = (text: string) => `'${text.replaceAll('\\', '\\\\').replaceAll('\'', '\\\'')}'`
const decode = (text: string) => text.replace(/&(?:quot|#34);/g, '"').replace(/&(?:apos|#39);/g, '\'').replace(/&amp;/g, '&')
const camel = (name: string) => name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())

function reactStyle(css: string) {
  const declarations = css.split(';').map(declaration => declaration.trim()).filter(Boolean).map(declaration => {
    const colon = declaration.indexOf(':')
    const property = declaration.slice(0, colon).trim()
    const value = decode(declaration.slice(colon + 1).trim())
    const key = property.startsWith('--') ? quote(property) : camel(property.startsWith('-ms-') ? property.slice(1) : property.replace(/^-(webkit|moz|o)-/, (_, vendor: string) => `${vendor[0].toUpperCase()}${vendor.slice(1)}-`))
    return `${key}: ${quote(value)}`
  })
  // React's types know no custom property; the cast is how a React project writes one without an import.
  const custom = css.split(';').some(declaration => declaration.trim().startsWith('--'))
  return custom ? `style={{ ${declarations.join(', ')} } as React.CSSProperties}` : `style={{ ${declarations.join(', ')} }}`
}

function reactAttribute(attribute: Attribute, svg: boolean): string {
  if (attribute.raw) return attribute.raw
  const { value } = attribute
  let name = reactNames[attribute.name.toLowerCase()] ?? attribute.name
  if (/^on/i.test(name)) throw new UnsupportedMarkup(`An inline handler (${name}) is a string of script`)
  if (svg && !/^(aria|data)-/.test(name)) {
    if (name.includes(':')) name = name.replace(/:([a-z])/, (_, letter: string) => letter.toUpperCase())
    else if (name.includes('-')) name = camel(name)
  }
  if (name === 'style' && value) return reactStyle(value)
  if (value === null || value === '') return booleans.has(name) ? name : `${name}=""`
  if (numeric.has(name) && /^-?\d+(\.\d+)?$/.test(value)) return `${name}={${value}}`
  return `${name}="${value.replaceAll('"', '&quot;')}"`
}

/** The text of an option, which is its value when it has no `value`. */
const textOf = (node: Node): string => node.type === 'text' ? node.text : node.type === 'element' ? node.children.map(textOf).join('') : ''

const react: Dialect = {
  element(element, svg) {
    if (element.tag === 'template') throw new UnsupportedMarkup('React renders into a template\'s children, not its content')
    if (element.tag === 'script' || element.tag === 'style') throw new UnsupportedMarkup(`A <${element.tag}> is not markup`)
    let attributes = element.attributes
    let children = element.children
    const extra: string[] = []
    const type = attributes.find(attribute => attribute.name === 'type')?.value ?? 'text'

    // A form control's state, written in HTML, is where it starts: React calls that a default.
    if (element.tag === 'input') {
      attributes = attributes.map(attribute =>
        attribute.name === 'checked' ? { ...attribute, name: 'defaultChecked' }
        : attribute.name === 'value' && !fixedValue.has(type) ? { ...attribute, name: 'defaultValue' }
        : attribute)
    }
    if (element.tag === 'textarea' && element.raw) {
      extra.push(element.raw.includes('\n') ? `defaultValue={\`${element.raw.replace(/[`\\]|\$\{/g, match => `\\${match}`)}\`}` : `defaultValue="${element.raw.replaceAll('"', '&quot;')}"`)
      children = []
    }
    if (element.tag === 'select') {
      // React chooses an option from the select's value, never from an option's `selected`.
      const options: Element[] = []
      const collect = (nodes: Node[]) => nodes.forEach(node => {
        if (node.type !== 'element') return
        if (node.tag === 'option') options.push(node)
        else collect(node.children)
      })
      collect(children)
      const chosen = options.filter(option => option.attributes.some(attribute => attribute.name === 'selected'))
      if (chosen.length) {
        const values = chosen.map(option => decode(option.attributes.find(attribute => attribute.name === 'value')?.value ?? textOf(option).trim()))
        extra.push(attributes.some(attribute => attribute.name === 'multiple') ? `defaultValue={[${values.map(quote).join(', ')}]}` : `defaultValue="${values[0].replaceAll('"', '&quot;')}"`)
        const strip = (nodes: Node[]): Node[] => nodes.map(node => node.type !== 'element' ? node
          : node.tag === 'option' ? { ...node, attributes: node.attributes.filter(attribute => attribute.name !== 'selected') }
          : { ...node, children: strip(node.children) })
        children = strip(children)
      }
    }

    const printed: string[] = []
    const spread = attributes.filter(untyped)
    for (const attribute of attributes) {
      if (!untyped(attribute)) printed.push(reactAttribute(attribute, svg))
      else if (attribute === spread[0]) printed.push(`{...{ ${spread.map(({ name, value }) => `${name}: ${quote(decode(value ?? ''))}`).join(', ')} }}`)
    }
    printed.push(...extra)
    const empty = isVoid(element) || element.tag === 'textarea' && !children.length && !!element.raw
    return { open: `<${element.tag}${printed.map(attribute => ` ${attribute}`).join('')}${empty ? ' />' : '>'}`, children, empty }
  },
  text: text => text.replace(/[{}<>]/g, char => ({ '{': '{\'{\'}', '}': '{\'}\'}', '<': '&lt;', '>': '&gt;' })[char]!),
  comment: text => `{/*${text.replaceAll('*/', '* /')}*/}`,
  verbatim(element) {
    // JSX folds whitespace in text, so a `pre` holds its text as a string. Markup inside one keeps its own lines.
    if (element.children.every(child => child.type === 'text')) {
      return `{\`${decode(textOf(element).replace(/&lt;/g, '<').replace(/&gt;/g, '>')).replace(/[`\\]|\$\{/g, match => `\\${match}`)}\`}`
    }
    if (/\n/.test(element.raw ?? '')) throw new UnsupportedMarkup('A <pre> with markup and line breaks would lose its lines in JSX')
    return element.children.map(child => child.type === 'text' ? react.text(child.text) : print(child, react, '', false)).join('')
  },
}

const dialects: Record<MarkupLanguage, Dialect> = { html, react, svelte, vue }

/* Icons ---------------------------------------------------------------------------------------------------------- */

/** What a file imports: an icon by default, or a framework component of the library by its name. */
export interface IconImport { name: string, from: string, named?: boolean }

const iconPackages: Record<Exclude<MarkupLanguage, 'html'>, string> = { react: '@master/icons-react', svelte: '@master/icons-svelte', vue: '@master/icons-vue' }
const masters = [16, 20, 24] as const
/** What an inline drawing states that its component already carries. */
const drawn = new Set(['viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'xmlns'])

let catalog: Map<string, string> | undefined
/** Every soft drawing of the release at its own stroke, by master and geometry. */
function drawings() {
  if (!catalog) {
    catalog = new Map()
    for (const definition of Object.values(release) as unknown[]) {
      if (typeof definition !== 'object' || definition === null || !('variants' in definition)) continue
      const { name, variants } = definition as IconDefinition
      for (const size of masters) {
        const key = `${size}:${release.serializeNodes(variants[size].soft.nodes)}`
        if (!catalog.has(key)) catalog.set(key, name)
      }
    }
  }
  return catalog
}

/** A drawing's children as the release serializes them, to be found in it. */
const geometry = (nodes: Node[]): string => nodes.map(node => {
  if (node.type !== 'element') return ''
  const inner = geometry(node.children)
  return `<${node.tag}${node.attributes.map(({ name, value }) => ` ${name}="${value ?? ''}"`).join('')}${inner ? `>${inner}</${node.tag}>` : '/>'}`
}).join('')

const pascal = (name: string) => name.replace(/(^|-)([a-z0-9])/g, (_, _dash: string, letter: string) => letter.toUpperCase())

/**
 * Replace each Master Icons drawing by its component and return what to import. An icon that is labelled keeps its
 * `aria-label`, which the component reads as its label; `aria-hidden` and `role="img"` are what it sets by itself.
 */
function components(nodes: Node[], language: Exclude<MarkupLanguage, 'html'>): { nodes: Node[], imports: IconImport[] } {
  const found: { element: Element, name: string, size: number }[] = []
  const visit = (node: Node): Node => {
    if (node.type !== 'element') return node
    if (node.tag === 'svg' && node.attributes.some(({ name, value }) => name === 'class' && value?.split(/\s+/).includes('icon'))) {
      const size = Number(/^0 0 (\d+) \1$/.exec(node.attributes.find(({ name }) => name === 'viewBox')?.value ?? '')?.[1])
      const name = drawings().get(`${size}:${geometry(node.children)}`)
      if (name) {
        const labelled = node.attributes.some(attribute => attribute.name === 'aria-label' || attribute.name === 'aria-labelledby')
        const element: Element = {
          type: 'element', tag: name, selfClosing: true, children: [],
          attributes: node.attributes.filter(attribute => !drawn.has(attribute.name) && attribute.name !== 'aria-hidden' && !(labelled && attribute.name === 'role')),
        }
        found.push({ element, name, size })
        return element
      }
    }
    return { ...node, children: node.children.map(visit) }
  }
  const result = nodes.map(visit)
  // One icon at two sizes in a preview is two components, so each says its master.
  const sizes = new Map<string, Set<number>>()
  for (const { name, size } of found) sizes.set(name, (sizes.get(name) ?? new Set()).add(size))
  const imports = new Map<string, IconImport>()
  for (const { element, name, size } of found) {
    element.tag = `${pascal(name)}Icon${sizes.get(name)!.size > 1 ? size : ''}`
    imports.set(element.tag, { name: element.tag, from: `${iconPackages[language]}/native/${size}/soft/${name}` })
  }
  return { nodes: result, imports: [...imports.values()] }
}

const importLine = ({ name, from, named }: IconImport) => `import ${named ? `{ ${name} }` : name} from '${from}'`

/* -------------------------------------------------------------------------------------------------------------- */
/* Printing                                                                                                        */
/* -------------------------------------------------------------------------------------------------------------- */

type Token = Node | 'space'

/** Children as pieces of text and elements, with `space` wherever HTML has whitespace between them. */
function tokens(children: Node[]): Token[] {
  const result: Token[] = []
  const push = (token: Token) => {
    if (token === 'space' && (result.length === 0 || result.at(-1) === 'space')) return
    result.push(token)
  }
  for (const child of children) {
    if (child.type !== 'text') { push(child); continue }
    const text = child.text.replace(/\s+/g, ' ')
    if (text.startsWith(' ')) push('space')
    if (text.trim()) push({ type: 'text', text: text.trim() })
    if (text.endsWith(' ') && text.trim()) push('space')
  }
  while (result.at(-1) === 'space') result.pop()
  return result
}

/** Elements that run inside a line of text, where a space between two of them is part of what is read. */
const textLevel = new Set(['a', 'abbr', 'b', 'bdi', 'bdo', 'cite', 'code', 'data', 'del', 'dfn', 'em', 'i', 'ins', 'kbd', 'mark', 'q', 's', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var'])
const isBlock = (node: Node) => node.type === 'comment' || node.type === 'element' && blocks.has(node.tag)
const isText = (node: Node) => node.type === 'text' || node.type === 'element' && textLevel.has(node.tag)

/**
 * Children in lines. A line break is a space in HTML and Svelte, but JSX drops whitespace that holds one and Vue drops
 * it between two elements, so every language keeps the same lines: pieces that touch stay together, and in an element
 * that holds text, a space beside that text or between two text-level elements stays a space on the line. Elsewhere
 * (between controls in a row, beside a block) a line break is free, since what it would take away draws nothing there.
 */
function lines(children: Node[]) {
  const result: Node[][] = []
  const separators: string[][] = []
  let space = false
  // Only where the element holds text of its own is it a line of text; between controls in a row, space draws nothing.
  const prose = children.some(child => child.type === 'text' && child.text.trim())
  for (const token of tokens(children)) {
    if (token === 'space') { space = true; continue }
    const last = result.at(-1)?.at(-1)
    const glue = last && !isBlock(token) && !isBlock(last) && (!space || prose && (isText(last) && isText(token) || last.type === 'text' || token.type === 'text'))
    if (glue) {
      result.at(-1)!.push(token)
      separators.at(-1)!.push(space ? ' ' : '')
    } else {
      result.push([token])
      separators.push([''])
    }
    space = false
  }
  return result.map((nodes, index) => ({ nodes, separators: separators[index] }))
}

/** The node on one line, or null when it must be broken: a block inside it, a comment, a line break it keeps. */
function flat(node: Node, dialect: Dialect, svg: boolean): string | null {
  if (node.type === 'text') return dialect.text(node.text)
  if (node.type === 'comment') return null
  if (node.wide) {
    const open = `<${node.tag}${node.attributes.map(({ raw }) => ` ${raw}`).join('')} />`
    return open.includes('\n') ? null : open
  }
  const inSvg = svg || node.tag === 'svg'
  const { open, children, empty } = dialect.element(node, inSvg)
  if (empty) return open
  if (verbatim.has(node.tag)) return (node.raw ?? '').includes('\n') ? null : `${open}${dialect.verbatim(node)}</${node.tag}>`
  const content = lines(children)
  if (content.some(line => line.nodes.some(isBlock)) && !content.every(line => line.nodes.every(child => child.type === 'text'))) return null
  const parts: string[] = []
  for (const line of content) {
    let printed = ''
    for (const [index, child] of line.nodes.entries()) {
      const one = flat(child, dialect, inSvg)
      if (one === null) return null
      printed += line.separators[index] + one
    }
    parts.push(printed)
  }
  // Lines that were broken at whitespace are joined by a space, which every language keeps within a line.
  return `${open}${parts.join(' ')}</${node.tag}>`
}

function print(node: Node, dialect: Dialect, indent: string, svg: boolean): string {
  const one = flat(node, dialect, svg)
  if (one !== null && indent.length + one.length <= width) return one
  if (node.type === 'text') return dialect.text(node.text)
  if (node.type === 'comment') return dialect.comment(node.text)
  if (node.wide) return `<${node.tag}\n${node.attributes.map(({ raw }) => raw!.split('\n').map(line => `${indent}  ${line}`).join('\n')).join('\n')}\n${indent}/>`
  const inSvg = svg || node.tag === 'svg'
  const { open, children, empty } = dialect.element(node, inSvg)
  if (empty) return open
  if (verbatim.has(node.tag)) return `${open}${dialect.verbatim(node)}</${node.tag}>`
  if (!children.length) return `${open}</${node.tag}>`
  return `${open}\n${block(children, dialect, `${indent}  `, inSvg)}\n${indent}</${node.tag}>`
}

/** Children broken one line each. */
function block(children: Node[], dialect: Dialect, indent: string, svg: boolean) {
  return lines(children).map(line => indent + line.nodes.map((node, index) => line.separators[index] + print(node, dialect, indent, svg)).join('')).join('\n')
}

/* Charts ---------------------------------------------------------------------------------------------------------- */

const chartFiles: Record<Exclude<MarkupLanguage, 'html'>, IconImport> = {
  react: { name: 'Chart', from: './ui/chart', named: true },
  svelte: { name: 'Chart', from: './ui/Chart.svelte' },
  vue: { name: 'Chart', from: './ui/Chart.vue' },
}
/** A page's script that draws one chart from data: the form every chart preview writes. */
const chartScript = /^\s*addEventListener\('DOMContentLoaded', function \(\) \{\s*MasterUI\.chart\(document\.getElementById\('([\w-]+)'\), \{([\s\S]*)\}\)\s*\}\)\s*$/

/** The entries of an object literal's body, each as its key and the text of its value. */
function entries(body: string): [string, string][] {
  const parts: string[] = []
  let depth = 0
  let from = 0
  for (let at = 0; at < body.length; at++) {
    const char = body[at]
    if (char === '\'' || char === '"' || char === '`') {
      for (at++; at < body.length && body[at] !== char; at++) if (body[at] === '\\') at++
    } else if ('([{'.includes(char)) depth++
    else if (')]}'.includes(char)) depth--
    else if (char === ',' && depth === 0) {
      parts.push(body.slice(from, at))
      from = at + 1
    }
  }
  parts.push(body.slice(from))
  return parts.filter(part => part.trim()).map(part => {
    const [, lead, key, value] = /^(\s*)([\w$]+)\s*:\s*([\s\S]*?)\s*$/.exec(part.replace(/^\n+/, '')) ?? []
    if (!key) throw new UnsupportedMarkup('A chart option that is not a plain entry')
    // Lines after the first keep how far they stood in from their key.
    return [key, value.split('\n').map((line, index) => index ? line.slice(Math.min(lead.length, line.length - line.trimStart().length)) : line).join('\n')]
  })
}

/**
 * A chart a page's script draws from data is, in a framework, the chart component given the same data: the figure
 * becomes `<Chart>`, the script's options its props, and the script goes. The component comes from
 * `npx master-ui add chart`, which copies it into the project's `ui/` directory.
 */
function charts(nodes: Node[], language: Exclude<MarkupLanguage, 'html'>): { nodes: Node[], imports: IconImport[] } {
  const drawn = new Map<string, [string, string][]>()
  for (const node of nodes) {
    const [, id, body] = node.type === 'element' && node.tag === 'script' && !node.attributes.length ? chartScript.exec(node.raw ?? '') ?? [] : []
    if (id) drawn.set(id, entries(body))
  }
  if (!drawn.size) return { nodes, imports: [] }
  let found = 0
  const visit = (node: Node): Node => {
    if (node.type !== 'element') return node
    const options = node.tag === 'figure' && drawn.get(node.attributes.find(({ name }) => name === 'id')?.value ?? '')
    if (!options) return { ...node, children: node.children.map(visit) }
    found++
    const own = node.attributes.flatMap(attribute => {
      // The component writes `chart` itself; a variant beside it stays.
      const value = attribute.name === 'class' ? (attribute.value ?? '').split(/\s+/).filter(name => name !== 'chart').join(' ') : attribute.value
      return attribute.name === 'class' && !value ? [] : [{ ...attribute, value }]
    })
    const props = options.map(([key, value]) => {
      const text = /^'([^'"\\{}]*)'$/.exec(value)?.[1]
      if (language === 'vue' && value.includes('"')) throw new UnsupportedMarkup('A chart option with a double quote cannot be a Vue attribute')
      return text !== undefined ? `${key}="${text}"` : value === 'true' ? key : language === 'vue' ? `:${key}="${value}"` : `${key}={${value}}`
    })
    const raws = [...own.map(attribute => language === 'react' ? reactAttribute(attribute, false) : htmlAttribute(attribute)), ...props]
    return { type: 'element', tag: 'Chart', selfClosing: true, wide: true, children: [], attributes: raws.map(raw => ({ name: raw, value: null, raw })) }
  }
  const kept = nodes.filter(node => !(node.type === 'element' && node.tag === 'script' && chartScript.test(node.raw ?? ''))).map(visit)
  if (found !== drawn.size) throw new UnsupportedMarkup('A chart script whose figure is not in the markup')
  // The script was the last thing in the markup: the line break before it goes with it.
  while (kept.at(-1)?.type === 'text' && !(kept.at(-1) as Text).text.trim()) kept.pop()
  return { nodes: kept, imports: [chartFiles[language]] }
}

export interface PrintOptions {
  /**
   * The preview is a pattern with a script. HTML ends with the module that attaches the behaviors; a framework
   * attaches them to the markup's root when it mounts and detaches them when it goes, as /guide/behaviors shows.
   */
  behaviors?: boolean
}

/** The type of the element a React ref holds, for the roots a preview has. Any other is an HTMLElement. */
const interfaces: Record<string, string> = {
  a: 'HTMLAnchorElement', button: 'HTMLButtonElement', details: 'HTMLDetailsElement', dialog: 'HTMLDialogElement', div: 'HTMLDivElement',
  fieldset: 'HTMLFieldSetElement', form: 'HTMLFormElement', input: 'HTMLInputElement', label: 'HTMLLabelElement', li: 'HTMLLIElement',
  ol: 'HTMLOListElement', p: 'HTMLParagraphElement', span: 'HTMLSpanElement', table: 'HTMLTableElement', ul: 'HTMLUListElement',
  video: 'HTMLVideoElement', audio: 'HTMLAudioElement', svg: 'SVGSVGElement',
}
const rootAttribute: Record<Exclude<MarkupLanguage, 'html'>, string> = { react: 'ref={root}', svelte: '{@attach attach}', vue: 'ref="root"' }
const attachModule = '\n<script type="module">\n  import { attach } from \'@master/ui/behaviors\'\n\n  attach()\n</script>'

/**
 * The markup of a preview in one language and the icons it imports. Throws `UnsupportedMarkup` when that language
 * cannot hold it as markup. React's markup is one expression, Vue's a template; the imports stand apart from both.
 * With behaviors, `root` is the tag that takes them: the markup's one root, or a `div` put around several.
 */
export function printSource(source: string, language: MarkupLanguage, { behaviors = false }: PrintOptions = {}): { markup: string, imports: IconImport[], root?: string } {
  let nodes = parse((behaviors && language === 'html' ? source + attachModule : source).trim())
  let imports: IconImport[] = []
  let root: string | undefined
  const dialect = dialects[language]
  if (language !== 'html') {
    const chart = charts(nodes, language)
    nodes = chart.nodes
    const visit = (node: Node) => {
      if (node.type !== 'element') return
      if (node.tag === 'script' || node.tag === 'style') throw new UnsupportedMarkup(`A <${node.tag}> is not markup`)
      if (node.attributes.some(attribute => /^on[a-z]+$/i.test(attribute.name))) throw new UnsupportedMarkup('An inline handler is a string of script')
      node.children.forEach(visit)
    }
    nodes.forEach(visit)
    ;({ nodes, imports } = components(nodes, language))
    imports = [...chart.imports, ...imports]
    // The chart component attaches its own behavior, so a preview it draws needs nothing attached around it.
    if (behaviors && !chart.imports.length) {
      const mark: Attribute = { name: 'ref', value: null, raw: rootAttribute[language] }
      const roots = nodes.filter(node => node.type !== 'text' || node.text.trim())
      const only = roots.length === 1 && roots[0].type === 'element' && /^[a-z]/.test(roots[0].tag) ? roots[0] : undefined
      // React and Vue name the root first; an attachment reads best after what the element is.
      if (only) nodes = nodes.map(node => node !== only ? node : { ...only, attributes: language === 'svelte' ? [...only.attributes, mark] : [mark, ...only.attributes] })
      else nodes = [{ type: 'element', tag: 'div', attributes: [mark], children: [{ type: 'text', text: '\n' }, ...nodes, { type: 'text', text: '\n' }], selfClosing: false }]
      root = only?.tag ?? 'div'
    }
  }
  if (language === 'react') {
    const roots = lines(nodes)
    if (roots.length === 1 && roots[0].nodes.length === 1 && roots[0].nodes[0].type === 'element') return { markup: print(roots[0].nodes[0], dialect, '', false), imports, root }
    return { markup: `<>\n${block(nodes, dialect, '  ', false)}\n</>`, imports, root }
  }
  if (language === 'vue') return { markup: `<template>\n${block(nodes, dialect, '  ', false)}\n</template>`, imports, root }
  return { markup: block(nodes, dialect, '', false), imports, root }
}

const indented = (text: string, by: string) => text.split('\n').map(line => line && by + line).join('\n')

/**
 * A preview as a reader copies it: the markup, under the imports of its icons where the language has components.
 * A pattern with a script is a whole file in a framework: a component that attaches the behaviors to its root.
 */
export function printMarkup(source: string, language: MarkupLanguage, options: PrintOptions = {}): string {
  const { markup, imports, root } = printSource(source, language, options)
  const icons = imports.map(importLine)
  if (root && language === 'react') {
    return [
      'import { useEffect, useRef } from \'react\'', 'import { attach } from \'@master/ui/behaviors\'', ...icons, '',
      'export function Example() {', `  const root = useRef<${interfaces[root] ?? 'HTMLElement'}>(null)`, '  useEffect(() => attach(root.current!), [])', '',
      '  return (', indented(markup, '    '), '  )', '}',
    ].join('\n')
  }
  if (root && language === 'svelte') {
    return `<script>\n${['import { attach } from \'@master/ui/behaviors\'', ...icons].map(line => `  ${line}`).join('\n')}\n</script>\n\n${markup}`
  }
  if (root && language === 'vue') {
    return [
      '<script setup>', 'import { onMounted, onUnmounted, ref } from \'vue\'', 'import { attach } from \'@master/ui/behaviors\'', ...icons, '',
      'const root = ref(null)', 'let detach', '', 'onMounted(() => { detach = attach(root.value) })', 'onUnmounted(() => detach?.())', '</script>', '', markup,
    ].join('\n')
  }
  if (!icons.length) return markup
  if (language === 'svelte') return `<script>\n${icons.map(line => `  ${line}`).join('\n')}\n</script>\n\n${markup}`
  if (language === 'vue') return `<script setup>\n${icons.join('\n')}\n</script>\n\n${markup}`
  return `${icons.join('\n')}\n\n${markup}`
}

/** Every language a preview's markup can be written in, HTML first; a framework that cannot hold it is left out. */
export function markupSources(source: string, options: PrintOptions = {}) {
  return markupLanguages.flatMap(entry => {
    try {
      return [{ ...entry, code: printMarkup(source, entry.language, options) }]
    } catch (error) {
      if (error instanceof UnsupportedMarkup) return []
      throw error
    }
  })
}
