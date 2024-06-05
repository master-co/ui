
import type { Config } from '@master/css'

export const styles = {
    toggle: {
        body: 'size:inherit rounded ~background|.3s bg:slate-20@light bg:gray-70@dark',
        input: `
            hidden
            filter:none[disabled]>.toggle-button
            opacity:.7[disabled]+.toggle-body
            cursor:no-drop[disabled]+.toggle-body
        `,
        button: '~transform|.1s|ease-out,width|.1s|ease-out drop-shadow(0|2px|2px|rgba(0,0,0,.2)) fill:#fff w:28 h:28',
        md: 'size:51|32 w:34>.toggle-input:active:not([disabled])+.toggle-body>.toggle-button translateX(19):has(:checked)_.toggle-button translateX(13):has(:checked:not([disabled]):active)_.toggle-button',
        primary: 'bg:primary:has(:checked)>.toggle-body'
    }
}

export default {
    styles
} as Config