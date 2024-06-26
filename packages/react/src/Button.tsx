import type { ElementType, ComponentPropsWithoutRef } from 'react'
import type { BUTTON_SIZES, BUTTON_COLORS } from '@master/ui'
import clsx from 'clsx'
import Spinner from './Spinner'

type ButtonProps<T extends ElementType> = {
    as?: T
    disabled?: boolean
    round?: boolean
    rounded?: boolean
    square?: boolean
    loading?: boolean
    size?: keyof typeof BUTTON_SIZES | string
    color?: keyof typeof BUTTON_COLORS | string
} & ComponentPropsWithoutRef<T>

const Button = <T extends ElementType = 'button'>({
    as,
    children,
    className,
    size = 'md',
    color = 'primary',
    disabled,
    round,
    rounded,
    square,
    loading,
    ...props
}: ButtonProps<T>) => {
    const Component = as || 'button'
    return (
        <Component  {...props}
            className={clsx(
                'btn',
                size && `btn-${size}`,
                color && `btn-${color}`,
                round && 'round square',
                rounded && 'rounded',
                square && 'square',
                loading && 'loading',
                className
            )}
            disabled={Component === 'button' ? (disabled || loading) : undefined}
        >
            {children}
            {loading && <Spinner className='btn-loading' />}
        </Component>
    )
}

export default Button