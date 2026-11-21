// Synthetic two-bar compatibility score, not a user document.
export function createBarlineStyleFixture({ style = 'light-light', location = 'right', repeat, partCount = 1,
  targetPart = 1, targetMeasure = 1 }: {
  style?: string; location?: string; repeat?: 'forward' | 'backward'; partCount?: number; targetPart?: number; targetMeasure?: number
} = {}): string {
  const line = `<barline location="${location}">${style === 'omitted' ? '' : `<bar-style>${style}</bar-style>`}${repeat ? `<repeat direction="${repeat}"${repeat === 'backward' ? ' times="2"' : ''}/>` : ''}</barline>`
  const parts = Array.from({ length: partCount }, (_, p) => `<part id="P${p + 1}">${[1, 2].map(m => {
    const selected = p + 1 === targetPart && m === targetMeasure
    const note = `<note><pitch><step>${m === 1 ? 'C' : 'D'}</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>`
    return `<measure number="${m}">${m === 1 ? '<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>' : ''}${selected && location === 'left' ? line : ''}${note}${selected && location !== 'left' ? line : ''}</measure>`
  }).join('')}</part>`).join('')
  return `<?xml version="1.0"?><score-partwise version="4.0"><work><work-title>마디선 ${style}</work-title></work><part-list>${Array.from({ length: partCount }, (_, p) => `<score-part id="P${p + 1}"><part-name>Barline ${p + 1}</part-name></score-part>`).join('')}</part-list>${parts}</score-partwise>`
}
