/**
 * The chart's colors, read from the theme. A canvas cannot read a custom property, and a token is written with
 * light-dark(), so each one is resolved where it is used: a hidden probe inside the chart's root takes the token
 * as its color, and one pixel painted with that color gives it as rgba. Paper, a scoped override and the color
 * scheme all apply, since the probe stands where the chart does.
 */
export function palette(root) {
  const probe = document.createElement('span')
  probe.setAttribute('aria-hidden', 'true')
  probe.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden'
  root.append(probe)
  const pixel = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  pixel.canvas.width = pixel.canvas.height = 1
  const read = (token, alpha = 1) => {
    probe.style.color = `var(${token})`
    pixel.clearRect(0, 0, 1, 1)
    pixel.fillStyle = getComputedStyle(probe).color
    pixel.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = pixel.getImageData(0, 0, 1, 1).data
    return `rgba(${r}, ${g}, ${b}, ${Math.round((a / 255) * alpha * 1000) / 1000})`
  }
  return {
    /** A category's role: `mark` for a line, a bar or a slice; `surface`, `line` and `text` as the theme gives them. */
    category: (name, role = 'mark', alpha = 1) => read(`--color-category-${name}-${role}`, alpha),
    token: read,
    remove: () => probe.remove(),
  }
}

/**
 * Calls `change` when the colors may have changed: the reader's color scheme, or a page that switches its theme
 * on the root element. Returns the function that stops listening.
 */
export function watchTheme(change) {
  const controller = new AbortController()
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', change, { signal: controller.signal })
  const observer = new MutationObserver(change)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] })
  return () => {
    controller.abort()
    observer.disconnect()
  }
}

/** Whether to animate, kept current while the reader changes the setting. */
export function motion(change) {
  const query = matchMedia('(prefers-reduced-motion: reduce)')
  const controller = new AbortController()
  query.addEventListener('change', change, { signal: controller.signal })
  return { still: () => query.matches, stop: () => controller.abort() }
}

/** An element with its attributes and children: what the legend and the table are written with. */
export function element(tag, attributes = {}, ...children) {
  const node = document.createElement(tag)
  for (const [name, value] of Object.entries(attributes)) if (value !== undefined && value !== false) node.setAttribute(name, value === true ? '' : value)
  node.append(...children)
  return node
}
