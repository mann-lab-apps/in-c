import { useEffect, useRef, useState } from 'react'
import { Accordion, Button, Checkbox, Group, IconButton, Input, Text, Tooltip } from '@ddirori/ui'
import { X } from 'lucide-react'
import { VexFlow } from 'vexflow'
import type { Articulation, BreathMark, DynamicValue, Ornament } from '../../score-core'
import { articulationTermOptions, breathMarkTermOptions, koreanMusicTerms } from './editor/korean-music-terms'
import { StudioEventMarkGlyph } from './StudioEventMarks'
import { StudioDecorationGlyph, studioOrnamentOptions } from './StudioNoteDecorations'
import './studio-notation-palette.css'

const { Glyphs } = VexFlow
const dynamics: Record<DynamicValue, string> = {
  ppp:Glyphs.dynamicPPP,pp:Glyphs.dynamicPP,p:Glyphs.dynamicPiano,
  mp:Glyphs.dynamicMP,mf:Glyphs.dynamicMF,f:Glyphs.dynamicForte,
  ff:Glyphs.dynamicFF,fff:Glyphs.dynamicFFF,sfz:Glyphs.dynamicSforzato
}
const pauses=[{value:'fermata' as const,label:koreanMusicTerms.fermata},...breathMarkTermOptions]
const storageKey='studio.palette-families.v1'
const familyNames=['음자리표·조표·박자표','셈여림','표현 기호','장식음','정지 기호','범위 기호','텍스트','반복·볼타'] as const
type Family=(typeof familyNames)[number]
export type StudioPaletteEntry='clef'|'key'|'time'|'range'|'text'|'lyrics'|'repeat'
const clefGlyphs={G:Glyphs.gClef,F:Glyphs.fClef,C:Glyphs.cClef}

// A UI-only tight plane preserves each music glyph's aspect ratio. These
// measurements never change the score renderer or printed clef metrics.
function ClefSymbol({sign}:{sign:keyof typeof clefGlyphs}) {
  const [frame,setFrame]=useState('-2 -64 48 88')
  useEffect(()=>{
    let alive=true
    void document.fonts?.ready.then(()=>{
      const context=document.createElement('canvas').getContext('2d');if(!context||!alive)return
      context.font='32px Bravura'
      const m=context.measureText(clefGlyphs[sign])
      const {actualBoundingBoxLeft:left,actualBoundingBoxRight:right,actualBoundingBoxAscent:top,actualBoundingBoxDescent:bottom}=m
      if([left,right,top,bottom].every(Number.isFinite)&&left+right>0&&top+bottom>0) {
        // Round outward so antialiased edge pixels also fit the icon plane.
        const x=Math.floor(-left)-1,y=Math.floor(-top)-1
        setFrame(`${x} ${y} ${Math.ceil(right)+1-x} ${Math.ceil(bottom)+1-y}`)
      }
    })
    return()=>{alive=false}
  },[sign])
  return <svg data-clef-glyph={sign} aria-hidden="true" width="32" height="32" viewBox={frame} className="studio-notation-palette__symbol">
    <text x="0" y="0" fontFamily="Bravura" fontSize="32" fill="currentColor">{clefGlyphs[sign]}</text>
  </svg>
}

function DynamicSymbol({value}:{value:DynamicValue}) {
  const [frame,setFrame]=useState('-2 -22 60 42')
  useEffect(()=>{
    let alive=true
    void document.fonts?.ready.then(()=>{
      const context=document.createElement('canvas').getContext('2d');if(!context||!alive)return
      context.font='32px Bravura'
      const metrics=Object.values(dynamics).map(g=>context.measureText(g))
      const left=Math.max(...metrics.map(m=>m.actualBoundingBoxLeft)),right=Math.max(...metrics.map(m=>m.actualBoundingBoxRight))
      const top=Math.max(...metrics.map(m=>m.actualBoundingBoxAscent)),bottom=Math.max(...metrics.map(m=>m.actualBoundingBoxDescent))
      if([left,right,top,bottom].every(Number.isFinite)&&top+bottom>0)setFrame(`${-left-1} ${-top-1} ${left+right+2} ${top+bottom+2}`)
    })
    return()=>{alive=false}
  },[])
  return <svg data-dynamic-glyph={value} aria-hidden="true" width="40" height="24" viewBox={frame} className="studio-notation-palette__symbol"><text x="0" y="0" fontFamily="Bravura" fontSize="32" fill="currentColor">{dynamics[value]}</text></svg>
}

const singleFamilyStorageKey='studio.palette.single-family.v1'
const familyState=(opened:boolean)=>Object.fromEntries(familyNames.map(name=>[name,opened])) as Record<Family,boolean>
const defaultFamilyState=()=>Object.fromEntries(familyNames.map(name=>[name,name==='셈여림'])) as Record<Family,boolean>
function readSingleFamily(){try{return JSON.parse(localStorage.getItem(singleFamilyStorageKey)??'false')===true}catch{return false}}
export interface StudioPaletteWorkspace {
  open:Readonly<Record<Family,boolean>>
  single:boolean
  queryResetVersion:number
  reveal:(family:Family)=>void
  onFamilyOpen:(family:Family,value:boolean)=>void
  onSingle:(value:boolean)=>void
  collapse:()=>void
  expand:()=>void
  reset:()=>void
}
// Local workspace only: the existing family map remains backward compatible.
export function useStudioPaletteWorkspace():StudioPaletteWorkspace {
  const [single,setSingle]=useState(readSingleFamily)
  const [queryResetVersion,setQueryResetVersion]=useState(0)
  const [open,setOpen]=useState<Record<Family,boolean>>(()=>{
    let saved:Partial<Record<Family,boolean>>={}
    try{saved=JSON.parse(localStorage.getItem(storageKey)??'{}')??{}}catch{/* Use the existing defaults. */}
    const next=Object.fromEntries(familyNames.map(name=>[name,typeof saved[name]==='boolean'?saved[name]:name==='셈여림'])) as Record<Family,boolean>
    if(readSingleFamily()){
      const first=familyNames.find(name=>next[name])
      return{...familyState(false),...(first?{[first]:true}:{})}
    }
    return next
  })
  const lastOpen=useRef<Family|undefined>(familyNames.find(name=>open[name]))
  useEffect(()=>{try{localStorage.setItem(storageKey,JSON.stringify(open))}catch{/* Local preference failure must not affect notation. */}},[open])
  useEffect(()=>{try{localStorage.setItem(singleFamilyStorageKey,JSON.stringify(single))}catch{/* Keep the current session usable. */}},[single])
  return{open,single,queryResetVersion,
    reveal:name=>{
      lastOpen.current=name
      setQueryResetVersion(value=>value+1)
      setOpen(previous=>single?{...familyState(false),[name]:true}:{...previous,[name]:true})
    },
    onFamilyOpen:(name,value)=>{
      if(value)lastOpen.current=name
      setOpen(previous=>single&&value?{...familyState(false),[name]:true}:{...previous,[name]:value})
    },
    onSingle:value=>{
      setSingle(value)
      if(value)setOpen(previous=>{
        const keep=lastOpen.current&&previous[lastOpen.current]?lastOpen.current:familyNames.find(name=>previous[name])
        return{...familyState(false),...(keep?{[keep]:true}:{})}
      })
    },
    collapse:()=>{setQueryResetVersion(value=>value+1);setOpen(familyState(false))},
    expand:()=>{if(!single){setQueryResetVersion(value=>value+1);setOpen(familyState(true))}},
    reset:()=>{setQueryResetVersion(value=>value+1);lastOpen.current='셈여림';setSingle(false);setOpen(defaultFamilyState())}
  }
}
export function StudioPaletteSettings({workspace}:{workspace:StudioPaletteWorkspace}) {
  return <section className="studio-palette-workspace-settings" aria-label="팔레트 보기 설정"
    onKeyDownCapture={event=>{
      if((event.nativeEvent.isComposing||event.keyCode===229||event.key==='Process')&&
        ((event.target as HTMLElement).matches('input[type="checkbox"]'))){event.preventDefault();event.stopPropagation()}
    }}>
    <Text as="h4" variant="label">팔레트 보기</Text>
    <Checkbox label="한 팔레트씩 열기" checked={workspace.single} onChange={event=>workspace.onSingle(event.currentTarget.checked)}/>
    <Text as="p" variant="caption">한 팔레트씩 열기에서는 모두 펼칠 수 없습니다. 검색 결과는 함께 표시합니다.</Text>
    <Button kind="quiet" onClick={workspace.collapse}>모든 팔레트 접기</Button>
    <Button kind="quiet" disabled={workspace.single} onClick={workspace.expand}>모든 팔레트 펼치기</Button>
    <Button kind="quiet" onClick={workspace.reset}>팔레트 표시 기본값</Button>
    <Text as="p" variant="caption">전체 접기·펼치기·기본값은 검색도 지웁니다. 도크 폭과 악보는 유지합니다.</Text>
  </section>
}

export function StudioNotationPalette({workspace,values,active,enabled,onDynamic,onOpen,articulationEnabled,articulations,onArticulation,ornamentEnabled,ornaments,onOrnament,pauseEnabled,fermata,breathMark,onFermata,onBreath,clefs,clef,clefEnabled,clefScope,onClef}:{
  workspace:StudioPaletteWorkspace
  values:readonly DynamicValue[];active?:DynamicValue;enabled:boolean
  onDynamic:(value:DynamicValue)=>void;onOpen:(entry:StudioPaletteEntry)=>void
  articulationEnabled:boolean;articulations:ReadonlySet<Articulation>;onArticulation:(value:Articulation)=>void
  ornamentEnabled:boolean;ornaments:readonly Ornament[];onOrnament:(value:Ornament)=>void
  pauseEnabled:boolean;fermata:boolean;breathMark?:BreathMark;onFermata:()=>void;onBreath:(value:BreathMark)=>void
  clefs:readonly {id:string;label:string;value:{sign:keyof typeof clefGlyphs;line:number}}[]
  clef:string;clefEnabled:boolean;clefScope?:string;onClef:(value:string)=>void
}) {
  const [query,setQuery]=useState('')
  const searchRoot=useRef<HTMLDivElement>(null)
  const {open,queryResetVersion}=workspace
  // Global view actions clear the local draft; ordinary typing stays local.
  useEffect(()=>setQuery(''),[queryResetVersion])
  const search=query.trim().toLocaleLowerCase()
  const entries:Record<Exclude<Family,'셈여림'|'표현 기호'|'장식음'|'정지 기호'>,readonly {id:StudioPaletteEntry;label:string;keywords?:string}[]>={
    '음자리표·조표·박자표':[{id:'clef',label:'음자리표 설정 열기'},{id:'key',label:'조표 설정 열기'},{id:'time',label:'박자표 설정 열기'}],
    '범위 기호':[{id:'range',label:'범위 기호 설정 열기',keywords:'슬러 slur 헤어핀 hairpin 옥타브 octave 8va 8vb 15ma 15mb'}],
    '텍스트':[{id:'text',label:'텍스트 표기 설정 열기'},{id:'lyrics',label:'가사·코드 편집 열기'}],
    '반복·볼타':[{id:'repeat',label:'반복·볼타 설정 열기'}]
  }
  const matches=(name:Family,label='')=>!search||`${name} ${label}`.toLocaleLowerCase().includes(search)
  const matchingClefs=clefs.filter(item=>!search||`음자리표 clef ${item.id} ${item.label}`.toLocaleLowerCase().includes(search))
  const families=familyNames.filter(name=>name==='셈여림'?values.some(value=>matches(name,value)):name==='표현 기호'?articulationTermOptions.some(({label,value})=>matches(name,`${label} ${value}`)):name==='장식음'?studioOrnamentOptions.some(({label,value})=>matches(name,`${label} ornament ${value}`)):name==='정지 기호'?pauses.some(({label,value})=>matches(name,`${label} ${value}`)):entries[name].some(entry=>matches(name,`${entry.label} ${entry.keywords??''}`))||(name==='음자리표·조표·박자표'&&matchingClefs.length>0))
  return <div className="studio-notation-palette" onKeyDown={event=>{
    if(event.nativeEvent.isComposing||event.keyCode===229)return
    const headers=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button[aria-controls][aria-expanded]'))
    const current=headers.indexOf((event.target as HTMLElement).closest('button[aria-expanded]') as HTMLButtonElement)
    if(current>=0&&['ArrowUp','ArrowDown','Home','End'].includes(event.key)){
      event.preventDefault();event.stopPropagation()
      const next=event.key==='Home'?0:event.key==='End'?headers.length-1:(current+(event.key==='ArrowDown'?1:-1)+headers.length)%headers.length
      headers[next]?.focus()
    }
    if(event.key==='Enter'||event.key===' ')event.stopPropagation()
  }}>
    <div className="studio-notation-palette__search" ref={searchRoot}>
      <Input label="표기 기호 검색" type="search" value={query} onChange={event=>setQuery(event.target.value)} />
      {query?<Tooltip text="검색 지우기"><IconButton label="표기 기호 검색 지우기" onClick={()=>{
        // The clear control unmounts; keep keyboard continuation in its existing search field.
        searchRoot.current?.querySelector<HTMLInputElement>('input[type="search"]')?.focus()
        setQuery('')
      }}><X size={18} strokeWidth={1.75} aria-hidden="true" /></IconButton></Tooltip>:null}
    </div>
    {families.map(name=><div key={name} className="studio-notation-palette__family" data-family={name}><Accordion title={name} open={Boolean(search)||open[name]} onOpenChange={value=>workspace.onFamilyOpen(name,value)}>
      {name==='음자리표·조표·박자표'?<div className="studio-notation-palette__clef-family">
        {matchingClefs.length>0?<section aria-label="음자리표 팔레트" className="studio-notation-palette__marks">
          <Text as="p" variant="description">{clefEnabled?clefScope:'마디를 선택하면 해당 한 마디의 음자리표를 바꿀 수 있습니다.'}</Text>
          <div role="group" aria-label="선택 마디의 음자리표" className="studio-notation-palette__clef-grid">
            {matchingClefs.map(item=><Tooltip key={item.id} text={clefEnabled?`${item.label} · 선택한 한 마디`:'마디를 먼저 선택하세요.'}>
              <IconButton label={`${item.label} · 선택 마디에 적용`} className="studio-notation-palette__clef-button"
                selected={clefEnabled&&clef===item.id} disabled={!clefEnabled} onClick={()=>{if(clefEnabled&&clef!==item.id)onClef(item.id)}}>
                <span className="studio-notation-palette__clef-content"><ClefSymbol sign={item.value.sign}/><Text as="span" variant="label">{item.label}</Text></span>
              </IconButton>
            </Tooltip>)}
          </div>
        </section>:null}
        {entries[name].some(entry=>matches(name,`${entry.label} ${entry.keywords??''}`))?<div className="studio-notation-palette__entries">
          {entries[name].filter(entry=>matches(name,`${entry.label} ${entry.keywords??''}`)).map(entry=><Button key={entry.id} kind="quiet" onClick={()=>onOpen(entry.id)}>{entry.label}</Button>)}
        </div>:null}
      </div>:name==='셈여림'?<section aria-label="셈여림 팔레트" className="studio-notation-palette__dynamics">
        {values.filter(value=>matches(name,value)).map(value=><Tooltip key={value} text={`${value} · 선택 마디에 셈여림 적용`}>
          <IconButton label={`${value} 셈여림 적용`} selected={active===value} disabled={!enabled} onClick={()=>onDynamic(value)}><DynamicSymbol value={value}/></IconButton>
        </Tooltip>)}
      </section>:name==='표현 기호'?<section aria-label="표현 기호 팔레트" className="studio-notation-palette__marks">
        <Text as="p" variant="description">{articulationEnabled?'선택한 음표에 적용':'음표 하나를 선택하면 표현 기호를 적용할 수 있습니다.'}</Text>
        <Group label="팔레트의 표현 기호">
          {articulationTermOptions.filter(({label,value})=>matches(name,`${label} ${value}`)).map(({label,value})=><Tooltip key={value} text={`${label} · 선택한 음표에 적용 또는 해제. 다음 입력 설정은 바꾸지 않습니다.`}>
            <IconButton label={`${label} 적용 또는 해제`} disabled={!articulationEnabled} selected={articulationEnabled&&articulations.has(value)} onClick={()=>onArticulation(value)}><StudioEventMarkGlyph kind={value}/></IconButton>
          </Tooltip>)}
        </Group>
      </section>:name==='장식음'?<section aria-label="장식음 팔레트" className="studio-notation-palette__marks">
        <Text as="p" variant="description">{ornamentEnabled?'선택한 음표에 적용':'음표 하나를 선택하면 장식음을 적용할 수 있습니다.'}</Text>
        <Group label="팔레트의 장식음">
          {studioOrnamentOptions.filter(({label,value})=>matches(name,`${label} ornament ${value}`)).map(({label,value})=><Tooltip key={value} text={`${label} · 선택한 음표에 적용 또는 해제. 다음 입력 설정은 바꾸지 않습니다.`}>
            <IconButton label={`${label} 적용 또는 해제`} disabled={!ornamentEnabled} selected={ornamentEnabled&&ornaments.includes(value)} onClick={()=>onOrnament(value)}><StudioDecorationGlyph kind={value}/></IconButton>
          </Tooltip>)}
        </Group>
      </section>:name==='정지 기호'?<section aria-label="정지 기호 팔레트" className="studio-notation-palette__marks">
        <Text as="p" variant="description">{pauseEnabled?'선택한 음표·쉼표에 적용':'음표나 쉼표 하나를 선택하세요.'}</Text>
        <Group label="팔레트의 정지 기호">
          {pauses.filter(({label,value})=>matches(name,`${label} ${value}`)).map(({label,value})=><Tooltip key={value} text={`${label} · 선택한 음표 또는 쉼표에 적용 또는 해제. 다음 입력 설정은 바꾸지 않습니다.`}>
            <IconButton label={`${label} 적용 또는 해제`} disabled={!pauseEnabled} selected={pauseEnabled&&(value==='fermata'?fermata:breathMark===value)} onClick={value==='fermata'?onFermata:()=>onBreath(value)}><StudioEventMarkGlyph kind={value}/></IconButton>
          </Tooltip>)}
        </Group>
      </section>:<div className="studio-notation-palette__entries">{entries[name].filter(entry=>matches(name,`${entry.label} ${entry.keywords??''}`)).map(entry=><Button key={entry.id} kind="quiet" onClick={()=>onOpen(entry.id)}>{entry.label}</Button>)}</div>}
    </Accordion></div>)}
    {families.length===0?<Text as="p" variant="description">일치하는 표기가 없습니다. 다른 이름으로 검색해 주세요.</Text>:null}
  </div>
}
