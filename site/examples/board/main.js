/**
 * A board on local data. The kanban behavior does all the moving: the pointer, the keys and the mover. This
 * module only reads what it leaves: the arrangement, `value`, from which each column's count is written after
 * every `change`, and which Reset sets back to the one the markup started with. Saving the arrangement is the
 * application's: do it where the counts are written. Returns the function that stops it.
 */
import { kanban } from '@master/ui/behaviors/kanban.js'

export function mount(root) {
  const controller = new AbortController()
  const { signal } = controller
  const element = root.querySelector('.kanban')
  const board = kanban(element)
  const mover = element.querySelector('.kanban-mover')
  const status = element.querySelector('.kanban-status')
  /** The arrangement the markup holds before anything moves. */
  const first = board.value

  /** Each column's count is the length of its items in the arrangement, never a number kept beside it. */
  const count = () => {
    for (const { value, items } of board.value) {
      const badge = element.querySelector(`[data-count="${value}"]`)
      if (badge) badge.firstChild.data = String(items.length)
    }
  }

  // A move's events are the ones whose target is the board; a select in the mover sends its own through it.
  element.addEventListener('change', (event) => {
    if (event.target === element) count()
  }, { signal })

  // Setting the value arranges the board and dispatches nothing, so the counts are written here.
  root.querySelector('[data-reset]').addEventListener('click', () => {
    board.value = first
    count()
    status.textContent = 'The board is back in its first arrangement.'
  }, { signal })

  // The mover is one form for every card: name it with the card it was opened for.
  element.addEventListener('click', (event) => {
    const move = event.target.closest('.kanban-move')
    if (move) mover.setAttribute('aria-label', move.getAttribute('aria-label'))
  }, { signal })

  count()
  return () => {
    controller.abort()
    board()
  }
}
