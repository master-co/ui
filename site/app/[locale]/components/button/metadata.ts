import define from 'internal/utils/metadata'

const metadata = define({
    title: 'Button',
    description: 'Carefully crafted button components, including a variety of different sizes and styles.',
    category: 'Element',
    openGraph: {
        images: new URL('~/site/public/images/components/button.jpg', import.meta.url).toString()
    },
    filename: import.meta.url
})

export default metadata