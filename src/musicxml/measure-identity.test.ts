import { expect, it } from 'vitest'
import { TICKS_PER_QUARTER as q, validateTieRelations, validateMeasureRhythm, type Score } from '../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { createMeasureIdentityFixture, replaceMeasureLabels } from '../testing/measure-identity-fixture'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { parseMusicXml, parseMusicXmlWithReport, serializeMusicXml, type MusicXmlImportReport } from './index'
import { expandScoreRepeatsForMusicXml } from './expand-repeats'

// This fixture also exports two visible pedal signs. Their newly reported
// appearance loss must coexist with (and never hide) the identity diagnostics.
function expectPedalAppearanceDiagnostics(score: Score, report: MusicXmlImportReport) {
  const pedal = report.warnings.filter(warning => warning.message.startsWith('Unrepresented pedal sign '))
  const measures = score.parts[0].staves[0].measures
  expect(pedal).toEqual([[measures[1].number, 3, 'start'], [measures[3].number, 2, 'stop']].map(([measure, direction, type]) => expect.objectContaining({
    code: 'unsupported-direction', partNumber: 1, measureNumber: measure,
    path: `part[1].measure[${measure}].direction[${direction}].pedal[1]`,
    message: expect.stringContaining(`"type":"${type}"`)
  })))
  return report.warnings.filter(warning => !warning.message.startsWith('Unrepresented pedal sign '))
}

const cases = [
  { kind: 'alpha', labels: ['10', '2a', '30', '40'] },
  { kind: 'zero', labels: ['0', '1', '2', '3'] },
  { kind: 'duplicate', labels: ['1', '1', '3', '4'] },
  { kind: 'negative', labels: ['1', '-2', '3', '4'] },
  { kind: 'decimal', labels: ['1', '2.5', '3', '4'] },
  { kind: 'unsafe', labels: ['1', '9007199254740992', '3', '4'] },
  { kind: 'normalized-duplicate', labels: ['01', '1', '3', '4'] },
  { kind: 'empty', labels: ['1', '', '3', '4'] },
  { kind: 'missing-collision', labels: [undefined, '1', '3', '4'] }
]
it('control keeps nonzero node-keyed source timing, concrete spans, ties and global layout', () => {
  const { control } = createMeasureIdentityFixture(0, ['1', '2', '3', '4']), { score, report } = parseMusicXmlWithReport(control)
  expect(expectPedalAppearanceDiagnostics(score, report)).toEqual([])
  expect(score.tempo?.bpm).toBe(120)
  expect(score.tempoEvents?.map(t => [t.tick, t.bpm]).sort((a,b) => a[0] - b[0])).toEqual([[q, 84], [3*q, 72]])
  expect(score.harmonies?.map(h => h.tick).sort((a,b) => a-b)).toEqual([q, q, 2*q])
  expect(score.pedalEvents?.map(p => [p.tick, p.value])).toEqual([[q, 127], [2*q, 0]])
  expect(score.expressionTexts?.[0].tick).toBe(2*q)
  expect(validateTieRelations(score)).toEqual([])
  expect(score.layout?.systemBreakBeforeMeasureIds).toEqual([score.parts[0].staves[0].measures[2].id])
  const address = (id:string) => {
    for (const [pi,p] of score.parts.entries()) for (const [si,s] of p.staves.entries()) for (const [bi,b] of s.measures.entries()) for (const v of b.voices) {
      const e=v.events.find(e=>e.id===id);if(e)return[pi,si,bi,e.position.tick]
    }
    throw Error('Missing concrete source anchor')
  }
  expect(score.slurs?.map(s=>[address(s.startEventId),address(s.endEventId)])).toEqual([[[0,0,0,0],[0,0,2,2*q]]])
  expect(score.hairpins?.map(s=>[address(s.startEventId),address(s.endEventId)])).toEqual([[[0,1,0,2*q],[0,1,2,0]]])
  expect(score.octaveShifts?.map(s=>[address(s.startEventId),address(s.endEventId)])).toEqual([[[1,0,1,0],[1,0,3,2*q]]])
  expect(() => createNativeProject(score)).not.toThrow()
})
it.each(cases.flatMap(row => [0,1].map(partIndex => ({...row,partIndex}))))('normalizes only source part $partIndex with $kind identifiers and retains annotation/timing identities', ({labels,partIndex}) => {
  const { source, control } = createMeasureIdentityFixture(partIndex, labels), expected = parseMusicXml(control), result = parseMusicXmlWithReport(source)
  expect(result.score).toEqual(expected)
  expect(result.score.parts[partIndex].staves.every(s => s.measures.every((b,i) => b.number === i+1))).toBe(true)
  expect(result.score.parts[1-partIndex]).toEqual(expected.parts[1-partIndex])
  const identityWarnings = expectPedalAppearanceDiagnostics(result.score, result.report)
  expect(identityWarnings).toHaveLength(1)
  expect(identityWarnings[0]).toMatchObject({code:'unsupported-notation',partNumber:partIndex+1,path:`part[${partIndex+1}]`,message:expect.stringContaining('Source measure identifiers normalized')})
  for (const label of labels) if (label !== undefined) expect(identityWarnings[0].message).toContain(JSON.stringify(label))
  const native = encodeNativeProject(createNativeProject(result.score))
  expect(decodeNativeProject(native).score).toEqual(expected)
  expect(parseMusicXml(source)).toEqual(expected)
  const midi = serializeMidi(expected)
  expect(serializeMidi(result.score)).toEqual(midi)
  for (const score of [result.score, parseMusicXml(serializeMusicXml(result.score))]) {
    expect(serializeMidi(score)).toEqual(midi)
    for (const part of score.parts) for (const staff of part.staves) for (const bar of staff.measures) expect(validateMeasureRhythm(bar).isExact).toBe(true)
  }
})
it('retains the existing unsupported cross-jump span rejection for source and control', () => {
  const { source, control } = createMeasureIdentityFixture(0, ['10','2a','30','40'])
  for (const xml of [source,control]) {
    const score = parseMusicXml(xml), before = encodeNativeProject(createNativeProject(score))
    expect(() => expandScoreRepeatsForMusicXml(score)).toThrow('이 악보의 일부 표기는 아직 반복 펼치기로 옮길 수 없습니다.')
    expect(encodeNativeProject(createNativeProject(score))).toBe(before)
  }
})
it.each([0,1].flatMap(partIndex=>cases.filter(row=>['alpha','zero'].includes(row.kind)).map(row=>({...row,partIndex}))))('preserves supported expanded-copy music for $kind in part $partIndex', ({labels,partIndex}) => {
  const { source,control } = createMeasureIdentityFixture(partIndex,labels,true), expected = parseMusicXml(control), score = parseMusicXml(source)
  expect(score).toEqual(expected)
  const midi = serializeMidi(expected), expanded = expandScoreRepeatsForMusicXml(score)
  expect(serializeMidi(expanded)).toEqual(midi)
  expect(serializeMidi(parseMusicXml(serializeMusicXml(expanded)))).toEqual(midi)
  expect(expanded.parts.every(p=>p.staves.every(s=>s.measures.every(b=>!b.repeat&&!b.volta)))).toBe(true)
})
it.each([
  ['10','20','30','40'], ['40','30','20','10'], ['01','02','03','04'], [undefined,'2','3','4']
])('preserves existing unique positive numeric identities and legacy missing fallback: %j', (...labels) => {
  const { source } = createMeasureIdentityFixture(1, labels), result = parseMusicXmlWithReport(source)
  expect(result.score.parts[1].staves[0].measures.map(b=>b.number)).toEqual(labels.map((label,i)=>label===undefined?i+1:Number(label)))
  expect(expectPedalAppearanceDiagnostics(result.score, result.report)).toEqual([])
  expect(() => createNativeProject(result.score)).not.toThrow()
})

it('normalizes both affected parts independently with one complete diagnostic mapping per part', () => {
  const { source } = createMeasureIdentityFixture(0, ['0','1','2','3'])
  const xml = replaceMeasureLabels(source, 1, ['A','B','B','D']), result = parseMusicXmlWithReport(xml)
  const identityWarnings = expectPedalAppearanceDiagnostics(result.score, result.report)
  expect(identityWarnings).toHaveLength(2)
  expect(identityWarnings.map(w=>w.partNumber)).toEqual([1,2])
  for (const p of result.score.parts) for (const staff of p.staves) expect(staff.measures.map(b=>b.number)).toEqual([1,2,3,4])
  const control = parseMusicXml(replaceMeasureLabels(replaceMeasureLabels(xml,0,['1','2','3','4']),1,['1','2','3','4']))
  expect(result.score).toEqual(control)
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score).toEqual(control)
  expect(serializeMidi(result.score)).toEqual(serializeMidi(control))
})
it.each([['beats','2a'],['staff','upper']])('does not loosen the generic integer reader for %s', (kind,value) => {
  const { source } = createMeasureIdentityFixture(0,['0','1','2','3'])
  const xml = kind==='beats' ? source.replace('<beats>4</beats>',`<beats>${value}</beats>`) : source.replace('<clef number="1">',`<clef number="${value}">`)
  expect(xml).not.toBe(source)
  expect(()=>parseMusicXml(xml)).toThrow()
})
