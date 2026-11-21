// Supported scalar dynamics retain only a measure anchor in the current model.
export type DynamicPositionKind='start'|'cursor'|'offset'|'zero'|'compensated'|'voice'|'combined'|'cursor-zero'
interface DynamicPositionCase {id:DynamicPositionKind;lane:1|2;index:number;tick:number;offset?:string;voice?:string}
export const dynamicPositionCases:readonly DynamicPositionCase[]=[
 {id:'start',lane:1,index:0,tick:0},{id:'cursor',lane:1,index:2,tick:2},
 {id:'offset',lane:1,index:0,offset:'2',tick:2},{id:'zero',lane:1,index:0,offset:'0',tick:0},
 {id:'compensated',lane:1,index:2,offset:'-2',tick:0},{id:'voice',lane:2,index:0,voice:'2',tick:0},
 {id:'combined',lane:1,index:0,offset:'2',voice:'2',tick:2},{id:'cursor-zero',lane:1,index:2,offset:'0',tick:2}
]
export function createDynamicPositionFixture(kind:DynamicPositionKind='start'):string {
 const c=dynamicPositionCases.find(c=>c.id===kind)!
 const dynamic='<direction><direction-type><dynamics><p/></dynamics></direction-type>'+(c.offset===undefined?'':'<offset sound="yes">'+c.offset+'</offset>')+(c.voice===undefined?'':'<voice>'+c.voice+'</voice>')+'</direction>'
 let music=''
 for(const lane of[1,2]){
  if(lane===2)music+='<backup><duration>4</duration></backup>'
  for(let i=0;i<4;i++){
   if(c.lane===lane&&c.index===i)music+=dynamic
   music+='<note><pitch><step>'+['C','D','E','F'][i]+'</step><octave>'+(lane===1?4:5)+'</octave></pitch><duration>1</duration><voice>'+lane+'</voice><type>quarter</type></note>'
  }
 }
 return '<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><work><work-title>셈여림 위치·성부 손실 검증</work-title></work><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>'+music+'</measure></part></score-partwise>'
}
