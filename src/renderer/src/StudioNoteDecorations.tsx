import { useEffect, useState } from 'react'
import { Group, IconButton, Select, Text, Tooltip } from '@ddirori/ui'
import { VexFlow } from 'vexflow'
import type { Note, Ornament } from '../../score-core'
import { ornamentGlyphs } from './notation/ornament-glyphs'
import './studio-note-decorations.css'

export const studioOrnamentOptions = [
  {value:'trill',label:'트릴'},
  {value:'mordent',label:'모르덴트'},
  {value:'inverted-mordent',label:'프랄트릴러'},
  {value:'turn',label:'턴'}
] as const
const glyphs = {
  ...ornamentGlyphs,
  grace:VexFlow.Glyphs.graceNoteAcciaccaturaStemUp
}
export function StudioDecorationGlyph({kind}:{kind:keyof typeof glyphs}) {
  const [frame,setFrame]=useState('-2 -32 36 36')
  useEffect(()=>{
    let alive=true
    void document.fonts?.ready.then(()=>{
      const context=document.createElement('canvas').getContext('2d')
      if(!context||!alive)return
      context.font='32px Bravura'
      // Ornament icons share a plane;the taller grace note has its own plane.
      const pool=kind==='grace'?[glyphs.grace]:studioOrnamentOptions.map(item=>glyphs[item.value])
      const bounds=pool.map(glyph=>context.measureText(glyph))
      const left=Math.max(...bounds.map(b=>b.actualBoundingBoxLeft)),right=Math.max(...bounds.map(b=>b.actualBoundingBoxRight))
      const top=Math.max(...bounds.map(b=>b.actualBoundingBoxAscent)),bottom=Math.max(...bounds.map(b=>b.actualBoundingBoxDescent))
      if([left,right,top,bottom].every(Number.isFinite)&&top+bottom>0)setFrame(`${-Math.ceil(left)-2} ${-Math.ceil(top)-2} ${Math.ceil(left)+Math.ceil(right)+4} ${Math.ceil(top)+Math.ceil(bottom)+4}`)
    })
    return()=>{alive=false}
  },[kind])
  return <svg aria-hidden="true" data-decoration-glyph={kind} className="studio-note-decorations__glyph" width="24" height="24" viewBox={frame}>
    <text x="0" y="0" fontFamily="Bravura" fontSize="32" fill="currentColor">{glyphs[kind]}</text>
  </svg>
}
interface Props {
  theme:'light'|'dark'
  note:Note
  onTremolo:(marks:0|1|2|3)=>void
  onOrnament:(value:Ornament)=>void
  onGrace:()=>void
}
export function StudioNoteDecorations(props:Props) {
  return <section className="studio-note-decorations ddirori" aria-label="선택 음표의 장식" data-theme={props.theme} data-density="compact"
    onKeyDown={event=>{
      if(event.nativeEvent.isComposing||event.keyCode===229){event.stopPropagation();return}
      if((event.target as HTMLElement).closest('[role="combobox"]')&&!event.ctrlKey&&!event.metaKey)event.stopPropagation()
      else if(event.key==='Enter'||event.key===' ')event.stopPropagation()
    }}>
    <Text as="h3" variant="itemTitle">음표 장식</Text>
    <Select label="트레몰로" value={String(props.note.tremolo?.marks??0)}
      help="선택 음표에 적용 · 빗금 개수"
      options={([0,1,2,3] as const).map(value=>({value:String(value),label:value===0?'없음':`${value}줄`}))}
      onChange={value=>{const marks=Number(value);if(marks===0||marks===1||marks===2||marks===3)props.onTremolo(marks)}} />
    <div className="studio-note-decorations__row">
      <Text as="h4" variant="label">장식음</Text>
      <Group label="선택 음표의 장식음">
        {studioOrnamentOptions.map(({value,label})=><Tooltip key={value} text={`선택 음표 · ${label}`}>
          <IconButton label={label} selected={props.note.ornaments?.includes(value)} onClick={()=>props.onOrnament(value)}><StudioDecorationGlyph kind={value} /></IconButton>
        </Tooltip>)}
      </Group>
    </div>
    <div className="studio-note-decorations__row">
      <Text as="h4" variant="label">부착 꾸밈음</Text>
      <Tooltip text={props.note.graceNotes?.length?'선택 음표 앞의 꾸밈음 제거':'선택 음표 앞에 꾸밈음 붙이기'}>
        <IconButton label="부착 꾸밈음" selected={Boolean(props.note.graceNotes?.length)} onClick={props.onGrace}><StudioDecorationGlyph kind="grace" /></IconButton>
      </Tooltip>
      <Text as="p" variant="caption" className="studio-note-decorations__help">선택 음표와 음가는 유지합니다. 다음 입력 설정을 바꾸지 않습니다.</Text>
    </div>
  </section>
}
