import { useEffect, useId, useRef, useState } from 'react'
import { Button, Group, Input, Text } from '@ddirori/ui'
import { draftSaveGuidance, isDocumentSaveShortcut } from './editor/draft-save'
import { useDocumentDraftSaveGuard } from './editor/document-drafts'
import './studio-repeat-tools.css'

// Scope and repeat/volta command semantics remain owned by App.
export function StudioRepeatTools(props: {
  scope?: string
  start: boolean
  end: boolean
  times: number
  volta?: 1 | 2
  enabled: boolean
  onStart: () => void
  onEnd: () => void
  onTimes: (times: number) => void
  onVolta: (number: 1 | 2) => void
}) {
  const [draft, setDraft] = useState(String(props.times))
  const [saveNotice, setSaveNotice] = useState<string>()
  const scopeId = useId()
  const dirty = useRef(false), composing = useRef(false)
  // Preserve the existing blur contract: "2.0" is an explicit repeat-end
  // application even when the previously displayed default count was 2.
  const hasPendingValue = (input: HTMLInputElement) => props.enabled && dirty.current && input.value !== String(props.times)
  const trackDraftInput = useDocumentDraftSaveGuard({ workspace: 'notation', hasPendingValue,
    isComposing: () => composing.current, onBlocked: () => setSaveNotice(draftSaveGuidance) })
  useEffect(() => { dirty.current = false; setSaveNotice(undefined); setDraft(String(props.times)) }, [props.times])
  return <section className="studio-repeat-tools" aria-label="반복과 볼타" tabIndex={-1} aria-describedby={!props.enabled ? scopeId : undefined}
    onKeyDown={event => {
      if (event.nativeEvent.isComposing || event.keyCode === 229 || (!event.ctrlKey && !event.metaKey && !event.altKey && (event.key === 'Enter' || event.key === ' '))) event.stopPropagation()
    }}>
    <Text as="h3" variant="itemTitle">반복과 볼타</Text>
    {props.scope ? <Text as="p" variant="description">{props.scope}</Text> : null}
    {!props.enabled ? <Text id={scopeId} as="p" variant="description">도돌이표와 반복 횟수는 마디를 선택해 편집합니다. 볼타는 현재 위치의 마디부터 적용할 수 있습니다.</Text> : null}
    <Group label="도돌이표">
      <Button kind="secondary" aria-label="도돌이표 시작" selected={props.start} disabled={!props.enabled} onClick={props.onStart}>시작</Button>
      <Button kind="secondary" aria-label="도돌이표 끝" selected={props.end} disabled={!props.enabled} onClick={props.onEnd}>끝</Button>
    </Group>
    <Input label="반복 횟수" aria-label="반복 횟수" type="number" min={2} max={8} step={1} disabled={!props.enabled}
      help={`${saveNotice ? `${saveNotice} ` : ''}선택한 마디에 반복 끝을 설정합니다. 2–8회`} value={draft}
      onChange={event => { dirty.current = true; trackDraftInput(event.currentTarget); setSaveNotice(undefined); setDraft(event.currentTarget.value) }}
      onCompositionStart={event => { composing.current = true; trackDraftInput(event.currentTarget) }} onCompositionEnd={() => { composing.current = false }}
      onBlur={event => {
        setSaveNotice(undefined)
        if (composing.current || !dirty.current || !props.enabled) return
        dirty.current = false
        const text = event.currentTarget.value, value = Number.parseInt(text, 10)
        setDraft(String(props.times))
        if (Number.isFinite(value) && text !== String(props.times)) props.onTimes(value)
      }}
      onKeyDown={event => {
        if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229) { event.stopPropagation(); return }
        if (isDocumentSaveShortcut(event) && hasPendingValue(event.currentTarget)) {
          event.preventDefault(); event.stopPropagation(); setSaveNotice(draftSaveGuidance); return
        }
        if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); event.currentTarget.blur() }
        else if (event.key === 'Escape') {
          event.preventDefault(); event.stopPropagation(); dirty.current = false; setSaveNotice(undefined)
          event.currentTarget.value = String(props.times); setDraft(String(props.times)); event.currentTarget.blur()
        }
      }}/>
    <Group label="볼타">
      {([1, 2] as const).map(number => <Button key={number} kind="secondary" aria-label={`${number}번 볼타`} selected={props.volta === number} onClick={() => props.onVolta(number)}>{number}번</Button>)}
    </Group>
  </section>
}
