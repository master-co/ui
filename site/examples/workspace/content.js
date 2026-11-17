/**
 * The document as Tiptap stores it: JSON, the data an application saves and loads. Nothing here is HTML, so
 * nothing a reader wrote is ever put into the page as markup.
 */
const text = (value, ...marks) => ({ type: 'text', text: value, ...(marks.length ? { marks: marks.map((type) => ({ type })) } : {}) })
const paragraph = (...content) => ({ type: 'paragraph', content: content.map((part) => typeof part === 'string' ? text(part) : part) })
const heading = (level, value) => ({ type: 'heading', attrs: { level }, content: [text(value)] })
const list = (type, ...items) => ({ type, content: items.map((item) => ({ type: 'listItem', content: [paragraph(item)] })) })

export const notes = {
  type: 'doc',
  content: [
    paragraph('Atlas now serves from ', text('eighteen regions', 'bold'), ', four more than last month. A request is answered by the region nearest the reader, and a deployment reaches all of them in under a minute.'),
    heading(2, 'What is new'),
    list('bulletList',
      'São Paulo, Mumbai, Seoul and Johannesburg join the network.',
      'A deployment is copied to every region at once, not one after another.',
      'The dashboard draws latency by region, so a slow one is easy to find.',
    ),
    paragraph('Nothing has to change in a project. The new regions are on for every plan, and the next deployment uses them.'),
    heading(2, 'Choosing regions'),
    paragraph('Most projects should serve from everywhere. A project whose data must stay in one place can name the regions it runs in, from its settings or in its configuration file.'),
    list('orderedList',
      'Open the project and choose Settings.',
      'Under Regions, turn off Serve from every region.',
      'Choose the regions to keep, then deploy.',
    ),
    { type: 'blockquote', content: [paragraph(text('A region that is turned off stops answering within a minute; requests go to the nearest one that is left.', 'italic'))] },
    heading(2, 'What it costs'),
    paragraph('Requests are counted the same in every region, and the price of a request has not changed. Traffic between regions, which a deployment causes once, is not billed.'),
    heading(3, 'On the free plan'),
    paragraph('Free projects serve from every region too. The monthly allowance is shared across them, as before.'),
    heading(2, 'Known limits'),
    list('bulletList',
      'Scheduled jobs still start from one region, the first in the project\'s list.',
      'Logs from the new regions arrive a few seconds later than the others.',
    ),
    paragraph('Both are being worked on, and the status page says where each stands.'),
  ],
}
