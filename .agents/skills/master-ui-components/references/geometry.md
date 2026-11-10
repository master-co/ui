# Sizes and geometry

## Control scale

| Size | Height | Inline padding | Label | Icon | Radius |
| --- | --- | --- | --- | --- | --- |
| `-sm` | 32px | 12px | 12.5px | 14px | 5px |
| default | 38px | 16px | 13.5px | 16px | 6px |
| `-lg` | 44px | 20px | 15px | 18px | 6px |

Text fields and selects default to 40px for reading comfort; their `-sm` and `-lg` match 32 and 44px, and a raised select matches the button's 38px. In a row, flex stretch keeps a field and a button equal.

A segmented control's track is exactly a button's height: item height plus twice the inset (26 + 2×3, 30 + 2×4, 36 + 2×4).

## Nesting radii

Outer radius = inner radius + the inset between them. Tray 14 → sheet 10 (4px inset); segmented track 10 → item 6 (4px); small track 7 → item 4 (3px); switch track is a pill around a circular thumb with an even 3px inset. Only pills and dots are rounder than 14px.

## Painted edges

Contours are outside zero-blur shadows, so they do not consume padding. When measuring a visible gap, subtract the painted rings on both sides: a 4px inset between a well's inner contour and a raised item's outer ring shows about 2px.

## Icons

Icons are drawn on a 24px grid with a 1.5 stroke (about 1px at 16px). They carry roughly 3px of internal air, so controls pull them 1–2px toward the edge with `--icon-offset`. Center a square icon button by geometry, not by nudging the icon.

## Type

Control labels use `--font-weight-control` (460) on a single 1.2 line; measured cap height is centered within 0.3px at every size with Geist. Counts use tabular figures. Never change weight for the current or selected state; change ink and depth instead, so widths stay stable.
