import{expect,it}from'vitest'
import{mkdirSync,writeFileSync}from'node:fs'
import{join}from'node:path'
import{createNoteheadFixture}from'../testing/notehead-fixture'
import{parseMusicXml,parseMusicXmlWithReport}from'./parse'
import{serializeMusicXml}from'./serialize'
import{createNativeProject,encodeNativeProject,decodeNativeProject}from'../project/schema'
import{createPlaybackTimeline}from'../renderer/src/playback/timeline'
import{serializeMidi}from'../renderer/src/midi/serialize-midi'
const cases=[{id:'diamond',head:'diamond',value:'whole',owner:'main'}, {id:'none',head:'none',value:'quarter',owner:'main'}, {id:'slash-chord',head:'slash',value:'whole',owner:'chord'}, {id:'diamond-grace',head:'diamond',value:'whole',owner:'grace'}, {id:'filled-whole',head:'normal',value:'whole',filled:'yes',owner:'main'}, {id:'hollow-quarter',head:'normal',value:'quarter',filled:'no',owner:'main'}, {id:'parentheses',head:'normal',value:'quarter',parentheses:'yes',owner:'main'}, {id:'smufl',head:'other',value:'whole',smufl:'noteheadDiamondWhole',owner:'main'}, {id:'cross-half',head:'x',value:'half',owner:'main'}]as const
const warnings=(xml:string)=>parseMusicXmlWithReport(xml).report.warnings.filter(w=>w.message.startsWith('Explicit notehead appearance '))
it.each(cases)('reports explicit notehead loss with original owner $id',options=>{
 const xml=createNoteheadFixture({...options,partCount:2,targetPart:2,targetMeasure:2}),plain=xml.replace(/<notehead[^>]*>[^<]*<\/notehead>/,''),score=parseMusicXml(xml),event=options.owner==='chord'?2:1
 expect(warnings(xml)).toEqual([expect.objectContaining({code:'unsupported-notation',partNumber:2,measureNumber:2,eventIndex:event,path:`part[2].measure[2].note[${event}].notehead`,message:expect.stringContaining(options.head)})])
 expect(score).toEqual(parseMusicXml(plain));expect(createPlaybackTimeline(score)).toEqual(createPlaybackTimeline(parseMusicXml(plain)));expect(serializeMidi(score)).toEqual(serializeMidi(parseMusicXml(plain)))
 const native=decodeNativeProject(encodeNativeProject(createNativeProject(score)));expect(serializeMidi(native.score)).toEqual(serializeMidi(score))
 const copy=serializeMusicXml(score);expect(copy).not.toMatch(/<notehead(?:\s|>)/);expect(serializeMidi(parseMusicXml(copy))).toEqual(serializeMidi(score))
 const dir=process.env.STUDIO_NOTEHEAD_QA_DIR
 if(dir&&['diamond','hollow-quarter'].includes(options.id)){mkdirSync(dir,{recursive:true});writeFileSync(join(dir,options.id+'.musicxml'),xml,{flag:'wx'});writeFileSync(join(dir,options.id+'-expected.chromatics'),encodeNativeProject(native),{flag:'wx'})}
})
it.each([{value:'whole',head:'normal'},{value:'half',head:'normal',filled:'no'},{value:'quarter',head:'normal',filled:'yes'},{value:'eighth',head:'normal',filled:'yes'},{value:'whole',head:'normal',parentheses:'no'},{value:'whole',head:'normal',owner:'grace',filled:'yes'}]as const)('does not mislabel supported default appearance %j',options=>expect(warnings(createNoteheadFixture(options))).toEqual([]))
it('does not diagnose ordinary notes without explicit notehead markup',()=>expect(warnings(createNoteheadFixture().replace(/<notehead[^>]*>[^<]*<\/notehead>/,''))).toEqual([]))
