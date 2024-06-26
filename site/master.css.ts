import { type Config, variables } from '@master/css'
import common from 'internal/common/master.css'
import ui from '@master/ui'

export default {
    extends: [
        common,
        ui
    ],
    variables: {
        primary: variables.yellow,
        accent: {
            '@light': '$(yellow-50)',
            '@dark': '$(amber-20)',
        }
    }
} as Config