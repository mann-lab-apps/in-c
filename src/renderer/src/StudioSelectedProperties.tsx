import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Input, Select, Text } from '@ddirori/ui'
import type { DynamicValue } from '../../score-core'
import './studio-selected-properties.css'
import { StudioPropertyDisclosure } from './StudioPropertyDisclosure'
import { isRedoShortcut, isUndoShortcut } from './editor/keyboard-input'
import { draftSaveGuidance, isDocumentSaveShortcut } from './editor/draft-save'
import { useDocumentDraftSaveGuard } from './editor/document-drafts'

interface TextProperty {
  label:string
  value?:string
  help?:string
  objects?:readonly {id:string;text:string;positionLabel?:string}[]
  // Undefined keeps legacy first-object behavior; null is a genuinely empty
  // current position even when other timestamps have objects in this measure.
  objectId?:string|null
  objectHelp?:string
  request?:{id:string;sequence:number;focus?:boolean}
  onSelectObject?:(id:string)=>void
  scope:'measure'|'location'
  update:(text:string,id?:string)=>void
}
interface Props {
  theme:'light'|'dark'
  kind:string
  identity:string
  rows:readonly (readonly string[])[]
  enabled:boolean
  inputActive:boolean
  measureScope:string
  locationScope:string
  dynamics:readonly DynamicValue[]
  dynamicObjects?:readonly {id:string;value:DynamicValue}[]
  dynamicListIdentity?:string
  // History may return to another measure within this document/view.
  historyFocusScope?:string
  onSelectDynamic?:(id:string|undefined)=>void
  dynamicTarget?:{id:string;sequence:number;focus?:boolean;scope:string}
  dynamic?:DynamicValue
  onDynamic:(value:string)=>void
  fields:readonly TextProperty[]
  technical:string
  children?:ReactNode
}

export function StudioSelectedProperties(props:Props) {
  const dynamicHost=useRef<HTMLDivElement>(null)
  const dynamicTargetHost=useRef<HTMLDivElement>(null)
  const dynamicFocusSequence=useRef(0)
  const dynamicFocusOwner=useRef(props.historyFocusScope??props.dynamicListIdentity??props.identity)
  dynamicFocusOwner.current=props.historyFocusScope??props.dynamicListIdentity??props.identity
  const dynamicHistoryCleanup=useRef<(()=>void)|undefined>(undefined)
  useEffect(()=>()=>dynamicHistoryCleanup.current?.(),[])
  const [dynamicDeleteFocus,setDynamicDeleteFocus]=useState(0)
  const handledDynamicDeleteFocus=useRef(0)
  useEffect(()=>{
    if(!props.enabled||!props.dynamicTarget||props.dynamicTarget.focus===false)return
    const control=dynamicHost.current?.querySelector<HTMLButtonElement>('button[role="combobox"]')
    control?.focus();control?.scrollIntoView?.({block:'nearest'})
  },[props.enabled,props.dynamicTarget?.sequence])
  useEffect(()=>{
    if(handledDynamicDeleteFocus.current===dynamicDeleteFocus)return
    handledDynamicDeleteFocus.current=dynamicDeleteFocus
    // The selected-object field is remounted as the restored measure field.
    // Consume only this control's explicit deletion; ordinary selection or
    // document changes must not pull focus away from another editing surface.
    if(!props.enabled)return
    const control=dynamicHost.current?.querySelector<HTMLButtonElement>('button[role="combobox"]')
    control?.focus();control?.scrollIntoView?.({block:'nearest'})
  },[dynamicDeleteFocus,props.enabled])
  return <section className="studio-selected-properties ddirori" data-theme={props.theme} data-density="compact" aria-label="선택 요약" data-selection-kind={props.kind}
    onPointerDownCapture={()=>{dynamicFocusSequence.current+=1}}
    onKeyDown={event=>{
      const sequence=++dynamicFocusSequence.current
      const control=(event.target as HTMLElement).closest('[role="combobox"]')
      if(!event.nativeEvent.isComposing&&event.keyCode!==229&&event.key!=='Process'&&
        control?.getAttribute('aria-expanded')==='false'&&dynamicHost.current?.contains(control)&&
        (isUndoShortcut(event.nativeEvent)||isRedoShortcut(event.nativeEvent))){
        const owner=dynamicFocusOwner.current
        // App owns the command. Only restore this explicitly used field after
        // history replaces its control; never pull focus across a document/view.
        dynamicHistoryCleanup.current?.()
        const cancel=()=>{dynamicFocusSequence.current+=1}
        const cancelForKey=(event:KeyboardEvent)=>{
          // A second history key can reach BODY while the first command has
          // remounted the field. It continues this pending request only;
          // unrelated input or composition still invalidates its ownership.
          if(event.target===document.body&&!event.isComposing&&event.keyCode!==229&&event.key!=='Process'&&
            (isUndoShortcut(event)||isRedoShortcut(event)))return
          cancel()
        }
        const leave=(event:FocusEvent)=>{
          if(event.target instanceof Node&&!dynamicHost.current?.contains(event.target)&&!dynamicTargetHost.current?.contains(event.target))cancel()
        }
        const cleanup=()=>{
          document.removeEventListener('pointerdown',cancel,true)
          document.removeEventListener('keydown',cancelForKey,true)
          document.removeEventListener('focusin',leave,true)
          if(dynamicHistoryCleanup.current===cleanup)dynamicHistoryCleanup.current=undefined
        }
        dynamicHistoryCleanup.current=cleanup
        document.addEventListener('pointerdown',cancel,true)
        document.addEventListener('keydown',cancelForKey,true)
        document.addEventListener('focusin',leave,true)
        requestAnimationFrame(()=>{
          cleanup()
          if(owner!==dynamicFocusOwner.current||sequence!==dynamicFocusSequence.current)return
          const active=document.activeElement
          if(active!==document.body&&!dynamicHost.current?.contains(active)&&!dynamicTargetHost.current?.contains(active))return
          const current=dynamicHost.current?.querySelector<HTMLButtonElement>('button[role="combobox"]')
          current?.focus();current?.scrollIntoView?.({block:'nearest'})
        })
      }
      if((event.target as HTMLElement).closest('[role="combobox"]')&&!event.metaKey&&!event.ctrlKey&&!event.altKey)event.stopPropagation()
    }}>
    <Text as="h3" variant="itemTitle">선택한 표기</Text>
    <dl className="studio-selected-properties__readouts">{props.rows.filter(([label])=>label!=='틱').map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {props.children}
    {!props.enabled?<Text as="p" variant="description">한 마디 또는 한 위치를 선택하면 표기를 수정할 수 있습니다.</Text>:null}
    <section className="studio-selected-properties__group" aria-label="선택 위치의 표기">
      <Text as="h4" variant="label">선택 위치</Text>
      <Text as="p" variant="caption" className="studio-selected-properties__scope">{props.locationScope}</Text>
      {props.fields.filter(field=>field.scope==='location').map(field=><TextPropertyInput key={`${props.identity}:${field.label}:${field.request?.sequence??''}`} field={field} enabled={props.enabled}/>)}
    </section>
    <section className="studio-selected-properties__group" aria-label="작업 마디의 표기">
      <Text as="h4" variant="label">작업 마디</Text>
      {(props.dynamicObjects?.length??0)>1?<div ref={dynamicTargetHost}><Select key={`dynamic-target:${props.dynamicListIdentity??props.identity}`} label="셈여림 대상"
        help="마디 전체 또는 원본 값 하나를 선택하세요."
        value={props.dynamicTarget?.id??''} disabled={!props.enabled} options={[
          {value:'',label:'마디 전체 설정'},
          ...props.dynamicObjects!.map((mark,index)=>({value:mark.id,label:`${index+1} · ${mark.value} · ${index===0?'표시·재생':'원본 보관'}`}))
        ]} onChange={id=>props.onSelectDynamic?.(id||undefined)}/></div>:null}
      <div ref={dynamicHost} className="studio-selected-properties__dynamic-value"><Select key={`dynamic:${props.identity}:${props.dynamicTarget?.id??'measure'}`} label={props.dynamicTarget?'선택 셈여림':props.inputActive?'입력 마디 셈여림':'선택 마디 셈여림'} help={props.dynamicTarget?.scope??props.measureScope}
        value={props.dynamic??''} disabled={!props.enabled} options={[{value:'',label:'없음'},...props.dynamics.map(value=>({value,label:value}))]} onChange={value=>{
          if(props.dynamicTarget&&value===''&&dynamicHost.current?.contains(document.activeElement))setDynamicDeleteFocus(revision=>revision+1)
          props.onDynamic(value)
        }}/></div>
      {props.fields.filter(field=>field.scope==='measure').map(field=><TextPropertyInput key={`${props.identity}:${field.label}:${field.request?.sequence??''}`} field={field} enabled={props.enabled}/>)}
    </section>
    <StudioPropertyDisclosure className="studio-selected-properties__technical" title="기술 정보"><Text as="output" variant="caption">{props.technical}</Text></StudioPropertyDisclosure>
  </section>
}

function TextPropertyInput({field,enabled}:{field:TextProperty;enabled:boolean}) {
  const [selectedId,setSelectedId]=useState<string|undefined>(field.request?.id??field.objectId??undefined)
  const selected=field.objects?.find(item=>item.id===selectedId)??(field.objectId===undefined?field.objects?.[0]:field.objects?.find(item=>item.id===field.objectId))
  const value=selected?.text??field.value??''
  const [draft,setDraft]=useState(value)
  const [saveNotice,setSaveNotice]=useState<string>()
  const dirty=useRef(false),composing=useRef(false)
  const hasPendingValue=(input:HTMLInputElement)=>enabled&&dirty.current&&input.value.trim()!==value
  const trackDraftInput=useDocumentDraftSaveGuard({workspace:'note',hasPendingValue,
    isComposing:()=>composing.current,onBlocked:()=>setSaveNotice(draftSaveGuidance)})
  const host=useRef<HTMLDivElement>(null)
  useEffect(()=>{
    if(!field.request||field.request.focus===false||!enabled)return
    const input=host.current?.querySelector('input')
    input?.focus();input?.scrollIntoView?.({block:'nearest'})
  },[])
  useEffect(()=>{dirty.current=false;setSaveNotice(undefined);setDraft(value)},[value,selected?.id])
  return <div ref={host} className="studio-selected-properties__text-field">
    {(field.objects?.length??0)>1||(field.objectId!==undefined&&Boolean(field.objects?.length))?<Select label={`${field.label} 대상`} help={field.objectHelp} value={selected?.id??''} disabled={!enabled}
      options={[...(field.objectId===null?[{value:'',label:'현재 위치에 새 표기',disabled:true}]:[]),...field.objects!.map((item,index)=>({value:item.id,label:`${index+1} · ${item.text}${item.positionLabel?` · ${item.positionLabel}`:''}`}))]}
      onChange={id=>{
        const next=field.objects?.find(item=>item.id===id)
        if(!next)return
        dirty.current=false;composing.current=false;setSaveNotice(undefined);setDraft(next.text);setSelectedId(id)
        field.onSelectObject?.(id)
      }}/>:null}
    <Input key={selected?.id??'new'} label={field.label} help={[saveNotice,field.help].filter(Boolean).join(' ')||undefined} aria-label={`선택 요약 ${field.label}`} value={draft} type="text" maxLength={120} disabled={!enabled}
    onCompositionStart={event=>{composing.current=true;trackDraftInput(event.currentTarget)}} onCompositionEnd={()=>{composing.current=false}}
    onChange={event=>{dirty.current=true;trackDraftInput(event.currentTarget);setSaveNotice(undefined);setDraft(event.currentTarget.value)}}
    onBlur={event=>{
      setSaveNotice(undefined)
      if(!enabled||composing.current||!dirty.current)return
      dirty.current=false
      if(event.currentTarget.value.trim()!==value)field.update(event.currentTarget.value,selected?.id)
    }}
    onKeyDown={event=>{
      if(composing.current||event.nativeEvent.isComposing||event.keyCode===229){event.stopPropagation();return}
      if(isDocumentSaveShortcut(event)&&hasPendingValue(event.currentTarget)){
        event.preventDefault();event.stopPropagation();setSaveNotice(draftSaveGuidance);return
      }
      if(event.key==='Enter'){event.preventDefault();event.stopPropagation();event.currentTarget.blur()}
      else if(event.key==='Escape'){
        event.preventDefault();event.stopPropagation();dirty.current=false;setSaveNotice(undefined)
        event.currentTarget.value=value;setDraft(value);event.currentTarget.blur()
      }
    }}/>
  </div>
}
