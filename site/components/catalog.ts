/** The published components, in reading order. Each slug matches `content/components/<slug>` and `@master/ui/components/<slug>.css`. */
export const components = [
  { slug: 'surface', name: 'Surface', category: 'Materials', description: 'Trays, sheets and wells: the material ladder every component is built on.' },
  { slug: 'button', name: 'Button', category: 'Actions', description: 'A raised control that lifts on hover and sinks when pressed.' },
  { slug: 'input', name: 'Input', category: 'Forms', description: 'Text fields cut into the surface, with labels, hints and errors.' },
  { slug: 'select', name: 'Select', category: 'Forms', description: 'A native select drawn as a well, or raised for toolbars.' },
  { slug: 'checkbox', name: 'Checkbox and radio', category: 'Forms', description: 'Small native wells that fill with ink when checked.' },
  { slug: 'switch', name: 'Switch', category: 'Forms', description: 'A pearl thumb that slides onto ink for settings that apply at once.' },
  { slug: 'segmented', name: 'Segmented control', category: 'Forms', description: 'A few options in one well; the current one rises as a sheet.' },
  { slug: 'tabs', name: 'Tabs', category: 'Navigation', description: 'Words on one hairline, the current one underlined in ink.' },
  { slug: 'badge', name: 'Badge', category: 'Display', description: 'A small chip for a status, a category or a count.' },
  { slug: 'icon', name: 'Icon', category: 'Display', description: 'Size inline icons through the component that holds them.' },
  { slug: 'kbd', name: 'Kbd', category: 'Display', description: 'A keycap for shortcuts in text and menus.' },
  { slug: 'spinner', name: 'Spinner', category: 'Display', description: 'A fine ring for work of unknown duration.' },
] as const
