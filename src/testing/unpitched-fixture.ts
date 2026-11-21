// Synthetic support-boundary fixture; display position is not a musical pitch.
export function createUnpitchedFixture({ owner = 'main', kind = 'unpitched', display = true, line = true }: {
  owner?: 'main' | 'grace' | 'chord'; kind?: 'unpitched' | 'pitched' | 'rest' | 'missing'; display?: boolean; line?: boolean
} = {}) {
  const pitch = '<pitch><step>C</step><octave>5</octave></pitch>'
  const symbol = kind === 'pitched' ? pitch : kind === 'rest' ? '<rest/>' : kind === 'missing' ? ''
    : display ? '<unpitched><display-step>C</display-step><display-octave>5</display-octave></unpitched>' : '<unpitched/>'
  const note = owner === 'grace' ? `<note><grace/>${symbol}<type>eighth</type></note><note>${pitch}<duration>4</duration><type>whole</type></note>`
    : owner === 'chord' ? `<note>${pitch}<duration>4</duration><type>whole</type></note><note><chord/>${symbol}<duration>4</duration><type>whole</type></note>`
    : `<note>${symbol}<duration>4</duration><type>whole</type></note>`
  return `<?xml version="1.0"?><score-partwise version="4.0"><work><work-title>Unpitched import QA ${owner} ${kind}</work-title></work><part-list><score-part id="P1"><part-name>Snare QA</part-name><score-instrument id="I1"><instrument-name>Snare drum</instrument-name></score-instrument><midi-instrument id="I1"><midi-channel>10</midi-channel><midi-unpitched>39</midi-unpitched></midi-instrument></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>percussion</sign>${line ? '<line>2</line>' : ''}</clef></attributes>${note}</measure></part></score-partwise>`
}
