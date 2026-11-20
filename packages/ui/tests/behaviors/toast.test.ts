import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { toast } from '../../behaviors/toast.js'

/**
 * The toast's behavior removes a toast that has left its region. happy-dom plays no animation, so a test ends
 * the clock the way a browser does, with `animationend`, and waits a turn for the exit that has nothing to play.
 */
const markup = `<div class="toast-region" role="region" aria-label="Notifications">
  <dialog open class="toast toast-timed" aria-labelledby="saved"><p class="toast-title" id="saved">Saved</p></dialog>
  <dialog open class="toast" aria-labelledby="copied"><p class="toast-title" id="copied">Copied</p><span class="badge">1</span></dialog>
</div>
<dialog open class="toast" id="elsewhere"></dialog>`

function setup() {
  const page = dom(markup)
  const root = page.one('.toast-region')
  const [timed, plain] = page.all<HTMLDialogElement>('.toast-region > .toast')
  const end = (target: Element, animationName: string) => {
    const event = new page.window.Event('animationend', { bubbles: true }) as any
    event.animationName = animationName
    target.dispatchEvent(event)
  }
  const close = (target: HTMLDialogElement) => {
    target.removeAttribute('open')
    target.dispatchEvent(new page.window.Event('close') as never)
  }
  const settle = () => new Promise(resolve => setTimeout(resolve, 30))
  return { ...page, root, timed: timed!, plain: plain!, end, close, settle, detach: toast(root) }
}

test('toast: a toast whose clock has run out is removed, and no other animation removes one', () => {
  const { root, timed, plain, end, errors } = setup()
  end(plain, 'toast-enter')
  end(plain.querySelector('.badge')!, 'toast-expire')
  assert.equal(root.children.length, 2)
  end(timed, 'toast-expire')
  assert.deepEqual([...root.children], [plain])
  assert.deepEqual(errors, [])
})

test('toast: a dismissed toast is removed once it has left', async () => {
  const { root, timed, plain, close, settle } = setup()
  close(plain)
  assert.equal(plain.parentElement, root, 'it stays for its exit')
  await settle()
  assert.deepEqual([...root.children], [timed])
})

test('toast: a toast opened again before it left stays, and so does one outside the region', async () => {
  const { root, plain, close, settle, one } = setup()
  close(plain)
  plain.setAttribute('open', '')
  const elsewhere = one<HTMLDialogElement>('#elsewhere')
  close(elsewhere)
  await settle()
  assert.equal(plain.parentElement, root)
  assert.ok(elsewhere.isConnected)
})

test('toast: detached, the region keeps what leaves', async () => {
  const { root, timed, plain, end, close, settle, detach } = setup()
  detach()
  end(timed, 'toast-expire')
  close(plain)
  await settle()
  assert.equal(root.children.length, 2)
})
