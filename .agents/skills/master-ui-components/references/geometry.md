# Sizes and geometry

## Control scale

| Size | Height | Inline padding | Label | Icon | Radius |
| --- | --- | --- | --- | --- | --- |
| `-sm` | 32px | 12px | 12.5px | 14px | 8px (`--radius-control-sm`) |
| default | 38px | 16px | 13.5px | 16px | 10px (`--radius-control`) |
| `-lg` | 44px | 20px | 15px | 18px | 12px (`--radius-control-lg`) |

Text fields and selects default to 40px for reading comfort; their `-sm` and `-lg` match 32 and 44px, and a raised select matches the button's 38px. In a row, flex stretch keeps a field and a button equal.

A segmented control's track is exactly a button's height: item height plus twice the inset (26 + 2×3, 30 + 2×4, 36 + 2×4).

## Radii

Radii are role tokens, stated as circular values:

| Token | Value | Used by |
| --- | --- | --- |
| `--radius-chip` | 6px | Badges, keycaps, checkboxes (chip − 1), skeletons, tooltips (chip + 1) |
| `--radius-control-sm` | 8px | Small buttons and fields, menu rows, options, nav rows, segmented thumbs |
| `--radius-control` | 10px | Buttons, fields, wells, code blocks |
| `--radius-control-lg` | 12px | Large buttons and fields, alerts, choices, toasts, dropzones |
| `--radius-surface` | 16px | Sheets, cards |

A holder derives its corner: inner radius plus the inset between them. Tray = surface + 4 (20); card media = card − 4 (12); menu, popover, select list and toolbar = small control + 4 (12); segmented track = thumb + inset (9 / 12 / 14 for sm / md / lg); a button inside a field = field − 4 (6); a chip inside a wrapping field = field − 6 (4); a button inside a composer = sheet − 8 (8); a framed figure = media + 4 (20). A dialog is 20. A message bubble is 18 with a 6px corner toward its author. Only pills, dots, avatars and thumbs are rounder, and they are true circles.

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
