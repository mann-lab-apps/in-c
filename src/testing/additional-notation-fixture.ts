import { createXmlCharacterFixture, xmlCharacterCases } from './xml-character-reference-fixture'

export const additionalNotationCases = ['accidental', 'other-text', 'other-glyph', 'empty-glyph', 'repeated', 'containers', 'control', 'supported-control', 'ornament-control'] as const
export type AdditionalNotationCase = typeof additionalNotationCases[number]

// Generated documents only. Unsupported marks are compared with the same
// supported music, never converted into pitch accidentals or new span objects.
export function createAdditionalNotationFixture(kind: AdditionalNotationCase) {
  const seed = createXmlCharacterFixture(xmlCharacterCases[0], true)
  const supported = kind === 'supported-control' ? '<notations><articulations><staccato/></articulations></notations>'
    : kind === 'ornament-control' ? '<notations><ornaments><trill-mark/><accidental-mark>sharp</accidental-mark></ornaments></notations>'
      : kind === 'containers' ? '<notations><fermata/></notations>' : ''
  const extra = kind === 'accidental' ? '<notations><accidental-mark placement="above">sharp</accidental-mark></notations>'
    : kind === 'other-text' ? '<notations><other-notation type="single">확장 표기 QA</other-notation></notations>'
      : kind === 'other-glyph' ? '<notations><other-notation type="single" smufl="wiggleSawtoothWide">QA</other-notation></notations>'
        : kind === 'empty-glyph' ? '<notations><other-notation type="single" smufl="wiggleSawtoothWide"/></notations>'
          : kind === 'repeated' ? '<notations><accidental-mark>sharp</accidental-mark><accidental-mark placement="below">flat</accidental-mark></notations>'
            : kind === 'containers' ? '<notations><other-notation type="single">첫 표기</other-notation></notations><notations><accidental-mark>natural</accidental-mark></notations>' : ''
  return { kind, xml: seed.replace('</note>', extra + supported + '</note>'), controlXml: seed.replace('</note>', supported + '</note>') }
}
