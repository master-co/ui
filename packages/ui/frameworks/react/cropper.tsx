'use client'
import { useId, useRef, useState, type ComponentProps, type CSSProperties, type ReactNode } from 'react'
import { cropper, cropperFit, type Crop } from '@master/ui/behaviors/cropper.js'
import { useBehavior } from './use-behavior'

export type { Crop }

/** What the page's range input takes to zoom a panned cropper: spread it on the input. */
export interface CropperZoomAttributes {
  type: 'range'
  min: number
  max: number
  step: 'any'
  defaultValue: number
  disabled?: boolean
  'aria-controls': string
}

export interface CropperProps extends Omit<ComponentProps<'div'>, 'defaultValue' | 'children'> {
  /** The picture. */
  src: string
  alt: string
  /** The picture's own size, in pixels: the crop is counted in them. */
  width: number
  height: number
  /** The crop, in the picture's pixels, with `zoom` on a panned cropper. */
  value?: Crop
  defaultValue?: Crop
  /** Called as the crop moves. */
  onValueChange?: (crop: Crop) => void
  /** Called once a drag, a key, a pinch or a turn of the wheel has ended. */
  onValueCommit?: (crop: Crop) => void
  /** Width over height the box keeps. Free when left out; 1 on a panned cropper. */
  ratio?: number
  /** The box stays and the picture pans and zooms under it. */
  pan?: boolean
  /** A round box, for an avatar. */
  round?: boolean
  /** The least width and height, in the picture's pixels. */
  min?: number
  /** How far an arrow key moves the crop, in the picture's pixels. */
  step?: number
  /** The greatest zoom of a panned cropper. */
  maxZoom?: number
  /** The name of the box: what is cropped. */
  label: string
  /** What the box is called in place of "application", such as "crop box". */
  roleDescription?: string
  /** What the status says of a crop after each change, in the page's language. */
  describe?: (crop: Crop) => string
  /** A range input of the page's that zooms a panned cropper, given the attributes that join it to the frame. */
  zoom?: (attributes: CropperZoomAttributes) => ReactNode
  disabled?: boolean
}

/** A share of the picture as the behavior writes it. */
const share = (part: number) => String(Math.round(part * 1e5) / 1e5)

/** A picture with a box over it that says what to keep. */
export function Cropper({ src, alt, width, height, value, defaultValue, onValueChange, onValueCommit, ratio, pan, round, min, step, maxZoom = 4, label, roleDescription, describe, zoom, disabled, id, className, style, ...root }: CropperProps) {
  const generated = useId()
  const name = id ?? generated
  const [first] = useState(() => cropperFit({ width, height }, value ?? defaultValue, { ratio, pan, min, zoom: [1, maxZoom] }))
  const held = useRef(first)
  const ref = useBehavior(cropper, { ratio: ratio ?? 0, step, min, maxZoom, describe }, {
    value,
    defaultValue,
    onValueChange: (next: Crop | null) => { if (!next) return; held.current = next; onValueChange?.(next) },
    // The box says change once a gesture or a key has ended.
    on: { change: (event) => { if ((event.target as Element).classList.contains('cropper-box')) onValueCommit?.(held.current) } },
  })
  // The first crop is drawn on the server; after that the behavior writes these properties.
  const shares = { '--cropper-x': share(first.x / width), '--cropper-y': share(first.y / height), '--cropper-width': share(first.width / width), '--cropper-height': share(first.height / height), '--cropper-ratio': ratio || undefined }
  return (
    <>
      <div id={name} className={['cropper', pan && 'cropper-pan', round && 'cropper-round', className].filter(Boolean).join(' ')} style={{ ...shares, ...style } as CSSProperties} ref={ref} {...root}>
        <img className="cropper-image" src={src} alt={alt} width={width} height={height} />
        <div className="cropper-box" role="application" tabIndex={disabled ? -1 : 0} aria-label={label} aria-roledescription={roleDescription} aria-disabled={disabled || undefined}>
          {pan ? null : (
            <>
              <span className="cropper-handle cropper-handle-top cropper-handle-left" />
              <span className="cropper-handle cropper-handle-top" />
              <span className="cropper-handle cropper-handle-top cropper-handle-right" />
              <span className="cropper-handle cropper-handle-right" />
              <span className="cropper-handle cropper-handle-bottom cropper-handle-right" />
              <span className="cropper-handle cropper-handle-bottom" />
              <span className="cropper-handle cropper-handle-bottom cropper-handle-left" />
              <span className="cropper-handle cropper-handle-left" />
            </>
          )}
        </div>
        <p className="cropper-status" role="status" />
      </div>
      {pan && zoom?.({ type: 'range', min: 1, max: maxZoom, step: 'any', defaultValue: first.zoom ?? 1, disabled, 'aria-controls': name })}
    </>
  )
}
