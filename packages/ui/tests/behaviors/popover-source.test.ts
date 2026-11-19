import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { showFromPopoverTrigger } from '../../behaviors/internal.js'

test('a controlled popover uses one opening invoker and leaves its closer alone', (t) => {
  const { one } = dom('<button popovertarget="details">Details</button><div id="details" popover><button popovertarget="details" popovertargetaction="hide">Close</button></div>')
  const popover = one('#details')
  const show = t.mock.method(popover, 'showPopover')
  showFromPopoverTrigger(popover)
  assert.deepEqual(show.mock.calls[0].arguments, [{ source: one('button') }])
})

test('a controlled popover with several invokers keeps its unanchored open', (t) => {
  const { one } = dom('<button popovertarget="details">Details</button><button popovertarget="details">More details</button><div id="details" popover></div>')
  const popover = one('#details')
  const show = t.mock.method(popover, 'showPopover')
  showFromPopoverTrigger(popover)
  assert.deepEqual(show.mock.calls[0].arguments, [undefined])
})
