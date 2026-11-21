import { useRef, useState } from 'react'
import { Button, Dialog, Input, Select, Text } from '@ddirori/ui'
import { normalizePrintPageSetup } from './notation/print-layout'
import { isDocumentSaveShortcut } from './editor/draft-save'
import type { PrintSetup, usePrintPageProfiles } from './print-page-profiles'
import './studio-print-profiles-dialog.css'

export function describePrintSetup(value: PrintSetup) {
  return `${value.pageSize === 'a4' ? 'A4' : 'Letter'} ${value.orientation === 'portrait' ? '세로' : '가로'} · 여백 ${value.pageMarginMm} mm · 보표 ${value.staffSizePercent}% · 시스템 간격 ${value.systemSpacingPercent}%`
}
export function StudioPrintProfilesDialog({ theme, setup, partName, profiles: store, onClose, onApply }: {
  theme: 'light' | 'dark'; setup: PrintSetup; partName?: string; profiles: ReturnType<typeof usePrintPageProfiles>
  onClose: () => void; onApply: (setup: PrintSetup) => boolean
}) {
  const [name, setName] = useState(''), [selectedId, setSelectedId] = useState(store.profiles[0]?.id ?? '')
  const [error, setError] = useState<string>(), [status, setStatus] = useState('')
  const root = useRef<HTMLDivElement>(null), composing = useRef(false)
  const selected = store.profiles.find(profile => profile.id === selectedId)
  const focusName = () => root.current?.querySelector<HTMLInputElement>('input')?.focus()
  const close = () => { if (!composing.current) onClose() }
  return <div ref={root} className="studio-print-profiles-dialog ddirori" data-theme={theme} data-density="compact"
    onCompositionStartCapture={() => { composing.current = true }} onCompositionEndCapture={() => { composing.current = false }}
    onKeyDown={event => {
      event.stopPropagation()
      if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229 || event.key === 'Process') {
        if (event.key === 'Enter' || event.key === 'Escape') event.preventDefault()
        return
      }
      if (isDocumentSaveShortcut(event)) { event.preventDefault(); setStatus(''); setError('프리셋 창을 닫은 뒤 프로젝트를 저장하세요. 프리셋 목록은 프로젝트에 포함되지 않습니다.') }
      if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); close() }
    }}>
    <Dialog open title="출력 설정 프리셋" onClose={close}>
      <Text as="p" variant="description">용지·방향·여백·보표 크기·시스템 간격만 이 기기에 저장합니다. 악보 템플릿이나 전체 스타일이 아니며 자동 갱신되지 않습니다.</Text>
      <Text as="p" variant="description">{partName === undefined ? '총보에 적용' : `${partName || '선택 파트'} 파트보에 적용`}. 현재 설정: {describePrintSetup(setup)}</Text>
      <form aria-label="현재 출력 설정 저장" noValidate onSubmit={event => {
        event.preventDefault(); event.stopPropagation()
        if (composing.current) return
        const result = store.add(name, setup)
        if (result.error) { setStatus(''); setError(result.error); focusName(); return }
        focusName(); setSelectedId(result.id!); setName(''); setError(undefined); setStatus('출력 설정을 목록에 추가했습니다. 악보는 변경하지 않았습니다.')
      }}>
        <Input label="새 출력 설정 이름" value={name} help="1–40자 · 최대 20개 · 이 기기에 저장" onChange={event => { setName(event.currentTarget.value); setError(undefined); setStatus('') }} />
        <Button type="submit" onClick={() => {}}>현재 출력 설정 저장</Button>
      </form>
      {store.profiles.length ? <>
        <Select label="저장한 출력 설정" value={selectedId} options={store.profiles.map(profile => ({ value: profile.id, label: profile.name }))}
          onChange={id => { setSelectedId(id); setError(undefined); setStatus('') }} />
        {selected ? <>
          <Text as="p" variant="description">저장한 값: {describePrintSetup(selected.setup)}</Text>
          <Text as="p" variant="description">적용할 값: {describePrintSetup(normalizePrintPageSetup(selected.setup))}. 기존 출력 설정과 같이 소수는 정수로 반올림합니다.</Text>
        </> : null}
        <div className="studio-print-profiles-dialog__actions">
          <Button disabled={!selected} onClick={() => {
            if (composing.current || !selected) return
            if (!onApply(selected.setup)) { setStatus(''); setError('현재 문서의 미확정 입력을 확정하거나 취소한 뒤 다시 적용하세요.'); return }
            onClose()
          }}>선택 프리셋 적용</Button>
          <Button kind="secondary" disabled={!selected} onClick={() => {
            if (composing.current || !selected || !store.update(selected.id, setup)) return
            setError(undefined); setStatus(`‘${selected.name}’ 프리셋을 현재 설정으로 갱신했습니다. 악보는 변경하지 않았습니다.`)
          }}>선택 프리셋 갱신</Button>
          <Button kind="quiet" disabled={!selected} onClick={() => {
            if (composing.current || !selected) return
            focusName(); store.remove(selected.id); setSelectedId(store.profiles.find(profile => profile.id !== selected.id)?.id ?? '')
            setError(undefined); setStatus('선택 프리셋을 삭제했습니다. 현재 악보 설정은 유지합니다.')
          }}>선택 프리셋 삭제</Button>
        </div>
      </> : <Text as="p" variant="description">저장한 출력 설정이 없습니다.</Text>}
      {error ? <Text as="p" role="alert">{error}</Text> : null}
      {store.storageIssue ? <Text as="p" role="alert">{store.storageIssue}</Text> : null}
      <Text as="p" role="status">{status}</Text>
      <div className="studio-print-profiles-dialog__actions"><Button kind="quiet" onClick={close}>프리셋 창 닫기</Button></div>
    </Dialog>
  </div>
}
