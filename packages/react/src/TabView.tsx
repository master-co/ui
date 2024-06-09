'use client'

import { FC, ReactNode, createContext, useContext, useState } from 'react'

type TabViewContextType = {
    activeTab?: string
    setActiveTab: (tab: string) => void
};

export const TabViewContext = createContext<TabViewContextType | undefined>(undefined)

export const useTabView = () => {
    const context = useContext(TabViewContext)
    if (context === undefined) {
        throw new Error('useTabView must be used within a TabView')
    }
    return context
}

type TabViewProps = {
    activeTab?: string
    children: ReactNode
}

const TabView: FC<TabViewProps> = (props) => {
    const [activeTab, setActiveTab] = useState<string | undefined>(props.activeTab)
    return (
        <TabViewContext.Provider value={{ activeTab, setActiveTab }}>
            {props.children}
        </TabViewContext.Provider>
    )
}

export default TabView