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
        red: 'bg:red fg:red-contrast outline:1|red-ring',
        touch: {
            primary: 'bg:touch-primary:hover',
            red: 'bg:touch-red:hover'
        }
    },
    variables: {
        primary: {
            ring: {
                '@light': '$(black)/.1',
                '@dark': '$(white)/.3'
            }
        },
        red: {
            ring: {
                '@light': '$(black)/.15',
                '@dark': '$(white)/.2'
            }
        },
        touch: {
            primary: {
                '@light': '$(primary-30)',
                '@dark': '$(primary-40)'
            },
            red: {
                '@light': '$(red-30)',
                '@dark': '$(red-40)'
            }
        },
        text: {
            'primary-contrast': {
                '@light': '$(primary-90)',
                '@dark': '$(primary-95)'
            },
            'red-contrast': '$(white)'
        }
    }
} as Config

export default ui