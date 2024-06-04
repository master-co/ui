import define from 'internal/utils/metadata'

const metadata = define({
    title: 'Switch',
    description: 'Carefully crafted switch components, including a variety of different sizes and styles.',
    category: 'Element',
    openGraph: {
        images: new URL('~/site/public/images/components/switch.jpg', import.meta.url).toString()
    },
    filename: import.meta.url
})

export default metadata