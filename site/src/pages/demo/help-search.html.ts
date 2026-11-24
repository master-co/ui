import type { APIRoute } from 'astro'
import { example, exampleHtml, exampleScriptUrl } from '../../../utils/examples'
import { previewDocument, previewHead } from '../../../utils/preview'
import { uiSource } from '../../../utils/ui-source'

/** A GET results URL uses the same markup, script and utilities as the copyable example. */
export const GET: APIRoute = () => {
  const id = 'help-search'
  const { title, preview } = example(id)
  // The copied section sits under a page heading. Here it is the page itself.
  const content = exampleHtml(id).replace(/<(\/?)(h[23])\b/g, (_, slash, level) => `<${slash}${level === 'h2' ? 'h1' : 'h2'}`)
  const html = `<main>${content}</main><script type="module" src="${exampleScriptUrl(id)}"></script>`
  const section = { page: 'blocks', id, title, html: [html], css: uiSource(), classes: [], classLists: [], highlighted: [] }
  const document = previewDocument(section, { html, bodyClass: preview.bodyClass, head: `<title>Guide search · Master UI</title>${previewHead}`, caption: '' })
  return new Response(document, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
