# Anatomy of a block

Blocks stack on a page, so they share a frame, a measure and a way of opening. A block that follows these lines up with its neighbors without a wrapper around them.

## The frame

A marketing block is a `<section>` that is a size container and carries the block's own room:

```html
<section class="container-inline px-lg py-4xl" aria-labelledby="pricing-title">
  <div class="flex flex-col gap-2xl max-w(1040) mx-auto">
    …
  </div>
</section>
```

| Part | Written as | Why |
| --- | --- | --- |
| The block | `container-inline px-lg py-4xl` | The side gutter and the room over and under it belong to the block, so two blocks in a row keep their distance by themselves. `py-3xl` is for a block that leans on the one before it, such as a logo cloud under a hero |
| The measure | `max-w(…) mx-auto` on one inner element | The block may be full bleed; its content never is |
| The name | `aria-labelledby` pointing at the block's heading, or `aria-label` when it has none | A `<section>` without a name is not a landmark |

Measures in use. Pick one of these before inventing another:

| Width | For |
| --- | --- |
| `max-w(1040)` | A grid of several things: features, plans, quotations, a footer's columns |
| `max-w(960)` | A split of two columns, where 1040 would leave the text too wide |
| `max-w(760)` | A centered hero |
| `max-w(720)` | One column of reading: an FAQ, a single quotation, a quiet call to action |

A footer and a header are `<footer>` and `<header>` with the same `container-inline px-lg`; a footer is parted from the page with a hairline, `bt(1) bt-solid b-line-hair`.

An application block (a page header, a table view, an empty state) stands inside a page's main region, which already has its padding: it is a `container-inline` with no padding of its own.

## The heading group

A block opens the same way wherever it is: a quiet word, the title, one sentence.

```html
<header class="flex flex-col items-center gap-sm text-center">
  <p class="eyebrow">Pricing</p>
  <h2 class="heading heading-2xl" id="pricing-title">Free to start. Fair when you grow.</h2>
  <p class="lead max-w(480)">Every plan deploys the same way. You pay for the team, not for the traffic.</p>
</header>
```

- The eyebrow is a `<p>`, never a heading: a screen reader's list of headings starts with the title.
- A block's title is an `<h2>` at `heading-2xl`. Only a hero has the page's `<h1>`, at `heading-display`. What stands inside the block steps down: `<h3>` at `heading-sm` for a feature, a plan or a column.
- The lead keeps a measure of its own, narrower than the title's, so its lines stay short.
- A group set at the start instead of the middle drops `items-center text-center`. Nothing else changes.

## Which component does the job

Look here before writing a row of utilities. The contract's `use` and `instead` (`packages/ui/components/<name>.json`) settle a doubt.

| The piece | Component |
| --- | --- |
| A surface to stand things on | `sheet` (raised with `sheet-raised`, the one that matters at the default lift), or `card` when it has a header, media and a footer in a card's order. A plan is a `sheet`: its button stands before its list |
| The one surface that asks for something | `sheet sheet-inverse` |
| A title, an eyebrow, a lead | `heading`, `eyebrow`, `lead` |
| The thing to do | `btn`; `btn-brand` or `btn-primary` for the one that matters, once |
| A price | `price` with `price-currency`, `price-amount`, `price-period`, `price-was` |
| What a plan includes, points of an argument, a row of short reassurances | `bullets`, with `bullets-check` and `bullets-off`; `flex flex-wrap` on it sets the items in a row |
| A figure that makes the case | `stat` |
| A quotation and who said it | `quote` with an `avatar` |
| A new thing, a status, a recommendation | `badge` |
| Questions and answers | `accordion` |
| Facts about one thing, in rows | `data-list`. A few facts in one row under a title are a `<dl>` laid out with utilities, each `<dt>` and `<dd>` in a `<div>` |
| Figures with a few words each | A `<dl>` with the label as `<dt>` first in the source and `flex-col-reverse` on the group to draw the figure over it |
| A picture, a screenshot | `figure`; `window` or `device` around a product shot |
| Names that pass by | `marquee` |
| A field with its button | `input-group`, or `input` and `btn` in a wrapping row |
| Navigation of a site | `navbar` in a header, `nav` in a sidebar, `breadcrumb`, `tabs` |
| The first link of a page | `skip` |
| Previous and next | `pager` |
| A table with its tools | `table`, `toolbar`, `pagination`, `chip` for filters |
| A table wider than its column | `scroll-area scroll-area-inline` around it, inside the sheet; `tabindex="0"`, a role and a name when nothing in the table takes focus |
| Nothing to show yet, or no match | `empty` |
| A view that failed to load | `alert alert-danger` with `role="alert"`, not `empty` |
| A menu on a button | `menu`; a drawer for a narrow screen is `dialog dialog-drawer` with a `dialog-close` button |
| A code to type | `otp`, with the preview's `behaviors` |
| A block that arrives as it scrolls in | `reveal` on the block or on its tiles, sparingly |

When nothing fits and the piece has a material, a state or a geometry of its own, it is a missing component: stop and add it with `$master-ui-components`.

## Marking the one that matters

A recommended plan, a featured quotation, the main action: mark it with depth, one word and at most one hue, never with a colored border.

- Depth: a `sheet` at its default lift among `sheet-raised` neighbors.
- A word: a `badge badge-ink`, which is text and so is read aloud.
- A hue: the page's one `btn-brand`.

## Icons

An icon in a block is an inline `<svg class="icon">` on the 24px grid at a 1.5 stroke, with `aria-hidden="true"` when words beside it say the same. Its size comes from the component that holds it. If the same SVG is pasted before every item of a list, the list wants `bullets`.

## Links and buttons

A thing that goes somewhere is `<a class="btn" href>`; a thing that does something is `<button>`. In a block's example an `href` is `#` or a fragment, since the destination is the reader's to fill in. A link that cannot be followed (Previous on the first page) has `aria-disabled="true"` and no `href`. A form's fields have labels, a lone field has an `aria-label`, and a field the form cannot do without is `required`.

The order of two actions follows the kind of block:

- In a marketing block the action you want comes first, where the eye lands: "Start deploying", then "Read the docs".
- In an application block the confirming action comes last, as in a form's actions and a dialog's footer: "Export", then "New deployment".

## Copy

- The product is Atlas, a deployment platform, in every block: one voice across the catalog, so a page assembled from several blocks reads as one page.
- Write what a real page would say. A title makes a claim, a lead supports it in one sentence, a button names what happens.
- Numbers agree with each other within a block and with the same fact in another: fourteen regions is fourteen everywhere.
- People are the catalog's own. Ada Lovelace is the person signed in: the account in a sidebar, the address on a sign-in card. Alan Turing, Grace Hopper and Katherine Johnson are customers, quoted with a role and a company. Portraits come from `site/public/demo/`; a portrait beside a name has `alt=""`, and a letter mark beside a name is `aria-hidden`.
- Facts in use: the workspace is Atlas Labs with 12 projects; Pro is $20 per member a month with 400 build minutes; plans are priced by the team, never by traffic, so nothing meters bandwidth.

## Measuring \{#measuring\}

A `PagePreview` reserves an authored height at each of three widths. To choose them, build the site, serve `site/out`, open the block's page and run this in the console. It switches each preview to Desktop, Tablet and Phone and prints the frame's size beside the document's:

```js
for (const tray of document.querySelectorAll('[data-page-preview]')) {
  const frame = tray.querySelector('iframe')
  const name = tray.dataset.componentPreview
  frame.loading = 'eager'
  frame.scrollIntoView({ block: 'center' })
  const sizes = document.querySelectorAll(`input[name="preview-size-${name}"]`)
  for (const [index, label] of ['desktop', 'tablet', 'phone'].entries()) {
    sizes[index].click()
    await new Promise(done => setTimeout(done, 900))
    const page = frame.contentDocument.documentElement
    console.log(name, label, `frame ${frame.clientWidth}x${frame.clientHeight}`, `document ${page.scrollWidth}x${page.scrollHeight}`)
  }
  sizes[0].click()
}
```

Read it this way:

- The document's height equal to the frame's: the block fits. Larger: it scrolls, so raise that width's height. A frame much taller than what the block needs leaves blank room: lower it.
- The document wider than the frame: something overflows sideways. That is a defect of the block, not of the preview. Find the element that does not wrap or shrink.
- A height is a multiple of 8 a few pixels above what was measured.
- Run it again with a coarse pointer (the browser's device emulation) and put any larger result in `touchHeight`.

A measurement proposes a height. Look at the result at each width before keeping it.
