import { useEffect, useState } from 'react'
import { Group, IconButton, Text, Tooltip } from '@ddirori/ui'
import { VexFlow } from 'vexflow'
import type { Articulation, BreathMark } from '../../score-core'
import { articulationTermOptions, breathMarkTermOptions, koreanMusicTerms } from './editor/korean-music-terms'
import './studio-event-marks.css'

const glyphs = {
  fermata: VexFlow.Glyphs.fermataAbove,
  breath: VexFlow.Glyphs.breathMarkComma,
  caesura: VexFlow.Glyphs.caesura,
  staccato: VexFlow.Glyphs.articStaccatoAbove,
  accent: VexFlow.Glyphs.articAccentAbove,
  tenuto: VexFlow.Glyphs.articTenutoAbove,
  marcato: VexFlow.Glyphs.articMarcatoAbove
}

// Domain music glyphs only. This separate measured plane leaves the approved
// duration toolbar and score engraving font/metrics unchanged.
export function StudioEventMarkGlyph({kind}:{kind:keyof typeof glyphs}) {
  const [frame,setFrame]=useState('-2 -20 36 28')
  useEffect(()=>{
    let alive=true
    void document.fonts?.ready.then(()=>{
      const context=document.createElement('canvas').getContext('2d')
      if(!context||!alive)return
      context.font='32px Bravura'
      const bounds=Object.values(glyphs).map(glyph=>context.measureText(glyph))
      const left=Math.max(...bounds.map(b=>b.actualBoundingBoxLeft))
      const right=Math.max(...bounds.map(b=>b.actualBoundingBoxRight))
      const top=Math.max(...bounds.map(b=>b.actualBoundingBoxAscent))
      const bottom=Math.max(...bounds.map(b=>b.actualBoundingBoxDescent))
      if([left,right,top,bottom].every(Number.isFinite)&&top+bottom>0)
        setFrame(`${-left-1} ${-top-1} ${left+right+2} ${top+bottom+2}`)
    })
    return()=>{alive=false}
  },[])
  return <svg aria-hidden="true" data-mark-glyph={kind} className="studio-event-marks__glyph" width="24" height="24" viewBox={frame}>
    <text x="0" y="0" fontFamily="Bravura" fontSize="32" fill="currentColor">{glyphs[kind]}</text>
  </svg>
}

interface Props {
  theme:'light'|'dark'
  scope:string
  note:boolean
  fermata:boolean
  breathMark?:BreathMark
  articulations:ReadonlySet<Articulation>
  onFermata:()=>void
  onBreath:(value:BreathMark)=>void
  onArticulation:(value:Articulation)=>void
}

export function StudioEventMarks(props:Props) {
  return <section className="studio-event-marks ddirori" data-theme={props.theme} data-density="compact" aria-label="선택한 표기의 연주 기호"
    onKeyDown={event=>{if(event.key==='Enter'||event.key===' ')event.stopPropagation()}}>
    <Text as="h3" variant="itemTitle">연주 기호</Text>
    <Text as="p" variant="caption" className="studio-event-marks__scope">{props.scope} · 다음 입력 설정을 바꾸지 않습니다.</Text>
    <div className="studio-event-marks__row">
      <Text as="h4" variant="label">정지 기호</Text>
      <Group label="선택 표기의 정지 기호">
        <Tooltip text="선택한 음표 또는 쉼표 · 페르마타">
          <IconButton label={koreanMusicTerms.fermata} selected={props.fermata} onClick={props.onFermata}><StudioEventMarkGlyph kind="fermata" /></IconButton>
        </Tooltip>
        {breathMarkTermOptions.map(({label,value})=><Tooltip key={value} text={`선택한 음표 또는 쉼표 · ${label}`}>
          <IconButton label={label} selected={props.breathMark===value} onClick={()=>props.onBreath(value)}><StudioEventMarkGlyph kind={value} /></IconButton>
        </Tooltip>)}
      </Group>
    </div>
    <div className="studio-event-marks__row">
      <Text as="h4" variant="label">표현 기호</Text>
      <Group label="선택 음표의 표현 기호">
        {articulationTermOptions.map(({label,value})=><Tooltip key={value} text={props.note?`선택한 음표 · ${label}`:'표현 기호는 음표에만 적용할 수 있습니다.'}>
          <IconButton label={label} disabled={!props.note} selected={props.articulations.has(value)} onClick={()=>props.onArticulation(value)}><StudioEventMarkGlyph kind={value} /></IconButton>
        </Tooltip>)}
      </Group>
    </div>
  </section>
}
