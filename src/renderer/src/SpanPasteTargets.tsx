import { ClipboardPaste } from 'lucide-react'
import { useState } from 'react'
import type { Score } from '../../score-core'
import type { EditorSelection } from './editor/editor-state'
import { buildSpanPaste, type SpanClipboard } from './editor/span-clipboard'
import { staffEndpointOptions } from './editor/span-editing'

interface Props {
  score: Score
  selection: EditorSelection
  clipboard: SpanClipboard
  onPaste: (startEventId: string, endEventId?: string) => void
}

export function SpanPasteTargets({ score, selection, clipboard, onPaste }: Props) {
  const [draft, setDraft] = useState<{ score: Score; selection: EditorSelection; clipboard: SpanClipboard; start: string; end: string }>()
  const current = draft?.score === score && draft.selection === selection && draft.clipboard === clipboard ? draft : undefined
  const start = current?.start ?? (selection.type === 'event' ? selection.eventId : '')
  const end = current?.end ?? ''
  const options = selection.type === 'event' ? staffEndpointOptions(score, selection.eventId, clipboard.kind) : []
  const previewId = '__span-paste-preview__'
  const canPaste = Boolean(buildSpanPaste(score, { type: 'event', eventId: start }, clipboard, () => previewId, end || undefined))
  const change = (patch: Partial<{ start: string; end: string }>) => setDraft({ score, selection, clipboard, start, end, ...patch })
  return <section className="selection-properties span-paste-targets" aria-label="표기 붙여넣기 대상">
    <h3>{clipboard.kind === 'slur' ? '슬러 붙여넣기' : '헤어핀 붙여넣기'}</h3>
    <label className="selection-properties__edit"><span>시작</span>
      <select aria-label="붙여넣기 시작점" value={options.some(option => option.id === start) ? start : ''}
        disabled={!options.length} onChange={event => change({ start: event.target.value, end: '' })}>
        <option value="">선택 없음</option>
        {options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      {options.find(option => option.id === start)?.label &&
        <output className="span-paste-targets__address">{options.find(option => option.id === start)!.label}</output>}
    </label>
    <label className="selection-properties__edit"><span>끝</span>
      <select aria-label="붙여넣기 끝점" value={end} disabled={!start || !options.length} onChange={event => change({ end: event.target.value })}>
        <option value="">{clipboard.requiresExplicitEnd ? '끝점 선택 필요' : '자동 · 원본 간격'}</option>
        {options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      {end && <output className="span-paste-targets__address">{options.find(option => option.id === end)?.label}</output>}
    </label>
    <button type="button" className="icon-button" aria-label="표기 대상에 붙여넣기" title="표기 대상에 붙여넣기"
      disabled={!canPaste} onClick={() => onPaste(start, end || undefined)}><ClipboardPaste size={18} aria-hidden="true" /></button>
  </section>
}
