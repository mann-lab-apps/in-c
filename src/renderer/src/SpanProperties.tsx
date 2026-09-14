import { Link2, RotateCcw, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { isSpanSegmentAddressValid, replaceSpanSegmentEngraving, resolveSpanSegmentEngraving, spanSegmentKey,
  type Score, type SpanEngraving, type SpanGeometry, type SpanSegmentAddress } from '../../score-core'
import { locateEvent } from './editor/editor-state'
import { findSpan, listSpans, spanEndpointOptions, type SpanReference } from './editor/span-editing'

interface Props {
  score: Score
  partId?: string
  selected?: SpanReference
  onSelect: (reference?: SpanReference) => void
  onEndpointChange: (patch: Partial<{ startEventId: string; endEventId: string }>) => void
  onDelete: () => void
  onEngravingChange: (engraving?: SpanEngraving) => void
  independentGeometry?: boolean
  onInheritEngraving?: () => void
  renderedSegments?: SpanReference[]
}

export function SpanProperties({ score, partId, selected, onSelect, onEndpointChange, onDelete, onEngravingChange, independentGeometry, onInheritEngraving, renderedSegments }: Props) {
  const references = listSpans(score, partId)
  const span = selected && findSpan(score, selected)
  const start = span && locateEvent(score, span.startEventId)
  const owner = score.parts.find(part => part.id === start?.address.partId)
  const options = selected ? spanEndpointOptions(score, selected) : []
  const segment = selected?.segment
  const geometry = span && (segment ? resolveSpanSegmentEngraving(span.engraving, segment) : span.engraving)
  const segmentOverride = span?.engraving?.segments?.find(item => segment && spanSegmentKey(item) === spanSegmentKey(segment))
  const segmentOptions = new Map<string, SpanSegmentAddress>()
  const currentSegments = renderedSegments?.filter(reference => reference.kind === selected?.kind && reference.id === selected.id)
    .flatMap(reference => reference.segment ? [reference.segment] : [])
  for (const address of [...(currentSegments ?? []), ...(segment ? [segment] : []), ...(span?.engraving?.segments ?? [])]) segmentOptions.set(spanSegmentKey(address), address)
  const isRendered = (address: SpanSegmentAddress) => currentSegments?.some(item => spanSegmentKey(item) === spanSegmentKey(address))
  const inactiveSegment = Boolean(segment && (currentSegments ? !isRendered(segment) : span && !isSpanSegmentAddressValid(score, span, segment)))
  const commitGeometry = (value?: SpanGeometry) => onEngravingChange(segment
    ? replaceSpanSegmentEngraving(span?.engraving, segment, value ?? null)
    : value ? { ...span?.engraving, ...value } : undefined)
  const segmentLabel = (address: SpanSegmentAddress) => {
    const staff = score.parts.find(part => part.id === address.partId)?.staves.find(staff => staff.id === address.staffId)
    return `${staff?.measures.find(measure => measure.id === address.startMeasureId)?.number ?? '?'} - ${staff?.measures.find(measure => measure.id === address.endMeasureId)?.number ?? '?'}마디 구간`
  }
  return (
    <section className="selection-properties span-properties" aria-label="범위 표기 속성">
      <h3>범위 표기</h3>
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
          <dl><div className="selection-properties__row"><dt>배치 범위</dt><dd>{partId ? independentGeometry ? '독립 파트보' : '총보 연동' : '총보'}</dd></div></dl>
          <label className="selection-properties__edit"><span>조정 대상</span>
            <select aria-label="표기 조정 대상" value={segment ? spanSegmentKey(segment) : ''}
              onChange={event => onSelect({ kind: selected.kind, id: selected.id, segment: segmentOptions.get(event.target.value) })}>
              <option value="">객체 전체</option>
              {[...segmentOptions].map(([key, address]) => <option key={key} value={key}>{segmentLabel(address)}{currentSegments && !isRendered(address) ? ' (비활성)' : ''}</option>)}
            </select>
          </label>
          {segment && currentSegments ? <output aria-label="구간 배치 상태">{inactiveSegment ? '현재 배치에 없음' : '현재 배치에 적용'}</output> : null}
          <label className="selection-properties__edit"><span>배치</span>
            <select aria-label="표기 배치" disabled={inactiveSegment} value={geometry?.placement ?? 'auto'} onChange={event => commitGeometry({ ...geometry, placement: event.target.value === 'auto' ? undefined : event.target.value as 'above' | 'below' })}>
              <option value="auto">자동</option><option value="above">보표 위</option><option value="below">보표 아래</option>
            </select>
          </label>
          {(['offsetX', 'offsetY', 'height'] as const).map(field => <label className="selection-properties__edit" key={field}>
            <span>{field === 'offsetX' ? '가로 이동 (sp)' : field === 'offsetY' ? '세로 이동 (sp)' : selected.kind === 'slur' ? '곡률 높이 (sp)' : '벌어짐 (sp)'}</span>
            <GeometryInput key={`${selected.kind}:${selected.id}:${segment ? spanSegmentKey(segment) : ''}:${field}`} label={field === 'offsetX' ? '표기 가로 이동' : field === 'offsetY' ? '표기 세로 이동' : '표기 높이'}
              min={field === 'height' ? 0.5 : -8} placeholder={field === 'height' ? '자동' : '0'}
              disabled={inactiveSegment}
              value={geometry?.[field]} onCommit={value => commitGeometry({ ...geometry, [field]: value })} />
          </label>)}
          <button type="button" className="icon-button" aria-label="표기 자동 배치 복원" title="표기 자동 배치 복원" disabled={inactiveSegment || !geometry} onClick={() => commitGeometry(undefined)}><RotateCcw size={18} aria-hidden="true" /></button>
          {segment ? <button type="button" className="icon-button" aria-label="객체 전체 배치 따르기" title="객체 전체 배치 따르기" disabled={!segmentOverride}
            onClick={() => onEngravingChange(replaceSpanSegmentEngraving(span.engraving, segment, undefined))}><Link2 size={18} aria-hidden="true" /></button> : null}
          {onInheritEngraving && !segment ? <button type="button" className="icon-button" aria-label="총보 배치 따르기" title="총보 배치 따르기" disabled={!independentGeometry} onClick={onInheritEngraving}><Link2 size={18} aria-hidden="true" /></button> : null}
        </details>
        <div className="span-properties__actions">
          <button aria-label="선택 표기 삭제" title="선택 표기 삭제" onClick={onDelete} type="button"><Trash2 size={18} aria-hidden="true" /></button>
          <button aria-label="표기 선택 해제" title="표기 선택 해제" onClick={() => onSelect(undefined)} type="button"><X size={18} aria-hidden="true" /></button>
        </div>
      </> : null}
    </section>
  )
}

function GeometryInput({ label, min, placeholder, value, onCommit, disabled }: {
  label: string; min: number; placeholder: string; value?: number; onCommit: (value?: number) => void; disabled?: boolean
}) {
  const [draft, setDraft] = useState(value === undefined ? '' : String(value))
  useEffect(() => setDraft(value === undefined ? '' : String(value)), [value])
  return <input aria-label={label} disabled={disabled} type="number" min={min} max={8} step={0.25} placeholder={placeholder} value={draft}
    onChange={event => setDraft(event.target.value)}
    onBlur={event => {
      if (!event.currentTarget.validity.valid) { setDraft(value === undefined ? '' : String(value)); return }
      const next = event.currentTarget.value === '' ? undefined : event.currentTarget.valueAsNumber
      if (next !== value) onCommit(next)
    }}
    onKeyDown={event => {
      if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() }
      if (event.key === 'Escape') {
        event.preventDefault()
        event.currentTarget.value = value === undefined ? '' : String(value)
        setDraft(event.currentTarget.value)
        event.currentTarget.blur()
      }
    }} />
}
