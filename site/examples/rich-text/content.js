/**
 * Documents as TipTap stores them: JSON, the data an application saves and loads. Nothing here is HTML, so
 * nothing a reader wrote is ever put into the page as markup.
 */
export const notes = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Version 0.4' }] },
    { type: 'paragraph', content: [
      { type: 'text', text: 'Category colors arrive: ' },
      { type: 'text', marks: [{ type: 'bold' }], text: 'twenty-three palettes' },
      { type: 'text', text: ', each with a surface, a text, a line and a mark that keep their contrast in every theme.' },
    ] },
    { type: 'bulletList', content: [
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Badges and chips take a category.' }] }] },
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A schedule shows a month and an agenda.' }] }] },
    ] },
    { type: 'paragraph', content: [
      { type: 'text', text: 'Read the ' },
      { type: 'text', marks: [{ type: 'link', attrs: { href: 'https://ui.master.co/components/category' } }], text: 'category guide' },
      { type: 'text', text: ' before you choose one.' },
    ] },
  ],
}

export const other = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'From the server' }] },
    { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'italic' }], text: 'A component is a class on a native element.' }] }] },
    { type: 'orderedList', content: [
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Read the contract.' }] }] },
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Write the markup.' }] }] },
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Run the checker.' }] }] },
    ] },
  ],
}
