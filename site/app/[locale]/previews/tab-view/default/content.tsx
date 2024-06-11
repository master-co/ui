'use client'
import { TabControl, TabPane, TabView, Tabs } from '@master/ui.react'

export default () => {
    const tabs = [
        { name: 'a', label: 'A Label', content: 'A Pane' },
        { name: 'b', label: 'B Label', content: 'B Pane' }
    ]
    return (
        <TabView activeTab={tabs[0].name}>
            <Tabs underlined>
                {tabs.map((tab) =>
                    <TabControl name={tab.name} key={tab.name}>
                        {tab.label}
                    </TabControl>)}
            </Tabs>
            {tabs.map((tab) =>
                <TabPane name={tab.name} key={tab.name}>
                    {tab.content}
                </TabPane>)}
        </TabView>
    )
}