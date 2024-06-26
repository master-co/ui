import type { InputHTMLAttributes } from 'react'
import type { BADGE_SIZES, BADGE_COLORS } from '@master/ui'
import clsx from 'clsx'

type BadgeProps = {
    rounded?: boolean
    size?: keyof typeof BADGE_SIZES | (string & object)
    color?: keyof typeof BADGE_COLORS | (string & object)
} & InputHTMLAttributes<HTMLSpanElement>

const Badge = ({
    className,
    size = 'md' as never,
    color = 'primary',
    rounded,
    ...props
}: BadgeProps) => {
    return (
        <span {...props} className={clsx(
            'badge',
            size && `badge-${size}`,
            color && `badge-${color}`,
            rounded && 'rounded',
            className
        )} />
    )
}

export default Badge