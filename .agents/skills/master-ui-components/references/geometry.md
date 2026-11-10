# Sizes and geometry

## Control scale

| Size | Height | Inline padding | Label | Icon | Radius |
| --- | --- | --- | --- | --- | --- |
| `-sm` | 32px | 12px | 12.5px | 14px | 7px |
| default | 38px | 16px | 13.5px | 16px | 8px (`--radius-lg`) |
| `-lg` | 44px | 20px | 15px | 18px | 10px |

Text fields and selects default to 40px for reading comfort; their `-sm` and `-lg` match 32 and 44px, and a raised select matches the button's 38px. In a row, flex stretch keeps a field and a button equal.

A segmented control's track is exactly a button's height: item height plus twice the inset (26 + 2×3, 30 + 2×4, 36 + 2×4).

## Nesting radii

Outer radius = inner radius + the inset between them. Tray 16 → sheet 12 (4px inset); card 12 → media 8 (4px); menu, popover and select list 12 → row 8 (4px); field 8 → a button inside it 4 (4px); segmented track 11 → item 7 (4px), small track 8 → item 5 (3px), large track 12 → item 8; switch track is a pill around a circular thumb with an even 3px inset. A dialog is 16. Only pills, dots and avatars are rounder than 16px.

| Radius | Used by |
| --- | --- |
| 5px | Checkboxes, keycaps, small badges |
| 6px (`--radius-md`) | Badges, skeletons |
| 7px | Small controls, tooltips, segmented thumbs |
| 8px (`--radius-lg`) | Buttons, fields, wells, menu items, options |
| 10px | Large controls, alerts |
| 12px (`--radius-xl`) | Sheets, cards, popovers, menus |
| 16px (`--radius-2xl`) | Trays, dialogs |

## Painted edges

Contours are half-pixel zero-blur shadows, outside a raised face and inset in a well, so they do not consume padding. A half pixel is one device pixel at 2x; at 1x the browser antialiases it into a fainter 1px line, which is the intended weight. When measuring a visible gap, subtract the painted rings on both sides: a 4px inset between a well's inner contour and a raised item's outer ring shows about 3px.

Joined controls overlap their rings instead of doubling them: buttons in a `btn-group` sit .5px apart, so the two contours share one seam.

## Icons

Icons are drawn on a 24px grid with a 1.5 stroke (about 1px at 16px). They carry roughly 3px of internal air, so controls pull them 1–2px toward the edge with `--icon-offset`. Center a square icon button by geometry, not by nudging the icon.

## Type

Control labels use `--font-weight-control` (460) on a single 1.2 line; measured cap height is centered within 0.3px at every size with Geist. Counts use tabular figures. Never change weight for the current or selected state; change ink and depth instead, so widths stay stable.
