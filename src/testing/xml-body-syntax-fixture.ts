import { serializeMusicXml } from '../musicxml'
import { createNativePartIdFixture } from './native-part-id-fixture'

export const malformedXmlKinds = [
  'missing-root-close', 'mismatched-part-close', 'duplicate-id',
  'second-root', 'same-second-root', 'trailing-text', 'outside-cdata'
] as const
export type MalformedXmlKind = typeof malformedXmlKinds[number]
export function createXmlBodySyntaxFixture(kind: MalformedXmlKind | 'valid'): string {
  const xml = serializeMusicXml(createNativePartIdFixture(['P1']))
  switch (kind) {
    case 'missing-root-close': return xml.replace(/<\/score-partwise>\s*$/, '')
    case 'mismatched-part-close': return xml.replace('</part>', '</wrong-part>')
    case 'duplicate-id': return xml.replace('<score-part id="P1">', '<score-part id="P1" id="P2">')
    case 'second-root': return xml + '<extra/>'
    case 'same-second-root': return xml + '<score-partwise/>'
    case 'trailing-text': return xml + 'unclosed-tail'
    case 'outside-cdata': return xml + '<![CDATA[outside]]>'
    default: return xml
  }
}
