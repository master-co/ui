import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import vue from '@vitejs/plugin-vue'

/** The playground compiles all three frameworks at once; each plugin takes only its own files. */
export default defineConfig({
  root: import.meta.dirname,
  plugins: [react({ include: /\.tsx$/ }), svelte({ configFile: false }), vue()],
  publicDir: '../../../../../site/public',
  // The adapters are named mount-<framework>: a file named `svelte.ts` here would be taken for the package.
  server: { port: 4320, strictPort: true, fs: { allow: ['../../../../..'] } },
})
