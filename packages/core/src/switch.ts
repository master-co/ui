
import type { Config } from '@master/css'

export const SWITCH_SIZES = {
    sm: '$size:1.25rem',
    md: '$size:1.5rem',
    lg: '$size:2rem',
} as const

export const SWITCH_COLORS = {
    primary: 'bg:primary:has(:checked)>.switch-body',
    gray: 'bg:gray:has(:checked)>.switch-body',
    slate: 'bg:slate:has(:checked)>.switch-body',
    brown: 'bg:brown:has(:checked)>.switch-body',
    orange: 'bg:orange:has(:checked)>.switch-body',
    amber: 'bg:amber:has(:checked)>.switch-body',
    yellow: 'bg:yellow:has(:checked)>.switch-body',
    lime: 'bg:lime:has(:checked)>.switch-body',
    green: 'bg:green:has(:checked)>.switch-body',
    teal: 'bg:teal:has(:checked)>.switch-body',
    cyan: 'bg:cyan:has(:checked)>.switch-body',
    sky: 'bg:sky:has(:checked)>.switch-body',
    blue: 'bg:blue:has(:checked)>.switch-body',
    indigo: 'bg:indigo:has(:checked)>.switch-body',
    violet: 'bg:violet:has(:checked)>.switch-body',
    purple: 'bg:purple:has(:checked)>.switch-body',
    fuchsia: 'bg:fuchsia:has(:checked)>.switch-body',
    pink: 'bg:pink:has(:checked)>.switch-body',
    crimson: 'bg:crimson:has(:checked)>.switch-body',
    red: 'bg:red:has(:checked)>.switch-body'
} as const

export default {
    styles: {
        switch: {
            '': `
                inline-flex
                filter:none:has([disabled])_.switch-button
                opacity:.7:has([disabled])>.switch-body
                w:calc(($(size)*1.625-4)*.75):active:not(:has([disabled]))_.switch-button
                translateX(calc($(size)*1.625*.375)):has(:checked)_.switch-button
                translateX(calc(($(size)*1.625-.25rem)*.24)):has(:checked:not([disabled]):active)_.switch-button
            `,
            control: 'hidden',
            body: 'size:calc($(size)*1.625)|$(size) inline-flex rounded ~background-color|.3s will-change:background-color bg:slate-10@light bg:gray-70@dark',
            button: 'size:calc($(size)-4)|calc($(size)-4) rx:calc($(size)/2-0.125rem) x:2 y:2 ~transform|.1s|ease-out,width|.1s|ease-out drop-shadow(0|2|2|rgba(0,0,0,.2)) fill:white',
            ...SWITCH_SIZES,
            ...SWITCH_COLORS
        }
    }
} as Config