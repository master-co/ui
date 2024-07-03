'use client'

import Link from 'internal/components/Link'
import Image from 'next/image'
import { Fragment } from 'react'
import { useTranslation } from '~/internal/contexts/i18n'
import { getUnitCategories } from '~/site/metadata'

export const categories = getUnitCategories('components')

export default function Overview() {
    const $ = useTranslation()
    return (
        categories
            .filter(({ name }) => name !== 'Overview')
            .map((category, index) => (
                <Fragment key={index}>
                    <hr />
                    <h3 id={category.name}>{category.name}</h3>
                    <div className="grid-cols:2 grid-cols:4@sm mt:5x gap:6x">
                        {
                            category.definedMetadataList.map((definedMetadata, index) => (
                                <Link href={definedMetadata.pathname} key={index}>
                                    <div className='r:2x b:1|lightest overflow:hidden ~transform|.15s'>
                                        <Image src={(definedMetadata.openGraph?.images as any)[0]} className='a:hover_{scale(1.1)} ~transform|.15s hidden block@light' width={600} height={300} alt={$(definedMetadata.title as string)} />
                                        <Image src={(definedMetadata.openGraph?.images as any)[1]} className='a:hover_{scale(1.1)} ~transform|.15s hidden block@dark' width={600} height={300} alt={$(definedMetadata.title as string)} />
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