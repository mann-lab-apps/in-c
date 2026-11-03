import { expect,it } from 'vitest'
import { mkdirSync,writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createDirectSoundTempoFixture } from '../testing/direct-sound-tempo-fixture'
import { parseMusicXml,parseMusicXmlWithReport } from './parse'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createNativeProject,encodeNativeProject } from '../project/schema'

it.each(['<sound/>','<sound></sound>'])('keeps the held pedal across an empty playback instruction %s',empty=>{
 const base=createDirectSoundTempoFixture('pedal').xml,measure='<measure number="2"><note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note></measure>'
 const plain=base.replace('</part>',measure+'</part>'),xml=plain.replace('<measure number="2">','<measure number="2">'+empty),baseline=parseMusicXml(plain),{score,report}=parseMusicXmlWithReport(xml)
 expect(baseline.pedalEvents).toHaveLength(1);expect(baseline.pedalEvents![0].value).toBe(127)
 expect(score).toEqual(baseline);expect(report.warnings).toEqual([]);expect(serializeMidi(score)).toEqual(serializeMidi(baseline))
 const out=process.env.DDIRORI_EMPTY_SOUND_QA_DIR
 if(out){const dir=join(out,empty.includes('</')?'paired':'self-closing');mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.musicxml'),xml);writeFileSync(join(dir,'expected.chromatics'),encodeNativeProject(createNativeProject(baseline)));writeFileSync(join(dir,'expected.mid'),serializeMidi(baseline))}
})
