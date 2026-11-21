import { useRef, useState } from 'react'
import { Button, Dialog, Input, Select, Text } from '@ddirori/ui'
import { describeEditShortcut, editShortcutActions, validateEditShortcut, type EditShortcutAction, type EditShortcutChord, type useEditShortcutBindings } from './studio-shortcut-bindings'
import './studio-shortcut-settings.css'

export function StudioShortcutSettings({ theme, store, onClose }: { theme: 'light' | 'dark'; store: ReturnType<typeof useEditShortcutBindings>; onClose: () => void }) {
  const [action, setAction] = useState<EditShortcutAction>('undo')
  const [draft, setDraft] = useState<EditShortcutChord>(), [captureError, setCaptureError] = useState<string>(), [status, setStatus] = useState('')
  const composing = useRef(false)
  const error = captureError ?? (draft ? validateEditShortcut(store.overrides, action, draft) : undefined)
  const clearDraft = () => { setDraft(undefined); setCaptureError(undefined); setStatus('') }
  const close = () => { if (!composing.current) onClose() }
  const update = (value: EditShortcutChord | null | undefined) => {
    if (composing.current) return
    const problem = store.set(action, value)
    if (problem) { setCaptureError(problem); return }
    clearDraft(); setStatus('단축키를 적용했습니다. 악보와 실행 취소 기록은 유지합니다.')
  }
  return <div className="studio-shortcut-settings ddirori" data-theme={theme} data-density="compact"
    onCompositionStartCapture={() => { composing.current = true }} onCompositionEndCapture={() => { composing.current = false }}
    onKeyDown={event => {
      event.stopPropagation()
      if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229 || event.key === 'Process') {
        if (event.key === 'Escape' || event.key === 'Enter') event.preventDefault()
        return
      }
      if ((event.metaKey || event.ctrlKey) && event.key !== 'Tab') event.preventDefault()
      if (event.key === 'Escape') { event.preventDefault(); if (draft || captureError) clearDraft(); else close() }
    }}>
    <Dialog open title="단축키 설정" onClose={close}>
      <Text as="p" variant="description">실행 취소·다시 실행·잘라내기·복사·붙여넣기·삭제를 이 기기에서 변경합니다. 악보 파일에는 저장하지 않습니다. 입력창의 텍스트 편집은 기존 키를 사용합니다.</Text>
      {action === 'delete' ? <Text as="p" variant="description">기존 Delete 동작을 변경합니다. 음표·범위는 기존 리듬을 보존하며 지우고, 선택한 선은 제거합니다. 마디를 선택한 상태에서는 그 마디를 제거하므로 대상을 먼저 확인하세요. 마디 표기만 지우는 메뉴와는 다릅니다.</Text> : null}
      <Select label="단축키 명령" value={action} options={editShortcutActions.map(item => ({ value: item.id, label: item.label }))} onChange={value => { clearDraft(); setAction(value as EditShortcutAction) }} />
      <Text as="p">현재 단축키: {describeEditShortcut(store.overrides, action)}</Text>
      <Input label="새 단축키" readOnly value={draft ? `⌘/Ctrl+Shift+${draft.code.slice(3)}` : ''} help="이 필드에 포커스를 두고 ⌘/Ctrl+Shift와 영문 글쇠를 누르세요. 한글 자판에서도 같은 물리 글쇠를 사용합니다. 예약된 조합은 사용할 수 없습니다. Escape는 기록 취소, Tab은 다음 항목입니다."
        onKeyDown={event => {
          if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229 || event.key === 'Process') return
          if (event.key === 'Tab' || event.key === 'Escape' || ['Meta', 'Control', 'Shift', 'Alt'].includes(event.key)) return
          event.preventDefault(); setStatus('')
          if (!(event.metaKey || event.ctrlKey) || !event.shiftKey || event.altKey || !/^Key[A-Z]$/.test(event.code)) {
            setDraft(undefined); setCaptureError('새 단축키는 ⌘/Ctrl+Shift와 영문 글쇠를 함께 눌러 지정하세요.'); return
          }
          setCaptureError(undefined); setDraft({ code: event.code, command: true, shift: true, alt: false })
        }} />
      {error ? <Text as="p" role="alert">{error}</Text> : null}
      {store.issue ? <Text as="p" role="alert">{store.issue}</Text> : null}
      <div className="studio-shortcut-settings__actions">
        <Button disabled={!draft || Boolean(error)} onClick={() => update(draft)}>단축키 적용</Button>
        <Button kind="secondary" onClick={() => update(null)}>선택 명령 단축키 해제</Button>
        <Button kind="secondary" onClick={() => update(undefined)}>선택 명령 기본값 복원</Button>
      </div>
      <Text as="p" role="status">{status}</Text>
      <Button kind="quiet" onClick={close}>설정 창 닫기</Button>
    </Dialog>
  </div>
}
