import {expect,it} from 'vitest'
import {parseMusicXmlWithReport,parseMusicXml} from './parse'
import {serializeMusicXml} from './serialize'
import {serializeMidi} from '../renderer/src/midi/serialize-midi'
import {createNativeProject,encodeNativeProject,decodeNativeProject} from '../project/schema'
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {createInlineClefFixture as fixture} from '../testing/inline-clef-fixture'
it.each(['middle','end'])('warns about unpreserved %s clef position without claiming inline support',kind=>{
 const xml=fixture(kind),{score,report}=parseMusicXmlWithReport(xml)
 expect(report.warnings).toContainEqual(expect.objectContaining({code:'unsupported-notation',measureNumber:2,path:'part[1].measure[2].attributes[1].clef[1]'}))
 expect(report.warnings.find(w=>w.path.endsWith('.clef[1]'))?.message).toMatch(/위치.*보존/)
 expect(score).toEqual(parseMusicXml(xml))
 const native=createNativeProject(score),output=serializeMusicXml(score)
 expect(decodeNativeProject(encodeNativeProject(native)).score).toEqual(score)
 expect(serializeMidi(parseMusicXml(output))).toEqual(serializeMidi(score))
 const out=process.env.STUDIO_INLINE_CLEF_QA_DIR
 if(out){mkdirSync(out,{recursive:true});writeFileSync(join(out,`${kind}.musicxml`),xml);writeFileSync(join(out,`${kind}.chromatics`),encodeNativeProject(native))}
})
it.each(['start','backup'])('does not warn about a clef at musical tick zero: %s',kind=>{
 const {score,report}=parseMusicXmlWithReport(fixture(kind));expect(report.warnings.filter(w=>w.path.endsWith('.clef[1]'))).toEqual([]);expect(score.parts[0].staves[0].measures[1].clef).toMatchObject({sign:'F',line:4})
})

it.each(['middle', 'end'])('carries the %s clef at the next measure independently of redundant divisions', kind => {
  const xml = fixture(kind)
  const redundant = xml.replace('<measure number="2">', '<measure number="2"><attributes><divisions>1</divisions></attributes>')
  const { score, report } = parseMusicXmlWithReport(redundant)
  expect(score).toEqual(parseMusicXml(xml))
  expect(score.parts[0].staves[0].measures.map(({ clef }) => [clef.sign, clef.line]))
    .toEqual([['G', 2], ['G', 2], ['F', 4]])
  expect(report.warnings).toContainEqual(expect.objectContaining({
    partNumber: 1, measureNumber: 2, path: 'part[1].measure[2].attributes[2].clef[1]'
  }))

  const preserved = parseMusicXml(redundant.replace('<attributes><clef><sign>F</sign><line>4</line></clef></attributes>', ''))
  expect(serializeMidi(score)).toEqual(serializeMidi(preserved))
  expect(parseMusicXml(serializeMusicXml(score))).toEqual(score)
})

it.each([false, true])('uses musical position and preserves a distinct next opening clef when specified (%s)', override => {
  const clef = (sign: string, line: number, staffNumber: number) =>
    `<clef number="${staffNumber}"><sign>${sign}</sign><line>${line}</line></clef>`
  const attrs = (...entries: string[]) => `<attributes>${entries.join('')}</attributes>`
  const note = (step: string, staff: number) =>
    `<note><pitch><step>${step}</step><octave>${staff === 1 ? 4 : 3}</octave></pitch><duration>1</duration><type>quarter</type><staff>${staff}</staff></note>`
  const backup = '<backup><duration>2</duration></backup>'
  const upperNotes = note('E', 1) + note('G', 1)
  const lowerNotes = note('C', 2) + note('D', 2)
  const opening = attrs('<divisions>1</divisions><time><beats>2</beats><beat-type>4</beat-type></time><staves>2</staves>',
    clef('G', 2, 1), clef('F', 4, 2))
  const secondOpening = attrs(clef('F', 3, 2))
  const secondUpperEnd = attrs(clef('C', 4, 1))
  const secondMid = attrs(clef('F', 5, 1), clef('C', 3, 2))
  const thirdOpening = override ? attrs(clef('G', 1, 1)) : ''
  const music = [opening + upperNotes + backup + lowerNotes,
    upperNotes + secondUpperEnd + backup + secondOpening + note('C', 2) + secondMid + note('D', 2),
    thirdOpening + upperNotes + backup + lowerNotes]
  const xml = '<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Two staves</part-name></score-part></part-list><part id="P1">' +
    music.map((body, index) => `<measure number="${index + 1}">${body}</measure>`).join('') + '</part></score-partwise>'

  const { score, report } = parseMusicXmlWithReport(xml)
  expect(score.parts[0].staves.map(({ measures }) => measures.map(({ clef }) => [clef.sign, clef.line])))
    .toEqual([[['G', 2], ['G', 2], override ? ['G', 1] : ['C', 4]], [['F', 4], ['F', 3], ['C', 3]]])
  expect(report.warnings.map(warning => warning.path)).toEqual([
    'part[1].measure[2].attributes[1].clef[1]',
    'part[1].measure[2].attributes[3].clef[1]',
    'part[1].measure[2].attributes[3].clef[2]'
  ])
  expect(parseMusicXml(serializeMusicXml(score))).toEqual(score)
})
