'use client'

import type { ElementType, ComponentPropsWithoutRef } from 'react'
import { useTabView } from './TabView'

type TabPaneProps<T extends ElementType> = {
    name: string
    as?: T
} & ComponentPropsWithoutRef<T>

const TabPane = <T extends ElementType = 'div'>({ as, ...props }: TabPaneProps<T>) => {
    const tabView = useTabView()
    const Component = as || 'div'
    return <Component  {...props} hidden={tabView.activeTab !== props.name} />
}

export default TabPane