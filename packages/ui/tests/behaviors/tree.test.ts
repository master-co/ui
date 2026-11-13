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

/** A tree where any number of files are selected. c.ts is disabled; guide.md is inside a closed branch. */
const files = `<ul class="tree" role="tree" aria-label="Files" aria-multiselectable="true">
  <li role="none">
    <div class="tree-item tree-toggle" role="treeitem" aria-expanded="true">src</div>
    <ul class="tree-sub" role="group">
      <li role="none"><div class="tree-item" role="treeitem" data-value="a">a.ts</div></li>
      <li role="none"><div class="tree-item" role="treeitem" data-value="b">b.ts</div></li>
      <li role="none"><div class="tree-item" role="treeitem" data-value="c" aria-disabled="true">c.ts</div></li>
      <li role="none"><div class="tree-item" role="treeitem" data-value="d">d.ts</div></li>
    </ul>
  </li>
  <li role="none">
    <div class="tree-item tree-toggle" role="treeitem" aria-expanded="false">docs</div>
    <ul class="tree-sub" role="group">
      <li role="none"><div class="tree-item" role="treeitem" data-value="guide">guide.md</div></li>
    </ul>
  </li>
  <li role="none"><div class="tree-item" role="treeitem" data-value="readme" aria-selected="true">README.md</div></li>
</ul>`

/** What a multiselectable tree has selected, and what it said. */
function several(html = files) {
  const page = setup(html)
  const heard: string[][] = []
  const control = page.detach as ReturnType<typeof tree>
  page.root.addEventListener('change', () => heard.push(control.value as string[]))
  const selected = () => page.all('[aria-selected="true"]').map(page.text)
  return { ...page, control, heard, selected }
}

test('tree: in a multiselectable tree every row that can be selected says whether it is, and the value is the list', () => {
  const { all, control, text } = several()
  assert.deepEqual(all('.tree-item').map((item) => [text(item), item.getAttribute('aria-selected')]), [
    ['src', null], ['a.ts', 'false'], ['b.ts', 'false'], ['c.ts', 'false'], ['d.ts', 'false'], ['docs', null], ['guide.md', 'false'], ['README.md', 'true'],
  ], 'a branch is folded, not selected')
  assert.deepEqual(control.value, ['readme'])
  control.value = ['guide', 'a']
  assert.deepEqual(control.value, ['a', 'guide'], 'in the order of the document')
  control.value = []
  assert.deepEqual(control.value, [])
})

test('tree: a click selects one row alone, and Control or Command with a click selects one more or one less', () => {
  const { row, click, control, heard, selected, stops } = several()
  click(row('a.ts'))
  assert.deepEqual(selected(), ['a.ts'], 'the row that was selected is not any more')
  assert.deepEqual(stops(), ['a.ts'])
  click(row('b.ts'), { ctrlKey: true })
  assert.deepEqual(control.value, ['a', 'b'])
  click(row('a.ts'), { metaKey: true })
  assert.deepEqual(control.value, ['b'])
  click(row('b.ts'))
  assert.deepEqual(heard, [['a'], ['a', 'b'], ['b']], 'selecting what is selected changes nothing')
  click(row('docs'), { ctrlKey: true })
  assert.equal(row('docs').getAttribute('aria-expanded'), 'true', 'a branch opens all the same')
  click(row('c.ts'), { ctrlKey: true })
  assert.deepEqual(control.value, ['b'], 'a disabled row is not selected')
})

test('tree: in a multiselectable tree Space selects or unselects the row in focus, and the arrows only move', () => {
  const { row, press, focus, control, heard } = several()
  row('a.ts').focus()
  assert.equal(press(' '), true)
  assert.deepEqual(control.value, ['a', 'readme'])
  press('ArrowDown')
  assert.equal(focus(), 'b.ts')
  assert.deepEqual(control.value, ['a', 'readme'], 'moving selects nothing')
  press(' ')
  press('ArrowUp')
  press(' ')
  assert.deepEqual(heard, [['a', 'readme'], ['a', 'b', 'readme'], ['b', 'readme']])
  row('docs').focus()
  press(' ')
  assert.equal(row('docs').getAttribute('aria-expanded'), 'true', 'Space opens a branch')
  press('Enter')
  assert.equal(row('docs').getAttribute('aria-expanded'), 'false')
  row('d.ts').focus()
  press('Enter')
  assert.deepEqual(control.value, ['d'], 'Enter does what a click does')
})

test('tree: Shift with an arrow key moves and selects every visible row from the anchor, passing over disabled ones', () => {
  const { row, press, focus, control } = several()
  row('a.ts').focus()
  assert.equal(press('ArrowDown', { shiftKey: true }), true)
  assert.equal(focus(), 'b.ts')
  assert.deepEqual(control.value, ['a', 'b', 'readme'], 'the run starts at the row the keys were on')
  press('ArrowDown', { shiftKey: true })
  assert.equal(focus(), 'd.ts')
  assert.deepEqual(control.value, ['a', 'b', 'd', 'readme'])
  press('ArrowDown', { shiftKey: true })
  press('ArrowDown', { shiftKey: true })
  assert.equal(focus(), 'README.md', 'docs is a branch: the run passes it, and guide.md inside it')
  assert.deepEqual(control.value, ['a', 'b', 'd', 'readme'])
  press('ArrowDown', { shiftKey: true })
  assert.equal(focus(), 'README.md', 'the keys do not wrap')
  row('src').focus()
  assert.equal(press('ArrowUp', { shiftKey: true }), true)
  assert.equal(focus(), 'src')
})

test('tree: Shift with a click or Space selects the run from the row chosen last, and Control or Command with Shift and Home or End the run to an end', () => {
  const { row, click, press, focus, control } = several()
  click(row('b.ts'))
  click(row('README.md'), { shiftKey: true })
  assert.deepEqual(control.value, ['b', 'd', 'readme'])
  click(row('a.ts'))
  row('d.ts').focus()
  assert.equal(press(' ', { shiftKey: true }), true)
  assert.deepEqual(control.value, ['a', 'b', 'd'])
  click(row('d.ts'))
  assert.equal(press('Home', { shiftKey: true, ctrlKey: true }), true)
  assert.equal(focus(), 'src')
  assert.deepEqual(control.value, ['a', 'b', 'd'])
  assert.equal(press('End', { shiftKey: true, metaKey: true }), true)
  assert.equal(focus(), 'README.md')
  assert.deepEqual(control.value, ['a', 'b', 'd', 'readme'])
})

test('tree: Control or Command with A selects every visible row, or none when they all are', () => {
  const { row, press, control, heard } = several()
  row('a.ts').focus()
  assert.equal(press('a', { ctrlKey: true }), true)
  assert.deepEqual(control.value, ['a', 'b', 'd', 'readme'], 'not the disabled row, nor the row inside a closed branch')
  assert.equal(press('A', { metaKey: true }), true)
  assert.deepEqual(control.value, [])
  assert.equal(heard.length, 2)
})

test('tree: a tree that is not multiselectable leaves Shift, Control and Command alone', () => {
  const { row, press, focus, click, all } = setup(outline)
  row('How it fits together').focus()
  assert.equal(press('a', { ctrlKey: true }), false)
  assert.equal(press('ArrowDown', { shiftKey: true }), true, 'Shift with an arrow moves as the arrow does')
  assert.equal(focus(), 'Principles')
  click(row('Principles'), { ctrlKey: true })
  assert.deepEqual(all('[aria-selected]').map((item) => item.textContent), ['Principles'], 'one row is selected')
})

test('tree: rows that arrive in a multiselectable tree say they are not selected', async () => {
  const { one, all } = several()
  one('.tree-sub').insertAdjacentHTML('beforeend', '<li role="none"><div class="tree-item" role="treeitem" data-value="e">e.ts</div></li>')
  await Promise.resolve()
  const arrived = all('.tree-item').find((item) => item.textContent === 'e.ts')
  assert.equal(arrived.getAttribute('aria-selected'), 'false')
  assert.equal(arrived.getAttribute('tabindex'), '-1')
})

/** A checkbox tree. lib is closed; a.ts starts checked. */
const checks = `<ul class="tree" role="tree" aria-label="Files" aria-multiselectable="true">
  <li role="none">
    <div class="tree-item tree-toggle" role="treeitem" aria-expanded="true" aria-checked="false" data-value="src"><span class="tree-check" aria-hidden="true"></span><span class="tree-label">src</span></div>
    <ul class="tree-sub" role="group">
      <li role="none">
        <div class="tree-item tree-toggle" role="treeitem" aria-expanded="false" aria-checked="false" data-value="lib"><span class="tree-check" aria-hidden="true"></span><span class="tree-label">lib</span></div>
        <ul class="tree-sub" role="group">
          <li role="none"><div class="tree-item" role="treeitem" aria-checked="false" data-value="x"><span class="tree-check" aria-hidden="true"></span><span class="tree-label">x.ts</span></div></li>
          <li role="none"><div class="tree-item" role="treeitem" aria-checked="false" data-value="y"><span class="tree-check" aria-hidden="true"></span><span class="tree-label">y.ts</span></div></li>
        </ul>
      </li>
      <li role="none"><div class="tree-item" role="treeitem" aria-checked="true" data-value="a"><span class="tree-check" aria-hidden="true"></span><span class="tree-label">a.ts</span></div></li>
      <li role="none"><div class="tree-item" role="treeitem" aria-checked="false" data-value="b"><span class="tree-check" aria-hidden="true"></span><span class="tree-label">b.ts</span></div></li>
    </ul>
  </li>
  <li role="none"><div class="tree-item" role="treeitem" aria-checked="false" data-value="readme"><span class="tree-check" aria-hidden="true"></span><span class="tree-label">README.md</span></div></li>
</ul>`

function checkboxes(html = checks) {
  const page = setup(html)
  const control = page.detach as ReturnType<typeof tree>
  const heard: [string, string[]][] = []
  page.root.addEventListener('change', (event: any) => heard.push([page.text(event.detail.item), control.value as string[]]))
  const state = () => Object.fromEntries(page.all('.tree-item').map((item) => [item.getAttribute('data-value'), item.getAttribute('aria-checked')]))
  return { ...page, control, heard, state }
}

test('tree: a checkbox tree says each branch from the rows under it, and its value is the checked leaves', () => {
  const { state, control, all } = checkboxes()
  assert.deepEqual(state(), { src: 'mixed', lib: 'false', x: 'false', y: 'false', a: 'true', b: 'false', readme: 'false' })
  assert.deepEqual(control.value, ['a'])
  assert.ok(all('.tree-item').every((item) => !item.hasAttribute('aria-selected')), 'a checkbox tree selects nothing')
  control.value = ['y', 'readme']
  assert.deepEqual(state(), { src: 'mixed', lib: 'mixed', x: 'false', y: 'true', a: 'false', b: 'false', readme: 'true' })
  control.value = ['x', 'y', 'a', 'b']
  assert.equal(state().src, 'true', 'a branch whose rows are all checked is checked')
  assert.deepEqual(control.value, ['x', 'y', 'a', 'b'], 'branches are not in the value')
})

test('tree: Space checks a row and every row under it, inside closed branches too, and unchecks them again', () => {
  const { row, press, state, heard } = checkboxes()
  row('src').focus()
  assert.equal(press(' '), true)
  assert.deepEqual(state(), { src: 'true', lib: 'true', x: 'true', y: 'true', a: 'true', b: 'true', readme: 'false' }, 'a mixed branch is checked')
  assert.equal(row('src').getAttribute('aria-expanded'), 'true', 'Space checks, it does not fold')
  press(' ')
  assert.deepEqual(state(), { src: 'false', lib: 'false', x: 'false', y: 'false', a: 'false', b: 'false', readme: 'false' })
  assert.deepEqual(heard, [['src', ['x', 'y', 'a', 'b']], ['src', []]])
})

test('tree: a click checks a leaf, and checks a branch only on its check: the rest of its row folds it', () => {
  const { row, click, state, control, one } = checkboxes()
  click(row('b.ts'))
  assert.deepEqual(control.value, ['a', 'b'])
  assert.equal(state().src, 'mixed')
  click(row('src'))
  assert.equal(row('src').getAttribute('aria-expanded'), 'false')
  assert.equal(state().src, 'mixed')
  click(one('[data-value="lib"] .tree-check'))
  assert.deepEqual(state(), { src: 'true', lib: 'true', x: 'true', y: 'true', a: 'true', b: 'true', readme: 'false' })
  click(row('x.ts'))
  assert.deepEqual(state(), { src: 'mixed', lib: 'mixed', x: 'false', y: 'true', a: 'true', b: 'true', readme: 'false' }, 'unchecking one says mixed all the way up')
})

test('tree: Enter checks a leaf and folds a branch in a checkbox tree', () => {
  const { row, press, state } = checkboxes()
  row('README.md').focus()
  assert.equal(press('Enter'), true)
  assert.equal(state().readme, 'true')
  row('src').focus()
  press('Enter')
  assert.equal(row('src').getAttribute('aria-expanded'), 'false')
  assert.equal(state().src, 'mixed')
})

test('tree: a disabled row keeps its check, and a branch it leaves mixed unchecks when the rest is checked', () => {
  const { row, press, click, state } = checkboxes(checks.replace('aria-checked="false" data-value="b"', 'aria-checked="false" aria-disabled="true" data-value="b"'))
  row('src').focus()
  press(' ')
  assert.deepEqual(state(), { src: 'mixed', lib: 'true', x: 'true', y: 'true', a: 'true', b: 'false', readme: 'false' })
  press(' ')
  assert.deepEqual(state(), { src: 'false', lib: 'false', x: 'false', y: 'false', a: 'false', b: 'false', readme: 'false' }, 'pressed again, it does not stay where it was')
  click(row('b.ts'))
  assert.equal(state().b, 'false', 'a click on a disabled row checks nothing')
  row('b.ts').focus()
  press(' ')
  assert.equal(state().b, 'false')
})

/** A tree whose remote branch has no rows yet. */
const lazy = `<ul class="tree" role="tree" aria-label="Files">
  <li role="none">
    <div class="tree-item tree-toggle" role="treeitem" aria-expanded="false" data-value="remote"><span class="spinner" aria-hidden="true"></span><span class="tree-label">remote</span></div>
    <ul class="tree-sub" role="group"></ul>
  </li>
  <li role="none">
    <div class="tree-item tree-toggle" role="treeitem" aria-expanded="false" data-value="local"><span class="tree-label">local</span></div>
    <ul class="tree-sub" role="group">
      <li role="none"><div class="tree-item" role="treeitem">notes.md</div></li>
    </ul>
  </li>
</ul>`

test('tree: a branch that opens with no rows says aria-busy until its rows arrive, and every branch that opens says expand', async () => {
  const { row, press, focus, root, one, stops, click, errors } = setup(lazy)
  const heard: unknown[] = []
  root.addEventListener('expand', (event: any) => heard.push([event.target === root, event.detail.value, event.detail.item.getAttribute('aria-busy')]))
  row('remote').focus()
  assert.equal(press('ArrowRight'), true)
  assert.equal(row('remote').getAttribute('aria-expanded'), 'true')
  assert.deepEqual(heard, [[true, 'remote', 'true']], 'the branch is busy when the page hears it opened')
  press('ArrowRight')
  assert.equal(focus(), 'remote', 'a busy branch has no row to go in to')
  press('ArrowLeft')
  press('ArrowRight')
  assert.equal(heard.length, 2)
  assert.equal(row('remote').getAttribute('aria-busy'), 'true')

  one('.tree-sub').innerHTML = '<li role="none"><div class="tree-item" role="treeitem">origin</div></li><li role="none"><div class="tree-item" role="treeitem">upstream</div></li>'
  await Promise.resolve()
  assert.equal(row('remote').hasAttribute('aria-busy'), false, 'the rows took it away')
  assert.equal(row('origin').getAttribute('tabindex'), '-1', 'the rows that arrived are out of the tab order at once')
  assert.deepEqual(stops(), ['remote'])
  press('ArrowRight')
  assert.equal(focus(), 'origin')
  press('ArrowDown')
  assert.equal(focus(), 'upstream')

  click(row('local'))
  assert.deepEqual(heard.at(-1), [true, 'local', null], 'a branch with rows is not busy')
  click(row('local'))
  assert.equal(heard.length, 3, 'closing says nothing')
  assert.deepEqual(errors, [])
})

test('tree: the rows that arrive under a checked branch are checked', async () => {
  const html = lazy
    .replace('aria-expanded="false" data-value="remote">', 'aria-expanded="false" aria-checked="false" data-value="remote"><span class="tree-check" aria-hidden="true"></span>')
    .replace('aria-expanded="false" data-value="local">', 'aria-expanded="false" aria-checked="false" data-value="local">')
    .replace('role="treeitem">notes.md', 'role="treeitem" aria-checked="false">notes.md')
  const { row, press, one, control, root, text } = checkboxes(html)
  row('remote').focus()
  press(' ')
  press('ArrowRight')
  assert.equal(row('remote').getAttribute('aria-checked'), 'true', 'a branch with no rows keeps its own check')
  assert.deepEqual(control.value, [], 'and is not in the value')
  const heard: string[] = []
  root.addEventListener('change', (event: any) => heard.push(text(event.detail.item)))
  one('.tree-sub').innerHTML = '<li role="none"><div class="tree-item" role="treeitem" aria-checked="false" data-value="origin">origin</div></li>'
  await Promise.resolve()
  assert.equal(row('origin').getAttribute('aria-checked'), 'true')
  assert.deepEqual(control.value, ['origin'])
  assert.deepEqual(heard, ['remote'], 'the value changed, and the tree says so')
})

/** A tree whose rows can be renamed: each label is a tree-label. */
const named = `<ul class="tree" role="tree" aria-label="Files">
  <li role="none">
    <div class="tree-item tree-toggle" role="treeitem" aria-expanded="true" data-value="src"><span class="tree-label">src</span></div>
    <ul class="tree-sub" role="group">
      <li role="none"><div class="tree-item" role="treeitem" data-value="a"><span class="tree-label">a.ts</span></div></li>
      <li role="none"><div class="tree-item" role="treeitem" data-value="b" aria-disabled="true"><span class="tree-label">b.ts</span></div></li>
    </ul>
  </li>
  <li role="none"><div class="tree-item" role="treeitem">README.md</div></li>
</ul>`

function renamed(options: Parameters<typeof tree>[1] = { rename: true }) {
  const page = setup(named, false)
  const detach = tree(page.root, options)
  const heard: unknown[] = []
  page.root.addEventListener('rename', (event: any) => heard.push([event.target === page.root, event.detail.value, event.detail.label, page.text(event.detail.item.querySelector('.tree-label'))]))
  const changes: unknown[] = []
  page.root.addEventListener('change', (event: any) => changes.push(event.target))
  page.root.addEventListener('input', (event: any) => changes.push(event.target))
  const field = () => page.document.querySelector('.tree .editable-field') as any
  return { ...page, detach, heard, changes, field }
}

test('tree: F2 turns the label of the row in focus into an editable, and Enter saves it and gives focus back to the row', () => {
  const { row, press, field, one, heard, changes, document, key, type, errors } = renamed()
  const a = row('a.ts')
  const words = one('[data-value="a"] .tree-label')
  const text = words.firstChild
  a.focus()
  assert.equal(press('F2'), true)
  assert.equal(document.activeElement, field(), 'the field takes focus')
  assert.equal(field().value, 'a.ts')
  assert.equal(field().getAttribute('aria-label'), 'Rename a.ts')
  assert.equal(words.hidden, true, 'the editable takes the label\'s place')
  assert.equal(field().closest('.editable').previousElementSibling, words)
  assert.equal(one('[data-value="a"] .editable-preview').textContent, 'a.ts', 'the preview holds the cell open at the label\'s width')

  type(field(), 'alpha.ts')
  assert.equal(key(field(), 'Enter'), true)
  assert.equal(document.activeElement, a, 'focus returns to the row')
  assert.equal(document.querySelector('.tree .editable'), null, 'the field is gone')
  assert.equal(words.hidden, false)
  assert.equal(words.textContent, 'alpha.ts')
  assert.equal(words.firstChild, text, 'the text a framework wrote is written, not replaced')
  assert.deepEqual(heard, [[true, 'a', 'alpha.ts', 'alpha.ts']], 'the page hears the row, what it stood for and the new label')
  assert.deepEqual(changes, [], 'the field\'s own input and change stay in the field')
  assert.deepEqual(errors, [])
})

test('tree: Escape puts the label back, and an empty label is not saved', () => {
  const { row, press, field, one, heard, document, key, type } = renamed()
  const src = row('src')
  src.focus()
  press('F2')
  type(field(), 'source')
  assert.equal(key(field(), 'Escape'), true)
  assert.equal(document.activeElement, src)
  assert.equal(one('[data-value="src"] .tree-label').textContent, 'src')
  assert.deepEqual(heard, [])
  press('F2')
  type(field(), '')
  key(field(), 'Enter')
  assert.ok(field(), 'the field stays open for the reader to correct')
  type(field(), 'source')
  key(field(), 'Enter')
  assert.equal(document.activeElement, src)
  assert.deepEqual(heard, [[true, 'src', 'source', 'source']])
})

test('tree: leaving the field saves it and leaves focus where the reader took it', async () => {
  const { row, press, field, heard, document, type, errors } = renamed()
  row('a.ts').focus()
  press('F2')
  type(field(), 'alpha.ts')
  row('README.md').focus()
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(document.querySelector('.tree .editable'), null)
  assert.equal(document.activeElement, row('README.md'))
  assert.deepEqual(heard, [[true, 'a', 'alpha.ts', 'alpha.ts']])
  assert.deepEqual(errors, [])
})

test('tree: F2 renames only with the option, a row with a label and a row that is not disabled', () => {
  const off = renamed({})
  off.row('a.ts').focus()
  assert.equal(off.press('F2'), false)
  assert.equal(off.field(), null)
  const { row, press, field, click, all } = renamed()
  row('README.md').focus()
  assert.equal(press('F2'), false, 'a row without a tree-label has nothing to rename')
  row('b.ts').focus()
  assert.equal(press('F2'), false, 'a disabled row is not renamed')
  assert.equal(field(), null)
  row('a.ts').focus()
  press('F2')
  click(field())
  assert.deepEqual(all('[aria-selected]'), [], 'a click in the field selects nothing')
})

test('tree: edit() renames a row from a menu or a button, with or without the option', () => {
  const { row, detach, field, document, key, type, heard } = renamed({})
  const control = detach as ReturnType<typeof tree>
  assert.equal(control.edit(row('README.md')), false, 'a row without a tree-label has nothing to rename')
  assert.equal(control.edit(row('a.ts')), true)
  assert.equal(document.activeElement, field())
  assert.equal(control.edit(row('src')), false, 'one rename at a time')
  type(field(), 'alpha.ts')
  key(field(), 'Enter')
  assert.equal(document.activeElement, row('alpha.ts'), 'focus goes to the row, wherever it was before')
  assert.deepEqual(heard, [[true, 'a', 'alpha.ts', 'alpha.ts']])
})

test('tree: detaching during a rename puts the label back', () => {
  const { row, press, field, detach, one } = renamed()
  row('a.ts').focus()
  press('F2')
  assert.ok(field())
  detach()
  assert.equal(field(), null)
  assert.equal(one('[data-value="a"] .tree-label').hidden, false)
})
