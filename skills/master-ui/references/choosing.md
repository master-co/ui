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

## A message

| The job | Component |
| --- | --- |
| The result of what the reader just did, which can leave by itself | `toast` |
| Something about this part of the page, which stays in the flow | `alert` |
| One line everyone on the page should see, across the top | `banner` |
| A view has nothing to show yet | `empty` |
| A field is wrong | `field-error` in `field`, with `aria-invalid` or `:user-invalid` on the control |

## Work is under way

| The job | Component |
| --- | --- |
| Unknown duration, small, beside a label | `spinner` |
| Content is on its way and its shape is known | `skeleton` |
| Words that say work is under way: thinking, generating | `shimmer` |
| A known share of the work is done | `progress` |
| A reading within a range, not a task: disk used, a score | `meter` |

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
| A short sequence and where the reader is in it | `steps` |
| The headings of this page | `toc` |

## Records and figures

| The job | Component |
| --- | --- |
| Many records with the same columns, compared down a column | `table` |
| Records as rows with media, words and an action | `list` |
| The facts about one thing | `data-list` |
| One figure and how it moved | `stat` |
| A few numbers compared | `chart` |
| Many small numbers over time or a grid | `heatmap` |
| Events in order | `timeline` |
| One file | `file` |
| A turn of a conversation | `message` |

## Surfaces

| The job | Component |
| --- | --- |
| A raised face for content | `sheet`, or `card` when it has a header, media and a footer |
| A recess that holds sheets | `tray` |
| A recess inside a sheet: a code sample, a read-only value | `well` |
| The one ink surface of a page, for the moment that asks for something | `sheet-inverse` |
| A screenshot or a demo in the frame of an application | `window` |

## It is not a component

Where regions go and what scrolls is a layout: `page`, `shell`, `auto-grid` and `form` are the only layout classes, and everything else is utilities. A stretch of a page with a purpose (a hero, a pricing table, a sign-in card) is a block: copy its markup. Do not invent a class for either.
