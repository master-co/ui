/**
 * The markup the homepage writes out and then renders: each example is the contract's own markup, shown as code
 * and drawn by the library on the same page. Lines are kept short enough to fit the slab beside the stage on a
 * laptop; a tag with many attributes continues on the next line, as it would in a project.
 */
export interface ForgeExample {
  id: string
  label: string
  file: string
  /** The name the example takes as a component file in React, Svelte and Vue. */
  component: string
  html: string
}

export const forgeExamples: ForgeExample[] = [
  {
    id: 'card',
    label: 'Card',
    file: 'deployments.html',
    component: 'PreviewDeployments',
    html: `<section class="card">
  <header class="card-header">
    <h3 class="card-title">Preview deployments</h3>
    <p class="card-description">A URL for every pull request.</p>
    <input type="checkbox" role="switch" class="switch card-action"
      checked aria-label="Preview deployments">
  </header>
  <div class="card-body">
    <label class="field">
      Branch pattern
      <input class="input" value="feature/*">
    </label>
  </div>
  <footer class="card-footer">
    <button type="button" class="btn btn-sm">Reset</button>
    <button type="button" class="btn btn-sm btn-primary">Save</button>
  </footer>
</section>`,
  },
  {
    id: 'toast',
    label: 'Toast',
    file: 'deployed.html',
    component: 'DeployedToast',
    html: `<div class="toast-region" role="region"
  aria-label="Notifications" aria-live="polite">
  <dialog open class="toast toast-success" aria-labelledby="forge-toast">
    <svg class="icon toast-icon" viewBox="0 0 16 16" aria-hidden="true"
      fill="none" stroke="currentColor" stroke-linecap="round">
      <circle cx="8" cy="8" r="6"/>
      <path d="M5 8L7.1041 9.8703A0.2 0.2 0 0 0 7.3832
        9.8573L10.75 6.25"/>
    </svg>
    <div class="toast-body">
      <p class="toast-title" id="forge-toast">Deployed to production</p>
      <p class="toast-description">atlas.dev is live in 14 regions.</p>
    </div>
    <form method="dialog" class="toast-close">
      <button class="btn btn-quiet btn-square btn-sm" aria-label="Dismiss">
        <svg class="icon" viewBox="0 0 16 16" aria-hidden="true"
          fill="none" stroke="currentColor" stroke-linecap="round">
          <path d="M4 4L12 12"/>
          <path d="M4 12L12 4"/>
        </svg>
      </button>
    </form>
  </dialog>
</div>`,
  },
  {
    id: 'segmented',
    label: 'Segmented',
    file: 'view.html',
    component: 'ViewSwitch',
    html: `<div class="segmented" role="radiogroup" aria-label="View">
  <label class="segmented-item">
    <input type="radio" class="segmented-input"
      name="forge-view" value="list" checked>
    List
  </label>
  <label class="segmented-item">
    <input type="radio" class="segmented-input"
      name="forge-view" value="board">
    Board
  </label>
  <label class="segmented-item">
    <input type="radio" class="segmented-input"
      name="forge-view" value="timeline">
    Timeline
  </label>
</div>`,
  },
]

/** The frameworks the slab writes each example in. The specimen beside it is the same markup, drawn once. */
export const forgeFrameworks = [
  { id: 'html', title: 'HTML' },
  { id: 'react', title: 'React', language: 'tsx' },
  { id: 'svelte', title: 'Svelte', language: 'svelte' },
  { id: 'vue', title: 'Vue', language: 'vue' },
] as const

export type ForgeFramework = typeof forgeFrameworks[number]

const voidElements = new Set(['input', 'img', 'br', 'hr', 'meta', 'link', 'source', 'col'])
const indent = (code: string, by: number) => code.split('\n').map(line => ' '.repeat(by) + line).join('\n')

/**
 * The markup as JSX: `className` and `htmlFor`, other hyphenated attributes in camel case (ARIA and data attributes
 * stay as written), a field's initial `checked` and `value` as `defaultChecked` and `defaultValue` so it stays
 * uncontrolled, and every void element closed. Whitespace between attributes is kept, so line breaks stay where
 * the markup has them.
 */
function toJsx(html: string) {
  return html.replace(/<([a-z][\w-]*)([^<>]*?)(\/?)>/g, (_, name: string, rest: string, closed: string) => {
    const type = /\stype="([^"]*)"/.exec(rest)?.[1]
    const attributes = rest.replace(/(\s+)([\w-]+)(?:=("[^"]*"))?/g, (__, space: string, attribute: string, value?: string) => {
      let renamed = attribute
      if (attribute === 'class') renamed = 'className'
      else if (attribute === 'for') renamed = 'htmlFor'
      else if (attribute === 'tabindex') renamed = 'tabIndex'
      else if (attribute.includes('-') && !/^(aria|data)-/.test(attribute)) renamed = attribute.replace(/-(\w)/g, (___, letter: string) => letter.toUpperCase())
      if (name === 'input' && attribute === 'checked' && !value) renamed = 'defaultChecked'
      if (name === 'input' && attribute === 'value' && type !== 'radio' && type !== 'checkbox') renamed = 'defaultValue'
      return space + renamed + (value ? `=${value}` : '')
    })
    const end = closed || !voidElements.has(name) ? `${closed}>` : ' />'
    return `<${name}${attributes}${end}`
  })
}

/** An example as the file a project keeps it in: the markup itself, or the component of a framework that renders it. */
export function forgeSource(example: ForgeExample, framework: ForgeFramework['id']) {
  switch (framework) {
    case 'react':
      return { file: `${example.component}.tsx`, code: `export function ${example.component}() {\n  return (\n${indent(toJsx(example.html), 4)}\n  )\n}` }
    case 'svelte':
      return { file: `${example.component}.svelte`, code: example.html }
    case 'vue':
      return { file: `${example.component}.vue`, code: `<template>\n${indent(example.html, 2)}\n</template>` }
    default:
      return { file: example.file, code: example.html }
  }
}

const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

/** A run of source text and the kind it is highlighted as: a tag name, an attribute, a value, punctuation, or text. */
type Token = [kind: 't' | 'a' | 's' | 'p' | '', text: string]

/** Splits markup into tokens. A tag may run over several lines; its line breaks stay in the whitespace between attributes. */
function tokenize(html: string) {
  const tokens: Token[] = []
  for (const part of html.split(/(<[^>]+>)/)) {
    if (!part) continue
    if (!part.startsWith('<')) {
      tokens.push(['', part])
      continue
    }
    const [, open, name, rest, end] = part.match(/^(<\/?)([\w-]+)([\s\S]*?)(\/?>)$/)!
    tokens.push(['p', open], ['t', name])
    for (const [, space, attribute, equals, value] of rest.matchAll(/(\s+)([\w-]+)(?:(=)("[^"]*"))?/g)) {
      tokens.push(['', space], ['a', attribute])
      if (equals) tokens.push(['p', equals], ['s', value])
    }
    tokens.push(['p', end])
  }
  return tokens
}

/**
 * HTML highlighted into one `<span class="ui-forge-line">` per line, with tags, attribute names, values and
 * punctuation in their own spans. Every character of the source survives as text, so the decode can walk it and a
 * copy takes the markup exactly. A token is cut at each line break, so no span crosses a line. The contracts figure
 * highlights its single lines with it too and strips the line span, so a line keeps exactly that one wrapper.
 */
export function highlight(html: string) {
  const lines: string[] = ['']
  for (const [kind, text] of tokenize(html)) {
    text.split('\n').forEach((piece, index) => {
      if (index > 0) lines.push('')
      if (piece) lines[lines.length - 1] += kind ? `<span class="${kind}">${escape(piece)}</span>` : escape(piece)
    })
  }
  return lines.map(line => `<span class="ui-forge-line">${line || ' '}</span>`).join('\n')
}
