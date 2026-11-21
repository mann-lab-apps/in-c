export type SoundPedalSource = 'direction' | 'measure'
/** Supported score stays identical when only unrepresented pedal attributes differ. */
export function createSoundPedalFixture(attributes: Record<string, string> = {}, source: SoundPedalSource = 'direction', owner = 2) {
  const values = Object.entries(attributes).map(([key, value]) => ` ${key}="${value}"`).join('')
  const instruction = source === 'measure' ? `<sound${values}/>`
    : `<direction><direction-type><words/></direction-type><sound${values}/></direction>`
  const parts = [1, 2].map(part => `<part id="P${part}"><measure number="7"><attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>${part === owner ? instruction : ''}<note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><type>half</type></note><note><pitch><step>D</step><octave>4</octave></pitch><duration>2</duration><type>half</type></note></measure></part>`).join('')
  return `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><work><work-title>소프트·소스테누토 재생 지시</work-title></work><part-list><score-part id="P1"><part-name>Piano One</part-name></score-part><score-part id="P2"><part-name>Piano Two</part-name></score-part></part-list>${parts}</score-partwise>`
}
