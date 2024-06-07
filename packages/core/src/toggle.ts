
import type { Config } from '@master/css'

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
        // sizes
        sm: '$size:1.25rem',
        md: '$size:1.5rem',
        lg: '$size:2rem',
        // colors
        primary: 'bg:primary:has(:checked)>.toggle-body'
    }
}

export default {
    styles
} as Config


// import type { Config } from '@master/css'

// export const styles = {
//     toggle: {
//         '': 'inline-flex filter:none:has([disabled])_.toggle-button opacity:.7:has([disabled])>.toggle-body',
//         input: 'hidden',
//         body: 'inline-flex rounded ~background-color|.3s will-change:background-color bg:slate-20@light bg:gray-70@dark',
//         button: 'x:2 y:2 ~transform|.1s|ease-out,width|.1s|ease-out drop-shadow(0|2|2|rgba(0,0,0,.2)) fill:white',
//         // sizes
//         sm: 'size:32|20>.toggle-body {rx:8;size:16}_.toggle-button w:20:active:not(:has([disabled]))_.toggle-button translateX(12):has(:checked)_.toggle-button translateX(8):has(:checked:not([disabled]):active)_.toggle-button',
//         md: 'size:38|24>.toggle-body {rx:10;size:20}_.toggle-button w:24:active:not(:has([disabled]))_.toggle-button translateX(14):has(:checked)_.toggle-button translateX(10):has(:checked:not([disabled]):active)_.toggle-button',
//         lg: 'size:52|32>.toggle-body {rx:14;size:28}_.toggle-button w:35:active:not(:has([disabled]))_.toggle-button translateX(20):has(:checked)_.toggle-button translateX(13):has(:checked:not([disabled]):active)_.toggle-button',
//         // colors
//         primary: 'bg:primary:has(:checked)>.toggle-body'
//     }
// }

// export default {
//     styles
// } as Config