import define from 'internal/utils/metadata'

const metadata = define({
    title: 'Toggle Switch',
    description: 'Beautiful toggle switch components crafted with care in every size, color and interaction.',
    category: 'Control',
    openGraph: {
        images: new URL('~/site/public/images/components/switch.jpg', import.meta.url).toString()
    },
    filename: import.meta.url
})

export default metadata