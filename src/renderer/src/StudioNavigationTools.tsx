import { useRef, useState } from 'react'
import { Button, Checkbox, Group, Input, Select, Stack, Text } from '@ddirori/ui'
import type { NavigationMark } from '../../score-core'
import { navigationTypeOptions, type NavigationEditEntry, type NavigationEditScope } from './editor/navigation-edit-scope'
import { draftSaveGuidance, isDocumentSaveShortcut } from './editor/draft-save'
import { useDocumentDraftSaveGuard } from './editor/document-drafts'

interface NavigationDraft {
  type: NavigationMark['type']
  label: string
  words: string
  symbol: boolean
}

function defaultDraft(type: NavigationMark['type'], scope: NavigationEditScope): NavigationDraft {
  const labels = type === 'dalsegno' ? scope.segnoLabels : type === 'tocoda' ? scope.codaLabels : []
  return {
    type,
    label: labels.length === 1 ? labels[0] : type === 'coda' || type === 'tocoda' ? 'coda' : 'segno',
    words: type === 'dacapo' ? 'D.C.' : type === 'dalsegno' ? 'D.S.' : type === 'fine' ? 'Fine' : type === 'tocoda' ? 'To' : '',
    symbol: type === 'segno' || type === 'coda' || type === 'tocoda'
  }
}

function draftFromMarker(mark: NavigationMark): NavigationDraft {
  return {
    type: mark.type,
    label: 'label' in mark ? mark.label : '',
    words: 'display' in mark ? mark.display?.words ?? '' : '',
    symbol: 'symbol' in mark ? Boolean(mark.symbol) : 'display' in mark && Boolean(mark.display?.coda)
  }
}

function authoredMarker(draft: NavigationDraft, previous: NavigationMark | undefined): NavigationMark {
  const { type, symbol } = draft
  const label = draft.label.trim()
  if (type === 'segno' || type === 'coda') return { type, label, ...(symbol ? { symbol: true } : {}) }
  const passes = previous?.type === type && 'passes' in previous ? previous.passes : undefined
  const words = draft.words.trim()
  const display = words ? { words, ...(type === 'tocoda' && symbol ? { coda: true as const } : {}) } : undefined
  const fields = { ...(passes ? { passes } : {}), ...(display ? { display } : {}) }
  return type === 'dalsegno' || type === 'tocoda' ? { type, label, ...fields } : { type, ...fields }
}

export function StudioNavigationTools({ scope, onChange }: {
  scope: NavigationEditScope
  onChange: (entry: NavigationEditEntry | undefined, mark: NavigationMark | undefined) => boolean
}) {
  const [selected, select] = useState('new')
  const [open, setOpen] = useState(false)
  const entry = scope.rows.find(row => row.id === selected)
  return <details className="studio-navigation-tools" open={open}>
    <summary onClick={event => {
      event.preventDefault()
      setOpen(current => !current)
    }}>반복 이동</summary>
    {open ? <Stack role="group" aria-label="이동 표지 편집" gap="sm" className="studio-navigation-tools__editor">
      {scope.playbackIssue ? <Text as="p" variant="description" aria-live="polite">{scope.playbackIssue}</Text> : null}
      {scope.rows.length ? <Select label="편집할 이동 표지" value={entry?.id ?? 'new'} onChange={select}
        options={[{ value: 'new', label: '새 이동 표지' }, ...scope.rows.map(row => ({ value: row.id, label: row.name }))]} /> : null}
      <NavigationFields key={JSON.stringify([entry?.id, entry?.mark])} scope={scope} entry={entry} onChange={onChange}
        onRemoved={() => select('new')} />
    </Stack> : null}
  </details>
}

function NavigationFields({ scope, entry, onChange, onRemoved }: {
  scope: NavigationEditScope
  entry?: NavigationEditEntry
  onChange: (entry: NavigationEditEntry | undefined, mark: NavigationMark | undefined) => boolean
  onRemoved: () => void
}) {
  const original = entry ? draftFromMarker(entry.mark) : defaultDraft('segno', scope)
  const [draft, setDraft] = useState(original)
  const [notice, setNotice] = useState<string>()
  const [composing, setComposing] = useState(false)
  const isComposing = useRef(false)
  const exists = Boolean(scope.add || entry)
  const dirty = JSON.stringify(draft) !== JSON.stringify(original)
  const target = draft.type === 'segno' || draft.type === 'coda'
  const needsLabel = target || draft.type === 'dalsegno' || draft.type === 'tocoda'
  const invalid = (needsLabel && !draft.label.trim()) || (draft.type === 'tocoda' && draft.symbol && !draft.words.trim())
  const trackInput = useDocumentDraftSaveGuard({
    workspace: 'notation', hasPendingValue: () => exists && (dirty || isComposing.current),
    isComposing: () => isComposing.current,
    onBlocked: () => setNotice(draftSaveGuidance)
  })
  const update = (field: 'label' | 'words', value: string) => {
    setDraft(previous => ({ ...previous, [field]: value }))
    setNotice(undefined)
  }
  const inputEvents = {
    onCompositionStart: (event: React.CompositionEvent<HTMLInputElement>) => {
      isComposing.current = true
      setComposing(true)
      trackInput(event.currentTarget)
    },
    onCompositionEnd: () => {
      isComposing.current = false
      setComposing(false)
    }
  }
  const clear = () => { setDraft(original); setNotice(undefined) }
  return <div className="studio-navigation-tools__fields" onKeyDown={event => {
    if (isComposing.current || event.nativeEvent.isComposing || event.keyCode === 229) {
      event.stopPropagation()
      return
    }
    if (isDocumentSaveShortcut(event) && exists && dirty) {
      event.preventDefault()
      event.stopPropagation()
      setNotice(draftSaveGuidance)
    } else if (event.key === 'Escape' && dirty) {
      event.preventDefault()
      event.stopPropagation()
      clear()
    }
  }}>
    <Text as="p" variant="description" className="studio-navigation-tools__scope">{entry?.name ?? (scope.add
      ? `총보 공통 · ${scope.add.label} · ${scope.add.number}마디에 표시합니다.`
      : scope.disabledReason)}</Text>
    <Select label="이동 표지 종류" options={navigationTypeOptions} disabled={!exists} value={draft.type}
      onChange={value => {
        const type = navigationTypeOptions.find(option => option.value === value)?.value
        if (type) setDraft(entry?.mark.type === type ? original : defaultDraft(type, scope))
      }} />
    {needsLabel ? <Input label="연결 이름" help={target ? 'D.S. 또는 To Coda의 연결 이름과 같아야 합니다.' : '도착 지점에 붙인 세뇨 또는 코다의 연결 이름을 입력합니다.'}
      value={draft.label} maxLength={1024} disabled={!exists} {...inputEvents}
      onChange={event => { trackInput(event.currentTarget); update('label', event.currentTarget.value) }} /> : null}
    {target || draft.type === 'tocoda' ? <Checkbox label={target ? '기호 표시' : '문구 뒤에 코다 기호 표시'}
      disabled={!exists} checked={draft.symbol}
      onChange={event => setDraft(previous => ({ ...previous, symbol: event.currentTarget.checked }))} /> : null}
    {!target ? <Input label="악보 문구" help="마디 끝에 표시합니다. 비우면 재생 지시만 저장합니다."
      maxLength={1024} disabled={!exists} value={draft.words} {...inputEvents}
      onChange={event => { trackInput(event.currentTarget); update('words', event.currentTarget.value) }} /> : null}
    {notice ? <Text as="p" role="status" variant="description" className="studio-navigation-tools__scope">{notice}</Text> : null}
    <Group label="이동 표지 명령">
      <Button kind="secondary" disabled={!exists || invalid || composing || Boolean(entry && !dirty)}
        onClick={() => {
          if (isComposing.current) return
          if (onChange(entry, authoredMarker(draft, entry?.mark))) clear()
        }}>이동 표지 적용</Button>
      {entry ? <Button kind="secondary" disabled={composing}
        onClick={() => { if (onChange(entry, undefined)) onRemoved() }}>이동 표지 삭제</Button> : null}
    </Group>
  </div>
}
