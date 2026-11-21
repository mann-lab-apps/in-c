// Visible, ordinary whole-note music. Only the representation of its existing
// markings changes; no new note/technical-instruction model is introduced.
export function createNotationContainerFixture(groups: readonly string[] = [
  '<articulations><staccato/></articulations>',
  '<technical><fingering>2</fingering></technical>'
]): string {
  return `<?xml version="1.0"?><score-partwise version="4.0"><work><work-title>Later notation container probe</work-title></work><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type>${groups.map(group => `<notations>${group}</notations>`).join('')}</note></measure></part></score-partwise>`
}
