import Layout from 'internal/layouts/doc'
import metadata from './metadata'
/* @ts-expect-error toc */
import Content, { toc } from './content.mdx'
import generate from 'internal/utils/generate-metadata'
import { getUnitCategories } from 'site/metadata'
import AppTabs from 'internal/components/AppTabs'

export const dynamic = 'force-static'
export const revalidate = false

export async function generateMetadata(props: any, parent: any) {
    return await generate(metadata, props, parent)
}

export const tabs = (
    <AppTabs tabs={[
        { label: 'Examples', href: '/components/button' },
        { label: 'Properties', href: '/components/button/properties' },
        { label: 'Sources', href: '/components/button/sources' }
    ]} />
)

export default async function Page(props: any) {
    return (
        <Layout {...props} $type="preview" pageCategories={getUnitCategories('components')} pageDirname={__dirname} metadata={metadata} toc={toc} >
            {tabs}
            <Content />
        </Layout >
    )
}