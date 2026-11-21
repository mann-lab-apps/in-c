import { useLayoutEffect, useRef, useState } from 'react'
import { Button, Checkbox, Dialog, Input, Select, Text } from '@ddirori/ui'
import { measureDurationTicks, TICKS_PER_QUARTER, type Score } from '../../score-core'
import { isDocumentSaveShortcut } from './editor/draft-save'
import { useDocumentDraftSaveGuard } from './editor/document-drafts'
import { buildEmptyFirstMeasurePickupCommand, firstMeasurePickupIssues, inspectEmptyFirstMeasures } from './editor/existing-pickup'
import { parsePickupDuration } from './editor/new-score'
import './studio-pickup-dialog.css'

function initialDraft(score: Score) {
  const timing = score.parts[0]?.staves[0]?.measures[0]?.timing
  if (timing?.type !== 'pickup') return { enabled: false, count: '1', unit: '8' }
  const nominal = score.parts[0].staves[0].measures[0].timeSignature
  for (const unit of [8, 4, 16, 2, 1, 32, 64]) for (let count = 1; count <= 128; count++) {
    if (parsePickupDuration(String(count), String(unit), nominal) === timing.durationTicks) {
      return { enabled: true, count: String(count), unit: String(unit) }
    }
  }
  // Imported lengths outside this authoring control remain untouched.
  return { enabled: true, count: '', unit: '8' }
}

export function StudioPickupDialog({ score, theme, onClose, onApply }: {
  score: Score; theme: 'light' | 'dark'; onClose: () => void; onApply: (durationTicks?: number) => boolean
}) {
  const [draft, setDraft] = useState(() => initialDraft(score)), [error, setError] = useState<string>(),
    [invalidCount, setInvalidCount] = useState(false)
  const root = useRef<HTMLDivElement>(null), composing = useRef(false)
  const trackInput = useDocumentDraftSaveGuard({ workspace: 'document', hasPendingValue: () => true,
    isComposing: () => composing.current, onBlocked: () => setError('첫 마디 길이를 적용하거나 취소한 뒤 프로젝트를 저장하세요.') })
  useLayoutEffect(() => {
    const input = root.current?.querySelector<HTMLInputElement>('input')
    if (input) trackInput(input)
  }, [draft.enabled, trackInput])
  const { first, issue } = inspectEmptyFirstMeasures(score)
  const ticks = draft.enabled && first ? parsePickupDuration(draft.count, draft.unit, first.timeSignature) : undefined
  const result = !draft.enabled || ticks !== undefined ? buildEmptyFirstMeasurePickupCommand(score, ticks) : undefined
  const close = () => { if (!composing.current) onClose() }
  return <div ref={root} className="studio-pickup-dialog ddirori" data-theme={theme} data-density="compact"
    onCompositionStartCapture={() => { composing.current = true }} onCompositionEndCapture={() => { composing.current = false }}
    onKeyDown={event => {
      event.stopPropagation()
      if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229 || event.key === 'Process') {
        if (event.key === 'Enter' || event.key === 'Escape') event.preventDefault()
        return
      }
      if (isDocumentSaveShortcut(event)) { event.preventDefault(); setError('첫 마디 길이를 적용하거나 취소한 뒤 프로젝트를 저장하세요.') }
      if (event.key === 'Escape') { event.preventDefault(); close() }
    }}>
    <Dialog open title="첫 마디 길이" onClose={close}>
      <form aria-label="첫 마디 길이" noValidate onSubmit={event => {
        event.preventDefault(); event.stopPropagation()
        if (composing.current || issue || result?.unchanged) return
        if (draft.enabled && ticks === undefined) {
          setInvalidCount(true); setError('1–128 사이의 정수와 현재 박자표보다 짧은 길이를 지정하세요. 입력값은 자동으로 바뀌지 않습니다.')
          root.current?.querySelector<HTMLInputElement>('input[type="number"]')?.focus()
          return
        }
        if (result?.issue) { setError(firstMeasurePickupIssues[result.issue]); return }
        if (onApply(ticks)) onClose()
        else setError('현재 악보의 첫 마디를 변경할 수 없습니다. 원본 표기와 적용 범위를 확인하세요.')
      }}>
        <Text as="p" variant="description">적용 범위: 모든 보표의 빈 첫 마디. 마디 번호와 마지막 마디는 그대로 유지합니다.</Text>
        <Checkbox label="첫 마디를 못갖춘마디로" checked={draft.enabled} disabled={Boolean(issue)} onChange={event => {
          setDraft({ ...draft, enabled: event.currentTarget.checked }); setError(undefined); setInvalidCount(false)
        }} />
        {draft.enabled ? <div className="studio-pickup-dialog__fields">
          <Input label="못갖춘마디 개수" aria-label="못갖춘마디 개수" type="number" min={1} max={128} step={1} value={draft.count}
            disabled={Boolean(issue)} error={invalidCount ? '1–128 정수이며 한 마디보다 짧아야 합니다.' : undefined} help="1–128 · 정수"
            onFocus={event => trackInput(event.currentTarget)} onChange={event => { trackInput(event.currentTarget); setDraft({ ...draft, count: event.currentTarget.value }); setError(undefined); setInvalidCount(false) }} />
          <Select label="못갖춘마디 음가" value={draft.unit} disabled={Boolean(issue)} options={[1, 2, 4, 8, 16, 32, 64].map(value => ({ value: String(value), label: `${value}분음표` }))}
            onChange={unit => { setDraft({ ...draft, unit }); setError(undefined); setInvalidCount(false) }} />
        </div> : null}
        {first ? <Text as="p" variant="description">박자표 {first.timeSignature.beats}/{first.timeSignature.beatType} · 현재 길이 {(measureDurationTicks(first) / TICKS_PER_QUARTER).toLocaleString('ko-KR', { maximumFractionDigits: 3 })}박 (4분음표 기준). 선택을 해제하면 정상 길이로 복원합니다.</Text> : null}
        {issue || error ? <Text as="p" role="alert">{issue ? firstMeasurePickupIssues[issue] : error}</Text> : null}
        <div className="studio-pickup-dialog__actions"><Button kind="quiet" type="button" onClick={close}>취소</Button><Button type="submit" onClick={() => {}} disabled={Boolean(issue || result?.unchanged)}>적용</Button></div>
      </form>
    </Dialog>
  </div>
}
