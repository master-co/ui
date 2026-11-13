# Local translations

English is the source language. The site is published in English (unprefixed),
Taiwan Traditional Chinese (`/tw`), Japanese (`/ja`), Korean (`/ko`) and
Simplified Chinese (`/cn`); the locale list, prefixes and HTML language tags come
from `@master/internal-site/common/locales.js`.

## What is translated

- **Articles.** A translated page is a complete sibling of its source:
  `content.mdx` and `content.{tw,ja,ko,cn}.mdx`. Its localized `title` and
  `description` are frontmatter; `metadata.ts` keeps the English identity,
  category, order and dates.
- **Interface copy.** Every string the pages pass to `t()` is a key of
  `i18n/<locale>.json`. `i18n/resources.ts` lists the keys: literal `t('…')`
  calls in the site's source, the prose properties of the data modules named in
  `dataModules`, the guide's categories and the few keys only a dynamic `t(value)`
  reaches, which are listed by hand in `en.json`. Shell controls come from
  `@master/internal-site/common/translations.js` and are not repeated here.
- **Sections.** The guide and the home page are translated. `components`,
  `blocks` and `pages` are still English only (`i18n/sections.ts`): they have no
  translated routes, search entries or Markdown, and links to them from a
  translated page stay unprefixed. Translate a whole section, then remove it from
  that list and add its root to `localizablePathnameRoots` in `site.config.ts`.

## How to translate

Use `@master/internal-site/common/terminology.json` as the shared vocabulary of
the Master sites. Translate complete ideas and keep every prerequisite, default,
restriction and degree of certainty. Japanese uses consistent polite technical
prose (です・ます); Korean uses consistent formal technical prose (합니다).
Traditional Chinese uses Taiwan vocabulary (程式碼、檔案、預設、元件、樣式表).
Simplified Chinese is edited on its own, not converted from Traditional Chinese.

Keep as written: code fences and inline code, code comments, imports, component
and prop names, class names, tokens, commands, URLs, the markup in `html={…}`
samples, the agent prompt of `DocumentPrompt`, file names and the library's own
names (Master UI, moonstone, obsidian, Paper). Keep every heading's explicit ID
(`\{#stable-id\}`) identical and in the same order; the gate fails an edition
whose IDs differ. Keep links as they are (`/guide/theming#scope`); the site
points a guide link at the reader's language by itself.

Translate the prose, table cells, list items, and the reader-facing props:
`title` and `caption` of previews and figures, the words inside a `GuideFigure`,
and `alt` text. A preview `title` that is a file name stays as it is. The
diagrams themselves stay shared in English.

## Reviews

Every published edition needs an independent review recorded in
`i18n/reviews.json`: a reviewer other than the translator compares the whole
edition with its source and reads it rendered, then records it:

```sh
node --import tsx scripts/i18n.ts review tw guide/theme/content.mdx ui/product
```

A review records the hashes of the source (with the files it imports and its
`metadata.ts`) and of the translation. Changing either makes the edition stale
until it is reviewed again; `node --import tsx scripts/i18n.ts audit` lists what
the production gate would refuse, and `astro build` refuses it. Preparation and
builds never record a review.
