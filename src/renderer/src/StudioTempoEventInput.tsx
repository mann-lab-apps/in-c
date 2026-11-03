import { useEffect, useRef, useState } from 'react'
import { Input, Select, Text } from '@ddirori/ui'
import { draftSaveGuidance, isDocumentSaveShortcut } from './editor/draft-save'
import { useDocumentDraftSaveGuard } from './editor/document-drafts'
import './studio-tempo-event.css'

// Draft ownership is local to one document/location. App owns normalization,
// inheritance, tempo-event identity and the score command.
export function StudioTempoEventInput({value,scope,count=1,points,pointValue='',onPointChange,onCommit}: {
  value?: number
  scope: string
  count?: number
  points?: { value: string; label: string }[]
  pointValue?: string
  onPointChange?: (value: string) => void
  onCommit: (text: string) => void
}) {
  const [draft,setDraft]=useState(value===undefined?'':String(value))
  const [saveNotice,setSaveNotice]=useState<string>()
  const dirty=useRef(false),composing=useRef(false)
  useEffect(()=>{dirty.current=false;setSaveNotice(undefined);setDraft(value===undefined?'':String(value))},[value])
  const original=value===undefined?'':String(value)
  const hasPendingValue=(input:HTMLInputElement)=>{
    const next=input.value===''?undefined:input.valueAsNumber
    return dirty.current&&(!input.validity.valid||next!==value)
  }
  const trackInput=useDocumentDraftSaveGuard({workspace:'measure',hasPendingValue,isComposing:()=>composing.current,onBlocked:()=>setSaveNotice(draftSaveGuidance)})
  const help=count>1
    ? `40–240 BPM · 같은 위치의 지정 ${count}개 중 마지막 값입니다. 비우면 이 지정만 제거하고 앞선 값이 적용됩니다.`
    : '40–240 BPM · 비우면 이 위치의 빠르기 변경을 제거합니다.'
  return <section className="studio-tempo-event" aria-label="위치별 빠르기">
    <Text as="h3" variant="itemTitle">위치별 빠르기</Text>
    <Text as="p" variant="description">{scope}</Text>
    {points && points.length>1 && onPointChange ? <Select label="편집할 빠르기 위치" value={pointValue} options={points} onChange={onPointChange}/> : null}
    <Input label="위치별 빠르기 BPM" aria-label="위치별 빠르기 BPM" type="number" min={40} max={240} step={1}
      aria-description={scope}
      placeholder="변경 없음" value={draft} help={saveNotice ? `${saveNotice} ${help}` : help}
      onChange={event=>{trackInput(event.currentTarget);dirty.current=true;setSaveNotice(undefined);setDraft(event.currentTarget.value)}}
      onCompositionStart={event=>{trackInput(event.currentTarget);composing.current=true}} onCompositionEnd={()=>{composing.current=false}}
      onBlur={event=>{
        setSaveNotice(undefined)
        if(composing.current||!dirty.current)return
        dirty.current=false
        if(event.currentTarget.value!==original)onCommit(event.currentTarget.value)
      }}
      onKeyDown={event=>{
        if(composing.current||event.nativeEvent.isComposing||event.keyCode===229){event.stopPropagation();return}
        if(isDocumentSaveShortcut(event)&&hasPendingValue(event.currentTarget)){
          event.preventDefault();event.stopPropagation();setSaveNotice(draftSaveGuidance);return
        }
        if(event.key==='Enter'){event.preventDefault();event.stopPropagation();event.currentTarget.blur()}
        else if(event.key==='Escape'){
          event.preventDefault();event.stopPropagation();dirty.current=false;setSaveNotice(undefined)
          event.currentTarget.value=original;setDraft(original);event.currentTarget.blur()
        }
      }}/>
  </section>
}
