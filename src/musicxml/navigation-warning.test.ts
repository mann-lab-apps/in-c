import { expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { makeNavigationSoundXml } from '../testing/navigation-sound-fixture'
import { parseMusicXml, parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'
const warnings = (xml: string) => parseMusicXmlWithReport(xml).report.warnings.filter(w => w.message.startsWith('Playback navigation sound '))
const attributes = [['dacapo','yes'],['dalsegno','S1'],['segno','S1'],['coda','C1'],['tocoda','C1'],['fine','yes'],['forward-repeat','yes']] as const
it.each(attributes.flatMap(([attribute,value])=>['direction','direct'].map(container=>({attribute,value,container:container as 'direction'|'direct'}))))('reports explicit lost navigation with the exact owner: %j', options=>{
  const xml=makeNavigationSoundXml({...options,midMeasure:true}),plain=xml.replace(/<sound [^>]*><offset>-4<\/offset><\/sound>/,''),{score}=parseMusicXmlWithReport(xml),part=2,bar=2
  const path=options.container==='direct'?`part[${part}].measure[${bar}].sound[1].${options.attribute}`:`part[${part}].measure[${bar}].direction[1].sound.${options.attribute}`
  expect(warnings(xml)).toEqual([expect.objectContaining({code:'unsupported-direction',partNumber:part,measureNumber:bar,path,message:expect.stringContaining(`"${options.attribute}" value "${options.value}"`)})])
  expect(score).toEqual(parseMusicXml(plain));expect(createPlaybackTimeline(score)).toEqual(createPlaybackTimeline(parseMusicXml(plain)))
  const native=decodeNativeProject(encodeNativeProject(createNativeProject(score)));expect(serializeMidi(native.score)).toEqual(serializeMidi(parseMusicXml(plain)))
  const copy=serializeMusicXml(score);expect(copy).not.toMatch(/\b(?:dacapo|dalsegno|segno|coda|tocoda|fine|forward-repeat)=/);expect(serializeMidi(parseMusicXml(copy))).toEqual(serializeMidi(score))
  const dir=process.env.STUDIO_NAVIGATION_QA_DIR
  if(dir&&options.attribute==='dacapo'){mkdirSync(dir,{recursive:true});writeFileSync(join(dir,`${options.container}.musicxml`),xml,{flag:'wx'});writeFileSync(join(dir,`${options.container}-expected.chromatics`),encodeNativeProject(native),{flag:'wx'})}
})
it.each(['dacapo','forward-repeat'])('does not call inactive %s=no an active jump',attribute=>expect(warnings(makeNavigationSoundXml({attribute,value:'no'}))).toEqual([]))
it.each(['segno','coda','tocoda'])('does not infer a navigation target from an empty %s token',attribute=>expect(warnings(makeNavigationSoundXml({attribute,value:''}))).toEqual([]))
it('does not infer a jump from ordinary displayed words',()=>expect(warnings(makeNavigationSoundXml({wordsOnly:true}))).toEqual([]))
it.each([['tempo','60'],['damper-pedal','yes']] as const)('does not label supported sound %s as navigation', (attribute,value)=>expect(warnings(makeNavigationSoundXml({attribute,value}))).toEqual([]))
it('keeps source label text without interpreting or rewriting it',()=>{
 const xml=makeNavigationSoundXml({attribute:'dalsegno',value:'S & "1"'})
 expect(warnings(xml)[0]?.message).toContain('S & "1"');expect(warnings(xml)[0]?.path).toBe('part[2].measure[2].direction[1].sound.dalsegno')
})
