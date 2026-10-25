import { RotateCcw, Trash2, X } from 'lucide-react'
import { Input, IconButton, Text } from '@ddirori/ui'
import '@ddirori/ui/styles.css'
import { useEffect, useRef, useState } from 'react'
import type { Score, SpanEngraving } from '../../score-core'
import { locateEvent } from './editor/editor-state'
import { findSpan, listSpans, spanEndpointOptions, type SpanReference } from './editor/span-editing'

interface Props {
  theme?: 'light' | 'dark'
  score: Score
  partId?: string
  selected?: SpanReference
  onSelect: (reference?: SpanReference) => void
  onEndpointChange: (patch: Partial<{ startEventId: string; endEventId: string }>) => void
  onDelete: () => void
  onEngravingChange: (engraving?: SpanEngraving) => void
}

export function SpanProperties({ theme = 'light', score, partId, selected, onSelect, onEndpointChange, onDelete, onEngravingChange }: Props) {
  const references = listSpans(score, partId)
  const span = selected && findSpan(score, selected)
  const start = span && locateEvent(score, span.startEventId)
  const owner = score.parts.find(part => part.id === start?.address.partId)
  const options = selected ? spanEndpointOptions(score, selected) : []
  return (
    <section className="selection-properties span-properties studio-chrome ddirori" data-density="compact" data-theme={theme} aria-label="범위 표기 속성">
      <Text as="h3" variant="sectionTitle">범위 표기</Text>
      <label className="selection-properties__edit">
        <span>객체</span>
        <select aria-label="표기 객체 선택" value={span && selected ? `${selected.kind}:${selected.id}` : ''}
          onChange={event => onSelect(references.find(reference => `${reference.kind}:${reference.id}` === event.target.value))}>
          <option value="">선택 없음</option>
          {references.map((reference, index) => {
            const item = findSpan(score, reference)!
            const anchor = locateEvent(score, item.startEventId)
            const part = score.parts.find(candidate => candidate.id === anchor?.address.partId)
            return <option key={`${reference.kind}:${reference.id}`} value={`${reference.kind}:${reference.id}`}>
              {index + 1}. {reference.kind === 'slur' ? '슬러' : 'type' in item && item.type === 'diminuendo' ? '디미누엔도' : '크레셴도'} · {part?.name ?? '?'} · {anchor?.measureNumber ?? '?'}마디
            </option>
          })}
        </select>
      </label>
      {span && selected ? <>
        <dl>
          <div className="selection-properties__row"><dt>종류</dt><dd>{selected.kind === 'slur' ? '슬러' : '헤어핀'}</dd></div>
          <div className="selection-properties__row"><dt>파트</dt><dd>{owner?.name ?? '?'}</dd></div>
          <div className="selection-properties__row"><dt>보표</dt><dd>{owner ? owner.staves.findIndex(staff => staff.id === start?.address.staffId) + 1 : '?'}</dd></div>
          <div className="selection-properties__row"><dt>성부</dt><dd>{start ? start.measure.voices.findIndex(voice => voice.id === start.address.voiceId) + 1 : '?'}</dd></div>
        </dl>
        {(['startEventId', 'endEventId'] as const).map(endpoint => <label className="selection-properties__edit" key={endpoint}>
          <span>{endpoint === 'startEventId' ? '시작' : '끝'}</span>
          <select aria-label={endpoint === 'startEventId' ? '표기 시작점' : '표기 끝점'} value={span[endpoint]}
            title={options.find(option => option.id === span[endpoint])?.label}
            onChange={event => onEndpointChange({ [endpoint]: event.target.value })}>
            {!options.some(option => option.id === span[endpoint]) ? <option value={span[endpoint]}>지원되지 않는 끝점</option> : null}
            {options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
          <output className="span-properties__address">{options.find(option => option.id === span[endpoint])?.label}</output>
        </label>)}
        <details className="span-properties__geometry">
          <summary>배치 · 형상</summary>
          <label className="selection-properties__edit"><span>배치</span>
            <select aria-label="표기 배치" value={span.engraving?.placement ?? 'auto'} onChange={event => onEngravingChange({ ...span.engraving, placement: event.target.value === 'auto' ? undefined : event.target.value as 'above' | 'below' })}>
              <option value="auto">자동</option><option value="above">보표 위</option><option value="below">보표 아래</option>
            </select>
          </label>
          {(['offsetX', 'offsetY', 'height'] as const).map(field => <div className="selection-properties__edit" key={field}>
            <GeometryInput key={`${selected.kind}:${selected.id}:${field}`} label={field === 'offsetX' ? '표기 가로 이동' : field === 'offsetY' ? '표기 세로 이동' : '표기 높이'}
              displayLabel={field === 'offsetX' ? '가로 이동 (sp)' : field === 'offsetY' ? '세로 이동 (sp)' : selected.kind === 'slur' ? '곡률 높이 (sp)' : '벌어짐 (sp)'}
              min={field === 'height' ? 0.5 : -8} placeholder="자동"
              value={span.engraving?.[field]} onCommit={value => onEngravingChange({ ...span.engraving, [field]: value })} />
          </div>)}
          <IconButton label="표기 자동 배치 복원" disabled={!span.engraving} onClick={() => onEngravingChange(undefined)}><RotateCcw size={18} aria-hidden="true" /></IconButton>
        </details>
        <div className="span-properties__actions">
          <IconButton label="선택 표기 삭제" onClick={onDelete}><Trash2 size={18} aria-hidden="true" /></IconButton>
          <IconButton label="표기 선택 해제" onClick={() => onSelect(undefined)}><X size={18} aria-hidden="true" /></IconButton>
        </div>
      </> : <p className="span-properties__empty">선택된 범위 표기 없음</p>}
    </section>
  )
}

function GeometryInput({ label, displayLabel, min, placeholder, value, onCommit }: {
  label: string; displayLabel: string; min: number; placeholder: string; value?: number; onCommit: (value?: number) => void
}) {
  const [draft, setDraft] = useState(value === undefined ? '' : String(value))
  const [error, setError] = useState<string>()
  const dirty = useRef(false)
  const composing = useRef(false)
  useEffect(() => {
    dirty.current = false
    setError(undefined)
    setDraft(value === undefined ? '' : String(value))
  }, [value])
  return <Input label={displayLabel} error={error} aria-label={label} type="number" min={min} max={8} step={0.25} placeholder={placeholder} value={draft}
    onCompositionStart={() => { composing.current = true }}
    onCompositionEnd={() => { composing.current = false }}
    onChange={event => { dirty.current = true; setError(undefined); setDraft(event.target.value) }}
    onBlur={event => {
      if (composing.current || !dirty.current) return
      dirty.current = false
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
      if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); event.currentTarget.blur() }
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        dirty.current = false
        setError(undefined)
        event.currentTarget.value = value === undefined ? '' : String(value)
        setDraft(event.currentTarget.value)
        event.currentTarget.blur()
      }
    }} />
}
