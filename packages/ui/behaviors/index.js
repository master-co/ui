/**
 * Behaviors: the reference scripts of the patterns that have no native element.
 *
 * Each one is a function of the pattern's name that takes the root element and returns a function that
 * removes everything it added. Import the one a page needs, or call `attach()` to find every pattern in a
 * document, or under an element, and attach its behavior.
 *
 * A context menu belongs to a target that only the page knows: attach it with `contextMenu(target, menu)`.
 */
import { calendar } from './calendar.js'
import { combobox } from './combobox.js'
import { command } from './command.js'
import { compare } from './compare.js'
import { listbox } from './listbox.js'
import { contextMenu, menu } from './menu.js'
import { otp } from './otp.js'
import { splitter } from './splitter.js'
import { stepper } from './stepper.js'
import { tabs } from './tabs.js'
import { tree } from './tree.js'
import { wheel } from './wheel.js'

export { calendar, combobox, command, compare, contextMenu, listbox, menu, otp, splitter, stepper, tabs, tree, wheel }

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
