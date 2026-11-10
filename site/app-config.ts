import type { SiteApp } from '@master/internal-site/config'
import Logotype from './components/UILogotype.svelte'
import { communityNavs, primaryNavs } from './navigation'
export type { AppNavItem } from '@master/internal-site/config'

export default {
  name: 'Master UI',
  brandURL: 'https://master.co/brand',
  sourceBaseURL: 'https://github.com/master-co/ui/blob/alpha/',
  feedbackURL: 'https://github.com/master-co/ui/issues/new?template=docs_request.yml',
  navs: primaryNavs,
  communityNavs,
  header: { communityNavs: communityNavs.filter(({ name }) => name === 'GitHub') },
  versions: [],
  Logotype
} satisfies SiteApp
