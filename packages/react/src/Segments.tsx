import type { HTMLAttributes } from 'react'
import type { SEGMENTS_SIZES } from '@master/ui'
import clsx from 'clsx'

type SegmentsProps = {
    size?: keyof typeof SEGMENTS_SIZES | string & object
} & HTMLAttributes<HTMLDivElement>

const Segments = ({ className, size = 'md', ...props }: SegmentsProps) => {
    return <div {...props} className={clsx('segments', size && `segments-${size}`, className)} />
}

export default Segments