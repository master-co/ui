
import type { Config } from '@master/css'

export const toggleSizes = {
    sm: '$size:1.25rem',
    md: '$size:1.5rem',
    lg: '$size:2rem',
}

export const toggleColors = {
    primary: 'bg:primary:has(:checked)>.toggle-body'
}

export const styles = {
    toggle: {
        '': `
            inline-flex hidden>input
            filter:none:has([disabled])_.toggle-button
            opacity:.7:has([disabled])>.toggle-body
            w:calc(($(size)*1.625-4)*.75):active:not(:has([disabled]))_.toggle-button
            translateX(calc($(size)*1.625*.375)):has(:checked)_.toggle-button
            translateX(calc(($(size)*1.625-.25rem)*.24)):has(:checked:not([disabled]):active)_.toggle-button
        `,
        body: 'size:calc($(size)*1.625)|$(size) inline-flex rounded ~background-color|.3s will-change:background-color bg:slate-10@light bg:gray-70@dark',
        button: 'size:calc($(size)-4)|calc($(size)-4) rx:calc($(size)/2-0.125rem) x:2 y:2 ~transform|.1s|ease-out,width|.1s|ease-out drop-shadow(0|2|2|rgba(0,0,0,.2)) fill:white',
        ...toggleSizes,
        ...toggleColors
    }
}

export default {
    styles
} as Config