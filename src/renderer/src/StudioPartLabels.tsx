import { useEffect, useRef, useState } from 'react'
import { Input, Text } from '@ddirori/ui'
import { draftSaveGuidance, isDocumentSaveShortcut } from './editor/draft-save'
import { useDocumentDraftSaveGuard } from './editor/document-drafts'
import './studio-part-labels.css'

type LabelField = 'name' | 'abbreviation'

// App owns part identity, trimming/fallback and the existing one-command update.
export function StudioPartLabels({ name, abbreviation, enabled, onCommit }: {
  name: string
  abbreviation?: string
  enabled: boolean
  onCommit: (field: LabelField, value: string) => void
}) {
  return <section className="studio-part-labels" aria-label="현재 파트 표기">
    <Text as="h3" variant="itemTitle">파트 이름과 약어</Text>
    <Text as="p" variant="description">현재 파트 전체에 적용합니다. 기보 음높이와 보표 구성은 유지합니다.</Text>
    <Text as="p" variant="caption">파트 표시는 첫 악보단에 이름을, 이후에는 입력한 약어를 사용합니다. 약어가 비어 있으면 이후 표시는 생략합니다.</Text>
    <div className="studio-part-labels__fields">
      <PartLabelInput label="현재 파트 이름" value={name} maxLength={80} enabled={enabled}
        onCommit={value => onCommit('name', value)} emptyFallback={name}/>
      <PartLabelInput label="현재 파트 약어" value={abbreviation ?? ''} maxLength={24} enabled={enabled}
        onCommit={value => onCommit('abbreviation', value)} emptyFallback=""/>
    </div>
  </section>
}

function PartLabelInput({ label, value, maxLength, enabled, emptyFallback, onCommit }: {
  label: string
  value: string
  maxLength: number
  enabled: boolean
  emptyFallback: string
  onCommit: (value: string) => void
}) {
  const [draft, setDraft] = useState(value)
  const [saveNotice, setSaveNotice] = useState<string>()
  const dirty = useRef(false)
  const composing = useRef(false)
  const hasPendingValue = (input: HTMLInputElement) => enabled && dirty.current && (input.value.trim() || emptyFallback) !== value
  const trackDraftInput = useDocumentDraftSaveGuard({ workspace: 'measure', hasPendingValue,
    isComposing: () => composing.current, onBlocked: () => setSaveNotice(draftSaveGuidance) })
  useEffect(() => { dirty.current = false; setSaveNotice(undefined); setDraft(value) }, [value])
  return <Input label={label} aria-label={label} type="text" value={draft}
    maxLength={maxLength} disabled={!enabled} help={saveNotice}
    onChange={event => { dirty.current = true; trackDraftInput(event.currentTarget); setSaveNotice(undefined); setDraft(event.currentTarget.value) }}
    onCompositionStart={event => { composing.current = true; trackDraftInput(event.currentTarget) }}
    onCompositionEnd={() => { composing.current = false }}
    onBlur={event => {
      setSaveNotice(undefined)
      if (!enabled || composing.current || !dirty.current) return
      dirty.current = false
      const normalized = event.currentTarget.value.trim() || emptyFallback
      setDraft(normalized)
      if (normalized !== value) onCommit(event.currentTarget.value)
    }}
    onKeyDown={event => {
      if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229) {
        event.stopPropagation(); return
      }
      if (isDocumentSaveShortcut(event) && hasPendingValue(event.currentTarget)) {
        event.preventDefault(); event.stopPropagation(); setSaveNotice(draftSaveGuidance); return
      }
      if (event.key === 'Enter') {
        event.preventDefault(); event.stopPropagation(); event.currentTarget.blur()
      } else if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation(); dirty.current = false; setSaveNotice(undefined)
        event.currentTarget.value = value; setDraft(value); event.currentTarget.blur()
      }
    }}/>
}
