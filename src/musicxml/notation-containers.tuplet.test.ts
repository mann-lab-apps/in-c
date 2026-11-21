import { expect, it } from 'vitest'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'

type Grouping = 'single' | 'split-first' | 'split-last' | 'split-both' | 'before-both'
function fixture(mode: Grouping = 'single') {
  return `<?xml version="1.0"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>3</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>${['C','D','E'].map((step,index) => `<note><pitch><step>${step}</step><octave>4</octave></pitch><duration>1</duration><type>eighth</type><time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>${index===1 ? '' : `${mode==='before-both' ? '<notations/>' : ''}<notations><tuplet type="${index===0 ? 'start' : 'stop'}"/></notations>${mode==='split-both'||mode==='split-first'&&index===0||mode==='split-last'&&index===2 ? '<notations/>' : ''}`}</note>`).join('')}<note><rest/><duration>9</duration><type>half</type><dot/></note></measure></part></score-partwise>`
}

it.each(['single', 'split-first', 'split-last', 'split-both', 'before-both'] as const)('retains an existing explicit 3:2 group across notation containers: %s', mode => {
  const actual = parseMusicXmlWithReport(fixture(mode)), control = parseMusicXmlWithReport(fixture())
  expect(actual.report.warnings).toEqual([])
  expect(actual.score).toEqual(control.score)
  const voice = actual.score.parts[0].staves[0].measures[0].voices[0]
  expect(voice.tuplets).toEqual([{ id: 'measure-1-tuplet-1', eventIds: ['event-1','event-2','event-3'], actualNotes: 3, normalNotes: 2 }])
  expect(createPlaybackTimeline(actual.score).totalBeats).toBe(4)
  expect(serializeMidi(actual.score)).toEqual(serializeMidi(control.score))
  const native = encodeNativeProject(createNativeProject(actual.score))
  expect(native).toBe(encodeNativeProject(createNativeProject(control.score)))
  expect(decodeNativeProject(native).score).toEqual(control.score)
  const xml = serializeMusicXml(actual.score)
  expect(xml).toBe(serializeMusicXml(control.score))
  expect(parseMusicXmlWithReport(xml).score.parts[0].staves[0].measures[0].voices[0].tuplets).toEqual(voice.tuplets)
})

it.each(['start', 'stop'])('still rejects a genuinely missing %s marker', type => {
  const xml = fixture('split-both').replace(`<tuplet type="${type}"/>`, '')
  expect(() => parseMusicXmlWithReport(xml)).toThrow(/MusicXML.*tuplet/)
})

it('keeps unsupported nested group starts rejected even in a later notation container', () => {
  const xml = fixture().replace('<step>D</step><octave>4</octave></pitch><duration>1</duration><type>eighth</type><time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>', '<step>D</step><octave>4</octave></pitch><duration>1</duration><type>eighth</type><time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification><notations/><notations><tuplet type="start" number="2"/></notations>')
  expect(() => parseMusicXmlWithReport(xml)).toThrow('중첩 또는 비율 없는 tuplet은 지원하지 않습니다')
})
