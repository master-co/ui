/** @type {import('aronrepo').AronrepoConfig} */
export default {
  release: {
    // Only the owner raises minor and major versions, with Bump(Minor) and Bump(Major) commits.
    mode: 'explicit'
    // Release paths derive from public workspace packages (packages/ui).
  }
}
