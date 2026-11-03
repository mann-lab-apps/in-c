import { parseMusicXml } from '../musicxml/parse'

export function createMidiChannelFixture(count: number, emptyOverflow = false) {
 if (!Number.isInteger(count) || count < 1 || count > 31) throw new Error('Invalid owned MIDI fixture size')
 const title = `MIDI shared channels ${count}${emptyOverflow ? ' empty' : ''}`
 const name = (index: number) => index === 15 ? 'Flute' : index === 16 ? 'Bassoon' : 'Piano'
 const definitions = Array.from({ length: count }, (_, index) => `<score-part id="P${index + 1}"><part-name>${name(index)}</part-name></score-part>`).join('')
 const parts = Array.from({ length: count }, (_, index) => `<part id="P${index + 1}"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><note>${emptyOverflow && index === 15 ? '<rest/>' : '<pitch><step>C</step><octave>4</octave></pitch>'}<duration>4</duration><voice>1</voice><type>whole</type></note></measure></part>`).join('')
 const xml = `<?xml version="1.0"?><score-partwise version="4.0"><work><work-title>${title}</work-title></work><part-list>${definitions}</part-list>${parts}</score-partwise>`
 return { title, xml, score: parseMusicXml(xml) }
}
