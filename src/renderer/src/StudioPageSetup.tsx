import { Checkbox, IconButton, Input, Select, Slider, Text, Tooltip } from '@ddirori/ui'
import { RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ScorePageSetup } from '../../score-core'
import { draftSaveGuidance, isDocumentSaveShortcut } from './editor/draft-save'
import { useDocumentDraftSaveGuard } from './editor/document-drafts'
import './studio-page-setup.css'

type Setup = Required<ScorePageSetup>
interface Props {
  theme: 'light' | 'dark'
  value: Setup
  preset: string
  presets: readonly {value: string; label: string}[]
  sizes: readonly {value: Setup['pageSize']; label: string}[]
  orientations: readonly {value: Setup['orientation']; label: string}[]
  onPreset: (value: string) => void
  onChange: (patch: Partial<Setup>) => void
  showGuides: boolean
  onGuides: (value: boolean) => void
  partName?: string
  resetDisabled: boolean
  onReset: () => void
}

// Presentation only. App owns normalized values,score-vs-part commands and undo.
export function StudioPageSetup(props: Props) {
  return <section className="studio-page-setup ddirori" aria-label="PDF 페이지 설정"
    data-theme={props.theme} data-density="compact"
    onKeyDownCapture={event => {
      if(event.nativeEvent.isComposing || event.keyCode === 229) event.stopPropagation()
    }}
    onKeyDown={event => {
      if(!event.ctrlKey && !event.metaKey && !event.altKey &&
        ((event.target as HTMLElement).closest('[role="combobox"]') || event.key === 'Enter' || event.key === ' ')) event.stopPropagation()
    }}>
    <div className="studio-page-setup__heading">
      <Text as="h3" variant="itemTitle">PDF 페이지 설정</Text>
      <Text variant="description">{props.partName !== undefined ? `${props.partName || '선택 파트'} 파트보에 적용` : '총보에 적용'}</Text>
      {props.partName !== undefined ? <Tooltip text="파트보 조판 초기화"><IconButton
        label="파트보 조판 초기화" disabled={props.resetDisabled} onClick={props.onReset}>
        <RotateCcw aria-hidden="true" size={18} strokeWidth={1.75}/>
      </IconButton></Tooltip> : null}
    </div>
    <div className="studio-page-setup__fields">
      <Select label="PDF 설정 프리셋" value={props.preset} options={props.presets} onChange={props.onPreset}/>
      <Select label="PDF 용지" value={props.value.pageSize} options={props.sizes}
        onChange={pageSize => props.onChange({pageSize})}/>
      <Select label="PDF 방향" value={props.value.orientation} options={props.orientations}
        onChange={orientation => props.onChange({orientation})}/>
      <PageMarginInput value={props.value.pageMarginMm} onCommit={pageMarginMm=>props.onChange({pageMarginMm})}/>
      <Slider label="PDF 보표 크기" min={75} max={125} step={5}
        value={props.value.staffSizePercent} valueText={`${props.value.staffSizePercent}%`}
        onChange={staffSizePercent => props.onChange({staffSizePercent})}/>
      <Slider label="PDF 시스템 간격" min={80} max={140} step={5}
        value={props.value.systemSpacingPercent} valueText={`${props.value.systemSpacingPercent}%`}
        onChange={systemSpacingPercent => props.onChange({systemSpacingPercent})}/>
      <Checkbox label="여백 가이드" aria-label="PDF 여백 가이드 표시" checked={props.showGuides}
        onChange={event => props.onGuides(event.currentTarget.checked)}/>
    </div>
  </section>
}

function PageMarginInput({value,onCommit}:{value:number;onCommit:(value:number)=>void}) {
  const [draft,setDraft]=useState(String(value))
  const [error,setError]=useState<string>()
  const [saveNotice,setSaveNotice]=useState<string>()
  const dirty=useRef(false),composing=useRef(false)
  useEffect(()=>{dirty.current=false;setDraft(String(value));setError(undefined);setSaveNotice(undefined)},[value])
  const hasPendingValue=(input:HTMLInputElement)=>dirty.current&&(!input.validity.valid||input.value===''||input.valueAsNumber!==value)
  const trackInput=useDocumentDraftSaveGuard({workspace:'export',hasPendingValue,isComposing:()=>composing.current,onBlocked:()=>setSaveNotice(draftSaveGuidance)})
  return <Input label="PDF 여백 (mm)" aria-label="PDF 여백 mm" type="number" min={3} max={30} step={1}
    value={draft} error={error} help={saveNotice}
    onCompositionStart={event=>{trackInput(event.currentTarget);composing.current=true}}
    onCompositionEnd={()=>{composing.current=false}}
    onChange={event=>{trackInput(event.currentTarget);dirty.current=true;setError(undefined);setSaveNotice(undefined);setDraft(event.target.value)}}
    onBlur={event=>{
      if(composing.current||!dirty.current)return
      dirty.current=false
      setSaveNotice(undefined)
      if(!event.currentTarget.validity.valid||event.currentTarget.value===''){
        setError('3~30 mm, 1 mm 단위로 입력하세요.');setDraft(String(value));return
      }
      const next=event.currentTarget.valueAsNumber
      if(next!==value)onCommit(next)
    }}
    onKeyDown={event=>{
      if(composing.current||event.nativeEvent.isComposing||event.keyCode===229){event.stopPropagation();return}
      if(isDocumentSaveShortcut(event)&&hasPendingValue(event.currentTarget)){
        event.preventDefault();event.stopPropagation()
        setSaveNotice(draftSaveGuidance)
        return
      }
      if(event.key==='Enter'){event.preventDefault();event.stopPropagation();event.currentTarget.blur()}
      if(event.key==='Escape'){
        event.preventDefault();event.stopPropagation();dirty.current=false;setError(undefined);setSaveNotice(undefined)
        event.currentTarget.value=String(value);setDraft(String(value));event.currentTarget.blur()
      }
    }}/>
}
