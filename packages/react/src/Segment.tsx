import type { ButtonHTMLAttributes } from 'react'
import clsx from 'clsx'

type SegmentProps = {
    active?: boolean
} & ButtonHTMLAttributes<HTMLButtonElement>

const Segment = ({ className, active, ...props }: SegmentProps) => {
    return <button {...props} className={clsx('segment', className, active && 'active')} />
}

export default Segment