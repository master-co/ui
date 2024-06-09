import type { HTMLAttributes } from 'react'
import type { segmentsSizes } from '@master/ui'
import clsx from 'clsx'

type SegmentsProps = {
    // eslint-disable-next-line @typescript-eslint/ban-types
    size?: (keyof typeof segmentsSizes) | (string & {})
} & HTMLAttributes<HTMLDivElement>

const Segments = ({ className, size = 'md', ...props }: SegmentsProps) => {
    return <div {...props} className={clsx('segments', size && `segments-${size}`, className)} />
}

export default Segments