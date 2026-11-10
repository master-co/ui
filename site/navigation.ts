import type { AppNavItem } from '@master/internal-site/config'
import IconBrandGithub from '@tabler/icons-svelte-runes/icons/brand-github'
import IconBrandX from '@tabler/icons-svelte-runes/icons/brand-x'
import IconCompass from '@tabler/icons-svelte-runes/icons/compass'
import IconComponents from '@tabler/icons-svelte-runes/icons/components'
import IconLayoutSidebar from '@tabler/icons-svelte-runes/icons/layout-sidebar'
import IconStack2 from '@tabler/icons-svelte-runes/icons/stack-2'
import IconMessages from '@tabler/icons-svelte-runes/icons/messages'

export interface FooterNavGroup {
  name: string
  links: { name: string, href: string }[]
}

const repositoryURL = 'https://github.com/master-co/ui'

export const primaryNavs = [
  { name: 'Guide', href: '/guide/introduction', Icon: IconCompass },
  { name: 'Components', href: '/components', Icon: IconComponents },
  { name: 'Layouts', href: '/layouts', Icon: IconLayoutSidebar },
  { name: 'Blocks', href: '/blocks', Icon: IconStack2 },
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
      { name: 'Layouts', href: '/layouts' },
      { name: 'Blocks', href: '/blocks' },
    ]
  },
  {
    name: 'Products',
    links: [
      { name: 'Master CSS', href: 'https://css.master.co' },
      { name: 'Master Design', href: 'https://github.com/master-co/design' },
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
      { name: 'MIT License', href: `${repositoryURL}?tab=MIT-1-ov-file#readme` },
    ]
  },
] satisfies FooterNavGroup[]

export const footerProps = { navGroups: footerNavGroups }
