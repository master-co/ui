import type { InputHTMLAttributes } from 'react'
import type { switchSizes, switchColors } from '@master/ui'
import clsx from 'clsx'

type SwitchProps = {
    disabled?: boolean
    // eslint-disable-next-line @typescript-eslint/ban-types
    size?: (keyof typeof switchSizes) | (string & {})
    // eslint-disable-next-line @typescript-eslint/ban-types
    color?: (keyof typeof switchColors) | (string & {})
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