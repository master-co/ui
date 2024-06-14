import type { Config } from '@master/css'
import colors from '@master/colors'
import common from 'internal/common/master.css'
import ui from '@master/ui'

// @ts-expect-error The variable value does not indicate false type.
export default {
    extends: [
        common,
        ui
    ],
    variables: {
        primary: colors.yellow,
        text: {
            'primary-contrast': {
                '': false,
                '@light': '$(primary-90)',
                '@dark': '$(primary-95)'
            }
        }
    }
} as Config