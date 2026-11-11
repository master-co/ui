# Sizes and geometry

## Control scale

| Size | Height | Inline padding | Label | Icon | Radius |
| --- | --- | --- | --- | --- | --- |
| `-sm` | 32px | 12px | 12.5px | 14px | 8px (`--radius-control-sm`) |
| default | 38px | 16px | 13.5px | 16px | 10px (`--radius-control`) |
| `-lg` | 44px | 20px | 15px | 18px | 12px (`--radius-control-lg`) |

Everything that can stand beside a button is on this scale: a text field, an input group and what is built on one (a stepper, a combobox, a date field), a select in either material, and a segmented control's track. They are equal by their own height, not by flex stretch, so a row with `align-items: center` is level too. A 14px field line is 20.3px, so its block padding is 8px: 9px would carry the field to 38.3px.

A segmented control's track is exactly a button's height: item height plus twice the inset (26 + 2×3, 30 + 2×4, 36 + 2×4). What stands inside a well follows the same sum: a button in an input group is the well minus 8px (24 / 30 / 36), a chip in a wrapping field the well minus 12px.

## Three scales

Height is decided by what a component is, and only the first kind has to match its neighbors:

| Kind | Heights | What it is |
| --- | --- | --- |
| Control | 32 / 38 / 44px | Stands in a row beside a button: button, field, input group, select, segmented track, stepper, combobox, compact file (32) |
| Row | 28 / 32 / 36 / 44px | One of a list, or a row of navigation on its own line: tree 28, menu item, option and nav item 32, wheel row and small tab 36, tab 44 |
| Bar | 40 / 48 / 56px | A band across its container: toolbar, banner, code panel header and window bar 40 (a 32px control plus 4px over and under), accordion row 48, navbar 56 / 48, tab bar 56 |

A component outside these keeps a scale of its own and says so in its header: a chip is 28px, a badge and a keycap 22px, a switch 22px, a checkbox 18px, an OTP cell 40 × 44px, a command palette's search row 52px. Before giving a new component a height, name its kind; a new control that is not 32, 38 or 44px is a mistake.

On a touch screen (`pointer: coarse`) every control and every row is 44px. A control changes the property its parts derive from (`--input-height`), not only its own `min-height`, so a button in a well keeps its 4px inset there; a segmented item is 44px minus twice the inset, so the track is still a button's height.

## Radii

Radii are role tokens, stated as circular values:

| Token | Value | Used by |
| --- | --- | --- |
| `--radius-chip` | 6px | Badges, keycaps, checkboxes (chip − 1), skeletons, tooltips (chip + 1) |
| `--radius-control-sm` | 8px | Small buttons and fields, menu rows, options, nav rows, segmented thumbs |
| `--radius-control` | 10px | Buttons, fields, wells, code blocks |
| `--radius-control-lg` | 12px | Large buttons and fields, alerts, choices, toasts, dropzones |
| `--radius-surface` | 16px | Sheets, cards |

A holder derives its corner: inner radius plus the inset between them. Tray = surface + 4 (20); card media = card − 4 (12); menu, popover, select list and toolbar = small control + 4 (12); segmented track = thumb + inset (9 / 12 / 14 for sm / md / lg); a button inside a field = field − 4 (6); a chip inside a wrapping field = field − 6 (4); a button inside a composer = sheet − 8 (8); a framed figure = media + 4 (20); a stepper's buttons and a code panel's control = well − 4 (6); a wheel's mark = well − 4 (8); the control and the picture in a compact file = sheet − 4 (4, from the small control's 8); a window's address = frame − 4 (8). A dialog is 20. A file's page is 3 with a 9px folded corner. A message bubble is 18 with a 6px corner toward its author. Only pills, dots, avatars and thumbs are rounder, and they are true circles.

## Continuous corners

Where `corner-shape` is supported the theme sets `--corner-shape: squircle` and `--corner-scale: 1.6`; elsewhere `round` and `1`. Components write `border-radius: calc(<circular radius> * var(--corner-scale))` with `corner-shape: var(--corner-shape)`.

- A squircle of radius r curves inside an r × r box but hugs the corner more closely than a circle: at 45° it stands .16r from the corner against a circle's .29r. Multiplying by 1.6 keeps the apparent roundness and lets the curve begin earlier.
- Nesting still adds: the box in which an offset curve turns grows by the offset. So the inset is added after the scale, never multiplied by it. When a child multiplies its own radius, pass it a pre-divided inset: `--btn-radius: calc(var(--input-radius) - 4px / var(--corner-scale))`.
- A scaled radius above half the height makes the short side one continuous curve. That is intended for a checkbox (an app-icon shape) and acceptable for chips of 18 to 26px; check it by eye for anything new.
- `corner-shape` is not inherited. Box-shadow, outline, overflow clipping and dashed borders all follow it.

## Painted edges

Contours are half-pixel zero-blur shadows, outside a raised face and inset in a well, so they do not consume padding. A half pixel is one device pixel at 2x; at 1x the browser antialiases it into a fainter 1px line, which is the intended weight. When measuring a visible gap, subtract the painted rings on both sides: a 4px inset between a well's inner contour and a raised item's outer ring shows about 3px.

Joined controls overlap their rings instead of doubling them: buttons in a `btn-group` sit .5px apart, so the two contours share one seam.

## Icons

Icons are drawn on a 24px grid with a 1.5 stroke (about 1px at 16px). They carry roughly 3px of internal air, so controls pull them 1–2px toward the edge with `--icon-offset`. Center a square icon button by geometry, not by nudging the icon.

## Type

Control labels use `--font-weight-control` (460) on a single 1.2 line; measured cap height is centered within 0.3px at every size with Geist. Counts use tabular figures. Never change weight for the current or selected state; change ink and depth instead, so widths stay stable.
