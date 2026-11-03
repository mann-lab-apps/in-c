import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { createPrintHeaderFixture } from '../testing/print-header-fixture'
import { applyScoreCommand, buildTieCommand } from '../score-core'
import { decodeNativeProject, encodeNativeProject } from './schema'
it('isolates the pending open from a dirty existing tie command without changing input files',()=>{
 const project=createPrintHeaderFixture('short'),edited=structuredClone(project),replacement=structuredClone(project)
 project.score.title='Owned wizard baseline';edited.score.title=project.score.title;replacement.score.title='Owned fresh file'
 const id=project.score.parts[0].staves[0].measures[0].voices[0].events[0].id,command=buildTieCommand(project.score,id,true)
 expect(command).toBeDefined();edited.score=applyScoreCommand(project.score,command!).score
 for(const value of [project,edited,replacement])expect(decodeNativeProject(encodeNativeProject(value))).toEqual(value)
 const out=process.env.DDIRORI_OPEN_WIZARD_QA_DIR
 if(out){mkdirSync(out,{recursive:true});for(const [name,value]of Object.entries({source:project,edited,replacement}))writeFileSync(join(out,name+'.chromatics'),encodeNativeProject(value))}
})
