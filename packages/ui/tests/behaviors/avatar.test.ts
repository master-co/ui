import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { avatar } from '../../behaviors/avatar.js'

const markup = (src = '/people/ada.jpg') => `<span class="avatar" role="img" aria-label="Ada Lovelace">
  <img class="avatar-image" src="${src}" alt="">
  <span class="avatar-fallback" aria-hidden="true">AL</span>
</span>`

/**
 * happy-dom loads no picture, so each test says what the photo is: still loading, already in the cache, or
 * broken. `complete` and `decode` are what the behavior asks of a photo that settled before it attached.
 */
function photo(page: ReturnType<typeof dom>, state: { complete?: boolean, decodes?: boolean } = {}) {
  const image = page.one<HTMLImageElement>('.avatar-image')
  let complete = state.complete ?? false
  Object.defineProperty(image, 'complete', { get: () => complete, configurable: true })
  Object.defineProperty(image, 'decode', { value: () => state.decodes ? Promise.resolve() : Promise.reject(new Error('EncodingError')), configurable: true })
  return {
    image,
    fallback: page.one<HTMLElement>('.avatar-fallback'),
    load: () => { complete = true; image.dispatchEvent(new page.window.Event('load')) },
    fail: () => { complete = true; image.dispatchEvent(new page.window.Event('error')) },
    restart: () => { complete = false },
  }
}

const tick = () => new Promise(resolve => setTimeout(resolve, 0))

test('avatar: while the photo loads both stand in the cell; once it loads the fallback is hidden', () => {
  const page = dom(markup())
  const { image, fallback, load } = photo(page)
  avatar(page.one('.avatar'))
  assert.equal(image.hidden, false, 'the photo stays in the layout so it can load')
  assert.equal(fallback.hidden, false, 'the initials show through until it paints')
  load()
  assert.equal(image.hidden, false)
  assert.equal(fallback.hidden, true)
  assert.deepEqual(page.errors, [])
})

test('avatar: a photo that fails is hidden and the fallback shows, with no broken image', () => {
  const page = dom(markup())
  const { image, fallback, fail } = photo(page)
  avatar(page.one('.avatar'))
  fail()
  assert.equal(image.hidden, true)
  assert.equal(fallback.hidden, false)
})

test('avatar: a photo already in the cache is settled when the behavior attaches', async () => {
  const page = dom(markup())
  const { image, fallback } = photo(page, { complete: true, decodes: true })
  avatar(page.one('.avatar'))
  await tick()
  assert.equal(image.hidden, false)
  assert.equal(fallback.hidden, true)

  const broken = dom(markup())
  const second = photo(broken, { complete: true, decodes: false })
  avatar(broken.one('.avatar'))
  await tick()
  assert.equal(second.image.hidden, true, 'a broken photo that settled before is hidden')
  assert.equal(second.fallback.hidden, false)
})

test('avatar: an empty source shows the fallback at once', () => {
  const page = dom(markup(''))
  const { image, fallback } = photo(page)
  avatar(page.one('.avatar'))
  assert.equal(image.hidden, true)
  assert.equal(fallback.hidden, false)
})

test('avatar: a new source starts over, and an answer about the old one changes nothing', async () => {
  const page = dom(markup('/people/old.jpg'))
  const { image, fallback, load, fail, restart } = photo(page)
  avatar(page.one('.avatar'))
  fail()
  assert.equal(image.hidden, true)

  restart()
  image.setAttribute('src', '/people/new.jpg')
  await tick()
  assert.equal(image.hidden, false, 'the new photo is back in the layout to load')
  assert.equal(fallback.hidden, false)

  // The old request answers late: it may not hide the new photo.
  image.setAttribute('src', '/people/newer.jpg')
  await tick()
  const late = () => image.dispatchEvent(new page.window.Event('error'))
  image.setAttribute('src', '/people/newest.jpg')
  late()
  assert.equal(image.hidden, false, 'an error about a source the photo no longer has hides nothing')
  await tick()
  assert.equal(image.hidden, false, 'the newest source starts over')
  load()
  assert.equal(fallback.hidden, true)
})

test('avatar: the name is the root\'s; the photo and the initials are not read again', () => {
  const page = dom(markup())
  avatar(page.one('.avatar'))
  assert.equal(page.one('.avatar').getAttribute('aria-label'), 'Ada Lovelace')
  assert.equal(page.one('.avatar-image').getAttribute('alt'), '')
  assert.equal(page.one('.avatar-fallback').getAttribute('aria-hidden'), 'true')
})

test('avatar: detach stops following the photo, and attaching twice is safe', () => {
  const page = dom(markup())
  const { image, fallback, fail } = photo(page)
  const root = page.one('.avatar')
  avatar(root)
  const detach = avatar(root)
  detach()
  fail()
  assert.equal(image.hidden, false)
  assert.equal(fallback.hidden, false)
})
