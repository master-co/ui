import type { Config } from '@master/css'

const ui = {
    extends: [
        require('./button').default,
        require('./segments').default,
        require('./switch').default,
        require('./select').default,
        require('./tabs').default,
        require('./badge').default,
    ],
    styles: {
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

export default ui