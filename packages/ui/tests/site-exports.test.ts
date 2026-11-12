import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { previewMarkdown } from '../../../site/utils/preview-markdown.ts'
import { anchorMarkdown } from '../../../site/utils/anchor-markdown.ts'
import { figureMarkdown } from '../../../site/utils/figure-markdown.ts'
import { promptMarkdown } from '../../../site/utils/prompt-markdown.ts'

const page = (slug: string) => readFileSync(new URL(`../../../site/content/${slug}/content.mdx`, import.meta.url), 'utf8')

test('portable figures keep the authored explanation, formatting and links', () => {
  const caption = '**A scoped token.** Descendants inherit `--radius-control`; [properties](/guide/customization#property) belong on the component.'
  const source = `Before\n\n<GuideFigure name="theming" title="Token scope and inheritance">\n\n${caption}\n\n</GuideFigure>\n\nAfter`
  const markdown = figureMarkdown(source)
  assert.ok(markdown.includes(caption))
  assert.ok(markdown.includes('**Token scope and inheritance**'))
  assert.ok(markdown.startsWith('Before'))
  assert.ok(markdown.endsWith('After'))
  assert.doesNotMatch(markdown, /<\/?GuideFigure/)
  for (const fence of ['```', '~~~~']) {
    const example = `${fence}mdx\n${source}\n${fence}`
    assert.equal(figureMarkdown(example), example)
  }
})

test('unsupported figure presentations fail instead of leaking JSX into Markdown', () => {
  assert.throws(() => figureMarkdown('<GuideFigure name="theming" />'), /standalone tags/)
  assert.throws(() => figureMarkdown('<GuideFigure name="theming">\nCaption'), /Unclosed/)
})

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
  const layout = previewMarkdown(page('components/auto-grid'))
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

test('portable guides preserve authored link targets independently of heading wording', () => {
  for (const slug of ['design', 'theming', 'customization', 'contracts']) {
    const source = page(`guide/${slug}`)
    const markdown = anchorMarkdown(previewMarkdown(source))
    for (const [, id] of source.matchAll(/^#+ .*? \\\{#([\w-]+)\\\}/gm)) {
      assert.ok(markdown.includes(`<a id="${id}"></a>`), `${slug} lost #${id}`)
    }
  }
})

test('heading examples inside fenced code are preserved literally', () => {
  const sample = '## Example \\{#example\\}'
  for (const fence of ['```', '~~~~']) {
    const source = `${fence}md\n${sample}\n${fence}\n\n${sample}`
    assert.equal(anchorMarkdown(source), `${fence}md\n${sample}\n${fence}\n\n<a id="example"></a>\n\n## Example`)
  }
})

// These identifiers are public links from the retired Design /master-ui chapter.
test('the UI design guide preserves the transferred chapter links in portable output', () => {
  const markdown = anchorMarkdown(page('guide/design'))
  for (const id of [
    'ownership', 'native-behavior-and-explicit-contracts', 'moonstone-and-obsidian',
    'choose-a-role-on-the-material-ladder', 'concentric-geometry-and-continuous-corners',
    'state-feedback-on-a-stable-control', 'paper-demonstrates-a-different-material',
    'customization-boundaries', 'components-layouts-and-blocks', 'guideline-to-implementation',
    'review-a-change-together',
  ]) assert.equal(markdown.split(`<a id="${id}"></a>`).length, 2, `Expected exactly one meaningful target for #${id}`)
  assert.doesNotMatch(markdown, /design\.master\.co\/master-ui|\]\(geometry\.md\)/)
})

test('the installation prompt keeps its exact text in portable output', () => {
  const source = page('guide/installation')
  const text = /<DocumentPrompt title="Set up Master UI" text=\{`([\s\S]*?)`\} \/>/.exec(source)![1]
  const markdown = promptMarkdown(source)
  assert.ok(markdown.includes(`**Set up Master UI**\n\n\`\`\`text\n${text}\n\`\`\``))
  assert.doesNotMatch(markdown, /<DocumentPrompt/)
  assert.equal(promptMarkdown('<DocumentPrompt title="T" text={`run \\`\\`\\`npm\\`\\`\\``} />'), '**T**\n\n````text\nrun ```npm```\n````')
  assert.throws(() => promptMarkdown('<DocumentPrompt title="T" text={`${x}`} />'), /static template literal/)
})
