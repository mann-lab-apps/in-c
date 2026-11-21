import { expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { TICKS_PER_QUARTER } from '../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { makeMeasureRestXml } from '../testing/measure-rest-fixture'
import { makeMeasureRestDurationXml } from '../testing/measure-rest-duration-fixture'
import { parseMusicXml, parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'
const warnings = (xml: string) => parseMusicXmlWithReport(xml).report.warnings.filter(w => w.message.startsWith('Full-measure rest duration '))
it.each([8,20].flatMap(units=>[false,true].map(explicitType=>({units,explicitType}))))('reports source duration loss without changing current music: %j', ({ units, explicitType }) => {
  const xml=makeMeasureRestDurationXml(units,explicitType),parsed=parseMusicXmlWithReport(xml),same=parseMusicXml(makeMeasureRestDurationXml(16,explicitType))
  expect(warnings(xml)).toEqual([expect.objectContaining({code:'unsupported-notation',partNumber:1,measureNumber:1,eventIndex:2,path:'part[1].measure[1].note[2].duration',message:expect.stringContaining(`${units*TICKS_PER_QUARTER/4}`)})])
  expect(warnings(xml)[0].message).toContain(`${4*TICKS_PER_QUARTER}`)
  expect(parsed.score).toEqual(same);expect(serializeMidi(parsed.score)).toEqual(serializeMidi(same))
  const native=decodeNativeProject(encodeNativeProject(createNativeProject(parsed.score)))
  expect(serializeMidi(parseMusicXml(serializeMusicXml(native.score)))).toEqual(serializeMidi(same))
  const dir=process.env.STUDIO_REST_DURATION_QA_DIR
  if(dir&&!explicitType){mkdirSync(dir,{recursive:true});writeFileSync(join(dir,`rest-${units}.musicxml`),xml,{flag:'wx'});writeFileSync(join(dir,`rest-${units}-expected.chromatics`),encodeNativeProject(native),{flag:'wx'})}
})
it.each([[3,4,false],[6,8,false],[3,8,false],[4,4,true]] as const)('uses actual meter/pickup length, not the graphic whole type, as the %i/%i control', (beats,beatType,pickup)=>{
  expect(warnings(makeMeasureRestXml(beats,beatType,false,pickup))).toEqual([])
})
it('keeps division inheritance and the actual second-measure note index in the diagnostic',()=>{
  const base=makeMeasureRestDurationXml(16),marker='<rest measure="yes"/><duration>16</duration><voice>2</voice>',index=base.lastIndexOf(marker)
  const xml=(base.slice(0,index)+base.slice(index).replace(marker,'<rest measure="yes"/><duration>8</duration><voice>2</voice>')).replace('<divisions>4</divisions>','<divisions>2</divisions>').replace(/<duration>(\d+)<\/duration>/g,(_,n)=>`<duration>${Number(n)/2}</duration>`)
  expect(warnings(xml)).toEqual([expect.objectContaining({partNumber:1,measureNumber:2,eventIndex:5,path:'part[1].measure[2].note[5].duration',message:expect.stringContaining(`${2*TICKS_PER_QUARTER}`)})])
})
it('does not warn when an explicitly different staff meter matches its own full rest',()=>{
  const xml=makeMeasureRestXml().replace('<staves>2</staves>','<time number="2"><beats>3</beats><beat-type>4</beat-type></time><staves>2</staves>').replaceAll('<rest measure="yes"/><duration>16</duration><voice>2</voice>','<rest measure="yes"/><duration>12</duration><voice>2</voice>')
  expect(warnings(xml)).toEqual([])
})
