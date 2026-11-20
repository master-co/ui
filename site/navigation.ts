import type { AppNavItem } from '@master/internal-site/config'
import IconBrandGithub from '@master/icons-svelte/native/20/soft/brand-github-outline'
import IconBrandX from '@master/icons-svelte/native/20/soft/brand-x'
import IconCompass from '@master/icons-svelte/native/20/soft/compass'
import IconChartLine from '@master/icons-svelte/native/20/soft/chart-line'
import IconComponent from '@master/icons-svelte/native/20/soft/component'
import IconPanelLeft from '@master/icons-svelte/native/20/soft/panel-left'
import IconLayers from '@master/icons-svelte/native/20/soft/layers'
import IconMessages from '@master/icons-svelte/native/20/soft/messages'

export interface FooterNavGroup {
  name: string
  links: { name: string, href: string }[]
}

const repositoryURL = 'https://github.com/master-co/ui'

export const primaryNavs = [
  { name: 'Guide', href: '/guide/introduction', Icon: IconCompass },
  { name: 'Components', href: '/components', Icon: IconComponent },
  { name: 'Charts', href: '/charts', Icon: IconChartLine },
  { name: 'Blocks', href: '/blocks', Icon: IconLayers },
  { name: 'Pages', href: '/pages', Icon: IconPanelLeft },
] satisfies AppNavItem[]

export const communityNavs = [
  { name: 'Discussions', href: `${repositoryURL}/discussions`, Icon: IconMessages },
  { name: 'GitHub', href: repositoryURL, Icon: IconBrandGithub },
  { name: 'X', href: 'https://twitter.com/mastercorg', Icon: IconBrandX },
] satisfies AppNavItem[]

export const footerNavGroups = [
  {
    name: 'Docs',
    links: [
      { name: 'Introduction', href: '/guide/introduction' },
      { name: 'Installation', href: '/guide/installation' },
      { name: 'Components', href: '/components' },
      { name: 'Charts', href: '/charts' },
      { name: 'Blocks', href: '/blocks' },
      { name: 'Pages', href: '/pages' },
    ]
  },
  {
    name: 'Products',
    links: [
      { name: 'Master CSS', href: 'https://css.master.co' },
      { name: 'Master Design', href: 'https://design.master.co' },
      { name: 'Master', href: 'https://master.co' },
    ]
  },
  {
    name: 'Community',
    links: [
      ...communityNavs.map(({ name, href }) => ({ name, href })),
      { name: 'Discord', href: 'https://discord.com/invite/sZNKpAAAw6' },
    ]
  },
  {
    name: 'Legal',
    links: [
      { name: 'Licensing', href: '/license.txt' },
    ]
  },
] satisfies FooterNavGroup[]

export const footerProps = { navGroups: footerNavGroups }
