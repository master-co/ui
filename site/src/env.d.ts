/// <reference types="@master/internal-site/env" />
/// <reference types="astro/client" />
/// <reference types="@master/css/client" />

interface ImportMetaEnv {
  readonly PUBLIC_PROJECT: string
  readonly PUBLIC_URL: string
  readonly PUBLIC_IMAGE_TRANSFORMATIONS: 'true' | 'false'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.astro' {
  const Component: import('astro/runtime/server/index.js').AstroComponentFactory
  export default Component
}

declare module '*.svelte' {
  const Component: import('svelte').Component<any>
  export default Component
}

declare module '*.mdx' {
  const Content: import('astro/runtime/server/index.js').AstroComponentFactory
  export default Content
  export const toc: { id: string, title: string, level: number }[] | undefined
}
declare module 'virtual:master-ui/preview-output' {
  const output: string
  export default output
}
