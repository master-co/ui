# Contracts

Every stylesheet in `packages/ui/components` and `packages/ui/layouts` has a contract beside it: `button.css` and `button.json`. The contract says what the stylesheet promises, in a form a program can read. It is the one source for the tests, the tables on the component page, `llms.txt`, the registry and the checker, so nothing about a class is written twice.

The schema is `packages/ui/contract.schema.json`. `packages/ui/tests/contracts.test.ts` keeps a contract and its stylesheet from drifting.

## What a contract holds

| Key | Holds |
| --- | --- |
| `name`, `title`, `tier`, `category`, `description` | The slug (the file name), what a reader calls it, `component` or `layout`, its group and one sentence on what it is |
| `use` | When to reach for it, in one or two sentences |
| `instead` | Neighbors that are the right choice in another situation: `{ "when": …, "use": "<contract name>" }` |
| `composes` | Other contracts whose classes its markup uses, such as `input` and `listbox` for a combobox |
| `script` | `none`, `optional` or `required`; see below |
| `behavior` | The reference script in `packages/ui/behaviors/<behavior>.js` |
| `keyboard` | What the keys do, natively or once the behavior is attached |
| `platform` | Each platform feature used as an enhancement, with what a browser without it shows |
| `classes` | Every class the stylesheet defines, and no other |
| `states` | Each state the stylesheet draws and the attribute or pseudo-class that marks it |
| `properties` | The public custom properties; anything not listed is private and may change |
| `example` | The smallest correct markup |

## Classes

Each class has a `name`, a `kind` and a `description`.

- `root` stands by itself: `btn`, `dialog`, `btn-group`. A stylesheet may have several.
- `part` lives inside its root and names it in `of`: `dialog-header` of `dialog`. The checker reports a part outside its root. Add `"anywhere": true` for a part that may stand elsewhere.
- `modifier` goes on the same element as its base and names it in `of`: `btn-primary` of `btn`, `dialog-drawer-start` of `dialog`. A modifier of a part names the part.

Four optional keys turn a rule of the page into something the checker enforces. Add one only when the stylesheet or the platform really requires it: a wrong constraint is a false error in someone's project.

| Key | Meaning | Example |
| --- | --- | --- |
| `elements` | The class only works on these elements | `dialog` on `["dialog"]`, `switch` on `["input"]` |
| `attributes` | Attributes the element must carry: `true` for any value, a string for one value, an array for one of several | `switch`: `{ "type": "checkbox", "role": "switch" }` |
| `label` | The element needs an accessible name | `btn-square`, `combobox-toggle` |
| `exclusive` | A group key; two modifiers with the same key do not share an element | `btn-sm` and `btn-lg` are both `"size"` |

## Script

- `none`: every state works without script.
- `optional`: a script adds a convenience (arrow keys in a menu, an indeterminate checkbox) and the page works without it.
- `required`: the pattern has no native element, so a script moves its attributes. Name the reference script in `behavior`; the file must exist.

## States and properties

A state names the class that carries the mark (`on`), a short `name` and the `mark` as written in markup or CSS: `aria-pressed="true"`, `disabled`, `open`, `:user-invalid`. The test checks that the stylesheet reads it.

A property is public API. List the ones the component page documents and the ones a page is meant to set (`--value`, `--swatch`). Give `default` when the stylesheet declares one; the test compares it with the declaration, so copy it from the stylesheet, not from an older page.

## The example

The example is the smallest markup that is correct, with real words in it. The test runs the checker over it and expects no diagnostics, and every class in it must be a contract class or a preset utility. Keep utilities out unless the example cannot stand without one.

## Writing one

1. Read the stylesheet, then its page in `site/content/components/<slug>/content.mdx` (or, for the frames `page` and `shell`, `site/content/pages/<page|app-shell>/content.mdx`) and its entry in `site/components/catalog.ts`.
2. Write `<slug>.json` with `"$schema": "../contract.schema.json"`. Take `title`, `category` and `description` from the catalog.
3. Run `node --import tsx --test --test-name-pattern="<slug>" tests/contracts.test.ts` in `packages/ui`.
4. Where the page and the stylesheet disagree, the stylesheet is right; fix the page.
