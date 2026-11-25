import { expect, it } from 'vitest'
import { parseMusicXml, serializeMusicXml } from '../../../musicxml'
import { createPlaybackTimeline } from './timeline'

function tieHairpinXml(anchor: 'start' | 'end', repeat: boolean) {
  const tieAt = anchor === 'start' ? 0 : 2
  const pitches = anchor === 'start' ? ['C', 'C', 'E', 'F'] : ['G', 'A', 'C', 'C']
  const notes = pitches.map((pitch, index) => {
    const tie = index === tieAt ? 'start' : index === tieAt + 1 ? 'stop' : undefined
    return `<note><pitch><step>${pitch}</step><octave>4</octave></pitch><duration>1</duration>
      ${tie ? `<tie type="${tie}"/>` : ''}<voice>1</voice><type>quarter</type>
      ${tie ? `<notations><tied type="${tie}"/></notations>` : ''}</note>`
  })
  return `<score-partwise version="4.0"><part-list><score-part id="P1">
    <part-name>Piano</part-name></score-part></part-list><part id="P1">
    <measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>
    <clef><sign>G</sign><line>2</line></clef></attributes>
    ${repeat ? '<barline location="left"><repeat direction="forward"/></barline>' : ''}
    <direction><direction-type><wedge type="crescendo"/></direction-type><offset>${anchor === 'start' ? 1 : 0}</offset><voice>1</voice></direction>
    <direction><direction-type><wedge type="stop"/></direction-type><offset>3</offset><voice>1</voice></direction>
    ${notes.join('')}
    ${repeat ? '<barline location="right"><repeat direction="backward" times="2"/></barline>' : ''}
    </measure></part></score-partwise>`
}

it.each(['start', 'end'] as const)('keeps a hairpin attached to an unstruck tied %s on each repeat pass', anchor => {
  const score = parseMusicXml(tieHairpinXml(anchor, true))
  for (const current of [score, parseMusicXml(serializeMusicXml(score))]) {
    const events = createPlaybackTimeline(current).events
    const expectedTiming = anchor === 'start' ? [[0, 2], [2, 1], [3, 1]] : [[0, 1], [1, 1], [2, 2]]
    for (const offset of [0, 4]) {
      const pass = events.filter(event => event.startBeat >= offset && event.startBeat < offset + 4)
      expect(pass.map(event => [event.startBeat - offset, event.durationBeats])).toEqual(expectedTiming)
      expect(pass[0].velocityStart).toBeCloseTo(.16)
      expect(pass[1].velocityStart).toBeCloseTo(anchor === 'start' ? .16 + .08 / 3 : .18)
      expect(pass[2].velocityEnd).toBeCloseTo(.24)
      expect(pass.filter(event => event.tiedEvents?.length)).toHaveLength(1)
    }
  }
})
