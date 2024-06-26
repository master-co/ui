import type { Config } from '@master/css'

export const SELECT_SIZES = {
    sm: 'font:12 r:4 h:8x pl:10>.select-control',
    md: 'font:14 r:6 h:10x pl:14>.select-control',
    lg: 'font:16 r:8 h:12x pl:16>.select-control',
} as const

export default {
    styles: {
        select: {
            '': 'rel fg:strong fg:lightest:has(:disabled)',
            control: 'fg:current font-family:inherit appearance:none outline:0 opacity:1 full pr:2em',
            outlined: 'b:1|light b:text-lightest:has(:hover:not(:disabled),:focus:not(:disabled))',
            indicator: 'abs middle untouchable',
            ...SELECT_SIZES,
        }
    }
} as Config