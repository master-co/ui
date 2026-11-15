import { condition, describe, operatorsOf, problem } from './query.js'

/**
 * A filter bar: conditions staged in a popover and applied together, then shown as chips that each remove one.
 * The page writes the bar's elements and marks them with `data-filter`, with a `<template>` for a condition's row,
 * a value to choose and an applied chip; this copies the templates, fills them in and says the applied conditions
 * to `onChange`.
 *
 * - The popover holds a draft. Opening it copies what is applied; Cancel, Escape or a click outside drop the draft.
 * - Apply checks every row first. A row that cannot be applied is marked `aria-invalid`, the message says why and
 *   focus goes to it; nothing is applied until every row can be.
 * - Clear empties the draft, so Apply then shows every row. Clear all, beside the chips, applies at once.
 *
 * @param {HTMLElement} root The element that holds the bar, its chips and its popover.
 * @param {{ fields: object[], applied?: object[], onChange: (applied: object[]) => void }} options
 * @returns {{ readonly applied: object[], setFields(fields: object[], applied?: object[]): void, destroy(): void }}
 */
export function filters(root, options) {
  const part = (name) => root.querySelector(`[data-filter="${name}"]`)
  const open = part('open')
  const count = part('count')
  const chips = part('chips')
  const clearAll = part('clear-all')
  const shown = part('applied')
  const panel = part('panel')
  const form = part('form')
  const list = part('conditions')
  const empty = part('empty')
  const error = part('error')
  const add = part('add')
  const controller = new AbortController()
  const { signal } = controller

  let fields = options.fields
  let applied = [...(options.applied ?? [])]
  let draft = []
  const fieldOf = (key) => fields.find((field) => field.key === key)

  /** A copy of one of the page's templates: the markup is the page's, this only fills it in. */
  const clone = (name) => part(name).content.firstElementChild.cloneNode(true)
  /** @param {[string, string][]} choices @param {string} chosen */
  const fill = (select, choices, chosen) => select.replaceChildren(...choices.map(([value, words]) => {
    const option = new Option(words, value, false, value === chosen)
    option.className = 'select-option'
    return option
  }))

  /** The control for a condition's value: what its field holds. */
  function valueControl(given, field, index) {
    const label = `Value of condition ${index + 1}`
    if (field.type === 'enum') {
      const select = clone('choice')
      fill(select, field.options, given.value)
      // Nothing is chosen for a new condition: a first option that cannot be chosen again says so.
      const prompt = new Option(`Choose a ${field.label.toLowerCase()}`, '', true, !given.value)
      prompt.disabled = true
      prompt.className = 'select-option'
      select.prepend(prompt)
      select.setAttribute('aria-label', label)
      return select
    }
    const input = clone('row').querySelector('[data-part="value"]')
    input.type = field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'
    if (field.type === 'number') Object.assign(input, { step: 'any', min: '0', inputMode: 'decimal' })
    if (field.type === 'text') input.placeholder = 'Value'
    input.setAttribute('aria-label', field.unit ? `${label}, in ${field.unit}` : label)
    input.value = given.value
    return input
  }

  /** Write the draft's rows. Focus goes back to the control it was on, by row and part. */
  function drawDraft(focus) {
    list.replaceChildren(...draft.map((given, index) => {
      const field = fieldOf(given.field)
      const row = clone('row')
      row.dataset.index = String(index)
      row.querySelector('[data-part="joiner"]').textContent = index === 0 ? 'Where' : 'and'
      const fieldSelect = row.querySelector('[data-part="field"]')
      fill(fieldSelect, fields.map((each) => [each.key, each.label]), given.field)
      fieldSelect.setAttribute('aria-label', `Field of condition ${index + 1}`)
      const operator = row.querySelector('[data-part="operator"]')
      fill(operator, operatorsOf(field), given.operator)
      operator.setAttribute('aria-label', `Comparison of condition ${index + 1}`)
      row.querySelector('[data-part="value"]').replaceWith(valueControl(given, field, index))
      row.querySelector('[data-part="remove"]').setAttribute('aria-label', `Remove condition ${index + 1}`)
      return row
    }))
    empty.hidden = draft.length > 0
    if (focus) list.querySelector(`[data-index="${focus.index}"] [data-part="${focus.part}"]`)?.focus()
  }

  function say(message, control) {
    error.textContent = message ?? ''
    error.hidden = !message
    for (const invalid of list.querySelectorAll('[aria-invalid="true"]')) {
      invalid.removeAttribute('aria-invalid')
      invalid.removeAttribute('aria-describedby')
    }
    if (control) {
      control.setAttribute('aria-invalid', 'true')
      control.setAttribute('aria-describedby', error.id)
    }
  }

  /** Write the applied conditions: a chip each, the count on the button, and Clear all when there is any. */
  function drawApplied() {
    chips.replaceChildren(...applied.map((given, index) => {
      const words = describe(given, fieldOf(given.field))
      const chip = clone('chip')
      chip.querySelector('.chip-label').textContent = words
      const remove = chip.querySelector('.chip-remove')
      remove.setAttribute('aria-label', `Remove the filter ${words}`)
      remove.dataset.index = String(index)
      return chip
    }))
    // The wrappers have no display of their own, so `hidden` hides them whatever their content's classes say.
    shown.hidden = applied.length === 0
    count.firstElementChild.textContent = String(applied.length)
    count.hidden = applied.length === 0
    open.setAttribute('aria-label', applied.length ? `Filters, ${applied.length} applied` : 'Filters')
  }

  function commit(next, focusAfter) {
    applied = next
    drawApplied()
    options.onChange(applied)
    focusAfter?.focus()
  }

  // Opening copies what is applied into the draft; closing without Apply drops it.
  panel.addEventListener('toggle', (event) => {
    if (event.newState !== 'open') return
    draft = applied.map((given) => ({ ...given }))
    say(null)
    drawDraft()
    ;(list.querySelector('[data-part="field"]') ?? add).focus()
  }, { signal })

  add.addEventListener('click', () => {
    draft.push(condition(fields[0]))
    say(null)
    drawDraft({ index: draft.length - 1, part: 'field' })
  }, { signal })

  list.addEventListener('click', (event) => {
    const remove = event.target.closest('[data-part="remove"]')
    if (!remove) return
    const index = Number(remove.closest('li').dataset.index)
    draft.splice(index, 1)
    say(null)
    if (draft.length) drawDraft({ index: Math.min(index, draft.length - 1), part: 'field' })
    else { drawDraft(); add.focus() }
  }, { signal })

  // A new field brings its own comparisons and its own kind of value.
  list.addEventListener('change', (event) => {
    const control = event.target.closest('[data-part]')
    const index = Number(control?.closest('li')?.dataset.index)
    if (!control || Number.isNaN(index)) return
    if (control.dataset.part === 'field') {
      draft[index] = condition(fieldOf(control.value))
      // What was said about the condition this row held is no longer true of it.
      say(null)
      drawDraft({ index, part: 'field' })
    } else if (control.dataset.part === 'operator') {
      draft[index].operator = control.value
    } else {
      draft[index].value = control.value
    }
  }, { signal })

  list.addEventListener('input', (event) => {
    const control = event.target.closest('[data-part="value"]')
    if (!control) return
    draft[Number(control.closest('li').dataset.index)].value = control.value
    if (control.getAttribute('aria-invalid') === 'true') say(null)
  }, { signal })

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    for (const [index, given] of draft.entries()) {
      const control = list.querySelector(`[data-index="${index}"] [data-part="value"]`)
      const message = problem(given, fieldOf(given.field), control?.validity)
      if (message) {
        say(draft.length > 1 ? `Condition ${index + 1}: ${message}` : message, control)
        control?.focus()
        return
      }
    }
    panel.hidePopover()
    commit(draft.map((given) => ({ ...given, value: String(given.value).trim() })), open)
  }, { signal })

  part('cancel').addEventListener('click', () => panel.hidePopover(), { signal })
  part('clear').addEventListener('click', () => {
    draft = []
    say(null)
    drawDraft()
    add.focus()
  }, { signal })

  chips.addEventListener('click', (event) => {
    const remove = event.target.closest('.chip-remove')
    if (!remove) return
    const index = Number(remove.dataset.index)
    const next = applied.filter((_, at) => at !== index)
    commit(next)
    // Focus stays in the row of chips: on the next one, or the one before, or the button that opens the filters.
    ;(chips.querySelectorAll('.chip-remove')[Math.min(index, next.length - 1)] ?? open).focus()
  }, { signal })

  clearAll.addEventListener('click', () => commit([], open), { signal })

  drawApplied()
  return {
    get applied() { return applied.map((given) => ({ ...given })) },
    setFields(next, start = []) {
      fields = next
      applied = start
      drawApplied()
    },
    destroy() {
      controller.abort()
      if (panel.matches(':popover-open')) panel.hidePopover()
    },
  }
}
