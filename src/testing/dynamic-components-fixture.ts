import {createDynamicPositionFixture} from './dynamic-position-fixture'
export interface DynamicComponentsCase {id:string;xml:string;control:string;lost:boolean;knownAttribute?:boolean}
export function createDynamicComponentsCases():DynamicComponentsCase[]{
 const initial=createDynamicPositionFixture('start'),direction='<direction><direction-type><dynamics><p/></dynamics></direction-type></direction>',none=initial.replace(direction,''),single=(body:string)=>initial.replace('<dynamics><p/></dynamics>',body),control=(value:string)=>single('<dynamics><'+value+'/></dynamics>'),note=(body:string)=>none.replace('</note>','<notations>'+body+'</notations></note>'),restBase=none.replace('<pitch><step>C</step><octave>4</octave></pitch>','<rest/>');
 const rows:Array<Omit<DynamicComponentsCase,'control'>&{control?:string}>=[
  {id:'single',xml:initial,control:initial,lost:false},
  {id:'empty',xml:single('<dynamics/>'),control:none,lost:false},
  {id:'empty-array',xml:single('<dynamics/><dynamics/>'),control:none,lost:false},
  {id:'compound',xml:single('<dynamics><p/><sfz/></dynamics>'),control:control('p'),lost:true},
  {id:'reordered',xml:single('<dynamics><sfz/><p/></dynamics>'),control:control('sfz'),lost:true},
  {id:'repeated-symbol',xml:single('<dynamics><p/><p/></dynamics>'),control:control('p'),lost:true},
  {id:'unsupported',xml:single('<dynamics><pppp/></dynamics>'),control:none,lost:true},
  {id:'text',xml:single('<dynamics><other-dynamics>subito p</other-dynamics></dynamics>'),control:none,lost:true},
  {id:'array',xml:single('<dynamics><p/></dynamics><dynamics><f/></dynamics>'),control:none,lost:true},
  {id:'empty-and-p',xml:single('<dynamics/><dynamics><p/></dynamics>'),control:none,lost:true},
  {id:'separate',xml:initial.replace('<dynamics><p/></dynamics>','<dynamics><p/></dynamics></direction-type><direction-type><dynamics><f/></dynamics>'),lost:false},
  {id:'note',xml:note('<dynamics><p/></dynamics>'),control:none,lost:true},
  {id:'note-attribute',xml:none.replace('<note>','<note dynamics="30">'),control:none,lost:false,knownAttribute:true},
  {id:'note-combined',xml:note('<dynamics><p/></dynamics>').replace('<note>','<note dynamics="30">'),control:none,lost:true,knownAttribute:true},
  {id:'note-empty',xml:note('<dynamics/>'),control:none,lost:false},
  {id:'note-rest',xml:restBase.replace('</note>','<notations><dynamics><p/></dynamics></notations></note>'),control:restBase,lost:true}
 ];
 const measure=none.match(/<measure number="1">([\s\S]*?)<\/measure>/)![1],ownerDirection='<direction><direction-type><words>anchor</words></direction-type></direction><direction><direction-type><words>dolce</words></direction-type><direction-type><dynamics><p/><sfz/></dynamics></direction-type></direction>',owned=measure.replace('<note>',ownerDirection+'<note>'),owner='<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><work><work-title>셈여림 위치·성부 손실 검증</work-title></work><part-list><score-part id="P1"><part-name>Piano 1</part-name></score-part><score-part id="P2"><part-name>Piano 2</part-name></score-part></part-list>'+[1,2].map(p=>'<part id="P'+p+'"><measure number="1">'+measure+'</measure><measure number="2">'+(p===2?owned:measure)+'</measure></part>').join('')+'</score-partwise>';
 rows.push({id:'owner',xml:owner,control:owner.replace('<p/><sfz/>','<p/>'),lost:true});
 return rows.map(row=>({...row,control:row.control??row.xml}));
}
