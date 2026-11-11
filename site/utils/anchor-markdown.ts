/** Keep authored heading links usable when MDX is exported as portable Markdown. */
export function anchorMarkdown(source: string): string {
  let fence: { marker: string, length: number } | undefined
  return source.split('\n').map(line => {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line)
    if (marker) {
      if (!fence) fence = { marker: marker[1][0], length: marker[1].length }
      else if (marker[1][0] === fence.marker && marker[1].length >= fence.length && !marker[2].trim()) fence = undefined
      return line
    }
    if (fence) return line
    return line.replace(/^(#{1,6}[ \t]+.+?) \\\{#([\w-]+)\\\}[ \t]*$/, '<a id="$2"></a>\n\n$1')
  }).join('\n')
}
