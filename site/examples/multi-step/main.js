/**
 * A workspace set up in three steps, with nowhere to send it. The markup is one whole form in order, which is
 * what a browser without this module shows. The module divides it: it shows one step at a time, moves
 * aria-current along the progress, checks the step in hand before going on, and at the end swaps the form
 * for the result. What was typed stays in the fields, and where the reader is stays in `state`; nothing is
 * stored and nothing leaves the page. In a product each step is a route and the server keeps the draft.
 * Returns the function that stops it and puts the whole form back.
 */
export function mount(root) {
  const controller = new AbortController()
  const { signal } = controller
  const task = root.querySelector('[data-ms-task]')
  const form = task.querySelector('.form')
  const steps = [...form.querySelectorAll('[data-ms-step]')]
  const review = form.querySelector('[data-ms-review]')
  const back = form.querySelector('[data-ms-back]')
  const next = form.querySelector('[data-ms-next]')
  const done = root.querySelector('[data-ms-done]')
  const phone = form.querySelector('[data-ms-phone]')
  // The same three steps twice: the vertical list of a wide page and the short row of a narrow one.
  const lists = [...root.querySelectorAll('[data-ms-progress]')].map(list => ({
    list,
    short: list.dataset.msProgress === 'short',
    items: [...list.querySelectorAll('.steps-item')]
  }))
  const last = steps.length - 1
  const submitLabel = next.textContent

  // Where the reader is, the furthest step they have reached, and whether the task is finished.
  const state = { step: 0, reached: 0, done: false }

  /**
   * A step's name in the progress is a link while the step can be opened and plain words while it cannot, as
   * the steps component asks: the element is replaced only when that changes.
   */
  const name = (item, index, open) => {
    const old = item.querySelector('.steps-title')
    if ((old.localName === 'a') === open) return old
    const title = document.createElement(open ? 'a' : 'span')
    title.className = open ? 'steps-title link link-quiet' : 'steps-title'
    title.textContent = old.textContent
    if (open) title.href = `#${steps[index].id}`
    old.replaceWith(title)
    return title
  }

  const headingOf = (step) => steps[step].querySelector('.heading')
  const controlsOf = (step) => [...steps[step].querySelectorAll('input, select, textarea')].filter(control => control.willValidate)

  /**
   * A field's error is read with the field only while it shows: its id joins aria-describedby, after the hint,
   * while the field is marked or the browser reports it, and leaves when the value is valid again.
   */
  const describe = (control) => {
    if (!control.dataset?.error) return
    const invalid = !control.validity.valid && (control.getAttribute('aria-invalid') === 'true' || control.matches(':user-invalid'))
    if (control.validity.valid) control.removeAttribute('aria-invalid')
    const ids = (control.getAttribute('aria-describedby') ?? '').split(' ').filter(id => id && id !== control.dataset.error)
    if (invalid) ids.push(control.dataset.error)
    if (ids.length) control.setAttribute('aria-describedby', ids.join(' '))
    else control.removeAttribute('aria-describedby')
  }

  /**
   * The browser holds the rules (required, type, pattern) and shows a field's error once the reader has edited
   * it. A field never touched has to be marked here, with aria-invalid, when Next is pressed: a submit would mark
   * every field of the form as tried, the ones in steps not reached yet among them. Focus goes to the first.
   */
  const check = (step) => {
    const invalid = controlsOf(step).filter(control => !control.validity.valid)
    for (const control of invalid) {
      control.setAttribute('aria-invalid', 'true')
      describe(control)
    }
    if (!invalid.length) return true
    if (state.step !== step) {
      state.step = step
      render()
    }
    invalid[0].focus()
    return false
  }

  // The phone number is asked for, and required, only while alerts go to a phone.
  const askPhone = () => {
    const field = phone.querySelector('.input')
    const wanted = form.elements.alerts.value === 'phone'
    phone.hidden = !wanted
    field.disabled = !wanted
    field.required = wanted
    if (!wanted) field.removeAttribute('aria-invalid')
    // An error that no longer shows is no longer read with the field when it comes back.
    describe(field)
  }

  const values = () => {
    const written = new FormData(form)
    const text = (name) => String(written.get(name) ?? '').trim()
    const alerts = { email: `Email to ${text('email')}`, phone: `Text message to ${text('phone')}`, none: 'None' }
    return { name: text('name'), address: `atlas.dev/${text('slug')}`, email: text('email'), alerts: alerts[text('alerts')], region: text('region') }
  }

  const render = () => {
    task.hidden = state.done
    done.hidden = !state.done
    steps.forEach((step, index) => { step.hidden = index !== state.step })
    // A button's own display outranks the hidden attribute, so Back leaves with the utility of that name.
    back.classList.toggle('hidden', state.step === 0)
    next.textContent = state.step === last ? submitLabel : 'Next'
    for (const { list, short, items } of lists) {
      list.classList.toggle('steps-complete', state.done)
      items.forEach((item, index) => {
        const current = !state.done && index === state.step
        // A step already reached is a link back to it; the current one and the ones ahead are plain words.
        const open = !state.done && !current && index <= state.reached
        if (current) item.setAttribute('aria-current', 'step')
        else item.removeAttribute('aria-current')
        // In the short row the other steps' names are not drawn, and a link nobody can see is not one to tab to or
        // to tap: there a step already reached is words, and Back is the way to it.
        const title = name(item, index, open && !short)
        // The short row shows the current step's name; the others keep theirs for assistive technology.
        if (short) title.classList.toggle('sr-only', !current)
      })
    }
    // What was typed is set as text, never as markup.
    if (state.done || state.step === last) {
      const written = values()
      for (const slot of root.querySelectorAll('[data-ms-value]')) slot.textContent = written[slot.dataset.msValue]
    }
  }

  /**
   * Going on checks every step passed on the way and stops at the first that fails. Going back checks nothing:
   * a reader may leave a step half written and find it as they left it.
   */
  const go = (target) => {
    for (let step = state.step; step < target; step++) if (!check(step)) return
    state.step = target
    state.reached = Math.max(state.reached, target)
    render()
    headingOf(target).focus()
  }

  const advance = () => {
    if (state.step < last) return go(state.step + 1)
    for (let step = 0; step < last; step++) if (!check(step)) return
    state.done = true
    render()
    done.querySelector('[data-ms-done-title]').focus()
  }

  next.addEventListener('click', advance, { signal })
  back.addEventListener('click', () => go(state.step - 1), { signal })
  // Next is not a submit button, so Enter in a field is given the same meaning here.
  form.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.isComposing || !event.target.matches('input')) return
    event.preventDefault()
    advance()
  }, { signal })
  form.addEventListener('submit', event => event.preventDefault(), { signal })
  for (const type of ['input', 'change', 'focusout']) {
    form.addEventListener(type, event => describe(event.target), { signal })
  }
  form.addEventListener('change', (event) => {
    if (event.target.name === 'alerts') askPhone()
  }, { signal })

  // A step already reached is opened from the progress, and from Edit in the review.
  for (const { list, items } of lists) {
    list.addEventListener('click', (event) => {
      const title = event.target.closest('a.steps-title')
      if (!title) return
      event.preventDefault()
      go(items.indexOf(title.closest('.steps-item')))
    }, { signal })
  }
  for (const edit of form.querySelectorAll('[data-ms-edit]')) {
    edit.addEventListener('click', () => go(Number(edit.dataset.msEdit)), { signal })
  }

  const clear = () => {
    form.reset()
    for (const control of form.querySelectorAll('[data-error]')) {
      control.removeAttribute('aria-invalid')
      describe(control)
    }
    Object.assign(state, { step: 0, reached: 0, done: false })
  }

  root.querySelector('[data-ms-restart]').addEventListener('click', () => {
    clear()
    askPhone()
    render()
    headingOf(0).focus()
  }, { signal })

  next.type = 'button'
  askPhone()
  render()

  return () => {
    controller.abort()
    clear()
    // The whole form again, in order, as the markup has it.
    task.hidden = false
    done.hidden = true
    steps.forEach((step) => { step.hidden = step === review })
    back.classList.add('hidden')
    next.type = 'submit'
    next.textContent = submitLabel
    phone.hidden = false
    phone.querySelector('.input').disabled = false
    phone.querySelector('.input').required = false
    for (const { list, items } of lists) {
      list.classList.remove('steps-complete')
      items.forEach((item, index) => {
        item.removeAttribute('aria-current')
        // The review holds no field, so the whole form has nothing to link its step to.
        name(item, index, steps[index] !== review).classList.remove('sr-only')
      })
    }
  }
}
