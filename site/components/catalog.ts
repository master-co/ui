/** The published components, in reading order. Each slug matches `content/components/<slug>` and `@master/ui/components/<slug>.css`. */
export const components = [
  { slug: 'button', name: 'Button', category: 'Actions', description: 'Trigger an action, with sizes, variants, icons and a busy state.' },
  { slug: 'badge', name: 'Badge', category: 'Feedback', description: 'Label a status or count beside content or on the corner of an icon.' },
  { slug: 'spinner', name: 'Spinner', category: 'Feedback', description: 'Show that work is in progress without a known duration.' },
  { slug: 'switch', name: 'Switch', category: 'Forms', description: 'Turn a setting on or off immediately with a native checkbox.' },
  { slug: 'select', name: 'Select', category: 'Forms', description: 'Choose one option from a native select with a consistent indicator.' },
  { slug: 'segmented', name: 'Segmented control', category: 'Forms', description: 'Pick one of a few mutually exclusive options from native radios.' },
  { slug: 'tabs', name: 'Tabs', category: 'Navigation', description: 'Move between related views or pages with a current indicator.' },
] as const
