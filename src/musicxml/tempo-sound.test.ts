import { XMLParser } from 'fast-xml-parser'
import { describe,expect,it } from 'vitest'
import { createNote,createScore,TICKS_PER_QUARTER } from '../score-core'
import { createNativeProject,encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { parseMusicXml,parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'

const cases=[
  {beatUnit:'quarter',dots:0,bpm:96,quarter:96},
  {beatUnit:'half',dots:0,bpm:96,quarter:192},
  {beatUnit:'quarter',dots:1,bpm:80,quarter:120},
  {beatUnit:'eighth',dots:0,bpm:96,quarter:48},
  {beatUnit:'half',dots:1,bpm:96,quarter:288},
  {beatUnit:'64th',dots:0,bpm:60,quarter:3.75}
] as const
const inputs=cases.flatMap(entry=>(['global','position'] as const).map(scope=>({...entry,scope})))
function fixture(entry:typeof inputs[number]){
  const {beatUnit,dots,bpm,scope}=entry,mark={beatUnit,dots,bpm,text:'Reference '+beatUnit},score=createScore()
  score.title=`Tempo sound ${scope}-${beatUnit}-${dots}-${bpm}`
  score.tempo=scope==='global'?mark:{bpm:120,beatUnit:'quarter',dots:0,text:'Global tempo'}
  if(scope==='position')score.tempoEvents=[{id:'sound-change',measureId:score.parts[0].staves[0].measures[0].id,tick:TICKS_PER_QUARTER,...mark}]
  score.parts[0].staves[0].measures[0].voices[0].events=['C','D','E','F'].map((step,index)=>createNote({id:'sound-note-'+index,pitch:{step:step as 'C'|'D'|'E'|'F',octave:4},duration:{value:'quarter',dots:0},position:{tick:index*TICKS_PER_QUARTER}}))
  return{score,mark,index:scope==='global'?0:1,kind:`${scope}-${beatUnit}-${dots}-${bpm}`}
}
function replaceSound(xml:string,index:number,quarter:number){
  let current=0
  return xml.replace(/<sound tempo="[^"]+"\s*\/>/g,value=>current++===index?`<sound tempo="${quarter}"/>`:value)
}

describe('MusicXML tempo sound units',()=>{
  it('keeps the source part in independent-tempo diagnostics',()=>{
    const {score}=fixture({...cases[1],scope:'position'}),xml=serializeMusicXml(score)
    const originalPart=xml.match(/<part id="part-1">[\s\S]*?<\/part>/)![0]
    const secondPart=replaceSound(originalPart.replace('<part id="part-1">','<part id="part-2">'),1,90)
    const combined=xml.replace('</part-list>','<score-part id="part-2"><part-name>Neighbor</part-name></score-part></part-list>').replace('</score-partwise>',secondPart+'</score-partwise>')
    const {report}=parseMusicXmlWithReport(combined)
    expect(report.warnings).toHaveLength(1);expect(report.warnings[0].path).toBe('part[2].measure[1].direction[2].sound.tempo')
  })

  it.each(['sound','legacy','offset-default','offset-no','override','matched','normal'] as const)('reports unsupported independent tempo semantics for %s without changing the imported model',async kind=>{
    const entry=kind==='sound'?{beatUnit:'half',dots:0,bpm:96,quarter:192,scope:'position'} as const:kind==='legacy'?{beatUnit:'half',dots:1,bpm:96,quarter:288,scope:'position'} as const:{beatUnit:'quarter',dots:0,bpm:96,quarter:96,scope:'position'} as const
    const {score,index}=fixture(entry);let xml=serializeMusicXml(score)
    if(kind==='sound'||kind==='legacy')xml=replaceSound(xml,index,kind==='sound'?90:96)
    if(kind==='offset-default'||kind==='matched')xml=xml.replace('<offset sound="yes">','<offset>')
    if(kind==='offset-no')xml=xml.replace('<offset sound="yes">','<offset sound="no">')
    if(kind==='override'||kind==='matched')xml=xml.replace('<sound tempo="96"/>',`<sound tempo="96"><offset>${TICKS_PER_QUARTER*(kind==='override'?2:1)}</offset></sound>`)
    const baseline=parseMusicXml(xml),{score:imported,report}=parseMusicXmlWithReport(xml),unsupported=kind!=='normal'&&kind!=='matched'
    expect(imported).toEqual(baseline);expect(serializeMidi(imported)).toEqual(serializeMidi(baseline))
    expect(report.warnings).toHaveLength(unsupported?1:0)
    if(unsupported){
      expect(report.warnings[0]).toMatchObject({code:'unsupported-direction',measureNumber:1})
      expect(report.warnings[0].path).toMatch(/^part\[1\]\.measure\[1\]\.direction\[2\]\./)
      expect(report.warnings[0].message).toContain(kind==='sound'||kind==='legacy'?'Independent sound tempo':'Independent tempo offset')
    }
    if(process.env.DDIRORI_TEMPO_WARNING_QA_DIR){
      const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path'),dir=join(process.env.DDIRORI_TEMPO_WARNING_QA_DIR,kind);mkdirSync(dir,{recursive:true})
      writeFileSync(join(dir,'source.musicxml'),xml);writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(createNativeProject(imported)));writeFileSync(join(dir,'source.mid'),serializeMidi(imported));writeFileSync(join(dir,'warnings.json'),JSON.stringify(report,null,2))
    }
  })

  it.each(inputs)('reads $scope $beatUnit/$dots per-minute separately from quarter sound tempo',async entry=>{
    const {score,mark,index,kind}=fixture(entry),xml=replaceSound(serializeMusicXml(score),index,entry.quarter),parsed=parseMusicXml(xml)
    expect(entry.scope==='global'?parsed.tempo:parsed.tempoEvents?.[0]).toMatchObject(mark)
    expect(serializeMidi(parsed)).toEqual(serializeMidi(score))
    if(process.env.DDIRORI_TEMPO_SOUND_QA_DIR){
      const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path'),dir=join(process.env.DDIRORI_TEMPO_SOUND_QA_DIR,kind);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.musicxml'),xml)
      if(entry.scope==='position'){
        const edited=structuredClone(parsed);edited.tempoEvents=[{...edited.tempoEvents![0],bpm:88}]
        writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(createNativeProject(parsed)));writeFileSync(join(dir,'edited.chromatics'),encodeNativeProject(createNativeProject(edited)));writeFileSync(join(dir,'source.mid'),serializeMidi(parsed));writeFileSync(join(dir,'edited.mid'),serializeMidi(edited))
        writeFileSync(join(dir,'expectations.json'),JSON.stringify({kind,title:parsed.title,eventId:parsed.parts[0].staves[0].measures[0].voices[0].events[1].id,originalBpm:entry.bpm}))
      }
    }
  })

  it.each(inputs)('writes $scope $beatUnit/$dots playback as quarter BPM while retaining native notation',async entry=>{
    const {score,index,kind}=fixture(entry),before=structuredClone(score),xml=serializeMusicXml(score),tree=new XMLParser({ignoreAttributes:false}).parse(xml)
    const direction=tree['score-partwise'].part.measure.direction,rows=Array.isArray(direction)?direction:[direction]
    expect(Number(rows[index].sound['@_tempo'])).toBe(entry.quarter)
    expect(serializeMidi(parseMusicXml(xml))).toEqual(serializeMidi(score));expect(score).toEqual(before)
    if(process.env.DDIRORI_TEMPO_SOUND_QA_DIR){const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path'),dir=join(process.env.DDIRORI_TEMPO_SOUND_QA_DIR,kind);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'output.musicxml'),xml)}
  })

  it.each(['global','position'] as const)('keeps old Studio $scope XML that used raw BPM in sound readable',scope=>{
    const entry={beatUnit:'half',dots:1,bpm:96,quarter:288,scope} as const,{score,index}=fixture(entry)
    const legacy=replaceSound(serializeMusicXml(score),index,96),parsed=parseMusicXml(legacy)
    expect(scope==='global'?parsed.tempo:parsed.tempoEvents?.[0]).toMatchObject({bpm:96,beatUnit:'half',dots:1})
    expect(serializeMidi(parsed)).toEqual(serializeMidi(score))
  })
})
