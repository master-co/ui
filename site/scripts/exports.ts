/**
 * Write what a program reads from the site, beside what a person reads:
 *
 *   /llms.txt                         the index: how to use the library, and a link to every page as Markdown
 *   /<section>/<slug>.md              each page as Markdown; a component's page is written from its contract
 *   /contracts.json, /theme.json      the contracts and the tokens, as data
 *   /contract.schema.json             the schema every contract follows
 *   /standalone.css, /themes/*.css    the library compiled to plain CSS
 *   /r/registry.json, /r/<name>.json  a registry in the shadcn format: source to copy into a project and own
 *
 * Everything here is generated from `packages/ui` and `content`; none of it is written by hand.
 */
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { blocks, components, layouts } from '../components/catalog.ts'

const site = fileURLToPath(new URL('../', import.meta.url))
const ui = join(site, '../packages/ui')
const out = join(site, 'public')
const origin = 'https://ui.master.co'
const read = (file: string) => readFileSync(file, 'utf8')
const write = (file: string, content: string) => {
  mkdirSync(dirname(join(out, file)), { recursive: true })
  writeFileSync(join(out, file), content)
}

/** Build the package first: the compiled CSS and the collected contracts are its outputs, not ours. */
execFileSync(process.execPath, ['--import', 'tsx', join(ui, 'scripts/build.ts')], { cwd: ui, stdio: 'ignore' })
const { contracts } = JSON.parse(read(join(ui, 'dist/contracts.json'))) as { contracts: any[] }
const contractOf = new Map(contracts.map(contract => [contract.name, contract]))

for (const generated of ['r', 'themes']) rmSync(join(out, generated), { recursive: true, force: true })
for (const section of ['guide', 'components', 'layouts', 'blocks']) {
  if (existsSync(join(out, section))) for (const file of readdirSync(join(out, section))) if (file.endsWith('.md')) rmSync(join(out, section, file))
}
cpSync(join(ui, 'dist/contracts.json'), join(out, 'contracts.json'))
cpSync(join(ui, 'dist/theme.json'), join(out, 'theme.json'))
cpSync(join(ui, 'dist/standalone.css'), join(out, 'standalone.css'))
cpSync(join(ui, 'dist/base.css'), join(out, 'base.css'))
cpSync(join(ui, 'dist/themes'), join(out, 'themes'), { recursive: true })
cpSync(join(ui, 'contract.schema.json'), join(out, 'contract.schema.json'))

/* ---------------------------------------------------------------- Markdown */

const row = (cells: string[]) => `| ${cells.map(cell => cell.replaceAll('|', '\\|').replaceAll('\n', ' ')).join(' | ')} |`
const table = (head: string[], rows: string[][]) => [row(head), row(head.map(() => '---')), ...rows.map(row)].join('\n')
const code = (text: string) => `\`${text}\``
const owners = (entry: any): string[] => entry.of === undefined ? [] : Array.isArray(entry.of) ? entry.of : [entry.of]

/** A contract as a page: everything an agent needs to write the markup, in the order it needs it. */
function contractMarkdown(contract: any) {
  const constraints = (entry: any) => [
    entry.kind === 'root' ? 'root' : `${entry.kind} of ${owners(entry).map(code).join(' or ')}`,
    entry.elements && `on ${entry.elements.map((tag: string) => code(`<${tag}>`)).join(' or ')}`,
    entry.attributes && `needs ${Object.entries(entry.attributes).map(([name, value]) => code(value === true ? name : `${name}="${Array.isArray(value) ? value.join('|') : value}"`)).join(', ')}`,
    entry.label && 'needs an accessible name',
    entry.exclusive && `one ${entry.exclusive} at a time`,
  ].filter(Boolean).join('; ')
  const directory = contract.tier === 'layout' ? 'layouts' : 'components'
  return [
    `# ${contract.title}`,
    contract.description,
    `**Use it for:** ${contract.use}`,
    contract.instead?.length && `**Use something else when:**\n\n${contract.instead.map((item: any) => `- ${item.when}: use [${item.use}](${origin}/${contractOf.get(item.use)?.tier === 'layout' ? 'layouts' : 'components'}/${item.use}.md).`).join('\n')}`,
    `## Markup\n\n\`\`\`html\n${contract.example}\n\`\`\``,
    `## Classes\n\n${table(['Class', 'Where it goes', 'What it is'], contract.classes.map((entry: any) => [code(entry.name), constraints(entry), entry.description]))}`,
    contract.states?.length && `## States\n\nMark a state with the attribute; the stylesheet draws it. Never add a class for a state.\n\n${table(['State', 'On', 'Mark it with', 'Notes'], contract.states.map((state: any) => [state.name, code(state.on), code(state.mark), state.description ?? '']))}`,
    contract.properties?.length && `## Custom properties\n\nThese are the public ones. A property with a default is declared on the class itself, so set it on that element: a class of your own beside it, a \`style\` attribute, or a rule such as \`.toolbar .btn { --btn-height: 2rem }\` that sets nothing else.\n\n${table(['Property', 'On', 'Default', 'What it sets'], contract.properties.map((property: any) => [code(property.name), property.on ? code(property.on) : '', property.default ? code(property.default) : '', property.description]))}`,
    `## Script\n\n${contract.script === 'none' ? 'None. Every state works without script.' : contract.script === 'optional' ? 'Optional. The component works without script; a script adds a convenience.' : 'Required. The pattern has no native element, so a script moves its attributes.'}${contract.behavior ? ` The reference script is \`@master/ui/behaviors/${contract.behavior}.js\`:\n\n\`\`\`js\nimport { ${contract.behavior.replace(/-(\w)/g, (_: string, letter: string) => letter.toUpperCase())} } from '@master/ui/behaviors/${contract.behavior}.js'\n\`\`\`` : ''}`,
    contract.keyboard?.length && `## Keyboard\n\n${table(['Keys', 'Action'], contract.keyboard.map((item: any) => [item.keys, item.action]))}`,
    contract.platform?.length && `## Platform\n\n${table(['Feature', 'Without it'], contract.platform.map((item: any) => [item.feature, item.fallback]))}`,
    contract.composes?.length && `## Used with\n\n${contract.composes.map((name: string) => `- [${name}](${origin}/${contractOf.get(name)?.tier === 'layout' ? 'layouts' : 'components'}/${name}.md)`).join('\n')}`,
    `## Install\n\n\`\`\`css\n@import '@master/ui/theme.css';\n${[...(contract.composes ?? []), contract.name].map((name: string) => `@import '@master/ui/${contractOf.get(name)?.tier === 'layout' ? 'layouts' : 'components'}/${name}.css';`).join('\n')}\n\`\`\`\n\nTheme tokens it reads: ${contract.tokens.length ? contract.tokens.map(code).join(', ') : 'none'}.\n\nHuman page: ${origin}/${directory === 'layouts' ? `layouts/${contract.name === 'shell' ? 'app-shell' : contract.name}` : `components/${contract.name}`}`,
  ].filter(Boolean).join('\n\n') + '\n'
}

/** An MDX page as Markdown: previews become fenced markup, components that only draw are dropped. */
function mdxMarkdown(source: string, title: string, description: string) {
  const body = source
    .replace(/^import .*$/gm, '')
    .replace(/export const (\w+) = `([\s\S]*?)`\n/g, '')
    .replace(/<(?:ComponentPreview|PagePreview)\b[^>]*?title="([^"]*)"[\s\S]*?html=\{`([\s\S]*?)`\}[\s\S]*?\/>/g, (_, name, html) => `**${name}**\n\n\`\`\`html\n${html}\n\`\`\``)
    .replace(/<(?:ComponentPreview|PagePreview)\b[\s\S]*?\/>/g, '')
    .replace(/<ComponentSource name="([^"]+)"(?: directory="([^"]+)")? \/>/g, (_, name, directory = 'components') => `\`\`\`css\n${read(join(ui, directory, `${name}.css`)).trim()}\n\`\`\``)
    .replace(/<ComponentLinks slugs=\{\[([^\]]*)\]\}(?: kind="(\w+)")? \/>/g, (_, slugs, kind = 'components') => slugs.split(',').map((slug: string) => slug.trim().replace(/['"]/g, '')).filter(Boolean).map((slug: string) => `- [${slug}](${origin}/${kind}/${slug}.md)`).join('\n'))
    .replace(/<Contract\w* [^>]*\/>/g, '')
    .replace(/ \\\{#[\w-]+\\\}/g, '')
    .replace(/\]\(\/(guide|components|layouts|blocks)\/([\w-]+)(#[\w-]+)?\)/g, (_, section, slug, hash = '') => `](${origin}/${section}/${slug}.md${hash})`)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return `# ${title}\n\n${description}\n\n${body}\n`
}

const metadataOf = (file: string) => {
  const source = read(file)
  const title = /subject: '([^']+)'/.exec(source)?.[1] ?? /title: (?:\{ absolute: )?'([^']+)'/.exec(source)?.[1] ?? ''
  return { title, description: /description: '((?:[^'\\]|\\.)*)'/.exec(source)?.[1].replace(/\\'/g, '\'') ?? '', order: Number(/order: (\d+)/.exec(source)?.[1] ?? 99), category: /category: '([^']+)'/.exec(source)?.[1] ?? '' }
}

const pages: Record<string, { slug: string, title: string, description: string }[]> = { guide: [], components: [], layouts: [], blocks: [] }

for (const slug of readdirSync(join(site, 'content/guide'))) {
  const directory = join(site, 'content/guide', slug)
  if (!existsSync(join(directory, 'content.mdx'))) continue
  const metadata = metadataOf(join(directory, 'metadata.ts'))
  pages.guide.push({ slug, ...metadata })
  write(`guide/${slug}.md`, mdxMarkdown(read(join(directory, 'content.mdx')), metadata.title, metadata.description))
}
const categoryRank = ['Getting started', 'Customizing', 'Building', 'Reference']
pages.guide.sort((a: any, b: any) => categoryRank.indexOf(a.category) - categoryRank.indexOf(b.category) || a.order - b.order)

for (const item of components) {
  pages.components.push({ slug: item.slug, title: item.name, description: item.description })
  write(`components/${item.slug}.md`, contractMarkdown(contractOf.get(item.slug)))
}
for (const [kind, list] of [['layouts', layouts], ['blocks', blocks]] as const) {
  for (const item of list) {
    const source = read(join(site, 'content', kind, item.slug, 'content.mdx'))
    const contract = kind === 'layouts' ? contractOf.get(item.slug === 'app-shell' ? 'shell' : item.slug) : undefined
    pages[kind].push({ slug: item.slug, title: item.name, description: item.description })
    write(`${kind}/${item.slug}.md`, mdxMarkdown(source, item.name, item.description) + (contract ? `\n---\n\n${contractMarkdown(contract)}` : ''))
  }
}

const links = (section: string) => pages[section].map(page => `- [${page.title}](${origin}/${section}/${page.slug}.md): ${page.description}`).join('\n')
write('llms.txt', `# Master UI

> Native HTML and CSS interface components for Master CSS, with a contract for each: the classes, where they go, the states the stylesheet draws, the public custom properties and the smallest correct markup. Layouts and blocks are markup to copy.

Rules for writing Master UI markup:

- A component is a class on a native element: \`<button class="btn btn-primary">\`, \`<dialog class="dialog">\`, \`<input type="checkbox" role="switch" class="switch">\`. Use the element the contract names.
- A modifier goes with its base on the same element (\`btn btn-sm\`, never \`btn-sm\` alone). A part goes inside its root (\`dialog-title\` inside \`dialog\`).
- Mark a state with the native or ARIA attribute the contract lists (\`disabled\`, \`aria-pressed="true"\`, \`aria-selected="true"\`, \`open\`). Never add a class for a state, and never write a class that is not in a contract: there is no \`btn-secondary\` or \`btn-outline\`.
- Lay out with Master CSS utilities in the markup (\`flex gap-md p-lg\`). Do not write CSS for a component's face, edge or shadow; set a theme token or a public custom property instead.
- Overlays use the platform: \`<dialog>\` with \`command="show-modal"\` and \`commandfor\`, the \`popover\` attribute with \`popovertarget\`. Do not add a positioning or focus-trapping script.
- A pattern whose contract says \`"script": "required"\` needs its reference script from \`@master/ui/behaviors\`.
- Check the result: \`npx master-ui check\` reports markup that breaks a contract.
- To change how something looks, take the lowest step that works: a utility on the element, a theme token, a public custom property, a theme file, and only then own the component's source (\`npx master-ui own <name>\`). See the customization guide.

Data: [every contract](${origin}/contracts.json), [the contract schema](${origin}/contract.schema.json), [the theme's tokens](${origin}/theme.json), [the registry](${origin}/r/registry.json), [the library as plain CSS](${origin}/standalone.css).

## Guide

${links('guide')}

## Components

${links('components')}

## Layouts

${links('layouts')}

## Blocks

${links('blocks')}
`)

/* ---------------------------------------------------------------- Registry */

/**
 * The registry follows the shadcn registry-item schema, so its CLI and MCP server can read it, and uses only
 * the universal item type with explicit targets, so nothing in it assumes React or Tailwind.
 * Source is copied to `ui/` in the project; imports of the theme and of composed components stay on the package
 * until the project owns those too.
 */
const schema = 'https://ui.shadcn.com/schema/registry-item.json'
const item = (name: string) => `${origin}/r/${name}.json`
const file = (target: string, content: string) => ({ path: target, type: 'registry:file', target: `~/${target}`, content })
const items: any[] = []

items.push({
  $schema: schema, name: 'theme', type: 'registry:item', title: 'Theme', description: 'Moonstone and obsidian: the tokens and the mixins every Master UI stylesheet reads.',
  dependencies: ['@master/css'], files: [file('ui/theme.css', read(join(ui, 'theme.css')))], categories: ['Theme'],
  docs: 'Import ui/theme.css after @master/css and before any component.',
})
for (const name of readdirSync(join(ui, 'themes')).filter(name => name.endsWith('.css')).map(name => name.replace(/\.css$/, ''))) {
  items.push({
    $schema: schema, name: `theme-${name}`, type: 'registry:item', title: `${name[0].toUpperCase()}${name.slice(1)} theme`, description: `The ${name} theme: a starting point for a theme of your own.`,
    dependencies: ['@master/css'], registryDependencies: [item('theme')], files: [file(`ui/themes/${name}.css`, read(join(ui, 'themes', `${name}.css`)))], categories: ['Theme'],
    docs: `Import ui/themes/${name}.css after the library.`,
  })
}
for (const contract of contracts) {
  const directory = contract.tier === 'layout' ? 'layouts' : 'components'
  const { stylesheet, tokens, mixins, ...published } = contract
  const files = [
    file(`ui/${contract.name}.css`, read(join(ui, stylesheet))),
    file(`ui/${contract.name}.json`, `${JSON.stringify({ $schema: `${origin}/contract.schema.json`, ...published }, null, 2)}\n`),
  ]
  if (contract.behavior) {
    const pending = [`${contract.behavior}.js`]
    const taken = new Set<string>()
    while (pending.length) {
      const name = pending.pop()!
      if (taken.has(name)) continue
      taken.add(name)
      const source = read(join(ui, 'behaviors', name))
      files.push(file(`ui/${name}`, source))
      for (const match of source.matchAll(/from\s+['"]\.\/([\w-]+\.js)['"]/g)) pending.push(match[1])
    }
  }
  items.push({
    $schema: schema, name: contract.name, type: 'registry:item', title: contract.title, description: contract.description,
    dependencies: ['@master/css'], registryDependencies: [item('theme'), ...(contract.composes ?? []).map(item)], files, categories: [contract.category],
    docs: `Import ui/${contract.name}.css after ui/theme.css. Its contract is ui/${contract.name}.json; markup: ${origin}/${directory}/${contract.name}.md`,
    meta: { tier: contract.tier, script: contract.script, classes: contract.classes.map((entry: any) => entry.name), tokens, mixins },
  })
}
/** A block or a page layout is its first preview: markup to paste, written with components and utilities. */
for (const [kind, list] of [['layouts', layouts], ['blocks', blocks]] as const) {
  for (const entry of list) {
    const source = read(join(site, 'content', kind, entry.slug, 'content.mdx'))
    const markup = /<PagePreview\b[\s\S]*?html=\{`([\s\S]*?)`\}/.exec(source)?.[1]
    if (!markup) continue
    const used = [...new Set([...markup.matchAll(/class="([^"]*)"/g)].flatMap(match => match[1].split(/\s+/)))]
    const needs = contracts.filter(contract => contract.classes.some((entry: any) => used.includes(entry.name))).map(contract => contract.name)
    const name = kind === 'blocks' ? `block-${entry.slug}` : `layout-${entry.slug}`
    items.push({
      $schema: schema, name, type: 'registry:item', title: entry.name, description: entry.description,
      dependencies: ['@master/css'], registryDependencies: needs.map(item), files: [file(`ui/${kind}/${entry.slug}.html`, `${markup}\n`)], categories: [entry.category],
      docs: `Markup to paste into a page or a component. It uses: ${needs.join(', ')}. Variants: ${origin}/${kind}/${entry.slug}.md`,
      meta: { tier: kind === 'blocks' ? 'block' : 'layout', components: needs },
    })
  }
}
for (const entry of items) write(`r/${entry.name}.json`, `${JSON.stringify(entry, null, 2)}\n`)
write('r/registry.json', `${JSON.stringify({
  $schema: 'https://ui.shadcn.com/schema/registry.json', name: 'master', homepage: origin,
  items: items.map(({ files, $schema, ...entry }) => ({ ...entry, files: files.map(({ content, ...rest }: any) => rest) })),
}, null, 2)}\n`)

console.log(`Generated llms.txt, ${Object.values(pages).flat().length} Markdown pages, contracts.json, theme.json, standalone.css and a registry of ${items.length} items`)
