import define from '@master/internal-site/utils/metadata'

export default define({
  title: 'Owning the source',
  description: 'Two ways to get the library: the package, which keeps following upstream, and the registry, which copies source into the project.',
  category: 'Customizing',
  other: { subject: 'Registry' },
  order: 4,
  fileURL: import.meta.url
})
