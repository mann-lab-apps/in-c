import { RotateCcw, Trash2, X } from 'lucide-react'
import { Input, IconButton, Select, Text, Tooltip } from '@ddirori/ui'
import '@ddirori/ui/styles.css'
import './studio-span-properties.css'
import { StudioPropertyDisclosure, useRevealPropertyDisclosure } from './StudioPropertyDisclosure'
import { hasManualSpanEngraving } from '../../project/span-engraving'
import { useEffect, useRef, useState } from 'react'
import type { Score, SpanEngraving } from '../../score-core'
import { locateEvent } from './editor/editor-state'
import { draftSaveGuidance, isDocumentSaveShortcut } from './editor/draft-save'
import { useDocumentDraftSaveGuard } from './editor/document-drafts'
import { findSpan, listSpans, spanEndpointOptions, spanEndpointOrderIsValid, type SpanReference } from './editor/span-editing'

interface Props {
  theme?: 'light' | 'dark'
  score: Score
  partId?: string
  scopeLabel?: string
  selected?: SpanReference
  onSelect: (reference?: SpanReference) => void
  onEndpointChange: (patch: Partial<{ startEventId: string; endEventId: string }>) => void
  onDelete: () => void
  onEngravingChange: (engraving?: SpanEngraving) => void
}

export function SpanProperties({ theme = 'light', score, partId, scopeLabel, selected, onSelect, onEndpointChange, onDelete, onEngravingChange }: Props) {
  const root = useRef<HTMLElement>(null)
  const references = listSpans(score, partId)
  const span = selected && findSpan(score, selected)
  const start = span && locateEvent(score, span.startEventId)
  const owner = score.parts.find(part => part.id === start?.address.partId)
  const options = selected ? spanEndpointOptions(score, selected) : []
  const startOption = span ? options.find(option => option.id === span.startEventId) : undefined
  const endOption = span ? options.find(option => option.id === span.endEventId) : undefined
  const invalidOrder = Boolean(startOption && endOption && !spanEndpointOrderIsValid(startOption, endOption))
  const focusObjectPicker = () => root.current?.querySelector<HTMLButtonElement>('[role="combobox"]')?.focus()
  const pickerOptions = [{ value:'', label:'선택 없음' }, ...references.map((reference, index) => {
    const item = findSpan(score, reference)!
    const anchor = locateEvent(score, item.startEventId)
    const part = score.parts.find(candidate => candidate.id === anchor?.address.partId)
    return { value:`${reference.kind}:${reference.id}`, label:`${index + 1}. ${reference.kind === 'slur' ? '슬러' : 'type' in item && item.type === 'diminuendo' ? '디미누엔도' : '크레셴도'} · ${part?.name ?? '?'} · ${anchor?.measureNumber ?? '?'}마디` }
  })]
  return (
    <section ref={root} className="studio-span-properties ddirori" data-density="compact" data-theme={theme} aria-label="범위 표기 속성"
      onKeyDown={event => {
        // Select owns navigation/commit/cancel; public buttons retain native
        // activation instead of reaching selected-span editor shortcuts.
        // Modified document shortcuts and composition guards stay with App.
        const target = event.target as HTMLElement
        if (event.metaKey || event.ctrlKey || event.altKey) return
        if (target.closest('[role="combobox"]')) {
          event.stopPropagation()
        } else if (target.closest('button')) {
          if (event.nativeEvent.isComposing || event.keyCode === 229) return
          if (span && (event.key === 'Escape' || event.key === 'Delete' || event.key === 'Backspace')) {
            event.preventDefault()
            event.stopPropagation()
            focusObjectPicker()
            if (event.key === 'Escape') onSelect(undefined)
            else onDelete()
          } else if (event.key === 'Enter' || event.key === ' ') event.stopPropagation()
        }
      }}>
      <Text as="h3" variant="itemTitle">{span&&selected?'선택한 표기':'범위 표기 찾기'}</Text>
      <Select label="표기 객체 선택" value={span && selected ? `${selected.kind}:${selected.id}` : ''} options={pickerOptions}
        onChange={value => onSelect(references.find(reference => `${reference.kind}:${reference.id}` === value))} />
      {span && selected ? <>
        <dl className="studio-span-properties__identity">
          <div><dt>종류</dt><dd>{selected.kind === 'slur' ? '슬러' : '헤어핀'}</dd></div>
          <div><dt>파트</dt><dd>{owner?.name ?? '?'}</dd></div>
          <div><dt>보표</dt><dd>{owner ? owner.staves.findIndex(staff => staff.id === start?.address.staffId) + 1 : '?'}</dd></div>
          <div><dt>성부</dt><dd>{options.find(option=>option.id===span.startEventId)?.voiceNumber ?? '?'}</dd></div>
          {scopeLabel ? <div><dt><Text variant="caption">적용 범위</Text></dt><dd><Text variant="description">{scopeLabel}</Text></dd></div> : null}
        </dl>
        {(['startEventId', 'endEventId'] as const).map(endpoint => {
          const supported = options.some(option => option.id === span[endpoint])
          const opposite = endpoint === 'startEventId' ? endOption : startOption
          return <Select key={`${selected.kind}:${selected.id}:${endpoint}`} label={endpoint === 'startEventId' ? '표기 시작점' : '표기 끝점'} value={span[endpoint]}
            options={[...(!supported ? [{value:span[endpoint],label:'지원되지 않는 끝점',disabled:true}] : []), ...options.map(option => ({value:option.id,label:option.label,
              disabled: endpoint === 'startEventId' ? !spanEndpointOrderIsValid(option, opposite) : !spanEndpointOrderIsValid(opposite, option)}))]}
            help={opposite
              ? endpoint === 'startEventId' ? '시작점은 현재 끝점보다 앞에 있어야 합니다.' : '끝점은 현재 시작점보다 뒤에 있어야 합니다.'
              : endpoint === 'startEventId' ? '끝점의 지원 범위를 먼저 수정해 주세요.' : '시작점의 지원 범위를 먼저 수정해 주세요.'}
            error={!supported ? '같은 파트·보표의 지원되는 끝점을 선택해 주세요.' : invalidOrder ? '끝점은 시작점보다 뒤에 있어야 합니다.' : undefined}
            onChange={value => onEndpointChange({ [endpoint]: value })} />
        })}
        <StudioPropertyDisclosure className="studio-span-properties__geometry" title="배치 · 형상">
          <Text as="output" variant="description" className="studio-span-properties__automatic" aria-label="표기 배치 요약">
            {span.engraving?.placement === 'above' ? '보표 위' : span.engraving?.placement === 'below' ? '보표 아래' : '배치 자동'}
            {(['offsetX', 'offsetY', 'height'] as const).map(field => <span key={field}>
              {` · ${field === 'offsetX' ? '가로' : field === 'offsetY' ? '세로' : '높이'} ${span.engraving?.[field] === undefined ? '자동' : `${span.engraving[field]} sp`}`}
            </span>)}
          </Text>
          <Select label="표기 배치" value={span.engraving?.placement ?? 'auto'} options={[{value:'auto',label:'자동'},{value:'above',label:'보표 위'},{value:'below',label:'보표 아래'}]}
            onChange={value => onEngravingChange({ ...span.engraving, placement: value === 'auto' ? undefined : value as 'above' | 'below' })} />
          {(['offsetX', 'offsetY', 'height'] as const).map(field => <div className="studio-span-properties__field" key={field}>
            <GeometryInput key={`${selected.kind}:${selected.id}:${field}`} label={field === 'offsetX' ? '표기 가로 이동' : field === 'offsetY' ? '표기 세로 이동' : '표기 높이'}
              displayLabel={field === 'offsetX' ? '가로 이동 (sp)' : field === 'offsetY' ? '세로 이동 (sp)' : selected.kind === 'slur' ? '곡률 높이 (sp)' : '벌어짐 (sp)'}
              min={field === 'height' ? 0.5 : -8} placeholder="자동"
              value={span.engraving?.[field]} onCommit={value => onEngravingChange({ ...span.engraving, [field]: value })} />
          </div>)}
          <Text as="p" variant="description">빈 값은 자동, 0은 지정한 위치입니다. sp는 오선 간격 단위입니다. 초기화하면 모든 수동 배치를 자동으로 되돌립니다.</Text>
          <Tooltip text="모든 수동 배치를 자동으로 복원">
            <IconButton label="표기 자동 배치 복원" disabled={!hasManualSpanEngraving(span.engraving)} onClick={() => {
              // Reset disables this button. Transfer focus before dispatch so
              // it stays on a live field without a delayed focus request.
              root.current?.querySelector<HTMLInputElement>('.studio-span-properties__field input')?.focus()
              onEngravingChange(undefined)
            }}><RotateCcw size={18} strokeWidth={1.75} aria-hidden="true" /></IconButton>
          </Tooltip>
        </StudioPropertyDisclosure>
        <div className="studio-span-properties__actions">
          <Tooltip text="선택한 표기 삭제"><IconButton label="선택 표기 삭제" onClick={() => {
            // These actions disappear after dispatch; keep keyboard focus on
            // the surviving public picker without a delayed focus request.
            focusObjectPicker()
            onDelete()
          }}><Trash2 size={18} strokeWidth={1.75} aria-hidden="true" /></IconButton></Tooltip>
          <Tooltip text="표기 선택 해제"><IconButton label="표기 선택 해제" onClick={() => {
            focusObjectPicker()
            onSelect(undefined)
          }}><X size={18} strokeWidth={1.75} aria-hidden="true" /></IconButton></Tooltip>
        </div>
        <StudioPropertyDisclosure className="studio-span-properties__technical" title="기술 정보"><Text as="output" variant="caption" aria-label="선택 표기 ID">{selected.id}</Text></StudioPropertyDisclosure>
      </> : <Text as="p" variant="description" className="studio-span-properties__empty">선택된 범위 표기 없음</Text>}
    </section>
  )
}

function GeometryInput({ label, displayLabel, min, placeholder, value, onCommit }: {
  label: string; displayLabel: string; min: number; placeholder: string; value?: number; onCommit: (value?: number) => void
}) {
  const [draft, setDraft] = useState(value === undefined ? '' : String(value))
  const [error, setError] = useState<string>()
  const [saveNotice, setSaveNotice] = useState<string>()
  const dirty = useRef(false)
  const composing = useRef(false)
  useEffect(() => {
    dirty.current = false
    setError(undefined)
    setSaveNotice(undefined)
    setDraft(value === undefined ? '' : String(value))
  }, [value])
  const hasPendingValue = (input: HTMLInputElement) => {
    const next = input.value === '' ? undefined : input.valueAsNumber
    return dirty.current && (!input.validity.valid || next !== value)
  }
  const revealDisclosure = useRevealPropertyDisclosure()
  const showSaveNotice = () => { revealDisclosure?.(); setSaveNotice(draftSaveGuidance) }
  const trackInput = useDocumentDraftSaveGuard({ workspace: 'span-properties', hasPendingValue, isComposing: () => composing.current, onBlocked: showSaveNotice })
  return <Input label={displayLabel} error={error} help={saveNotice} aria-label={label} type="number" min={min} max={8} step={0.25} placeholder={placeholder} value={draft}
    onCompositionStart={event => { trackInput(event.currentTarget); composing.current = true }}
    onCompositionEnd={() => { composing.current = false }}
    onChange={event => { trackInput(event.currentTarget); dirty.current = true; setError(undefined); setSaveNotice(undefined); setDraft(event.target.value) }}
    onBlur={event => {
      if (composing.current || !dirty.current) return
      dirty.current = false
      setSaveNotice(undefined)
      if (!event.currentTarget.validity.valid) {
        setError(`${min}~8 sp, 0.25 sp 단위로 입력하세요.`)
        setDraft(value === undefined ? '' : String(value))
        return
      }
      const next = event.currentTarget.value === '' ? undefined : event.currentTarget.valueAsNumber
      if (next !== value) onCommit(next)
    }}
    onKeyDown={event => {
      if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229) {
        event.stopPropagation()
        return
      }
      if (isDocumentSaveShortcut(event) && hasPendingValue(event.currentTarget)) {
        event.preventDefault()
        event.stopPropagation()
        showSaveNotice()
        return
      }
      if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); event.currentTarget.blur() }
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        dirty.current = false
        setError(undefined)
        setSaveNotice(undefined)
        event.currentTarget.value = value === undefined ? '' : String(value)
        setDraft(event.currentTarget.value)
        event.currentTarget.blur()
      }
    }} />
}
