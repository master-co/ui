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
  `@master/internal-site/common/translations.js`. The review includes any local
  overrides of those controls because the site renders the override when present.
- **Contracts and figures.** Contract prose is keyed by its exact English text in
  `i18n/contracts.<locale>.json`. The site uses it for tables and portable
  Markdown. The published JSON keeps the original contract and its API
  identifiers. Labels in guide diagrams live in `i18n/figures.<locale>.json`.
  The introductory rules for `llms.txt` live in `i18n/llms/<locale>.md`.
- **Sections.** The home page, guide, components, blocks and pages have localized
  routes. Search and Markdown use the same article editions.

## How to translate

Use `@master/internal-site/common/terminology.json` as the shared vocabulary of
the Master sites. Translate complete ideas and keep every prerequisite, default,
restriction and degree of certainty. Japanese uses consistent polite technical
prose (です・ます); Korean uses consistent formal technical prose (합니다).
Traditional Chinese uses Taiwan vocabulary (程式碼、檔案、預設、元件、樣式表).
Simplified Chinese is edited on its own, not converted from Traditional Chinese.

Use the same component name in its page title, catalog entry, contract title,
and links that name the component. Translate terms by their role in the UI.
For example, a filter chip is a selectable label, a badge conveys status or
counts, and a pill describes a shape.

| English | Traditional Chinese | Simplified Chinese | Japanese | Korean |
| --- | --- | --- | --- | --- |
| Chip | 膠囊標籤 | 胶囊标签 | チップ | 칩 |
| Filter chip | 篩選標籤 | 筛选标签 | フィルターチップ | 필터 칩 |
| Badge | 徽章 | 徽标 | バッジ | 배지 |
| Popover | 彈出面板 | 弹出层 | ポップオーバー | 팝오버 |
| Tabs | 分頁標籤 | 标签页 | タブ | 탭 |
| Pagination | 分頁導覽 | 分页 | ページネーション | 페이지네이션 |
| Listbox | 清單方塊 | 列表框 | リストボックス | 목록 상자 |
| Tree | 樹狀檢視 | 树形视图 | ツリー | 트리 |

Keep as written: code fences and inline code, code comments, imports, component
and prop names, class names, tokens, commands, URLs, the markup in `html={…}`
samples, the agent prompt of `DocumentPrompt`, file names and the library's own
names (Master UI, moonstone, obsidian, Paper). Keep every heading's explicit ID
(`\{#stable-id\}`) identical and in the same order; the gate fails an edition
whose IDs differ. Keep links as they are (`/guide/theming#scope`); the site
points these links at the reader's language.

Translate the prose, table cells, list items, and the reader-facing props:
`title` and `caption` of previews and figures, the words inside a `GuideFigure`,
and `alt` text. A preview `title` that is a file name stays as it is.
Write homepage copy for the local audience with short headings and direct
language. Guide articles lead with the reader's task. Reference pages keep
class names and browser behavior precise and put conditions before actions.

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
