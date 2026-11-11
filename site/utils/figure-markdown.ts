/** Drawings are redundant with their authored MDX caption. Keep that caption
 * intact in portable Markdown, and never strip examples inside code fences. */
export function figureMarkdown(source: string): string {
  let fence: { marker: string, length: number } | undefined
  let inFigure = false
  const result = source.split('\n').map(line => {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line)
    if (marker) {
      if (!fence) fence = { marker: marker[1][0], length: marker[1].length }
      else if (marker[1][0] === fence.marker && marker[1].length >= fence.length && !marker[2].trim()) fence = undefined
      return line
    }
    if (fence) return line
    if (/^<GuideFigure name="[\w-]+">\s*$/.test(line)) {
      if (inFigure) throw new Error('Guide figures cannot be nested.')
      inFigure = true
      return ''
    }
    if (/^<\/GuideFigure>\s*$/.test(line)) {
      if (!inFigure) throw new Error('Unmatched GuideFigure closing tag.')
      inFigure = false
      return ''
    }
    if (/<\/?GuideFigure\b/.test(line)) throw new Error('GuideFigure needs standalone tags and a Markdown caption.')
    return line
  }).join('\n')
  if (inFigure) throw new Error('Unclosed GuideFigure.')
  return result
}
