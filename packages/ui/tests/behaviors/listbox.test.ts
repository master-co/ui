import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { listbox } from '../../behaviors/listbox.js'

/** happy-dom catches what a listener throws and reports it on the window; a test must not pass over it. */
const thrown: unknown[] = []
afterEach(() => assert.deepEqual(thrown.splice(0), [], 'a listener threw'))

/**
 * The listbox's behavior moves two states: the active option, aria-selected on the option and
 * aria-activedescendant on the list, and the chosen one, aria-checked. The markup is the contract's example
 * with more options, a disabled one among them.
 */
const markup = (attributes = '') => `<div class="listbox" role="listbox" aria-label="Framework" tabindex="0" aria-activedescendant="fw-astro" ${attributes}>
  <div class="listbox-option" role="option" id="fw-astro" aria-selected="true" aria-checked="true">Astro</div>
  <div class="listbox-option" role="option" id="fw-next" aria-checked="false">Next.js</div>
  <div class="listbox-option" role="option" id="fw-nuxt" aria-checked="false" aria-disabled="true">Nuxt</div>
  <div class="listbox-option" role="option" id="fw-svelte" aria-checked="false">SvelteKit</div>
  <div class="listbox-option" role="option" id="fw-solid" aria-checked="false">Solid Start</div>
</div>`

function setup(html = markup()) {
  const page = dom(html)
  page.window.addEventListener('error', (event: any) => thrown.push(event.error ?? event.message))
  const root = page.one('.listbox')
  const heard: string[] = []
  page.document.body.addEventListener('input', (event: any) => { if (event.target === root) heard.push('input') })
  page.document.body.addEventListener('change', (event: any) => { if (event.target === root) heard.push('change') })
  /** The id of the active option, checked both ways the behavior says it. */
  const active = () => {
    const selected = page.all('[role="option"][aria-selected="true"]')
    assert.equal(selected.length, 1, 'one option is active')
    assert.equal(root.getAttribute('aria-activedescendant'), selected[0].id, 'aria-activedescendant names the active option')
    return selected[0].id as string
  }
  const checked = () => page.all('[role="option"][aria-checked="true"]').map(option => option.id as string)
  return { ...page, root, heard, active, checked }
}

test('listbox: ArrowDown and ArrowUp move the active option, skip a disabled one and stop at the ends', () => {
  const { root, key, active } = setup()
  listbox(root)
  assert.equal(key(root, 'ArrowDown'), true, 'a key the behavior handles is prevented')
  assert.equal(active(), 'fw-next')
  key(root, 'ArrowDown')
  assert.equal(active(), 'fw-svelte', 'Nuxt is disabled')
  key(root, 'ArrowDown')
  assert.equal(active(), 'fw-solid')
  assert.equal(key(root, 'ArrowDown'), true)
  assert.equal(active(), 'fw-solid', 'the last option is the end')
  key(root, 'ArrowUp')
  key(root, 'ArrowUp')
  assert.equal(active(), 'fw-next', 'Nuxt is skipped on the way back')
  key(root, 'ArrowUp')
  assert.equal(key(root, 'ArrowUp'), true)
  assert.equal(active(), 'fw-astro', 'the first option is the end')
})

test('listbox: the active option is scrolled into view', () => {
  const { root, one, key } = setup()
  const seen: unknown[] = []
  one('#fw-next').scrollIntoView = (options: unknown) => { seen.push(options) }
  listbox(root)
  key(root, 'ArrowDown')
  assert.deepEqual(seen, [{ block: 'nearest' }])
})

test('listbox: Home and End move to the first and the last option', () => {
  const { root, key, active } = setup()
  listbox(root)
  assert.equal(key(root, 'End'), true)
  assert.equal(active(), 'fw-solid')
  assert.equal(key(root, 'Home'), true)
  assert.equal(active(), 'fw-astro')
})

test('listbox: Home and End skip a disabled option at an end', () => {
  const { root, one, key, active } = setup()
  one('#fw-astro').setAttribute('aria-disabled', 'true')
  one('#fw-solid').setAttribute('aria-disabled', 'true')
  listbox(root)
  key(root, 'End')
  assert.equal(active(), 'fw-svelte')
  key(root, 'Home')
  assert.equal(active(), 'fw-next')
})

test('listbox: Enter and Space choose the active option, one at a time', () => {
  const { root, key, checked, heard, all } = setup()
  listbox(root)
  key(root, 'ArrowDown')
  assert.deepEqual(checked(), ['fw-astro'], 'moving does not choose')
  assert.equal(key(root, 'Enter'), true)
  assert.deepEqual(checked(), ['fw-next'])
  assert.deepEqual(all('[role="option"]').map(option => option.getAttribute('aria-checked')), ['false', 'true', 'false', 'false', 'false'])
  assert.deepEqual(heard, ['input', 'change'])
  key(root, 'ArrowDown')
  assert.equal(key(root, ' '), true)
  assert.deepEqual(checked(), ['fw-svelte'])
  assert.deepEqual(heard, ['input', 'change', 'input', 'change'])
  key(root, 'Enter')
  assert.deepEqual(checked(), ['fw-svelte'], 'choosing the chosen option keeps it')
  assert.equal(heard.length, 4, 'and changes nothing, so nothing is dispatched')
})

test('listbox: with aria-multiselectable, Enter and Space check and uncheck the active option by itself', () => {
  const { root, key, checked, heard } = setup(markup('aria-multiselectable="true"'))
  listbox(root)
  key(root, 'ArrowDown')
  key(root, ' ')
  assert.deepEqual(checked(), ['fw-astro', 'fw-next'])
  key(root, 'End')
  key(root, 'Enter')
  assert.deepEqual(checked(), ['fw-astro', 'fw-next', 'fw-solid'])
  key(root, ' ')
  assert.deepEqual(checked(), ['fw-astro', 'fw-next'])
  assert.deepEqual(heard, ['input', 'change', 'input', 'change', 'input', 'change'])
})

test('listbox: typed letters move to the next option that starts with them', (t) => {
  const { root, key, active } = setup()
  let now = 1_000
  t.mock.method(Date, 'now', () => now)
  listbox(root)
  assert.equal(key(root, 's'), true, 'a typed letter is prevented')
  assert.equal(active(), 'fw-svelte')
  now += 100
  key(root, 'o')
  assert.equal(active(), 'fw-solid', 'letters typed together are read together: "so"')
  now += 1_000
  key(root, 'N')
  assert.equal(active(), 'fw-next', 'after a pause the letters start again, in any case; disabled Nuxt is never found')
  now += 1_000
  key(root, 'n')
  assert.equal(active(), 'fw-next', 'the only enabled match keeps the place')
  now += 1_000
  key(root, 'z')
  assert.equal(active(), 'fw-next', 'no match, no move')
})

test('listbox: one letter pressed again walks through the options that start with it', (t) => {
  const { root, key, active } = setup()
  let now = 1_000
  t.mock.method(Date, 'now', () => now)
  listbox(root)
  key(root, 's')
  assert.equal(active(), 'fw-svelte')
  now += 100
  key(root, 's')
  assert.equal(active(), 'fw-solid')
  now += 100
  key(root, 's')
  assert.equal(active(), 'fw-svelte', 'and around again')
})

test('listbox: hidden options are skipped by every key', () => {
  const { root, one, key, active } = setup()
  one('#fw-next').hidden = true
  one('#fw-solid').hidden = true
  listbox(root)
  key(root, 'ArrowDown')
  assert.equal(active(), 'fw-svelte')
  key(root, 'End')
  assert.equal(active(), 'fw-svelte')
  key(root, 'n')
  assert.equal(active(), 'fw-svelte')
})

test('listbox: a key it does not handle is left alone', () => {
  const { root, key, active, checked } = setup()
  listbox(root)
  assert.equal(key(root, 'Tab'), false)
  assert.equal(key(root, 'Escape'), false)
  assert.equal(key(root, 'ArrowRight'), false)
  assert.equal(key(root, 'ArrowDown', { altKey: true }), false)
  assert.equal(key(root, 'a', { ctrlKey: true }), false)
  assert.equal(key(root, 's', { metaKey: true }), false)
  assert.equal(active(), 'fw-astro')
  assert.deepEqual(checked(), ['fw-astro'])
})

test('listbox: focus on a list with no active option starts from the chosen one, or from the first', () => {
  const html = markup().replace(' aria-activedescendant="fw-astro"', '').replace(' aria-selected="true" aria-checked="true"', ' aria-checked="false"')
  const first = setup(html)
  listbox(first.root)
  assert.equal(first.root.hasAttribute('aria-activedescendant'), false, 'nothing is active before focus')
  first.root.focus()
  assert.equal(first.active(), 'fw-astro')
  assert.deepEqual(first.checked(), [], 'focus does not choose')
  assert.equal(first.document.activeElement, first.root, 'focus stays on the list')

  const chosen = setup(html.replace('id="fw-svelte" aria-checked="false"', 'id="fw-svelte" aria-checked="true"'))
  listbox(chosen.root)
  chosen.root.focus()
  assert.equal(chosen.active(), 'fw-svelte')
})

test('listbox: with no active option, ArrowDown starts at the first and ArrowUp at the last', () => {
  const html = markup().replace(' aria-activedescendant="fw-astro"', '').replace(' aria-selected="true"', '')
  const down = setup(html)
  listbox(down.root)
  down.key(down.root, 'ArrowDown')
  assert.equal(down.active(), 'fw-astro')
  const up = setup(html)
  listbox(up.root)
  up.key(up.root, 'ArrowUp')
  assert.equal(up.active(), 'fw-solid')
  const none = setup(html)
  listbox(none.root)
  assert.equal(none.key(none.root, 'Enter'), false, 'with nothing active, Enter has nothing to choose')
  assert.deepEqual(none.checked(), ['fw-astro'])
})

test('listbox: a click makes an option active and chooses it; a disabled option does neither', () => {
  const { root, one, click, active, checked, heard } = setup()
  listbox(root)
  click(one('#fw-svelte'))
  assert.equal(active(), 'fw-svelte')
  assert.deepEqual(checked(), ['fw-svelte'])
  assert.deepEqual(heard, ['input', 'change'])
  click(one('#fw-nuxt'))
  assert.equal(active(), 'fw-svelte')
  assert.deepEqual(checked(), ['fw-svelte'])
  assert.equal(heard.length, 2)
})

test('listbox: an option without an id is given one when it becomes active', () => {
  const { root, all, key } = setup(markup().replace(/ id="fw-[a-z]+"/g, '').replace(' aria-activedescendant="fw-astro"', ''))
  listbox(root)
  key(root, 'ArrowDown')
  const option = all('[role="option"]')[1]
  assert.ok(option.id, 'the option has an id')
  assert.equal(root.getAttribute('aria-activedescendant'), option.id)
  assert.equal(all('[role="option"]').filter(other => other.id).length, 1, 'only the option that is pointed at')
})

test('listbox: a listbox that a combobox controls is left to that combobox', () => {
  const { root, one, click, key, checked } = setup(`<input role="combobox" aria-controls="frameworks">${markup('id="frameworks"')}`)
  listbox(root)
  assert.equal(key(root, 'ArrowDown'), false)
  click(one('#fw-svelte'))
  assert.deepEqual(checked(), ['fw-astro'])
})

test('listbox: detach removes the listeners, and attaching twice leaves one behavior', () => {
  const { root, one, key, click, active, checked, heard } = setup()
  listbox(root)
  const detach = listbox(root)
  key(root, 'ArrowDown')
  key(root, 'Enter')
  assert.equal(active(), 'fw-next')
  assert.deepEqual(heard, ['input', 'change'], 'one behavior answers, not two')
  detach()
  assert.equal(key(root, 'ArrowDown'), false)
  assert.equal(key(root, 's'), false)
  click(one('#fw-solid'))
  assert.equal(active(), 'fw-next')
  assert.deepEqual(checked(), ['fw-next'])
  assert.equal(heard.length, 2)
})
