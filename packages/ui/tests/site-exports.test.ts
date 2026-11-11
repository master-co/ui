import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { previewMarkdown } from '../../../site/utils/preview-markdown.ts'

const page = (slug: string) => readFileSync(new URL(`../../../site/content/${slug}/content.mdx`, import.meta.url), 'utf8')

test('theming exports both previews from the same authored specimen', () => {
  const source = page('guide/theming')
  const specimen = /export const specimen = `([\s\S]*?)`/.exec(source)![1]
  const markdown = previewMarkdown(source)
  for (const title of ['Moonstone', 'Paper']) {
    assert.ok(markdown.includes(`**${title}**\n\n\`\`\`html\n${specimen}\n\`\`\``))
  }
  assert.doesNotMatch(markdown, /export const specimen|<ComponentPreview|html=\{specimen\}/)
})

test('portable previews retain their teaching captions before or after the markup prop', () => {
  const theme = previewMarkdown(page('guide/theme'))
  assert.ok(theme.includes('Toggle Theme to compare moonstone and obsidian. Both come from the same stylesheet.'))
  const layout = previewMarkdown(page('layouts/auto-grid'))
  assert.ok(layout.includes('Choose Tablet, then Phone: four columns become two, then one. No query was written.'))
})

test('markup attributes and self-closing elements cannot replace preview metadata or truncate its source', () => {
  const html = '<svg title="Inner"><path d="M0 0" /></svg><p>After the icon</p>'
  const source = '<PagePreview touchHeight={{ phone: 200 }} html={`' + html + '`} title="Outer" caption="Read the whole example." />'
  assert.equal(previewMarkdown(source), `**Outer**\n\n\`\`\`html\n${html}\n\`\`\`\n\nRead the whole example.`)
})

test('unsupported preview expressions fail instead of losing the example silently', () => {
  assert.throws(() => previewMarkdown('<ComponentPreview title="Missing" html={unknown} />'), /static html/)
  assert.throws(() => previewMarkdown('<ComponentPreview title="Dynamic" html={`<p>${value}</p>`} />'), /static html/)
})
