export type StaffLineKind = 'one' | 'six' | 'zero' | 'second-staff' | 'multiple' | 'normalized' | 'none' | 'five' | 'padded-five' | 'size-only'

export function createStaffLineFixture(kind: StaffLineKind = 'one'): string {
  const detail = (lines: string, number = 1) => '<staff-details number="' + number + '"><staff-lines>' + lines + '</staff-lines></staff-details>'
  const details = kind === 'none' ? '' : kind === 'size-only' ? '<staff-details><staff-size>70</staff-size></staff-details>'
    : kind === 'multiple' ? detail('1') + detail('6', 2)
      : detail(kind === 'six' ? '6' : kind === 'zero' ? '0' : kind === 'five' ? '5' : kind === 'padded-five' ? '05' : '1', kind === 'second-staff' ? 2 : 1)
  const note = (staff: number) => '<note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type><staff>' + staff + '</staff></note>'
  const attributes = (two: boolean, extra = '') => '<attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time>' + (two ? '<staves>2</staves>' : '')
    + '<clef number="1"><sign>G</sign><line>2</line></clef>' + (two ? '<clef number="2"><sign>G</sign><line>2</line></clef>' : '') + extra + '</attributes>'
  const part = (id: string, two: boolean) => '<part id="' + id + '">' + [7, 10].map((number, index) => '<measure number="' + (kind === 'normalized' && two && index === 1 ? 'intro' : number) + '">'
    + attributes(two, two && index === 1 ? details : '') + note(1) + (two ? '<backup><duration>4</duration></backup>' + note(2) : '') + '</measure>').join('') + '</part>'
  return '<?xml version="1.0"?><score-partwise version="4.0"><work><work-title>보표 줄 수 손실 검증</work-title></work><part-list><score-part id="P1"><part-name>Solo</part-name></score-part><score-part id="P2"><part-name>Keyboard</part-name></score-part></part-list>'
    + part('P1', false) + part('P2', true) + '</score-partwise>'
}
