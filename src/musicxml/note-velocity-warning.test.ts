import { expect,it } from 'vitest'
import { mkdirSync,writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createNoteVelocityFixture,type NoteVelocityCase } from '../testing/note-velocity-fixture'
import { parseMusicXml,parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createNativeProject,encodeNativeProject } from '../project/schema'

it.each(['attack','release','both','chord-member','secondary','two-parts']as NoteVelocityCase[])('diagnoses unrepresented per-note velocity for %s without changing the current model',kind=>{
 const {xml}=createNoteVelocityFixture(kind),plain=xml.replace(/ (?:dynamics|end-dynamics)="[^"]*"/g,''),baseline=parseMusicXml(plain),{score,report}=parseMusicXmlWithReport(xml)
 expect(score).toEqual(baseline);expect(serializeMidi(score)).toEqual(serializeMidi(baseline));expect(serializeMusicXml(score)).toBe(serializeMusicXml(baseline))
 const parts=kind==='two-parts'?[1,2]:[kind==='secondary'?2:1],attributes=kind==='both'?['dynamics','end-dynamics']:[kind==='release'?'end-dynamics':'dynamics'],eventIndex=kind==='chord-member'?2:1
 expect(report.warnings.map(w=>w.path)).toEqual(parts.flatMap(part=>attributes.map(attribute=>`part[${part}].measure[1].note[${eventIndex}].${attribute}`)))
 expect(report.warnings.every(w=>w.code==='unsupported-notation'&&w.eventIndex===eventIndex&&w.message.startsWith('Explicit note '))).toBe(true)
 const out=process.env.DDIRORI_NOTE_VELOCITY_QA_DIR
 if(out){const dir=join(out,kind);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.musicxml'),xml);writeFileSync(join(dir,'expected.chromatics'),encodeNativeProject(createNativeProject(baseline)));writeFileSync(join(dir,'expected.mid'),serializeMidi(baseline));writeFileSync(join(dir,'warnings.json'),JSON.stringify(report,null,2))}
})
it.each(['0','12.5','200'])('keeps raw note dynamics %s diagnosed instead of muting or clamping notes',value=>{
 const {xml}=createNoteVelocityFixture('attack',value),{score,report}=parseMusicXmlWithReport(xml)
 expect(score.parts[0].staves[0].measures[0].voices[0].events[0].type).toBe('note');expect(report.warnings).toHaveLength(1);expect(report.warnings[0].message).toContain(`(${value}%`)
})
it('does not warn when no per-note velocity was provided',()=>{
 const {xml}=createNoteVelocityFixture('attack');expect(parseMusicXmlWithReport(xml.replace(' dynamics="20"','')).report.warnings).toEqual([])
})
