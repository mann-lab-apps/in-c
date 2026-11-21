export const notePassCases = ['first-pass', 'second-pass', 'multiple-passes', 'chord-member', 'secondary', 'rest', 'grace', 'tie-and-note', 'control'] as const
export type NotePassCase = typeof notePassCases[number]

/** Raw note attributes are deliberately distinct from tie and sound conditions. */
export function createNotePassFixture(kind: NotePassCase, override?: string) {
  const condition = kind === 'control' ? undefined : override ?? (kind === 'first-pass' ? '1' : kind === 'multiple-passes' ? '1, 3' : '2')
  const owner = kind === 'secondary' ? 2 : 1
  const attribute = condition === undefined ? '' : ` time-only="${condition}"`
  const parts = [1, 2].map(part => {
    const owned = part === owner, pitch = (step: string) => `<pitch><step>${step}</step><octave>4</octave></pitch>`
    const grace = owned && kind === 'grace' ? `<note${attribute}><grace/>${pitch('F')}<type>eighth</type></note>` : ''
    const firstAttribute = owned && kind !== 'grace' && kind !== 'chord-member' ? attribute : ''
    const tie = owned && kind === 'tie-and-note'
    const first = `<note${firstAttribute}>${owned && kind === 'rest' ? '<rest/>' : pitch('C')}<duration>2</duration>${tie ? '<tie type="start" time-only="1"/>' : ''}<type>half</type></note>`
    const chord = owned && kind === 'chord-member' ? `<note${attribute}><chord/>${pitch('E')}<duration>2</duration><type>half</type></note>` : ''
    const second = `<note>${pitch(tie ? 'C' : 'D')}<duration>2</duration>${tie ? '<tie type="stop" time-only="1"/>' : ''}<type>half</type></note>`
    return `<part id="P${part}"><measure number="7"><attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><barline location="left"><repeat direction="forward"/></barline>${grace}${first}${chord}${second}<barline location="right"><repeat direction="backward" times="${kind === 'multiple-passes' ? 3 : 2}"/></barline></measure></part>`
  }).join('')
  const xml = `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><work><work-title>음표 반복 회차 조건</work-title></work><part-list><score-part id="P1"><part-name>Piano One</part-name></score-part><score-part id="P2"><part-name>Piano Two</part-name></score-part></part-list>${parts}</score-partwise>`
  // Only remove the note attribute; leave the independent conditional tie intact.
  const plain = xml.replace(/<note time-only="[^"]*">/g, '<note>')
  return { kind, xml, plain, condition, owner, eventIndex: kind === 'chord-member' ? 2 : 1 }
}
