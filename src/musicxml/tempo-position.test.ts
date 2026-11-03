import { describe, expect, it } from 'vitest'
import { XMLParser } from 'fast-xml-parser'
import { TICKS_PER_QUARTER } from '../score-core'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { parseMusicXml } from './parse'
import { serializeMusicXml } from './serialize'

function direction(text:string,bpm:number,offset?:number):string {
  return `<direction placement="above"><direction-type><words>${text}</words></direction-type><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${bpm}</per-minute></metronome></direction-type>${offset===undefined?'':`<offset sound="yes">${offset}</offset>`}<sound tempo="${bpm}"/></direction>`
}
function sourceXml(divisions:number,placement:'offset'|'cursor',secondDivisions?:number):string {
  const notes=(d:number)=>['C','D','E','F'].map(step=>`<note><pitch><step>${step}</step><octave>4</octave></pitch><duration>${d}</duration><voice>1</voice><type>quarter</type></note>`)
  const first=notes(divisions),second=notes(secondDivisions??divisions)
  const bar=(items:string[],index:number,text:string,bpm:number,d:number)=>placement==='offset'
    ?direction(text,bpm,index*d)+items.join('')
    :items.slice(0,index).join('')+direction(text,bpm)+items.slice(index).join('')
  return `<score-partwise version="4.0"><work><work-title>Tempo position ${divisions}-${placement}-${secondDivisions??'inherited'}</work-title></work><part-list><score-part id="P1"><part-name>Solo</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>${divisions}</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>${direction('Global tempo',120)}${bar(first,1,'First change',80,divisions)}</measure><measure number="2">${secondDivisions?`<attributes><divisions>${secondDivisions}</divisions></attributes>`:''}${bar(second,2,'Second change',72,secondDivisions??divisions)}</measure></part></score-partwise>`
}

describe('MusicXML tempo direction positions',()=>{
  it('writes shared positioned tempo offsets as playback-active MusicXML positions',()=>{
    const score=parseMusicXml(sourceXml(1,'offset')),before=structuredClone(score),xml=serializeMusicXml(score),root=new XMLParser({ignoreAttributes:false}).parse(xml)['score-partwise']
    type Direction={offset?:number|{'#text':number;'@_sound'?:string}}
    const measures=root.part.measure as {direction:Direction|Direction[]}[]
    const positioned=measures.flatMap(measure=>Array.isArray(measure.direction)?measure.direction:[measure.direction]).filter(direction=>direction.offset!==undefined)
    expect(positioned).toHaveLength(2)
    expect(positioned.map(item=>typeof item.offset==='object'?item.offset['@_sound']:undefined)).toEqual(['yes','yes'])
    expect(positioned.map(item=>Number(typeof item.offset==='object'?item.offset['#text']:item.offset))).toEqual([TICKS_PER_QUARTER,TICKS_PER_QUARTER*2])
    expect(serializeMidi(parseMusicXml(xml))).toEqual(serializeMidi(score));expect(score).toEqual(before)
  })

  it('keeps the earlier Studio offset-only import contract without moving native anchors',()=>{
    const xml=sourceXml(1,'offset').replaceAll(' sound="yes"',''),score=parseMusicXml(xml)
    expect(score.tempoEvents?.map(event=>event.tick)).toEqual([TICKS_PER_QUARTER,TICKS_PER_QUARTER*2])
    expect(serializeMidi(parseMusicXml(serializeMusicXml(score)))).toEqual(serializeMidi(score))
  })
  it.each(([{divisions:1},{divisions:2},{divisions:7},{divisions:2,secondDivisions:7}] as const).flatMap(config=>(['offset','cursor'] as const).map(placement=>({...config,placement}))))('normalizes $divisions/$secondDivisions $placement without changing notes or MIDI',async config=>{
    const secondDivisions='secondDivisions'in config?config.secondDivisions:undefined
    const xml=sourceXml(config.divisions,config.placement,secondDivisions),score=parseMusicXml(xml)
    expect(score.tempoEvents?.map(event=>event.tick)).toEqual([TICKS_PER_QUARTER,TICKS_PER_QUARTER*2])
    // Independent canonical input uses native divisions and explicit offsets.
    const expected=parseMusicXml(sourceXml(TICKS_PER_QUARTER,'offset'));expected.title=score.title
    expect(expected.tempoEvents?.map(event=>event.tick)).toEqual([TICKS_PER_QUARTER,TICKS_PER_QUARTER*2])
    expect(score).toEqual(expected)
    expect(serializeMidi(score)).toEqual(serializeMidi(expected))
    const reopened=parseMusicXml(serializeMusicXml(score))
    expect(reopened.tempoEvents?.map(({tick,bpm,text})=>({tick,bpm,text}))).toEqual([{tick:TICKS_PER_QUARTER,bpm:80,text:'First change'},{tick:TICKS_PER_QUARTER*2,bpm:72,text:'Second change'}])
    expect(serializeMidi(reopened)).toEqual(serializeMidi(expected))
    if(process.env.DDIRORI_TEMPO_UNITS_QA_DIR){
      const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path')
      const kind=`${config.divisions}-${config.placement}-${secondDivisions??'inherited'}`,dir=join(process.env.DDIRORI_TEMPO_UNITS_QA_DIR,kind);mkdirSync(dir,{recursive:true})
      const edited=structuredClone(expected),target=edited.tempoEvents![0];edited.tempoEvents=[edited.tempoEvents![1],{...target,bpm:88}]
      writeFileSync(join(dir,'source.musicxml'),xml);writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(createNativeProject(expected)));writeFileSync(join(dir,'edited.chromatics'),encodeNativeProject(createNativeProject(edited)));writeFileSync(join(dir,'source.mid'),serializeMidi(expected));writeFileSync(join(dir,'edited.mid'),serializeMidi(edited))
      writeFileSync(join(dir,'expectations.json'),JSON.stringify({kind,title:score.title,eventId:score.parts[0].staves[0].measures[0].voices[0].events[1].id}))
    }
  })

  it('accepts a fractional divisions offset when it is an exact native tick',()=>{
    const xml=sourceXml(1,'offset').replace('<offset sound="yes">1</offset>','<offset sound="yes">0.5</offset>')
    const score=parseMusicXml(xml)
    expect(score.tempoEvents?.map(event=>event.tick)).toEqual([TICKS_PER_QUARTER/2,TICKS_PER_QUARTER*2])
    expect(parseMusicXml(serializeMusicXml(score)).tempoEvents?.map(event=>event.tick)).toEqual([TICKS_PER_QUARTER/2,TICKS_PER_QUARTER*2])
  })
})
