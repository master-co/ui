import define from 'internal/utils/metadata'

const metadata = define({
    title: 'Spinner',
    description: 'Spinner indicators inform users that your app isn\'t installed while it loads content or performs lengthy operations.',
    category: 'Status Indicators',
    openGraph: {
        images: [
            new URL('~/site/public/images/components/spinner.jpg', import.meta.url).toString(),
            new URL('~/site/public/images/components/spinner@dark.jpg', import.meta.url).toString()
        ]
    },
    filename: import.meta.url
})

export default metadata