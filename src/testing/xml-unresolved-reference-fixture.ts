import { createXmlBodySyntaxFixture } from './xml-body-syntax-fixture'

export function createXmlUnresolvedReferenceFixture(
  declaration: string, text: string,
  field: 'title' | 'composer' | 'part-name' | 'lyric' | 'attribute' = 'title'
): string {
  let xml = createXmlBodySyntaxFixture('valid')
  if (declaration) xml = xml.replace('<score-partwise', `<!DOCTYPE score-partwise [${declaration}]><score-partwise`)
  if (field === 'title') return xml.replace('Native part identifiers', text)
  if (field === 'composer') return xml.replace('</work>', `</work><identification><creator type="composer">${text}</creator></identification>`)
  if (field === 'part-name') return xml.replace('Piano 1', text)
  if (field === 'lyric') return xml.replace('</note>', `<lyric><text>${text}</text></lyric></note>`)
  return xml.replace('<part-name>', `<part-name font-family="${text}">`)
}
