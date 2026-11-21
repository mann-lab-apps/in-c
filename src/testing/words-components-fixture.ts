// Source components have no native rich-text representation. No implicit join.
export type WordsComponentsFixtureKind = 'styled' | 'plain' | 'positioned' | 'multiple' | 'normalized' | 'single' | 'separate' | 'none'
export function createWordsComponentsFixture(kind: WordsComponentsFixtureKind = 'styled') {
  const words = kind === 'positioned' ? '<words default-x="12">molto</words><words default-x="42">dolce</words>' : kind === 'plain' ? '<words>molto</words><words>dolce</words>' : '<words font-weight="bold">molto</words><words font-style="italic">dolce</words>'
  const direction = () => kind === 'single' ? '<direction placement="below"><direction-type><words font-style="italic">dolce</words></direction-type></direction>'
    : kind === 'separate' ? '<direction placement="above"><direction-type><words>molto</words></direction-type><direction-type><words>dolce</words></direction-type></direction>'
    : `<direction><direction-type>${words}</direction-type></direction>`
  const parts = [1, 2].map(part => `<part id="P${part}">${[1, 2, 3].map(bar => `<measure number="${kind === 'normalized' && part === 2 && bar === 2 ? 'intro' : bar}">${bar === 1 ? '<attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>' : ''}${part === 2 && bar === 2 && kind !== 'none' ? direction() + (kind === 'multiple' ? direction() : '') : kind === 'multiple' && part === 1 && bar === 3 ? direction() : ''}<note><pitch><step>${part === 1 ? 'C' : 'D'}</step><octave>4</octave></pitch><duration>16</duration><type>whole</type></note></measure>`).join('')}</part>`).join('')
  return `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><work><work-title>여러 글자 조각 검증</work-title></work><part-list><score-part id="P1"><part-name>Flute 1</part-name></score-part><score-part id="P2"><part-name>Flute 2</part-name></score-part></part-list>${parts}</score-partwise>`
}
export const stripWordsComponentDirections = (xml: string) => xml.replace(/<direction(?:\s[^>]*)?>[\s\S]*?<\/direction>/g, '')
