import { useRef, useState } from 'react'
import { Button, Dialog, Input, Select, Text } from '@ddirori/ui'
import { isDocumentSaveShortcut } from './editor/draft-save'
import { type DockLayout, type useDockLayoutProfiles } from './dock-layout-profiles'
import './studio-dock-layout-dialog.css'

export function describeDockLayout(layout: DockLayout) {
  const shown = [layout.visibility.palette ? '팔레트' : '', layout.visibility.properties ? '속성' : ''].filter(Boolean)
  const active = layout.visibility[layout.activeDock] ? layout.activeDock : layout.visibility.palette ? 'palette' : 'properties'
  return `폭: 팔레트 ${layout.widths.palette}px · 속성 ${layout.widths.properties}px. 표시 설정: ${shown.join('·') || '모두 숨김'}.${shown.length ? ` 공유 도크의 열린 탭: ${active === 'palette' ? '팔레트' : '속성'}.` : ''}`
}
export function StudioDockLayoutDialog({ theme, layout, profiles: store, onClose, onRestore }: {
  theme: 'light' | 'dark'; layout: DockLayout; profiles: ReturnType<typeof useDockLayoutProfiles>
  onClose: () => void; onRestore: (layout: DockLayout) => boolean
}) {
  const [name, setName] = useState(''), [selectedId, setSelectedId] = useState(store.profiles[0]?.id ?? '')
  const [error, setError] = useState<string>(), [status, setStatus] = useState('')
  const root = useRef<HTMLDivElement>(null), composing = useRef(false)
  const selected = store.profiles.find(profile => profile.id === selectedId)
  const focusName = () => root.current?.querySelector<HTMLInputElement>('input')?.focus()
  const close = () => { if (!composing.current) onClose() }
  return <div ref={root} className="studio-dock-layout-dialog ddirori" data-theme={theme} data-density="compact"
    onCompositionStartCapture={() => { composing.current = true }} onCompositionEndCapture={() => { composing.current = false }}
    onKeyDown={event => {
      event.stopPropagation()
      if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229 || event.key === 'Process') {
        if (event.key === 'Enter' || event.key === 'Escape') event.preventDefault()
        return
      }
      if (isDocumentSaveShortcut(event)) { event.preventDefault(); setStatus(''); setError('도크 배치 창을 닫은 뒤 프로젝트를 저장하세요. 배치 이름은 프로젝트에 포함되지 않습니다.') }
      if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); close() }
    }}>
    <Dialog open title="도크 배치" onClose={close}>
      <Text as="p" variant="description">이 기기의 도크 폭·표시 설정·열린 탭만 저장합니다. 악보, 확대율, 팔레트 내용은 바꾸지 않습니다. 배치는 자동 갱신되지 않습니다.</Text>
      <Text as="p" variant="description">현재 배치: {describeDockLayout(layout)}</Text>
      <form aria-label="현재 도크 배치 저장" noValidate onSubmit={event => {
        event.preventDefault(); event.stopPropagation()
        if (composing.current) return
        const result = store.add(name, layout)
        if (result.error) { setStatus(''); setError(result.error); focusName(); return }
        focusName(); setSelectedId(result.id!); setName(''); setError(undefined); setStatus('배치를 목록에 추가했습니다.')
      }}>
        <Input label="새 배치 이름" value={name} help="1–40자 · 최대 20개 · 이 기기에 저장" onChange={event => { setName(event.currentTarget.value); setError(undefined); setStatus('') }} />
        <Button type="submit" onClick={() => {}}>현재 배치 저장</Button>
      </form>
      {store.profiles.length ? <>
        <Select label="저장한 도크 배치" value={selectedId} options={store.profiles.map(profile => ({ value: profile.id, label: profile.name }))}
          onChange={id => { setSelectedId(id); setError(undefined); setStatus('') }} />
        {selected ? <Text as="p" variant="description">선택 배치: {describeDockLayout(selected.layout)}</Text> : null}
        <div className="studio-dock-layout-dialog__actions">
          <Button disabled={!selected} onClick={() => {
            if (composing.current || !selected) return
            if (!onRestore(selected.layout)) { setStatus(''); setError('미확정 문서 입력을 확정하거나 취소한 뒤 도크 배치를 복원하세요.'); return }
            setError(undefined); setStatus(`‘${selected.name}’ 배치를 복원했습니다. 악보는 변경하지 않았습니다.`)
          }}>선택 배치 복원</Button>
          <Button kind="secondary" disabled={!selected} onClick={() => {
            if (composing.current || !selected || !store.update(selected.id, layout)) return
            setError(undefined); setStatus(`‘${selected.name}’ 배치를 현재 배치로 갱신했습니다.`)
          }}>선택 배치 갱신</Button>
          <Button kind="quiet" disabled={!selected} onClick={() => {
            if (composing.current || !selected) return
            focusName(); store.remove(selected.id); setSelectedId(store.profiles.find(profile => profile.id !== selected.id)?.id ?? '')
            setError(undefined); setStatus('선택 배치를 삭제했습니다. 현재 도크 배치는 유지합니다.')
          }}>선택 배치 삭제</Button>
        </div>
      </> : <Text as="p" variant="description">저장한 배치가 없습니다.</Text>}
      {error ? <Text as="p" role="alert">{error}</Text> : null}
      {store.storageIssue ? <Text as="p" role="alert">{store.storageIssue}</Text> : null}
      <Text as="p" role="status">{status}</Text>
      <div className="studio-dock-layout-dialog__actions"><Button kind="quiet" onClick={close}>배치 창 닫기</Button></div>
    </Dialog>
  </div>
}
