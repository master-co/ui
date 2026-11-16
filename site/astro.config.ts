import { fileURLToPath } from 'node:url'
import { defineConfig } from 'astro/config'
import masterSite from '@master/internal-site/astro'
import site from './site.config'
import { stabilizeIslandIdsIn } from './scripts/stable-island-ids.mjs'
import { sharePreviewAssetsIn } from './scripts/preview-assets.mjs'
import { addSpeculationRulesIn } from './scripts/speculation-rules.mjs'

const outDir = './out'

Object.assign(process.env, {
  PUBLIC_PROJECT: 'Master UI',
  PUBLIC_URL: site.origin,
  PUBLIC_IMAGE_TRANSFORMATIONS: 'false'
})

export default defineConfig({
  outDir,
  server: { port: 3300 },
  devToolbar: { enabled: false },
  integrations: [
    masterSite(site),
    {
      name: 'ui-preview-output',
      hooks: {
        'astro:config:setup': ({ config, updateConfig }) => {
          const id = 'virtual:master-ui/preview-output'
          updateConfig({ vite: { plugins: [{
            name: 'ui-preview-output',
            resolveId: source => source === id ? '\0' + id : undefined,
            load: source => source === '\0' + id ? `export default ${JSON.stringify(config.outDir.href)}` : undefined
          }] } })
        }
      }
    },
    // Deliver the previews' shared stylesheet and large scripts as files, once, instead of inside every preview.
    { name: 'ui-preview-assets', hooks: { 'astro:build:done': ({ dir }) => sharePreviewAssetsIn(fileURLToPath(dir)) } },
    { name: 'ui-speculation-rules', hooks: { 'astro:build:done': ({ dir }) => addSpeculationRulesIn(fileURLToPath(dir)) } },
    // The delivered site is rebuilt by Cloudflare Pages in another directory and must match the verified build byte for byte.
    { name: 'ui-stable-island-ids', hooks: { 'astro:build:done': ({ dir }) => stabilizeIslandIdsIn(fileURLToPath(dir)) } }
  ]
})
