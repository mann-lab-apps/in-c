import { createNativePartIdFixture } from './native-part-id-fixture'
import { serializeMusicXml } from '../musicxml'

export const partNameDisplayCases = {
  nameText: '<part-name-display><display-text>Solo Piano</display-text></part-name-display>',
  nameStyled: '<part-name-display><display-text font-style="italic">Solo</display-text><accidental-text>sharp</accidental-text><display-text font-weight="bold">Piano</display-text></part-name-display>',
  nameHidden: '<part-name-display print-object="no"><display-text>Solo Piano</display-text></part-name-display>',
  nameEmpty: '<part-name-display/>',
  abbreviationText: '<part-abbreviation-display><display-text>Solo Pno.</display-text></part-abbreviation-display>',
  abbreviationSymbol: '<part-abbreviation-display><display-text>Pno.</display-text><accidental-text>flat</accidental-text></part-abbreviation-display>',
  abbreviationHiddenEmpty: '<part-abbreviation-display print-object="no"/>'
} as const
export type PartNameDisplayKind = keyof typeof partNameDisplayCases

export function createPartNameDisplayFixture(kind?: PartNameDisplayKind, targetPart = 1, reversedHeader = false): string {
  const score = createNativePartIdFixture(['P1', 'P2'])
  score.parts.forEach((part, index) => { part.abbreviation = `Pno. ${index + 1}` })
  let xml = serializeMusicXml(score)
  if (kind) {
    let index = 0
    xml = xml.replace(/<score-part\b[^>]*>[\s\S]*?<\/score-part>/g, block => {
      index += 1
      if (index !== targetPart) return block
      const marker = kind.startsWith('abbreviation') ? '</part-abbreviation>' : '</part-name>'
      if (!block.includes(marker)) throw new Error('Synthetic part label target missing')
      return block.replace(marker, marker + partNameDisplayCases[kind])
    })
  }
  if (reversedHeader) {
    const definitions = xml.match(/<score-part\b[^>]*>[\s\S]*?<\/score-part>/g)!
    xml = xml.replace(definitions[0]!, '__DDIRORI_FIRST_DEFINITION__').replace(definitions[1]!, definitions[0]!)
      .replace('__DDIRORI_FIRST_DEFINITION__', definitions[1]!)
  }
  return xml
}

/** Two-system control: print display affects presentation, not the formal part label. */
export function createSystemPartNameDisplayFixture(
  kind?: PartNameDisplayKind, targetPart = 1, displayPrintIndex = 1
): string {
  let partIndex = 0
  return createPartNameDisplayFixture().replace(/<part id="[^"]+">[\s\S]*?<\/part>/g, block => {
    partIndex += 1
    const first = block.match(/<measure\b[\s\S]*?<\/measure>/)![0]
    const display = kind && partIndex === targetPart ? partNameDisplayCases[kind] : ''
    const second = first.replace('number="1"', 'number="10"')
      .replace(/(<measure\b[^>]*>)/, '$1' + (displayPrintIndex === 2 ? '<print/>' : '')
        + '<print new-system="yes">' + display + '</print>')
    return block.replace(first, first + second)
  })
}

/** Valid legacy label attributes, independent of name-display directives. */
export const formalPartNameStyleCases = {
  nameFont: { field: 'part-name', attributes: 'font-style="italic" font-family="serif" font-size="18" font-weight="bold"' },
  namePosition: { field: 'part-name', attributes: 'default-x="0" default-y="12" relative-x="-3" relative-y="0" justify="right" color="#123456"' },
  nameHidden: { field: 'part-name', attributes: 'print-object="no"' },
  abbreviationFont: { field: 'part-abbreviation', attributes: 'font-style="italic"' },
  abbreviationHidden: { field: 'part-abbreviation', attributes: 'print-object="no"' }
} as const
export type FormalPartNameStyleKind = keyof typeof formalPartNameStyleCases
export function createFormalPartNameStyleFixture(kind?: FormalPartNameStyleKind, targetPart = 1, reversedHeader = false): string {
  let xml = createSystemPartNameDisplayFixture()
  if (kind) {
    const { field, attributes } = formalPartNameStyleCases[kind]
    let index = 0
    xml = xml.replace(/<score-part\b[^>]*>[\s\S]*?<\/score-part>/g, block => {
      if (++index !== targetPart) return block
      return block.replace(`<${field}>`, `<${field} ${attributes}>`)
    })
  }
  if (reversedHeader) {
    const definitions = xml.match(/<score-part\b[^>]*>[\s\S]*?<\/score-part>/g)!
    xml = xml.replace(definitions[0]!, '__DDIRORI_FIRST_DEFINITION__').replace(definitions[1]!, definitions[0]!)
      .replace('__DDIRORI_FIRST_DEFINITION__', definitions[1]!)
  }
  return xml
}
