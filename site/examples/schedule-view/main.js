import { schedule } from '@master/ui/behaviors/schedule.js'
import { calendars, events } from './events.js'

/**
 * A team calendar: the schedule behavior writes the period from the events, and an event, a button without a
 * link, opens its details in a drawer. Returns the function that stops it.
 */
export function mount(root) {
  const view = root.querySelector('.schedule-view')
  const dialog = root.querySelector('dialog')
  const field = (name) => root.querySelector(`#team-event-${name}`)
  const detach = schedule(view, { events, today: '2026-11-13', locale: 'en-US', weekStart: 1, value: { date: '2026-11-13', view: 'month' } })

  const controller = new AbortController()
  view.addEventListener('click', (click) => {
    const button = click.target.closest('button.schedule-event')
    const event = button && events.find((each) => each.id === button.value)
    if (!event) return
    const badge = field('calendar')
    badge.className = `badge badge-category badge-dot category-${event.category}`
    badge.textContent = calendars[event.category]
    field('title').textContent = event.title
    field('when').textContent = button.getAttribute('aria-label').slice(event.title.length + 2)
    field('where').textContent = event.where
    field('who').textContent = event.who
    // A day's list is a popover in the top layer; the drawer goes over it, and the list closes behind it. The
    // event's own button is then hidden, so when the drawer closes focus goes to the button that opened the list.
    const list = button.closest('[popover]')
    const opener = list ? view.querySelector(`[popovertarget="${list.id}"]`) : null
    list?.hidePopover()
    if (opener) dialog.addEventListener('close', () => opener.focus(), { once: true, signal: controller.signal })
    dialog.showModal()
  }, { signal: controller.signal })

  return () => {
    controller.abort()
    detach()
    if (dialog.open) dialog.close()
  }
}
