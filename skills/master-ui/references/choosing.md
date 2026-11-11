# Choosing a component

Read the row that matches the job, then the contract of the component it names.

## Something appears over the page

| The job | Component |
| --- | --- |
| A task that must be finished or dismissed before going on: confirm, edit, sign in | `dialog` |
| A panel from an edge with a list, filters or details beside the page | `dialog` with `dialog-drawer` |
| A panel from the bottom on a phone | `dialog` with `dialog-sheet` |
| A small surface with fields or details, opened by a button, that light-dismisses | `popover` |
| A list of actions opened by a button, or at the pointer | `menu` |
| A short label for a control, on hover and focus | `tooltip` |
| Search across every command and page, opened by a shortcut | `command` |
| A picture opened large over the page | `lightbox` |

## A message

| The job | Component |
| --- | --- |
| The result of what the reader just did, which can leave by itself | `toast` |
| Something about this part of the page, which stays in the flow | `alert` |
| One line everyone on the page should see, across the top | `banner` |
| A view has nothing to show yet | `empty` |
| Where a link has landed, shown for a moment | `flash` |
| A field is wrong | `field-error` in `field`, with `aria-invalid` or `:user-invalid` on the control |

## Work is under way

| The job | Component |
| --- | --- |
| Unknown duration, small, beside a label | `spinner` |
| Content is on its way and its shape is known | `skeleton` |
| Words that say work is under way: thinking, generating | `shimmer` |
| Text that is still being written, with more coming | `caret` |
| A known share of the work is done | `progress` |
| A reading within a range, not a task: disk used, a score | `meter` |
| One reading on a dial, where the figure is the point | `gauge` |
| A region that already shows content and is fetching it again | `busy` on the region, with `aria-busy` |
| The steps an agent or a job is taking, each of which may open | `trace` |

## One or several of a set

| The job | Component |
| --- | --- |
| One of two to five options that stay visible, switching a view | `segmented` |
| One of several, each a word or two | `radio` in `check` |
| One of several, each needing a sentence | `choice` |
| One from a list of up to a screen | `select` |
| One from a long list, found by typing | `combobox` |
| Several independent yes or no | `checkbox` in `check` |
| A setting that applies at once | `switch` |
| Filters that toggle, or values that can be removed | `chip` |
| A color | `swatch` |
| A score out of a few | `rating` |
| A quick vote that shows how everyone answered | `poll` |
| A degree on a row of numbers with named ends: how likely, how satisfied | `scale` |
| A date or a range of dates | `calendar`, in a `popover` for a picker |

## A number or a text

| The job | Component |
| --- | --- |
| An approximate value on a scale | `slider` |
| Two ends of a range | `range` |
| A small exact count, stepped by one | `stepper` |
| Any other number, a text, a file | `input` |
| A value picked by turning, on touch: a time, a unit | `wheel` |
| A short code sent to the reader | `otp` |
| A code or an amount entered with keys drawn on the page, on touch | `keypad` |
| A message or a prompt with tools under it | `composer` |
| Files, dropped or chosen | `dropzone` |

## Getting around

| The job | Component |
| --- | --- |
| The bar at the top of a site or an app | `navbar` |
| The main destinations of a small-screen app, at the bottom | `tabbar` |
| Destinations down the side | `nav` |
| Things that contain things: files, a document outline | `tree` |
| Views of one subject, one at a time | `tabs` |
| Where this page is in the site | `breadcrumb` |
| The pages of a long list | `pagination` |
| The page before and the page after, at the foot of an article | `pager` |
| A short sequence and where the reader is in it | `steps` |
| The headings of this page | `toc` |
| A way past the navigation for a reader who uses the keyboard | `skip` |

## Records and figures

| The job | Component |
| --- | --- |
| Many records with the same columns, compared down a column | `table` |
| Records as rows with media, words and an action | `list` |
| The facts about one thing | `data-list` |
| One figure and how it moved | `stat` |
| What something costs, with its currency and its period | `price` |
| A few numbers compared | `chart` |
| What a total is made of, as parts of one bar | `breakdown` |
| Many small numbers over time or a grid | `heatmap` |
| A service's days, each up, degraded or down | `uptime` |
| Events in order | `timeline` |
| Things that last, placed on a scale of time | `gantt` |
| One file | `file` |
| A turn of a conversation | `message` |
| Comments and the replies to them | `thread` |
| Words added and words struck in a sentence | `ins` and `del` |
| A list of sentences with markers hung beside them: points, what a plan includes | `bullets` |
| Points on a picture, explained one by one | `hotspot` |
| A row with one or two actions behind it, on touch | `swipe` |
| A block that arrives as it scrolls into view | `reveal` |

## Surfaces

| The job | Component |
| --- | --- |
| A raised face for content | `sheet`, or `card` when it has a header, media and a footer |
| A recess that holds sheets | `tray` |
| A recess inside a sheet: a code sample, a read-only value | `well` |
| The one ink surface of a page, for the moment that asks for something | `sheet-inverse` |
| A screenshot or a demo in the frame of an application | `window` |
| A screenshot or a demo in the body of a phone | `device` |
| Something issued and handed over: a pass, a voucher, a receipt | `ticket` |
| Several things of one kind shown as one | `pile` around the top surface |

## It is not a component

Where regions go and what scrolls is a layout: `page`, `shell`, `auto-grid` and `form` are the only layout classes, and everything else is utilities. A stretch of a page with a purpose (a hero, a pricing table, a sign-in card) is a block: copy its markup. Do not invent a class for either.
