import define from 'internal/utils/metadata'

const metadata = define({
    title: 'Switch',
    description: 'Beautiful toggle switch components crafted with care in every size, color and interaction.',
    category: 'Element',
    openGraph: {
        images: new URL('~/site/public/images/components/switch.jpg', import.meta.url).toString()
    },
    filename: import.meta.url
})

export default metadata