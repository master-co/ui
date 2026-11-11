import { test, mock, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { tree } from '../../behaviors/tree.js'

/**
 * The tree's behavior walks and folds the two trees the stylesheet draws: branches that are native details
 * (the page's first example) and rows that say aria-expanded inside role="tree" (its last). happy-dom turns
 * no key into a click, so where a browser activates a summary, a link or a button by itself the tests
 * assert that the key was left alone.
 */
const folders = (attributes = '') => `<ul class="tree" ${attributes}>
  <li>
    <details class="tree-group" open>
      <summary class="tree-item tree-toggle">packages</summary>
      <ul class="tree-sub">
        <li>
          <details class="tree-group" open>
            <summary class="tree-item tree-toggle">ui</summary>
            <ul class="tree-sub">
              <li><a class="tree-item" href="#button" aria-current="page">button.css</a></li>
              <li><a class="tree-item" href="#input">input.css</a></li>
              <li><a class="tree-item" href="#theme">theme.css</a></li>
            </ul>
          </details>
        </li>
        <li>
          <details class="tree-group">
            <summary class="tree-item tree-toggle">tests</summary>
            <ul class="tree-sub">
              <li><a class="tree-item" href="#test">master.test.ts</a></li>
            </ul>
          </details>
        </li>
      </ul>
    </details>
  </li>
  <li><a class="tree-item" href="#readme">README.md</a></li>
  <li><a class="tree-item" href="#license">LICENSE</a></li>
</ul>`

const outline = `<ul class="tree" role="tree" aria-label="Outline">
  <li role="none">
    <div class="tree-item tree-toggle" role="treeitem" aria-expanded="true" tabindex="0">Introduction</div>
    <ul class="tree-sub" role="group">
      <li role="none"><div class="tree-item" role="treeitem" aria-selected="true" tabindex="-1">How it fits together</div></li>
      <li role="none"><div class="tree-item" role="treeitem" tabindex="-1">Principles</div></li>
    </ul>
  </li>
  <li role="none">
    <div class="tree-item tree-toggle" role="treeitem" aria-expanded="false" tabindex="-1">Theme</div>
    <ul class="tree-sub" role="group">
      <li role="none"><div class="tree-item" role="treeitem" tabindex="-1">Surfaces</div></li>
    </ul>
  </li>
</ul>`

afterEach(() => mock.timers.reset())

function setup(html = folders(), attach = true) {
  const page = dom(html)
  const root = page.one('.tree')
  const text = (item: any) => item?.textContent.trim()
  /** A row, by what it says. */
  const row = (name: string) => {
    const found = page.all('.tree-item').find((item) => text(item) === name)
    if (!found) throw new Error(`No row says ${name}`)
    return found
  }
  /** The rows in the tab order. */
  const stops = () => page.all('.tree-item').filter((item) => item.getAttribute('tabindex') === '0').map(text)
  const focus = () => text(page.document.activeElement)
  /** Press a key on the row in focus, as a keyboard does. */
  const press = (name: string, init: Record<string, unknown> = {}) => page.key(page.document.activeElement, name, init)
  const detach = attach ? tree(root) : () => {}
  return { ...page, root, row, stops, focus, press, detach, text }
}

test('tree: the tree is one tab stop, at the current row', () => {
  const { all, stops } = setup()
  assert.deepEqual(stops(), ['button.css'])
  assert.ok(all('.tree-item').every((item) => ['0', '-1'].includes(item.getAttribute('tabindex'))), 'a summary and a link leave the tab order')
})

test('tree: Tab enters at the first row when none is current, and at the row the markup chose when it chose one', () => {
  const plain = setup(folders().replace(' aria-current="page"', ''))
  assert.deepEqual(plain.stops(), ['packages'])
  const chosen = setup(outline)
  assert.deepEqual(chosen.stops(), ['Introduction'], 'tabindex="0" in the markup wins over the selected row')
  const selected = setup(outline.replace('tabindex="0"', 'tabindex="-1"'))
  assert.deepEqual(selected.stops(), ['How it fits together'])
  const folded = setup(folders().replace('<details class="tree-group" open>\n            <summary class="tree-item tree-toggle">ui', '<details class="tree-group">\n            <summary class="tree-item tree-toggle">ui'))
  assert.deepEqual(folded.stops(), ['packages'], 'a current row inside a closed branch cannot take focus')
})

test('tree: ArrowDown and ArrowUp move to the next and the previous visible row', () => {
  const { row, press, focus, stops } = setup()
  row('packages').focus()
  const walked = []
  for (let step = 0; step < 7; step++) {
    assert.equal(press('ArrowDown'), true, 'a key the behavior handles is prevented')
    walked.push(focus())
  }
  assert.deepEqual(walked, ['ui', 'button.css', 'input.css', 'theme.css', 'tests', 'README.md', 'LICENSE'], 'the row inside the closed branch is passed over')
  assert.deepEqual(stops(), ['LICENSE'])
  assert.equal(press('ArrowDown'), true)
  assert.equal(focus(), 'LICENSE', 'the keys do not wrap')
  press('ArrowUp')
  press('ArrowUp')
  assert.equal(focus(), 'tests')
  row('packages').focus()
  assert.equal(press('ArrowUp'), true)
  assert.equal(focus(), 'packages')
})

test('tree: ArrowRight opens a closed branch and, on an open branch, moves to its first row', () => {
  const { row, press, focus, one } = setup()
  const tests = row('tests')
  tests.focus()
  assert.equal(press('ArrowRight'), true)
  assert.equal(tests.parentElement.open, true)
  assert.equal(focus(), 'tests', 'opening keeps focus on the branch')
  press('ArrowRight')
  assert.equal(focus(), 'master.test.ts')
  assert.equal(press('ArrowRight'), true)
  assert.equal(focus(), 'master.test.ts', 'a leaf has nowhere further in')
  assert.equal(one('details').open, true)
})

test('tree: ArrowLeft closes an open branch and, on a closed branch or a leaf, moves to the row of its parent', () => {
  const { row, press, focus, stops } = setup()
  row('input.css').focus()
  assert.equal(press('ArrowLeft'), true)
  assert.equal(focus(), 'ui')
  press('ArrowLeft')
  assert.equal(row('ui').parentElement.open, false)
  assert.equal(focus(), 'ui')
  press('ArrowLeft')
  assert.equal(focus(), 'packages', 'a closed branch moves to its parent')
  press('ArrowLeft')
  assert.equal(row('packages').parentElement.open, false)
  assert.equal(press('ArrowLeft'), true)
  assert.equal(focus(), 'packages', 'a row at the top has no parent')
  assert.deepEqual(stops(), ['packages'])
  row('README.md').focus()
  press('ArrowLeft')
  assert.equal(focus(), 'README.md')
})

test('tree: in right-to-left text ArrowLeft opens and goes in, and ArrowRight closes and goes out', () => {
  const { row, press, focus } = setup(folders('style="direction: rtl"'))
  row('tests').focus()
  press('ArrowLeft')
  assert.equal(row('tests').parentElement.open, true)
  press('ArrowLeft')
  assert.equal(focus(), 'master.test.ts')
  press('ArrowRight')
  assert.equal(focus(), 'tests')
  press('ArrowRight')
  assert.equal(row('tests').parentElement.open, false)
})

test('tree: Home and End move to the first and the last visible row', () => {
  const { row, press, focus } = setup()
  row('input.css').focus()
  assert.equal(press('End'), true)
  assert.equal(focus(), 'LICENSE')
  assert.equal(press('Home'), true)
  assert.equal(focus(), 'packages')
  const { row: last, press: again, focus: where } = setup(folders().replace('<li><a class="tree-item" href="#readme">README.md</a></li>\n  <li><a class="tree-item" href="#license">LICENSE</a></li>', ''))
  last('packages').focus()
  again('End')
  assert.equal(where(), 'tests', 'End does not open a closed branch to reach its last row')
})

test('tree: a character moves to the next visible row that starts with it, and typed again to the one after', () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  const { row, press, focus } = setup()
  row('packages').focus()
  assert.equal(press('t'), true)
  assert.equal(focus(), 'theme.css')
  press('t')
  assert.equal(focus(), 'tests')
  press('t')
  assert.equal(focus(), 'theme.css', 'the search wraps, and master.test.ts in the closed branch is not found')
  mock.timers.tick(500)
  press('L')
  assert.equal(focus(), 'LICENSE', 'a capital finds the row all the same')
  mock.timers.tick(500)
  assert.equal(press('z'), true)
  assert.equal(focus(), 'LICENSE', 'no row starts with it')
})

test('tree: characters typed quickly are one word, and Space is one of them', () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  const { row, press, focus, root } = setup(folders().replace('README.md', 'theme notes'))
  let clicks = 0
  root.addEventListener('click', () => clicks++)
  row('packages').focus()
  for (const letter of 'the') press(letter)
  assert.equal(focus(), 'theme.css')
  press('Shift')
  for (const letter of 'me') press(letter)
  assert.equal(focus(), 'theme.css', 'a word that grows keeps the row it still names, and Shift does not end it')
  assert.equal(press(' '), true)
  assert.equal(focus(), 'theme notes')
  assert.equal(clicks, 0, 'Space inside a word activates nothing')
  mock.timers.tick(499)
  press('n')
  assert.equal(focus(), 'theme notes')
  press('ArrowUp')
  assert.equal(focus(), 'tests')
  press('t')
  assert.equal(focus(), 'theme notes', 'a key that is not a character ends the word: t alone, not "theme nt"')
  press('Home')
  assert.equal(press(' '), false, 'and Space after it is Space again, which a summary answers itself')
  mock.timers.tick(500)
  press('u')
  assert.equal(focus(), 'ui', 'after a pause a letter starts a new word')
})

test('tree: Enter and Space are left to a summary, which opens and closes by itself', () => {
  const { row, press, click } = setup()
  const tests = row('tests')
  tests.focus()
  assert.equal(press('Enter'), false)
  assert.equal(press(' '), false)
  click(tests)
  assert.equal(tests.parentElement.open, true, 'the click a browser makes of the key opens the details')
})

test('tree: Enter is left to a link and Space follows it', () => {
  const { row, press, root, text } = setup()
  const followed: string[] = []
  root.addEventListener('click', (event: any) => {
    followed.push(text(event.target))
    event.preventDefault()
  })
  row('README.md').focus()
  assert.equal(press('Enter'), false, 'a link follows Enter by itself')
  assert.deepEqual(followed, [])
  assert.equal(press(' '), true)
  assert.deepEqual(followed, ['README.md'])
})

test('tree: * opens every closed branch at the level of the row in focus', () => {
  const { row, press, focus, all } = setup(folders().replace(/<details class="tree-group" open>/g, '<details class="tree-group">'))
  row('README.md').focus()
  assert.equal(press('*'), true)
  assert.deepEqual(all('details').map((details) => details.open), [true, false, false], 'the branches beside it, not the ones inside them')
  row('ui').focus()
  press('*')
  assert.deepEqual(all('details').map((details) => details.open), [true, true, true])
  assert.equal(focus(), 'ui')
})

test('tree: the keys pass over disabled and hidden rows, and a disabled row does nothing', () => {
  const html = folders()
    .replace('href="#input">', 'href="#input" aria-disabled="true">')
    .replace('<li><a class="tree-item" href="#readme">', '<li hidden><a class="tree-item" href="#readme">')
    .replace('<summary class="tree-item tree-toggle">tests', '<summary class="tree-item tree-toggle" aria-disabled="true">tests')
  const { row, press, focus, click, document } = setup(html)
  row('button.css').focus()
  press('ArrowDown')
  assert.equal(focus(), 'theme.css')
  press('ArrowDown')
  assert.equal(focus(), 'LICENSE', 'the disabled branch and the hidden row are passed over')
  press('ArrowUp')
  assert.equal(focus(), 'theme.css')
  press('ArrowUp')
  assert.equal(focus(), 'button.css')
  press('End')
  assert.equal(focus(), 'LICENSE')
  press('i')
  assert.equal(focus(), 'LICENSE', 'typed letters do not find a disabled row')
  let followed = true
  document.addEventListener('click', (event: any) => { followed = !event.defaultPrevented })
  click(row('input.css'))
  assert.equal(followed, false, 'the link of a disabled row is not followed')
  click(row('tests'))
  assert.equal(row('tests').parentElement.open, false, 'a disabled branch stays closed')
  row('ui').focus()
  press('*')
  assert.equal(row('tests').parentElement.open, false)
})

test('tree: a key with a modifier, a key on something inside a row and an unknown key are left alone', () => {
  const { row, key, press, focus } = setup(folders().replace('LICENSE', 'LICENSE <input aria-label="Rename">'))
  row('ui').focus()
  assert.equal(press('ArrowDown', { ctrlKey: true }), false)
  assert.equal(press('a', { metaKey: true }), false)
  assert.equal(press('ArrowRight', { altKey: true }), false)
  assert.equal(press('Tab'), false)
  assert.equal(press('Escape'), false)
  assert.equal(key(row('LICENSE').querySelector('input'), 'ArrowUp'), false)
  assert.equal(key(row('LICENSE').querySelector('input'), 'p'), false)
  assert.equal(focus(), 'ui')
})

test('tree: a branch that closes over the tab stop takes it', () => {
  const { row, stops, click } = setup()
  assert.deepEqual(stops(), ['button.css'])
  row('ui').parentElement.open = false
  assert.deepEqual(stops(), ['ui'], 'closed from outside the script')
  row('theme.css').parentElement.closest('details').open = true
  row('theme.css').focus()
  assert.deepEqual(stops(), ['theme.css'])
  click(row('packages'))
  assert.equal(row('packages').parentElement.open, false)
  assert.deepEqual(stops(), ['packages'])
})

test('tree: a row that takes focus or a click becomes the tab stop', () => {
  const { row, stops, click } = setup()
  row('LICENSE').focus()
  assert.deepEqual(stops(), ['LICENSE'])
  click(row('tests'))
  assert.deepEqual(stops(), ['tests'])
  assert.equal(row('tests').parentElement.open, true, 'the details still opens by itself')
})

test('tree: with aria-expanded rows the arrows fold and unfold the branch and walk past its hidden rows', () => {
  const { row, press, focus, stops } = setup(outline)
  row('Introduction').focus()
  press('End')
  assert.equal(focus(), 'Theme', 'Surfaces is inside a collapsed branch')
  assert.equal(press('ArrowRight'), true)
  assert.equal(row('Theme').getAttribute('aria-expanded'), 'true')
  press('ArrowRight')
  assert.equal(focus(), 'Surfaces')
  press('ArrowLeft')
  assert.equal(focus(), 'Theme')
  press('ArrowLeft')
  assert.equal(row('Theme').getAttribute('aria-expanded'), 'false')
  press('ArrowUp')
  assert.equal(focus(), 'Principles')
  press('Home')
  press('ArrowLeft')
  assert.equal(row('Introduction').getAttribute('aria-expanded'), 'false')
  press('ArrowDown')
  assert.equal(focus(), 'Theme')
  assert.deepEqual(stops(), ['Theme'])
  press('*')
  assert.equal(row('Introduction').getAttribute('aria-expanded'), 'true')
  assert.equal(row('Theme').getAttribute('aria-expanded'), 'true')
})

test('tree: Enter and Space open and close a branch that has no activation of its own', () => {
  const { row, press } = setup(outline)
  const theme = row('Theme')
  theme.focus()
  assert.equal(press('Enter'), true)
  assert.equal(theme.getAttribute('aria-expanded'), 'true')
  assert.equal(press(' '), true)
  assert.equal(theme.getAttribute('aria-expanded'), 'false')
  assert.equal(theme.hasAttribute('aria-selected'), false, 'a branch is folded, not selected')
})

test('tree: Enter, Space and a click select a treeitem leaf and say so with a change event', () => {
  const { row, press, click, all, root, document } = setup(outline)
  const heard: unknown[] = []
  document.addEventListener('change', (event: any) => heard.push([event.target === root, event.detail.item.textContent]))
  const selected = () => all('[aria-selected]').map((item) => [item.textContent, item.getAttribute('aria-selected')])
  row('Principles').focus()
  assert.equal(press('Enter'), true)
  assert.deepEqual(selected(), [['Principles', 'true']], 'the row that was selected loses the attribute')
  assert.deepEqual(heard, [[true, 'Principles']])
  press(' ')
  assert.equal(heard.length, 1, 'selecting the selected row changes nothing')
  click(row('How it fits together'))
  assert.deepEqual(selected(), [['How it fits together', 'true']])
  assert.equal(heard.length, 2)
  click(row('Theme'))
  assert.equal(row('Theme').getAttribute('aria-expanded'), 'true')
  assert.deepEqual(selected(), [['How it fits together', 'true']])
})

test('tree: a link is not selected: its current row is the page\'s to mark', () => {
  const { row, click, all, root } = setup()
  root.addEventListener('click', (event: any) => event.preventDefault())
  click(row('README.md'))
  assert.equal(all('[aria-selected]').length, 0)
  assert.equal(row('button.css').getAttribute('aria-current'), 'page')
})

test('tree: detach removes the listeners and gives every row its tabindex back', () => {
  const { row, key, detach, all, click, stops } = setup()
  row('ui').focus()
  detach()
  assert.ok(all('.tree-item').every((item) => !item.hasAttribute('tabindex')), 'every row is a tab stop again')
  assert.equal(key(row('ui'), 'ArrowDown'), false)
  assert.equal(key(row('ui'), 'ArrowLeft'), false)
  assert.equal(row('ui').parentElement.open, true)
  click(row('LICENSE'))
  row('LICENSE').focus()
  assert.deepEqual(stops(), [])
  const aria = setup(outline)
  aria.row('Principles').focus()
  aria.detach()
  assert.deepEqual(aria.all('.tree-item').map((item) => item.getAttribute('tabindex')), ['0', '-1', '-1', '-1', '-1'], 'the markup\'s own tabindex is back')
  assert.equal(aria.key(aria.row('Principles'), 'Enter'), false)
  aria.click(aria.row('Theme'))
  assert.equal(aria.row('Theme').getAttribute('aria-expanded'), 'false')
})

test('tree: attaching twice detaches the first', () => {
  const { root, row, press, document } = setup(outline)
  tree(root)
  let heard = 0
  document.addEventListener('change', () => heard++)
  row('Theme').focus()
  press('Enter')
  assert.equal(row('Theme').getAttribute('aria-expanded'), 'true', 'two behaviors would open it and close it again')
  row('Principles').focus()
  press('Enter')
  assert.equal(heard, 1)
})
