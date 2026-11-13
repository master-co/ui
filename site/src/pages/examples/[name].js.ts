import type { APIRoute } from 'astro'
import { exampleBundle, examples } from '../../../utils/examples'

/** Each example's script, served from the site's own origin; only the preview that runs it loads it. */
export function getStaticPaths() {
  return Object.entries(examples).filter(([, entry]) => entry.script).map(([name]) => ({ params: { name } }))
}

export const GET: APIRoute = async ({ params }) => new Response(await exampleBundle(params.name!), {
  headers: { 'Content-Type': 'text/javascript; charset=utf-8' },
})
