import define from 'internal/utils/metadata'

const metadata = define({
    title: 'Tabs',
    description: 'Navigation tabs are used to navigate between mutually exclusive panes of content in the same page layout.',
    category: 'Navigation',
    openGraph: {
        images: [
            new URL('~/site/public/images/components/tabs.jpg', import.meta.url).toString(),
            new URL('~/site/public/images/components/tabs@dark.jpg', import.meta.url).toString()
        ]
    },
    filename: import.meta.url
})

export default metadata