/**
 * An icon for the homepage's markup strings: a Master Icons drawing written the way the library's own examples
 * write one, at the master its viewBox names and the stroke that master carries. Import the master by the size the
 * holder gives the icon: 16 up to 17px, 20 for 18 to 22px.
 */
import { serializeNodes, type IconMaster } from '@master/icons/runtime'

export type Drawing = IconMaster & { opticalSize: number }

export const icon = (master: Drawing, name = 'icon') =>
  `<svg class="${name}" viewBox="0 0 ${master.opticalSize} ${master.opticalSize}" fill="none" stroke="currentColor" stroke-width="${master.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${serializeNodes(master.nodes)}</svg>`
