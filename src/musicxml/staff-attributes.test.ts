import { expect, it } from 'vitest'
import { XMLParser } from 'fast-xml-parser'
import { parseMusicXml, serializeMusicXml } from './index'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

function staffXml(changes: string[] = []) {
 const notes='<note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type><staff>1</staff></note><backup><duration>4</duration></backup><note><pitch><step>G</step><octave>3</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type><staff>2</staff></note>'
 return '<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1">'+Array.from({length:6},(_,i)=>`<measure number="${i+1}">${i===0?'<attributes><divisions>1</divisions><key><fifths>-1</fifths><mode>major</mode></key><time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>':changes[i]?'<attributes>'+changes[i]+'</attributes>':''}${notes}</measure>`).join('')+'</part></score-partwise>'
}
const key=(number:number|undefined,fifths:number)=>`<key${number===undefined?'':` number="${number}"`}><fifths>${fifths}</fifths><mode>major</mode></key>`
const time=(number:number|undefined,beats:number,beatType:number)=>`<time${number===undefined?'':` number="${number}"`}><beats>${beats}</beats><beat-type>${beatType}</beat-type></time>`
const attrs=(score:ReturnType<typeof parseMusicXml>)=>score.parts[0].staves.map(s=>s.measures.map(m=>({key:m.keySignature,time:m.timeSignature})))

it.each([1,2])('imports staff %i key/meter changes without leaking to its neighbor,including inheritance and global reset',number=>{
 const xml=staffXml(['',key(number,4)+time(number,2,2),'',key(undefined,0)+time(undefined,4,4),key(3-number,-3)+time(3-number,2,2)])
 const score=parseMusicXml(xml),staves=attrs(score)
 for(let staff=0;staff<2;staff++){
  expect(staves[staff][0]).toEqual({key:{fifths:-1,mode:'major'},time:{beats:4,beatType:4}})
  for(const index of [1,2])expect(staves[staff][index]).toEqual(staff===number-1?{key:{fifths:4,mode:'major'},time:{beats:2,beatType:2}}:staves[staff][0])
  expect(staves[staff][3]).toEqual({key:{fifths:0,mode:'major'},time:{beats:4,beatType:4}})
  for(const index of [4,5])expect(staves[staff][index]).toEqual(staff===2-number?{key:{fifths:-3,mode:'major'},time:{beats:2,beatType:2}}:staves[staff][3])
 }
})

it('exports different existing staff keys/meters explicitly and preserves neighbor MIDI and all authored values on reimport',()=>{
 const source=parseMusicXml(staffXml())
 for(const m of source.parts[0].staves[0].measures.slice(2,4)){m.keySignature={fifths:4,mode:'major'};m.timeSignature={beats:2,beatType:2}}
 const before=structuredClone(source),midi=serializeMidi(source),xml=serializeMusicXml(source),tree=new XMLParser({ignoreAttributes:false}).parse(xml)['score-partwise'].part.measure
 for(const i of [2,3]){
  expect(tree[i].attributes.key.map((v:any)=>[v['@_number'],v.fifths])).toEqual([['1',4],['2',-1]])
  expect(tree[i].attributes.time.map((v:any)=>[v['@_number'],v.beats,v['beat-type']])).toEqual([['1',2,2],['2',4,4]])
 }
 const reopened=parseMusicXml(xml)
 expect(attrs(reopened)).toEqual(attrs(source));expect(serializeMidi(reopened)).toEqual(midi);expect(source).toEqual(before)
})

it('retains the unnumbered shared form when all staff keys/meters match',()=>{
 const source=parseMusicXml(staffXml()),xml=serializeMusicXml(source)
 expect(xml).not.toMatch(/<(?:key|time) number=/)
 expect(attrs(parseMusicXml(xml))).toEqual(attrs(source));expect(serializeMidi(parseMusicXml(xml))).toEqual(serializeMidi(source))
})

it.each([0,3])('rejects out-of-range numbered key and time staff %i instead of applying it to all staves',number=>{
 for(const element of [key(number,4),time(number,2,2)])expect(()=>parseMusicXml(staffXml(['',element]))).toThrow(/staff|보표/i)
})

it('applies an unnumbered reset then a scoped override in the same attributes block',()=>{
 const score=parseMusicXml(staffXml(['',key(undefined,0)+key(1,4)+time(undefined,4,4)+time(2,2,2)]))
 const values=attrs(score)
 expect(values[0][1]).toEqual({key:{fifths:4,mode:'major'},time:{beats:4,beatType:4}})
 expect(values[1][1]).toEqual({key:{fifths:0,mode:'major'},time:{beats:2,beatType:2}})
 expect(attrs(parseMusicXml(serializeMusicXml(score)))).toEqual(values)
})
it('keeps different modes with the same fifths scoped rather than discarding the lower mode',()=>{
 const source=parseMusicXml(staffXml());source.parts[0].staves[1].measures[2].keySignature={fifths:-1,mode:'minor'}
 expect(attrs(parseMusicXml(serializeMusicXml(source)))).toEqual(attrs(source))
})
