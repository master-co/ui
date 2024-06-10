import type { HTMLAttributes } from 'react'
import type { tabsSizes } from '@master/ui'
import clsx from 'clsx'

type TabsProps = {
    underlined?: boolean
    // eslint-disable-next-line @typescript-eslint/ban-types
    size?: (keyof typeof tabsSizes) | (string & {})
} & HTMLAttributes<HTMLDivElement>

const Tabs = ({ className, size = 'md', underlined, ...props }: TabsProps) => {
    return <div {...props} className={clsx(
        'tabs',
        size && `tabs-${size}`,
        underlined && 'tabs-underlined',
        className
    )} />
}

export default Tabs