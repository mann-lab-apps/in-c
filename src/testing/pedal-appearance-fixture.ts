export type PedalAppearanceCase = 'plain' | 'sign' | 'default' | 'hidden' | 'line' | 'sound' | 'secondary' | 'multiple'

/** Deliberately plain musical content: visible pedal signs and CC64 are separate contracts. */
export function createPedalAppearanceFixture(kind: PedalAppearanceCase = 'sign'): string {
  const direction = (type: 'start' | 'stop', value: number) => {
    if (kind === 'plain') return ''
    if (kind === 'sound') return `<sound damper-pedal="${value}"/>`
    const attributes = kind === 'default' ? '' : kind === 'hidden' ? ' sign="no" line="no"' : kind === 'line' ? ' sign="no" line="yes"' : kind === 'secondary' ? ' number="2" sign="yes" line="no"' : ' sign="yes" line="no"'
    const pedal = `<pedal type="${type}"${attributes}/>`
    return `<direction><direction-type>${pedal}${kind === 'multiple' ? pedal : ''}</direction-type></direction>`
  }
  const note = '<note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><type>half</type></note>'
  return `<?xml version="1.0"?><score-partwise version="4.0"><work><work-title>Pedal display audit</work-title></work><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>${direction('start', 100)}${note}${direction('stop', 0)}${note}</measure></part></score-partwise>`
}
