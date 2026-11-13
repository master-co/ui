import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.ts'
import { carousel } from '../../behaviors/carousel.js'

const markup = `<div class="carousel-view">
  <div class="carousel" role="region" aria-label="Projects" tabindex="0">
    <article class="carousel-slide" id="s-atlas" data-value="atlas">Atlas</article>
    <article class="carousel-slide" id="s-borealis" data-value="borealis">Borealis</article>
    <article class="carousel-slide" id="s-cirrus" data-value="cirrus">Cirrus</article>
  </div>
  <button type="button" class="btn btn-square carousel-previous" aria-label="Previous slide"></button>
  <button type="button" class="btn btn-square carousel-next" aria-label="Next slide"></button>
  <div class="carousel-dots">
    <button type="button" class="carousel-dot" aria-controls="s-atlas" aria-label="Slide 1 of 3"></button>
    <button type="button" class="carousel-dot" aria-controls="s-borealis" aria-label="Slide 2 of 3"></button>
    <button type="button" class="carousel-dot" aria-controls="s-cirrus" aria-label="Slide 3 of 3"></button>
  </div>
</div>`

function setup(options = {}) {
  const page = dom(markup)
  const scrolled: string[] = []
  for (const slide of page.all('.carousel-slide')) slide.scrollIntoView = (init: any) => { scrolled.push(`${slide.id} ${init?.inline} ${init?.behavior}`) }
  const heard: string[] = []
  for (const type of ['input', 'change']) page.document.body.addEventListener(type, () => heard.push(type))
  const handle = carousel(page.one('.carousel-view'), options)
  const current = () => page.all('.carousel-dot').findIndex(dot => dot.getAttribute('aria-current') === 'true')
  return { ...page, handle, scrolled, heard, current, previous: page.one<HTMLButtonElement>('.carousel-previous'), next: page.one<HTMLButtonElement>('.carousel-next') }
}

test('carousel: the first slide is current, and previous has nowhere to go', () => {
  const { handle, current, previous, next } = setup()
  assert.equal(handle.value, 'atlas')
  assert.equal(current(), 0)
  assert.equal(previous.disabled, true)
  assert.equal(next.disabled, false)
})

test('carousel: next and previous scroll the neighbor into view through the platform and say so once', () => {
  const { handle, click, current, previous, next, scrolled, heard } = setup()
  click(next)
  assert.equal(handle.value, 'borealis')
  assert.equal(current(), 1)
  assert.deepEqual(scrolled, ['s-borealis start smooth'], 'the slide is scrolled to its own snap alignment')
  assert.deepEqual(heard, ['input', 'change'])
  click(next)
  assert.equal(next.disabled, true, 'at the last slide next is disabled')
  click(previous)
  assert.equal(handle.value, 'borealis')
})

test('carousel: a dot goes to its slide', () => {
  const { handle, click, all } = setup()
  click(all('.carousel-dot')[2])
  assert.equal(handle.value, 'cirrus')
})

test('carousel: a value set from outside scrolls to it and says nothing; an unknown one changes nothing', () => {
  const { handle, heard, current, scrolled } = setup()
  handle.value = 'cirrus'
  assert.equal(current(), 2)
  assert.equal(scrolled.length, 1)
  assert.deepEqual(heard, [])
  handle.value = 'nimbus'
  assert.equal(handle.value, 'cirrus')
})

test('carousel: the first value is shown at once, without gliding', () => {
  const { handle, scrolled } = setup({ value: 'borealis' })
  assert.equal(handle.value, 'borealis')
  assert.deepEqual(scrolled, ['s-borealis start instant'])
})

test('carousel: detach removes the listeners, and attaching twice is safe', () => {
  const page = setup()
  const again = carousel(page.one('.carousel-view'))
  again()
  page.click(page.next)
  assert.equal(page.handle.value, 'atlas')
  assert.deepEqual(page.errors, [])
})
