import type { InputHTMLAttributes } from 'react'
import type { SWITCH_SIZES, SWITCH_COLORS } from '@master/ui'
import clsx from 'clsx'

type SwitchProps = {
    disabled?: boolean
    size?: keyof typeof SWITCH_SIZES | string & object
    color?: keyof typeof SWITCH_COLORS | string & object
} & InputHTMLAttributes<HTMLInputElement>

const Switch = ({
    className,
    size = 'md' as never,
    color = 'primary',
    ...props
}: SwitchProps) => {
    return (
        <label className={clsx(
            'switch',
            size && `switch-${size}`,
            color && `switch-${color}`,
            className
        )}>
            <input {...props} className="switch-control" type="checkbox" />
            <svg className="switch-body">
                <rect className="switch-button" />
            </svg>
        </label>
    )
}

export default Switch