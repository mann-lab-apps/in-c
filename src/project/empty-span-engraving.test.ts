import { describe, expect, it } from 'vitest'
import { applyScoreCommand, type SpanEngraving } from '../score-core'
import { createWholeChordTieScore } from '../testing/chord-tie-fixture'
import { buildSpanEngravingCommand } from '../renderer/src/editor/span-editing'
import { serializeMusicXmlWithReport } from '../musicxml'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from './schema'

describe.each(['slur','hairpin'] as const)('empty %s engraving existing automatic contract',kind=>{
 const fixture=(engraving:SpanEngraving)=>{
  const score=createWholeChordTieScore(false),span={id:'owned-span',startEventId:'chord-tie-1',endEventId:'chord-tie-2',engraving}
  if(kind==='slur')score.slurs=[span];else score.hairpins=[{...span,type:'crescendo'}]
  return score
 }
 it.each([{}, {placement:undefined,offsetX:undefined,offsetY:undefined,height:undefined}])('does not report nonexistent manual geometry loss for %j',engraving=>{
  const score=fixture(engraving),before=structuredClone(score),key=kind==='slur'?'slurs':'hairpins',path=`score.${key}[0].engraving`,result=serializeMusicXmlWithReport(score)
  // The existing command builder already defines all-empty geometry as automatic.
  const normalized=applyScoreCommand(score,buildSpanEngravingCommand(score,{kind,id:'owned-span'},engraving)).score
  expect(normalized[key]?.[0].engraving).toBeUndefined()
  expect(result.report.warnings.filter(w=>w.path===path)).toEqual([])
  expect(result.contents).toBe(serializeMusicXmlWithReport(normalized).contents)
  const saved=encodeNativeProject(createNativeProject(score)),reopened=decodeNativeProject(saved)
  expect(reopened.score[key]?.[0].engraving).toEqual({});expect(encodeNativeProject(reopened)).toBe(saved);expect(score).toEqual(before)
 })
 it('keeps explicit zero manual, warnable and native-exact',()=>{
  const score=fixture({offsetY:0}),key=kind==='slur'?'slurs':'hairpins',path=`score.${key}[0].engraving`
  expect(serializeMusicXmlWithReport(score).report.warnings).toContainEqual(expect.objectContaining({code:'unsupported-layout',path}))
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score[key]?.[0].engraving).toEqual({offsetY:0})
 })
})
