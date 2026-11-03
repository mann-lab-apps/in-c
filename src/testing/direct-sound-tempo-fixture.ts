export type DirectSoundTempoCase = 'initial' | 'direct' | 'matching' | 'secondary' | 'direction' | 'pedal'

export function createDirectSoundTempoFixture(kind: DirectSoundTempoCase) {
  const title = `Direct sound tempo ${kind}`
  const tempo = (bpm: number) => `<direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${bpm}</per-minute></metronome></direction-type><sound tempo="${bpm}"/></direction>`
  const measure = (data: string) => `<measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>${data}<note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note></measure>`
  const direct = kind === 'initial' ? '<sound tempo="60"/>'
    : kind === 'matching' ? '<sound tempo="120"/>'
    : kind === 'direct' || kind === 'secondary' ? '<sound tempo="60"><offset>1</offset></sound>'
    : kind === 'pedal' ? '<sound damper-pedal="100"/>' : ''
  const primary = kind === 'initial' ? direct : tempo(kind === 'direction' ? 60 : 120) + (kind === 'secondary' ? '' : direct)
  const xml = `<?xml version="1.0"?><score-partwise version="4.0"><work><work-title>${title}</work-title></work><part-list><score-part id="P1"><part-name>Piano</part-name></score-part>${kind === 'secondary' ? '<score-part id="P2"><part-name>Neighbor</part-name></score-part>' : ''}</part-list><part id="P1">${measure(primary)}</part>${kind === 'secondary' ? `<part id="P2">${measure(direct)}</part>` : ''}</score-partwise>`
  return { title, xml }
}
