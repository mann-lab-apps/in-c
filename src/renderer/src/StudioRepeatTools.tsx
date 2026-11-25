import { useEffect, useId, useRef, useState } from 'react'
import { Button, Group, Input, Stack, Text } from '@ddirori/ui'
import { draftSaveGuidance, isDocumentSaveShortcut } from './editor/draft-save'
import { useDocumentDraftSaveGuard } from './editor/document-drafts'
import { StudioNavigationTools } from './StudioNavigationTools'
import { voltaNumberText, type NavigationMark, type VoltaMark } from '../../score-core'
import { parseVoltaPassEdit, type VoltaPassEditScope } from './editor/repeat-scope'
import type { NavigationEditEntry, NavigationEditScope } from './editor/navigation-edit-scope'
import './studio-repeat-tools.css'

// Scope and repeat/volta command semantics remain owned by App.
export function StudioRepeatTools(props: {
  scope?: string
  start: boolean
  end: boolean
  times: number
  volta?: 1 | 2
  voltaPasses?: readonly number[]
  enabled: boolean
  onStart: () => void
  onEnd: () => void
  onTimes: (times: number) => void
  onVolta: (number: 1 | 2) => void
  voltaPassEditor?: {
    scope: VoltaPassEditScope
    onChange: (mark: VoltaMark) => boolean
  }
  navigation?: {
    scope: NavigationEditScope
    onChange: (entry: NavigationEditEntry | undefined, mark: NavigationMark | undefined) => boolean
  }
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
      {props.voltaPasses ? <Text as="p" variant="description">
        {props.voltaPasses.length ? `볼타 회차: ${props.voltaPasses.join(', ')}` : '회차 번호가 없는 볼타'}
      </Text> : null}
      {([1, 2] as const).map(number => <Button key={number} kind="secondary" aria-label={`${number}번 볼타`} selected={props.volta === number} disabled={props.voltaPasses !== undefined} onClick={() => props.onVolta(number)}>{number}번</Button>)}
    </Group>
    {props.voltaPassEditor ? <VoltaPassEditor {...props.voltaPassEditor} /> : null}
    {props.navigation ? <StudioNavigationTools scope={props.navigation.scope} onChange={props.navigation.onChange} /> : null}
  </section>
}

function VoltaPassEditor({ scope, onChange }: {
  scope: VoltaPassEditScope
  onChange: (mark: VoltaMark) => boolean
}) {
  const [open, setOpen] = useState(false)
  return <details className="studio-volta-pass" open={open}>
    <summary onClick={event => { event.preventDefault(); setOpen(current => !current) }}>볼타 회차 편집</summary>
    {open ? <VoltaPassField scope={scope} onChange={onChange} /> : null}
  </details>
}

function VoltaPassField({ scope, onChange }: {
  scope: VoltaPassEditScope
  onChange: (mark: VoltaMark) => boolean
}) {
  const legacySecond = scope.mark.number === 2 && scope.repeatCount > 2
  const original = legacySecond ? '' : voltaNumberText(scope.mark)
  const [draft, setDraft] = useState(original)
  const [error, setError] = useState<string>()
  const [notice, setNotice] = useState<string>()
  const [composing, setComposing] = useState(false)
  const composition = useRef(false)
  const dirty = draft !== original
  const reset = () => {
    setDraft(original)
    setError(undefined)
    setNotice(undefined)
  }
  useEffect(reset, [original])
  const trackInput = useDocumentDraftSaveGuard({
    workspace: 'notation', hasPendingValue: () => dirty || composition.current,
    isComposing: () => composition.current, onBlocked: () => setNotice(draftSaveGuidance)
  })
  const apply = () => {
    if (!dirty || composition.current) return
    const result = parseVoltaPassEdit(draft, scope)
    if ('error' in result) {
      setError(result.error)
      return
    }
    if (onChange(result.mark)) {
      setDraft(voltaNumberText(result.mark))
      setError(undefined)
      setNotice(undefined)
    }
  }
  const exactSecond = scope.mark.passes?.length === 1 && scope.mark.passes[0] === 2
  const help = legacySecond
    ? '현재 2번 프리셋은 두 번째 이후에 재생합니다. 목록을 적용하면 지정한 회차를 사용합니다.'
    : exactSecond
      ? '이 볼타는 두 번째 회차에만 재생합니다. 목록을 적용하면 지정한 회차를 사용합니다.'
      : '쉼표로 구분한 번호를 입력합니다. 예 1, 2'
  return <Stack gap="sm" className="studio-volta-pass__editor">
    <Text as="p" variant="description">{scope.label}</Text>
    <Input label="재생 회차" value={draft} maxLength={400} help={notice ?? help} error={error}
      onChange={event => {
        trackInput(event.currentTarget)
        setDraft(event.currentTarget.value)
        setError(undefined)
        setNotice(undefined)
      }}
      onCompositionStart={event => { composition.current = true; setComposing(true); trackInput(event.currentTarget) }}
      onCompositionEnd={() => { composition.current = false; setComposing(false) }}
      onKeyDown={event => {
        if (composition.current || event.nativeEvent.isComposing || event.keyCode === 229) {
          event.stopPropagation()
          return
        }
        if (isDocumentSaveShortcut(event) && dirty) {
          event.preventDefault()
          event.stopPropagation()
          setNotice(draftSaveGuidance)
        } else if (event.key === 'Enter' || (event.key === 'Escape' && dirty)) {
          event.preventDefault()
          event.stopPropagation()
          if (event.key === 'Enter') apply()
          else reset()
        }
      }} />
    <Group label="볼타 회차 명령">
      <Button kind="secondary" disabled={composing || !dirty} onClick={apply}>회차 적용</Button>
    </Group>
  </Stack>
}
