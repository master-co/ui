/** Storage by kind, in gigabytes: the parts of one whole. */
export const storage = [
  { id: 'images', label: 'Images', category: 'blue', value: 412 },
  { id: 'video', label: 'Video', category: 'orange', value: 286 },
  { id: 'documents', label: 'Documents', category: 'teal', value: 138 },
  { id: 'other', label: 'Other', category: 'violet', value: 64 },
]

/** This week's three goals, each a ring of its own: how far it has come against its target. */
export const goals = [
  { id: 'deploys', label: 'Deploys', category: 'blue', done: 18, target: 24 },
  { id: 'reviews', label: 'Reviews', category: 'orange', done: 9, target: 12 },
  { id: 'incidents', label: 'Incidents closed', category: 'teal', done: 5, target: 5 },
]
