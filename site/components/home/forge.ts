/**
 * The markup the homepage writes out and then renders: each example is the contract's own markup, shown as code
 * and drawn by the library on the same page.
 */
export interface ForgeExample {
  id: string
  label: string
  file: string
  html: string
}

const check = '<svg class="icon toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5.5"/></svg>'
const close = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'

export const forgeExamples: ForgeExample[] = [
  {
    id: 'card',
    label: 'Card',
    file: 'deployments.html',
    html: `<section class="card">
  <header class="card-header">
    <h3 class="card-title">Preview deployments</h3>
    <p class="card-description">Every pull request gets its own URL.</p>
    <input type="checkbox" role="switch" class="switch card-action" checked aria-label="Preview deployments">
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
    html: `<div class="toast-region" role="region" aria-label="Notifications" aria-live="polite">
  <dialog open class="toast toast-success" aria-labelledby="toast-deployed">
    ${check}
    <div class="toast-body">
      <p class="toast-title" id="toast-deployed">Deployed to production</p>
      <p class="toast-description">atlas.dev is live in 14 regions.</p>
    </div>
    <form method="dialog" class="toast-close">
      <button class="btn btn-quiet btn-square btn-sm" aria-label="Dismiss">
        ${close}
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
  <label class="segmented-item"><input type="radio" class="segmented-input" name="view" value="list" checked>List</label>
  <label class="segmented-item"><input type="radio" class="segmented-input" name="view" value="board">Board</label>
  <label class="segmented-item"><input type="radio" class="segmented-input" name="view" value="timeline">Timeline</label>
</div>`,
  },
]

const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

/**
 * HTML highlighted into one `<span class="ui-forge-line">` per line, with tags, attribute names, values and
 * punctuation in their own spans. Every character of the source survives as text, so the decode can walk it.
 * Tags never span lines in these examples.
 */
export function highlight(html: string) {
  const span = (kind: string, text: string) => `<span class="${kind}">${escape(text)}</span>`
  const tag = (source: string) => {
    const [, open, name, rest, end] = source.match(/^(<\/?)([\w-]+)([\s\S]*?)(\/?>)$/)!
    let out = span('p', open) + span('t', name)
    for (const [, space, attribute, equals, value] of rest.matchAll(/(\s+)([\w-]+)(?:(=)("[^"]*"))?/g)) {
      out += space + span('a', attribute) + (equals ? span('p', equals) + span('s', value) : '')
    }
    return out + span('p', end)
  }
  return html.split('\n').map(line => {
    const out = line.split(/(<[^>]+>)/).map(part => part.startsWith('<') ? tag(part) : escape(part)).join('')
    return `<span class="ui-forge-line">${out || ' '}</span>`
  }).join('\n')
}
