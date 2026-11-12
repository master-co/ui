/**
 * The markup the homepage writes out and then renders: each example is the contract's own markup, shown as code
 * and drawn by the library on the same page. Lines are kept short enough to fit the slab beside the stage on a
 * laptop; a tag with many attributes continues on the next line, as it would in a project.
 */
export interface ForgeExample {
  id: string
  label: string
  file: string
  html: string
}

export const forgeExamples: ForgeExample[] = [
  {
    id: 'card',
    label: 'Card',
    file: 'deployments.html',
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
    html: `<div class="toast-region" role="region"
  aria-label="Notifications" aria-live="polite">
  <dialog open class="toast toast-success" aria-labelledby="forge-toast">
    <svg class="icon toast-icon" viewBox="0 0 24 24" aria-hidden="true"
      fill="none" stroke="currentColor" stroke-linecap="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="m8.5 12.5 2.5 2.5 4.5-5.5"/>
    </svg>
    <div class="toast-body">
      <p class="toast-title" id="forge-toast">Deployed to production</p>
      <p class="toast-description">atlas.dev is live in 14 regions.</p>
    </div>
    <form method="dialog" class="toast-close">
      <button class="btn btn-quiet btn-square btn-sm" aria-label="Dismiss">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"
          fill="none" stroke="currentColor" stroke-linecap="round">
          <path d="M6 6l12 12M18 6 6 18"/>
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
