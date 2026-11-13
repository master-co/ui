/**
 * Behaviors: the reference scripts of the patterns that have no native element.
 *
 * Each one is a function of the pattern's name that takes the root element and returns a function that
 * removes everything it added. Import the one a page needs, or call `attach()` to find every pattern in a
 * document, or under an element, and attach its behavior.
 *
 * A context menu belongs to a target that only the page knows: attach it with `contextMenu(target, menu)`.
 * A gantt is found too, and only its bars marked `role="slider"` move.
 *
 * Where a pattern has a value that no native control holds, the function its behavior returns has a `value`:
 * read it for what is chosen, set it to choose from outside. Setting it dispatches nothing.
 */
import { calendar, calendarMonth, calendarPeriods } from './calendar.js'
import { colorPicker, colorPickerState } from './color-picker.js'
import { combobox } from './combobox.js'
import { command } from './command.js'
import { compare } from './compare.js'
import { editable } from './editable.js'
import { dial } from './dial.js'
import { gantt } from './gantt.js'
import { listbox } from './listbox.js'
import { contextMenu, menu } from './menu.js'
import { otp } from './otp.js'
import { signature, signaturePath, signatureSvg } from './signature.js'
import { panel } from './panel.js'
import { sortable } from './sortable.js'
import { range } from './range.js'
import { splitter } from './splitter.js'
import { stepper } from './stepper.js'
import { tabs } from './tabs.js'
import { tags } from './tags.js'
import { toolbar } from './toolbar.js'
import { tour } from './tour.js'
import { tree } from './tree.js'
import { wheel } from './wheel.js'

export { calendar, calendarMonth, calendarPeriods, colorPicker, colorPickerState, combobox, command, compare, contextMenu, dial, editable, gantt, listbox, menu, otp, panel, range, signature, signaturePath, signatureSvg, sortable, splitter, stepper, tabs, tags, toolbar, tour, tree, wheel }

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
  ['.dial', dial],
  ['.signature', signature],
  ['.listbox', listbox],
  ['.tags', tags],
  ['.editable', editable],
  ['.sortable', sortable],
  ['.gantt', gantt],
  ['.toolbar[role="toolbar"]', toolbar],
  ['.coachmark-tour', tour],
  ['.color-picker', colorPicker],
  ['.panel', panel],
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
