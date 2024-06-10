import type { InputHTMLAttributes } from 'react'
import type { badgeSizes, badgeColors } from '@master/ui'
import clsx from 'clsx'

type BadgeProps = {
    rounded?: boolean
    // eslint-disable-next-line @typescript-eslint/ban-types
    size?: (keyof typeof badgeSizes) | string
    // eslint-disable-next-line @typescript-eslint/ban-types
    color?: (keyof typeof badgeColors) | string
} & InputHTMLAttributes<HTMLSpanElement>

const Badge = ({
    className,
    size = 'md',
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