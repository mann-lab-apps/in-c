// Synthetic MusicXML source, not a new notation/playback model.
export type ArpeggioFixtureKind = 'arpeggiate' | 'arpeggiate-down' | 'non-arpeggiate' | 'glissando' | 'slide' | 'control'
export function createArpeggioFixture(kind: ArpeggioFixtureKind = 'arpeggiate') {
  const note = (step: string, chord = false, notation = '') => `<note>${chord ? '<chord/>' : ''}<pitch><step>${step}</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type>${notation ? `<notations>${notation}</notations>` : ''}</note>`
  const parts = [1, 2].map(part => `<part id="P${part}">${[1, 2].map(bar => {
    const marks = ['', '', '', '', '', '']
    if (part === 2 && bar === 2) {
      if (kind === 'arpeggiate' || kind === 'arpeggiate-down') marks.fill(`<arpeggiate direction="${kind === 'arpeggiate-down' ? 'down' : 'up'}" number="1"/>`, 0, 3)
      else if (kind === 'non-arpeggiate') { marks[0] = '<non-arpeggiate type="bottom" number="1"/>'; marks[2] = '<non-arpeggiate type="top" number="1"/>' }
      else if (kind === 'glissando' || kind === 'slide') { marks[0] = `<${kind} type="start" number="1">gliss.</${kind}>`; marks[3] = `<${kind} type="stop" number="1"/>` }
    }
    const attributes = bar === 1 ? '<attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>' : ''
    return `<measure number="${bar}">${attributes}${note('C', false, marks[0])}${note('E', true, marks[1])}${note('G', true, marks[2])}${note('D', false, marks[3])}${note('E')}${note('F')}</measure>`
  }).join('')}</part>`).join('')
  return `<?xml version="1.0"?><score-partwise version="4.0"><work><work-title>추가 표현 기호 조사 ${kind}</work-title></work><part-list><score-part id="P1"><part-name>Piano 1</part-name></score-part><score-part id="P2"><part-name>Piano 2</part-name></score-part></part-list>${parts}</score-partwise>`
}
