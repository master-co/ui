'use client'
import { Segment, Segments, TabControl, TabPane, TabView } from '@master/ui.react'

export default () => {
    const tabs = [
        { name: 'a', label: 'A Label', content: 'A Pane' },
        { name: 'b', label: 'B Label', content: 'B Pane' }
    ]
    return (
        <TabView activeTab={tabs[0].name}>
            <Segments>
                {tabs.map((tab) =>
                    <TabControl name={tab.name} key={tab.name} as={Segment}>
                        {tab.label}
                    </TabControl>)}
            </Segments>
            {tabs.map((tab) =>
                <TabPane name={tab.name} key={tab.name}>
                    {tab.content}
                </TabPane>)}
        </TabView>
    )
}