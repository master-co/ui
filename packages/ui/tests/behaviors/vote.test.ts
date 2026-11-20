import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { vote } from '../../behaviors/vote.js'

/**
 * The vote's behavior takes a vote back. Choosing and the arrow keys are the radios' own, and happy-dom checks a
 * radio on a click as a browser does: a test presses the way a pointer does, `pointerdown` and then the click.
 */
const markup = (checked = 'up') => `<fieldset class="vote" aria-label="Vote on this answer" style="--votes: 7">
  <input type="radio" class="vote-up" name="answer" value="up" aria-label="Upvote"${checked === 'up' ? ' checked' : ''}>
  <span class="vote-count" aria-hidden="true"></span>
  <input type="radio" class="vote-down" name="answer" value="down" aria-label="Downvote"${checked === 'down' ? ' checked' : ''}>
</fieldset>`

function setup(html = markup()) {
  const page = dom(html)
  const root = page.one('.vote')
  const up = page.one<HTMLInputElement>('.vote-up')
  const down = page.one<HTMLInputElement>('.vote-down')
  const heard: string[] = []
  root.addEventListener('input', () => heard.push('input'))
  root.addEventListener('change', () => heard.push('change'))
  const press = (arrow: HTMLInputElement) => {
    arrow.dispatchEvent(new page.window.Event('pointerdown', { bubbles: true }) as never)
    arrow.click()
  }
  return { ...page, root, up, down, heard, press, detach: vote(root) }
}

test('vote: a second press on the arrow that holds the vote takes it back and says so', () => {
  const { up, down, press, heard, errors } = setup()
  press(up)
  assert.equal(up.checked, false)
  assert.equal(down.checked, false)
  assert.deepEqual(heard.slice(-2), ['input', 'change'])
  assert.deepEqual(errors, [])
})

test('vote: a press on the other arrow moves the vote, as a radio does', () => {
  const { up, down, press } = setup()
  press(down)
  assert.equal(down.checked, true)
  assert.equal(up.checked, false)
  press(up)
  assert.equal(up.checked, true, 'the arrow just left is chosen again, not cleared')
})

test('vote: a first press votes, and only the next one on the same arrow clears it', () => {
  const { up, press } = setup(markup(''))
  press(up)
  assert.equal(up.checked, true)
  press(up)
  assert.equal(up.checked, false)
  press(up)
  assert.equal(up.checked, true)
})

test('vote: Space on the arrow that holds the vote takes it back; on the other arrow it is left to the radio', () => {
  const { up, down, key, heard } = setup()
  assert.equal(key(down, ' '), false, 'Space on an unchecked radio is the platform\'s')
  assert.equal(up.checked, true)
  assert.equal(key(up, ' '), true)
  assert.equal(up.checked, false)
  assert.deepEqual(heard, ['input', 'change'])
})

test('vote: a vote the application set is read when the press begins', () => {
  const { up, down, press } = setup()
  down.checked = true
  press(down)
  assert.equal(down.checked, false)
  assert.equal(up.checked, false)
})

test('vote: a disabled arrow keeps its vote, and detaching leaves the radios as they were', () => {
  const { up, press, key, detach } = setup()
  up.disabled = true
  key(up, ' ')
  assert.equal(up.checked, true)
  up.disabled = false
  detach()
  press(up)
  assert.equal(up.checked, true)
  assert.equal(key(up, ' '), false)
})
