import { fileURLToPath } from 'node:url'
import { defineConfig } from 'astro/config'
import masterSite from '@master/internal-site/astro'
import site from './site.config'
import { stabilizeIslandIdsIn } from './scripts/stable-island-ids.mjs'

Object.assign(process.env, {
  PUBLIC_PROJECT: 'Master UI',
  PUBLIC_URL: site.origin,
  PUBLIC_IMAGE_TRANSFORMATIONS: 'false'
})

export default defineConfig({
  outDir: './out',
  server: { port: 3300 },
  devToolbar: { enabled: false },
  integrations: [
    masterSite(site),
    // The delivered site is rebuilt by Cloudflare Pages in another directory and must match the verified build byte for byte.
    { name: 'ui-stable-island-ids', hooks: { 'astro:build:done': ({ dir }) => stabilizeIslandIdsIn(fileURLToPath(dir)) } }
  ]
})
