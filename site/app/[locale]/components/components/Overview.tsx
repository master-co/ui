'use client'

import Link from 'internal/components/Link'
import Image from 'next/image'
import { Fragment } from 'react'
import { useTranslation } from '~/internal/contexts/i18n'
import { getUnitCategories } from '~/site/metadata'

export const categories = getUnitCategories('components')

export default () => {
    const $= useTranslation()
    return (
        categories
            .filter(({ name }) => name !== 'Overview')
            .map((category, index) => (
                <Fragment key={index}>
                    <h2>{category.name}</h2>
                    <div className="grid-cols:2 grid-cols:4@sm mt:5x gap:5x">
                        {
                            category.definedMetadataList.map((definedMetadata, index) => (
                                <Link href={definedMetadata.pathname} key={index}>
                                    <div className='r:2x b:1|frame overflow:hidden a:hover_{b:text-lightest} ~transform|.15s,border-color|.15s'>
                                        <Image src={definedMetadata.openGraph?.images as string}
                                            className='a:hover_{scale(1.1)} ~transform|.15s'
                                            width={600}
                                            height={300} alt={$(definedMetadata.title as string)} />
                                    </div>
                                    <div className="text:14 mt:3x">{$(definedMetadata.title as string)}</div>
                                </Link>
                            ))
                        }
                    </div>
                </Fragment>
            ))
    )
}