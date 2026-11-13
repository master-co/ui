/**
 * Requests a month in 2026, in thousands, for three regions. Each series names its category, and the category,
 * not its place in the list, decides its color: a region keeps its color wherever it is shown.
 */
export const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']

export const series = [
  { id: 'tokyo', label: 'Tokyo', category: 'blue', values: [412, 438, 461, 455, 498, 532, 548, 571, 602, 640] },
  { id: 'frankfurt', label: 'Frankfurt', category: 'orange', values: [298, 305, 322, 341, 336, 358, 377, 369, 391, 404] },
  { id: 'virginia', label: 'Virginia', category: 'teal', values: [188, 214, 236, 251, 283, 297, 330, 352, 371, 398] },
]
