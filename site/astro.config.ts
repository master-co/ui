import { defineConfig } from 'astro/config'
import masterSite from '@master/internal-site/astro'
import site from './site.config'

Object.assign(process.env, {
  PUBLIC_PROJECT: 'Master UI',
  PUBLIC_URL: site.origin,
  PUBLIC_IMAGE_TRANSFORMATIONS: 'false'
})

export default defineConfig({
  outDir: './out',
  server: { port: 3300 },
  devToolbar: { enabled: false },
  integrations: [masterSite(site)]
})
