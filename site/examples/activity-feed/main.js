/**
 * The activity of a team, filtered by kind on the page. The events are markup the server wrote, so the feed reads
 * in full without this script; a choice in the switch keeps the events of that kind in their lists, takes out a
 * day that is left with none, and says how many are shown. Returns the function that stops it and puts every
 * event back.
 */
export function mount(root) {
  const count = root.querySelector('#activity-count')
  const feed = root.querySelector('[data-activity-days]')
  const days = [...feed.children].map((day) => ({ day, list: day.querySelector('.timeline'), items: [...day.querySelectorAll('.timeline-item')] }))
  const words = { all: ['event', 'events'], deploy: ['deployment', 'deployments'], comment: ['comment', 'comments'], file: ['file change', 'file changes'] }
  const controller = new AbortController()

  const show = (kind) => {
    let shown = 0
    const kept = []
    for (const { day, list, items } of days) {
      const matching = items.filter((item) => kind === 'all' || item.dataset.kind === kind)
      list.replaceChildren(...matching)
      if (matching.length) kept.push(day)
      shown += matching.length
    }
    feed.replaceChildren(...kept)
    count.textContent = `${shown} ${words[kind][shown === 1 ? 0 : 1]} in Atlas Labs since Wednesday`
  }

  root.addEventListener('change', (event) => {
    if (event.target.name === 'activity-kind') show(event.target.value)
  }, { signal: controller.signal })

  return () => {
    controller.abort()
    show('all')
  }
}
