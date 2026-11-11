/**
 * Menu: the keys of a popover of actions, and a menu that opens at the pointer.
 *
 * Without script a menu is a popover of buttons and links, and it is complete: the browser opens and closes
 * it, Tab moves through the items and Esc returns focus to the button. `menu(root)` adds the keys of a
 * menu. When the menu opens, focus moves to its first item; the arrow keys, Home, End and typed letters
 * move focus through the items, skipping hidden and disabled ones; Tab closes the menu. An item with a
 * submenu opens it with the arrow that points into it, and the opposite arrow closes the submenu. A submenu
 * is a menu: attach the behavior to it too.
 *
 * Items stay native. A button, a link, and the checkbox or radio of a label item run with Enter and Space
 * as they always do, so the script sets no state. It adds no roles either: `role="menu"` and
 * `role="menuitem"` are the author's to write, together with this behavior.
 *
 * `contextMenu(target, menu)` opens a `menu-context` for a target: at the pointer on a right click or a
 * long press, and at the target from the keyboard.
 */
import { enabled, isOpen, step, typeahead } from './internal.js'

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()
/** @type {WeakMap<Element, AbortController>} */
const targets = new WeakMap()

/**
 * @param {HTMLElement} root The element with the `menu` class and the popover attribute.
 * @returns {() => void} Removes everything the behavior added.
 */
export function menu(root) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)

  const seek = typeahead()
  /**
   * What takes focus in an item: the item, or the checkbox or radio inside a label item.
   * @param {Element} item
   */
  const control = (item) => /** @type {HTMLElement} */ (item.querySelector('.menu-input') ?? item)
  /** The items of this menu the keys may land on. The items of a submenu are that submenu's. */
  const items = () => [...root.querySelectorAll('.menu-item')].filter((item) => item.closest('.menu') === root && enabled(item) && enabled(control(item)))

  root.addEventListener('toggle', (event) => {
    if (event.target !== root || !isOpen(root)) return
    const first = items()[0]
    if (first) control(first).focus()
  }, { signal })

  root.addEventListener('keydown', (event) => {
    // Tab is not prevented: the menu closes, focus returns to its button, and Tab moves on from there.
    // A menu closes on a Tab from its submenu too.
    if (event.key === 'Tab') {
      if (isOpen(root)) root.hidePopover()
      return
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return
    const current = /** @type {Element} */ (event.target).closest('.menu-item')
    if (current?.closest('.menu') !== root) return

    // The arrow that points into a submenu follows the direction of the text.
    const rtl = getComputedStyle(root).direction === 'rtl'
    const into = rtl ? 'ArrowLeft' : 'ArrowRight'
    const out = rtl ? 'ArrowRight' : 'ArrowLeft'
    const sub = current.nextElementSibling
    if (event.key === into && current.getAttribute('aria-haspopup') === 'menu' && sub?.matches('.menu-sub') && enabled(current)) {
      event.preventDefault()
      // The submenu's own behavior moves focus to its first item as it opens.
      if (!isOpen(sub)) /** @type {HTMLElement} */ (sub).showPopover()
      return
    }
    const opener = root.previousElementSibling
    if (event.key === out && root.matches('.menu-sub') && isOpen(root)) {
      event.preventDefault()
      root.hidePopover()
      if (opener?.matches('.menu-item')) control(opener).focus()
      return
    }

    const list = items()
    let to
    switch (event.key) {
      case 'ArrowDown': to = step(list, current, 1); break
      case 'ArrowUp': to = step(list, current, -1); break
      case 'Home': to = list[0]; break
      case 'End': to = list.at(-1); break
      default:
        to = seek(event, list, current)
        if (!to) return
    }
    event.preventDefault()
    if (to) control(to).focus()
  }, { signal })

  return () => controller.abort()
}

/**
 * A context menu. On `contextmenu`, which a right click and a long press send, the browser's own menu is
 * prevented, the pointer's place is passed to the stylesheet in `--menu-x` and `--menu-y`, and the menu is
 * shown. The ContextMenu key and Shift+F10 open it at the middle of the target, which must be focusable to
 * hear them. Attach `menu(menu)` as well for the keys inside it.
 * @param {HTMLElement} target What the menu belongs to.
 * @param {HTMLElement} menu The element with the classes `menu menu-context` and the popover attribute.
 * @returns {() => void} Removes everything the behavior added.
 */
export function contextMenu(target, menu) {
  targets.get(target)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  targets.set(target, controller)

  /** @param {number} x @param {number} y Where the menu opens, in pixels from the viewport's left and top edges. */
  function open(x, y) {
    menu.style.setProperty('--menu-x', `${x}px`)
    menu.style.setProperty('--menu-y', `${y}px`)
    // Shown again, an open menu moves to the new place and chooses its side of it afresh.
    if (isOpen(menu)) menu.hidePopover()
    menu.showPopover()
  }

  // The keyboard has no pointer. The target's box is read to say where the target is; the stylesheet does the placing.
  function atTarget() {
    const box = target.getBoundingClientRect()
    open(box.left + box.width / 2, box.top + box.height / 2)
  }

  target.addEventListener('contextmenu', (event) => {
    event.preventDefault()
    // A browser that sends the event for a key may give it no position.
    if (event.clientX || event.clientY) open(event.clientX, event.clientY)
    else atTarget()
  }, { signal })

  // Not every browser sends `contextmenu` for these keys; macOS sends it for neither.
  target.addEventListener('keydown', (event) => {
    if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return
    event.preventDefault()
    atTarget()
  }, { signal })

  // A browser that sends `contextmenu` when the key is released finds focus already in the menu, and a right
  // click may land on an item: either way the browser's menu stays away from this one.
  menu.addEventListener('contextmenu', (event) => event.preventDefault(), { signal })

  return () => controller.abort()
}
