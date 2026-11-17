import { fileURLToPath } from 'node:url'
import { defineConfig } from 'astro/config'
import masterSite from '@master/internal-site/astro'
import { generateStaticSocialImages } from '@master/internal-site/build/static-social.ts'
import { locales } from '@master/internal-site/common/locales.js'
import site from './site.config'
import { stabilizeIslandIdsIn } from './scripts/stable-island-ids.mjs'
import { sharePreviewAssetsIn } from './scripts/preview-assets.mjs'
import { addSpeculationRulesIn } from './scripts/speculation-rules.mjs'
import { writeSeoIn } from './scripts/seo.mjs'

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
    // Draw each page's social card into `/og/` in place of the shell's `/api/og-image` link, which a static site cannot
    // answer; then complete the Open Graph tags and write the sitemap and the robots.txt that names it.
    { name: 'ui-seo', hooks: { 'astro:build:done': async ({ dir }) => {
      const outDir = fileURLToPath(dir)
      await generateStaticSocialImages({
        siteDir: fileURLToPath(new URL('.', import.meta.url)),
        outDir,
        origin: site.origin,
        logo: new URL('./assets/brand/logo/master-ui/master-ui-horizontal-on-light.png', import.meta.url),
        locales
      })
      await writeSeoIn(outDir, site.origin)
    } } },
    // The delivered site is rebuilt by Cloudflare Pages in another directory and must match the verified build byte for byte.
    { name: 'ui-stable-island-ids', hooks: { 'astro:build:done': ({ dir }) => stabilizeIslandIdsIn(fileURLToPath(dir)) } }
  ]
})
