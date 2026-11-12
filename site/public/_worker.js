// This retired registry item must not fall through to a stale Pages asset.
// All current content and the nine valid registry redirects remain static.
export default {
    fetch(request, env) {
        if (new URL(request.url).pathname !== '/r/layout-arrangements.json') {
            return env.ASSETS.fetch(request)
        }
        return new Response(request.method === 'HEAD' ? null : JSON.stringify({
            error: 'Gone',
            message: 'The layout-arrangements registry item has been removed.'
        }), {
            status: 410,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-store',
                'Access-Control-Allow-Origin': '*',
                'X-Robots-Tag': 'noindex',
                'X-Content-Type-Options': 'nosniff'
            }
        })
    }
}
