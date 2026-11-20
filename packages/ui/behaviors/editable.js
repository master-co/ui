/**
 * Editable: a value read as text that becomes a field in place.
 *
 * The root, the element with the `editable` class, holds a button with `editable-preview` that shows the
 * saved value, and a field with `editable-field`, an input or a textarea, that starts `hidden`. Pressing the
 * preview hides it, shows the field with the saved value and selects its text. Enter saves, and in a
 * textarea Control or Command with Enter, since Enter there starts a line; Escape puts the saved value back.
 * Either way the field hides, the preview shows the saved value and takes focus again; Enter held down does
 * either once. Leaving the field saves too, or cancels with `blur: 'cancel'`.
 *
 * A value the field's own constraints refuse (`required`, `pattern`, `maxlength`) is not saved: Enter keeps
 * the field open and lets the browser say why, and leaving the field puts the saved value back.
 *
 * Saving a different value writes it into the preview and dispatches `input` and `change` from the field.
 * With an empty value the preview shows the field's `placeholder` in an `editable-placeholder`. Where the
 * value goes after that is the page's: while it is on its way, set `aria-busy="true"` on the root; if it is
 * refused, set the value back, or call `edit()` and mark the field `aria-invalid="true"`.
 *
 * The function it returns has a `value`, the saved value, and `edit()`, which opens the field. Setting the
 * value writes the preview and the field and dispatches nothing.
 */
import { valued, write } from './internal.js'

/** @type {WeakMap<Element, AbortController>} */
const attached = new WeakMap()

/**
 * @param {HTMLElement} root The element with the `editable` class.
 * @param {{ blur?: 'save' | 'cancel' }} [options] `blur`: what leaving the field does. `'save'` by default.
 * @returns {(() => void) & { value: string, edit: () => void }} Removes everything the behavior added. Its
 *   `value` is the saved value; `edit()` opens the field.
 */
export function editable(root, { blur = 'save' } = {}) {
  attached.get(root)?.abort()
  const controller = new AbortController()
  const { signal } = controller
  attached.set(root, controller)

  const preview = /** @type {HTMLButtonElement | null} */ (root.querySelector('.editable-preview'))
  const field = /** @type {HTMLInputElement | HTMLTextAreaElement | null} */ (root.querySelector('.editable-field'))
  let saved = field?.defaultValue ?? field?.value ?? preview?.textContent ?? ''

  /** Write a value into the preview, or the field's placeholder when it is empty. The pencil the preview holds stays after it. */
  const show = (/** @type {string} */ value) => {
    if (!preview) return
    const pencil = [...preview.querySelectorAll('.editable-pencil')]
    if (value) {
      preview.replaceChildren(value, ...pencil)
      return
    }
    const placeholder = field?.getAttribute('placeholder')
    if (!placeholder) {
      preview.replaceChildren(...pencil)
      return
    }
    const part = root.ownerDocument.createElement('span')
    part.className = 'editable-placeholder'
    part.textContent = placeholder
    preview.replaceChildren(part, ...pencil)
  }

  const editing = () => !!field && !field.hidden

  const edit = () => {
    if (!field || !preview || editing() || preview.disabled || root.getAttribute('aria-busy') === 'true') return
    write(field, saved)
    preview.hidden = true
    field.hidden = false
    field.focus()
    field.select()
  }

  /** Close the field. Focus returns to the preview when it was in the field, never from elsewhere. */
  const close = () => {
    if (!field || !preview) return
    const focused = root.ownerDocument.activeElement === field
    field.hidden = true
    preview.hidden = false
    if (focused) preview.focus()
  }

  const cancel = () => {
    if (!field) return
    write(field, saved)
    field.removeAttribute('aria-invalid')
    close()
  }

  /** Save what the field holds. Returns false, and keeps the field open, when its constraints refuse it. */
  const save = () => {
    if (!field) return false
    if (!field.checkValidity()) return false
    const value = field.value
    close()
    if (value === saved) return true
    saved = value
    show(value)
    saying = true
    field.dispatchEvent(new Event('input', { bubbles: true }))
    field.dispatchEvent(new Event('change', { bubbles: true }))
    saying = false
    return true
  }

  /**
   * The browser says `change` by itself when a field that was typed in loses focus, before this script has
   * saved or cancelled: a page would hear text that is then thrown away, or hear one save twice. The only
   * `change` a page hears is the one a save says.
   */
  let saying = false
  field?.addEventListener('change', (event) => {
    if (!saying) event.stopImmediatePropagation()
  }, { signal, capture: true })

  const detach = /** @type {(() => void) & { value: string, edit: () => void }} */ (valued(
    () => controller.abort(),
    () => saved,
    (next) => {
      const value = next === null || next === undefined ? '' : String(next)
      if (value === saved) return
      saved = value
      show(value)
      if (field) write(field, value)
    }
  ))
  detach.edit = edit
  if (!field || !preview) return detach

  preview.addEventListener('click', edit, { signal })
  // Enter held down opens or saves once. Its repeats would press the preview again as it takes focus back, and
  // save the field as soon as it opens: the field would open and close for as long as the key is down.
  preview.addEventListener('keydown', (event) => { if (event.key === 'Enter' && event.repeat) event.preventDefault() }, { signal })

  field.addEventListener('keydown', (/** @type {Event} */ pressed) => {
    const event = /** @type {KeyboardEvent} */ (pressed)
    // While an input method composes, Enter and Escape belong to it. Safari ends the composition before the
    // Enter that commits it, which then says only keyCode 229.
    if (event.isComposing || event.keyCode === 229) return
    const multiline = field.localName === 'textarea'
    if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
      return
    }
    if (event.key !== 'Enter' || event.altKey || event.shiftKey) return
    if (multiline && !(event.ctrlKey || event.metaKey)) return
    event.preventDefault()
    if (event.repeat) return
    if (!save()) field.reportValidity()
  }, { signal })

  field.addEventListener('input', () => field.removeAttribute('aria-invalid'), { signal })

  // Leaving the field, for anything but the window losing focus, saves or cancels.
  field.addEventListener('blur', () => {
    if (!editing() || root.ownerDocument.activeElement === field) return
    if (blur === 'cancel' || !save()) cancel()
  }, { signal })

  return detach
}
