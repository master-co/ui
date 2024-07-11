
import type { Config } from '@master/css'

export const TOGGLE_SIZES = {
    sm: '$size:1.25rem',
    md: '$size:1.5rem',
    lg: '$size:2rem',
} as const

export const TOGGLE_COLORS = {
    primary: 'bg:primary:has(:checked)>.toggle-body',
    gray: 'bg:gray:has(:checked)>.toggle-body',
    slate: 'bg:slate:has(:checked)>.toggle-body',
    brown: 'bg:brown:has(:checked)>.toggle-body',
    orange: 'bg:orange:has(:checked)>.toggle-body',
    amber: 'bg:amber:has(:checked)>.toggle-body',
    yellow: 'bg:yellow:has(:checked)>.toggle-body',
    lime: 'bg:lime:has(:checked)>.toggle-body',
    green: 'bg:green:has(:checked)>.toggle-body',
    teal: 'bg:teal:has(:checked)>.toggle-body',
    cyan: 'bg:cyan:has(:checked)>.toggle-body',
    sky: 'bg:sky:has(:checked)>.toggle-body',
    blue: 'bg:blue:has(:checked)>.toggle-body',
    indigo: 'bg:indigo:has(:checked)>.toggle-body',
    violet: 'bg:violet:has(:checked)>.toggle-body',
    purple: 'bg:purple:has(:checked)>.toggle-body',
    fuchsia: 'bg:fuchsia:has(:checked)>.toggle-body',
    pink: 'bg:pink:has(:checked)>.toggle-body',
    crimson: 'bg:crimson:has(:checked)>.toggle-body',
    red: 'bg:red:has(:checked)>.toggle-body'
} as const

export default {
    styles: {
        toggle: {
            '': 'inline-flex filter:none:has([disabled])_.toggle-button opacity:.7:has([disabled])>.toggle-body w:calc(($(size)*1.625-4)*.75):active:not(:has([disabled]))_.toggle-button translateX(calc($(size)*1.625*.375)):has(:checked)_.toggle-button translateX(calc(($(size)*1.625-.25rem)*.24)):has(:checked:not([disabled]):active)_.toggle-button',
            control: 'hidden',
            body: 'size:calc($(size)*1.625)|$(size) inline-flex rounded ~background-color|.3s will-change:background-color bg:slate-10@light bg:gray-70@dark',
            button: 'size:calc($(size)-4)|calc($(size)-4) rx:calc($(size)/2-0.125rem) x:2 y:2 ~transform|.1s|ease-out,width|.1s|ease-out drop-shadow(0|2|2|rgba(0,0,0,.2)) fill:white',
            ...TOGGLE_SIZES,
            ...TOGGLE_COLORS
        }
    }
} as Config