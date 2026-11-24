const charges = { solo: { monthly: 12, annual: 120 }, studio: { monthly: 30, annual: 300 } }
export function mount(root) {
  function update() {
    const cycle = root.querySelector('input:checked').value
    for (const card of root.querySelectorAll('[data-plan]')) {
      const plan = card.dataset.plan
      card.querySelector('.price-amount').textContent = charges[plan][cycle]
      card.querySelector('.price-period').textContent = cycle === 'annual' ? '/ year' : '/ month'
      const link = card.querySelector('a')
      const next = new URL(link.href)
      next.searchParams.set('cycle', cycle)
      link.href = next.href
      link.textContent = 'Review ' + card.querySelector('h3').textContent + ' ' + cycle
    }
  }
  root.addEventListener('change', update)
  update()
  return () => root.removeEventListener('change', update)
}
