export function mount(root) {
  const input = root.querySelector('input[name="q"]')
  // A preview seeds one search. A results page always reads its own shareable URL.
  const query = (location.href.startsWith('about:srcdoc')
    ? input.defaultValue
    : new URLSearchParams(location.search).get(input.name) ?? '').trim()
  input.value = query
  const needle = query.toLowerCase()

  function highlight(link) {
    const label = link.textContent
    const lower = label.toLowerCase()
    if (!needle) return true
    let index = lower.indexOf(needle)
    if (index < 0) return false
    const found = document.createDocumentFragment()
    let start = 0
    while (index !== -1) {
      found.append(label.slice(start, index))
      const mark = document.createElement('mark')
      mark.className = 'mark'
      mark.textContent = label.slice(index, index + query.length)
      found.append(mark)
      start = index + query.length
      index = lower.indexOf(needle, start)
    }
    found.append(label.slice(start))
    link.replaceChildren(found)
    return true
  }

  let count = 0
  for (const article of root.querySelectorAll('article')) {
    const titleMatches = highlight(article.querySelector('a'))
    let sections = 0
    for (const item of article.querySelectorAll('li')) {
      item.hidden = !highlight(item.querySelector('a')) && !titleMatches
      if (!item.hidden) sections++
    }
    article.hidden = sections === 0
    if (!article.hidden) count++
  }
  root.querySelector('[role="status"]').textContent = count
    ? count + (count === 1 ? ' guide' : ' guides') + (query ? ' matching “' + query + '”.' : '.')
    : 'No guides match “' + query + '”. Try a shorter search.'
  // A cached page may still hold the field as it was edited before leaving it.
  const restoreQuery = () => { input.value = query }
  window.addEventListener('pageshow', restoreQuery)
  return () => window.removeEventListener('pageshow', restoreQuery)
}
