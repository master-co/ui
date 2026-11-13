/**
 * Behaviors: the reference scripts of the patterns that have no native element.
 *
 * Each one is a function of the pattern's name that takes the root element and returns a function that
 * removes everything it added. Import the one a page needs, or call `attach()` to find every pattern in a
 * document, or under an element, and attach its behavior.
 *
 * A context menu belongs to a target that only the page knows: attach it with `contextMenu(target, menu)`.
 *
 * Where a pattern has a value that no native control holds, the function its behavior returns has a `value`:
 * read it for what is chosen, set it to choose from outside. Setting it dispatches nothing.
 */
import { avatar } from './avatar.js'
import { calendar, calendarMonth } from './calendar.js'
import { carousel } from './carousel.js'
import { combobox } from './combobox.js'
import { command } from './command.js'
import { compare } from './compare.js'
import { editable } from './editable.js'
import { listbox } from './listbox.js'
import { contextMenu, menu } from './menu.js'
import { schedule, scheduleLayout } from './schedule.js'
import { otp } from './otp.js'
import { sortable } from './sortable.js'
import { splitter } from './splitter.js'
import { stepper } from './stepper.js'
import { tabs } from './tabs.js'
import { tags } from './tags.js'
import { toolbar } from './toolbar.js'
import { tree } from './tree.js'
import { wheel } from './wheel.js'

export { avatar, calendar, calendarMonth, carousel, combobox, command, compare, contextMenu, editable, listbox, menu, otp, schedule, scheduleLayout, sortable, splitter, stepper, tabs, tags, toolbar, tree, wheel }

/**
 * Each pattern's root class and the behavior that drives it.
 * @type {[selector: string, behavior: (root: any) => () => void][]}
 */
const patterns = [
  ['.combobox', combobox],
  ['.command', command],
  ['.calendar', calendar],
  ['.otp', otp],
  ['.splitter', splitter],
  ['.tree', tree],
  ['.tabs[role="tablist"]', tabs],
  ['.menu', menu],
  ['.stepper', stepper],
  ['.wheel', wheel],
  ['.compare', compare],
  ['.listbox', listbox],
  ['.tags', tags],
  ['.editable', editable],
  ['.sortable', sortable],
  ['.toolbar[role="toolbar"]', toolbar],
  ['.avatar', avatar],
  ['.carousel-view', carousel],
  ['.schedule-view', schedule],
]

/**
 * Find every pattern in a document, or in an element and under it, and attach its behavior.
 * @param {Document | Element} [root] Where to look. The document by default.
 * @returns {() => void} Detaches every behavior it attached.
 */
export function attach(root = document) {
  /** @type {(() => void)[]} */
  const detach = []
  for (const [selector, behavior] of patterns) {
    const found = [...root.querySelectorAll(selector)]
    if ('matches' in root && root.matches(selector)) found.unshift(root)
    for (const element of found) {
      // A combobox and a command palette drive their own list.
      if (behavior === listbox && element.closest('.combobox, .command')) continue
      detach.push(behavior(element))
    }
  }
  return () => detach.forEach((each) => each())
}
