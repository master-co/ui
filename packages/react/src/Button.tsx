import clsx from 'clsx'
import type { FC, ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react'

const Button: FC<ButtonHTMLAttributes<HTMLButtonElement>> = ({ className, ...props }) => {
    return <button {...props} className={clsx('btn', className || 'btn-md btn-primary')} />
}

export default Button

export const ButtonLink: FC<{ disabled?: boolean } & AnchorHTMLAttributes<HTMLAnchorElement>> = ({ className, disabled, ...props }) => {
    const Component = (disabled ? 'button' : 'a') as 'a'
    return <Component {...props} className={clsx('btn', className || 'btn-md btn-primary')} />
}