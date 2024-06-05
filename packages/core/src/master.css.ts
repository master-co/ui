import type { Config } from '@master/css'
import { styles as button } from './button'
import { styles as segments } from './segments'
import { styles as toggle } from './toggle'

export default {
    styles: {
        ...button,
        ...segments,
        ...toggle,
        primary: 'bg:primary fg:primary-contrast outline:1|primary-ring',
        touch: {
            primary: 'bg:touch-primary:hover'
        }
    },
    variables: {
        primary: {
            ring: {
                '@light': '$(black)/.1',
                '@dark': '$(white)/.3'
            }
        },
        touch: {
            primary: {
                '@light': '$(primary-30)',
                '@dark': '$(primary-40)'
            }
        },
        text: {
            'primary-contrast': {
                '@light': '$(primary-90)',
                '@dark': '$(primary-95)'
            }
        }
    }
} as Config