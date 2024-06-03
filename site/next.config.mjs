import redirects from './redirects.mjs'
import withWebpackConfig from 'internal/common/with-webpack-config.mjs'
import defineNextConfig from 'internal/common/define-next-config.mjs'

const nextConfig = await defineNextConfig(
    {
        webpack: (config, context) => {
            return withWebpackConfig(config, context)
        }
    },
    {
        redirects
    }
)

export default nextConfig