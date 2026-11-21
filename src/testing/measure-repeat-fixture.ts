// Repeated music is explicit in the notes; measure-repeat is notation only.
export const measureRepeatCases: readonly { id: string; count: number; start: number; stop?: number; bars: number }[] = [
  { id: 'one', count: 1, start: 2, stop: 3, bars: 4 },
  { id: 'two', count: 2, start: 3, stop: 5, bars: 5 },
  { id: 'four-open-end', count: 4, start: 5, bars: 8 }
] as const

export function createMeasureRepeatFixture(
  spec: { id: string; count: number; start: number; stop?: number; bars: number } = measureRepeatCases[0],
  options: { include?: boolean; slashes?: string; staff?: string } = {}
): string {
  const marks = (n: number) => {
    if (options.include === false) return ''
    const staff = options.staff === undefined ? '' : ` number="${options.staff}"`
    if (n === spec.start) return `<measure-style${staff}><measure-repeat type="start"${options.slashes === 'omitted' ? '' : ` slashes="${options.slashes ?? '1'}"`}>${spec.count}</measure-repeat></measure-style>`
    if (n === spec.stop) return `<measure-style${staff}><measure-repeat type="stop"/></measure-style>`
    return ''
  }
  const bars = Array.from({ length: spec.bars }, (_, i) => {
    const n = i + 1
    const base = n === 1 ? '<divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef>' : ''
    // Keep empty attribute containers in the plain control, matching removal
    // of only the style directive from the audited source bytes.
    return `<measure number="${n}">${base || n === spec.start || n === spec.stop ? `<attributes>${base}${marks(n)}</attributes>` : ''}<note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note></measure>`
  }).join('')
  return `<?xml version="1.0"?><score-partwise version="4.0"><work><work-title>Read-only measure repeat ${spec.id}</work-title></work><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1">${bars}</part></score-partwise>`
}
