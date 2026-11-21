export const pizzicatoCases = ['note-yes', 'note-no', 'note-secondary', 'chord-member', 'two-parts', 'direction-yes', 'direction-no', 'direction-pair', 'direction-secondary', 'measure-yes', 'measure-no', 'measure-pair', 'technical-control', 'empty-sound-control', 'control'] as const
export type PizzicatoCase = typeof pizzicatoCases[number]
export function createPizzicatoFixture(kind: PizzicatoCase) {
  const expected: { scope: 'note' | 'sound'; value: string; partNumber: number; eventIndex?: number; path: string }[] = []
  const parts = [1, 2].map(part => {
    const owned = kind === 'two-parts' || part === (kind.endsWith('secondary') ? 2 : 1)
    const base = `part[${part}].measure[7]`
    const attr = (scope: 'note' | 'sound', value: string, path: string, eventIndex?: number) => {
      expected.push({ scope, value, partNumber: part, ...(eventIndex === undefined ? {} : { eventIndex }), path })
      return ` pizzicato="${value}"`
    }
    const noteAttr = owned && (kind.startsWith('note-') || kind === 'two-parts') ? attr('note', kind === 'note-no' ? 'no' : 'yes', `${base}.note[1].@pizzicato`, 1) : ''
    const pitch = (step: string) => `<pitch><step>${step}</step><octave>4</octave></pitch>`
    const technical = owned && kind === 'technical-control' ? '<notations><technical><pluck>p</pluck></technical></notations>' : ''
    const first = `<note${noteAttr}>${pitch('C')}<duration>2</duration><type>half</type>${technical}</note>`
    const chord = owned && kind === 'chord-member' ? `<note${attr('note', 'yes', `${base}.note[2].@pizzicato`, 2)}><chord/>${pitch('E')}<duration>2</duration><type>half</type></note>` : ''
    const second = `<note>${pitch('D')}<duration>2</duration><type>half</type></note>`
    const direction = (value: string, index: number) => `<direction><direction-type><words>${value === 'yes' ? 'pizz.' : 'arco'}</words></direction-type><sound${attr('sound', value, `${base}.direction[${index}].sound.@pizzicato`)}/></direction>`
    const sound = (value: string, index: number) => `<sound${attr('sound', value, `${base}.sound[${index}].@pizzicato`)}/>`
    const before = owned && kind.startsWith('direction-') ? direction(kind === 'direction-no' ? 'no' : 'yes', 1) : owned && kind.startsWith('measure-') ? sound(kind === 'measure-no' ? 'no' : 'yes', 1) : owned && kind === 'empty-sound-control' ? '<sound/>' : ''
    const between = owned && kind === 'direction-pair' ? direction('no', 2) : owned && kind === 'measure-pair' ? sound('no', 2) : ''
    return `<part id="P${part}"><measure number="7"><attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><barline location="left"><repeat direction="forward"/></barline>${before}${first}${chord}${between}${second}<barline location="right"><repeat direction="backward" times="2"/></barline></measure></part>`
  }).join('')
  const xml = `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><work><work-title>피치카토·아르코 교환 지시</work-title></work><part-list><score-part id="P1"><part-name>Piano One</part-name></score-part><score-part id="P2"><part-name>Piano Two</part-name></score-part></part-list>${parts}</score-partwise>`
  return { kind, xml, plain: xml.replace(/ pizzicato="(?:yes|no)"/g, ''), expected }
}
