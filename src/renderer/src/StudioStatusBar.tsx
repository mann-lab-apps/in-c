import { useLayoutEffect, useRef, useState, type KeyboardEventHandler, type ReactNode } from 'react'
import { Text } from '@ddirori/ui'
import { StudioOperationDetails, type StudioOperationDiagnostic } from './StudioWarningReport'
import './studio-status-bar.css'

interface Props {
  children?: ReactNode
  onNavigationKeyDown?: KeyboardEventHandler<HTMLElement>
  theme: 'light' | 'dark'
  input?: string
  duration: string
  view: string
  tuplet?: string
  position?: string
  edits: number
  playback: string
  beat: string
  result?: { tone: string; message: string; details?: StudioOperationDiagnostic }
}

// Presentation only. File-result ownership, dirty state and history stay in App.
export function StudioStatusBar(props: Props) {
  const rootRef = useRef<HTMLElement>(null)
  const [inlineContext, setInlineContext] = useState(false)
  useLayoutEffect(() => {
    const root = rootRef.current
    const context = root?.querySelector<HTMLElement>('.studio-status__context')
    const tools = root?.querySelector<HTMLElement>('.studio-status__view-tools')
    const readout = root?.querySelector<HTMLElement>('.studio-status__readout')
    if (!root || !context || !tools || !readout) return
    // Pack the three groups only when their actual contents fit. Window width
    // alone cannot distinguish enlarged text or a longer selected-part label.
    const groupWidth = (node: HTMLElement) => [...node.children].reduce(
      (width, child) => width + child.getBoundingClientRect().width, 0
    ) + parseFloat(getComputedStyle(node).columnGap) * Math.max(0, node.children.length - 1)
    const measure = () => {
      const style = getComputedStyle(root)
      const available = root.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      const required = groupWidth(context) + groupWidth(tools)
        + parseFloat(getComputedStyle(readout).flexBasis) + 2 * parseFloat(style.columnGap)
      setInlineContext(Number.isFinite(required) && required > 0 && required <= available)
    }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure)
    for (const node of [root, context, tools, readout, ...context.children, ...tools.children]) observer?.observe(node)
    return () => observer?.disconnect()
  }, [props.children])
  return <section ref={rootRef} className="studio-status ddirori" data-theme={props.theme}
    data-inline-context={inlineContext ? 'true' : undefined}
    data-density="compact" aria-label="악보 상태 및 보기" onKeyDown={event => {
      props.onNavigationKeyDown?.(event)
      if ((event.target as HTMLElement).closest('[role="radiogroup"],[role="combobox"]') && !event.metaKey && !event.ctrlKey && !event.altKey) event.stopPropagation()
    }}>
    <div className="editor-status studio-status__readout" role="status" aria-label="편집 및 파일 상태" aria-live="polite">
    {props.input ? <Text variant="description">{props.input}</Text> : null}
    <Text variant="description">{props.duration}</Text>
    <Text variant="description">{props.view}</Text>
    {props.tuplet ? <Text variant="description" className="tuplet-progress">{props.tuplet}</Text> : null}
    {props.position ? <Text variant="numeric" aria-label="입력 위치">{props.position}</Text> : null}
    <Text variant="numeric">{props.edits}회 수정</Text>
    <Text variant="description">{props.playback}</Text>
    <Text variant="numeric">{props.beat}</Text>
    {props.result ? <Text variant="description"
      className={`editor-status__result studio-status__result${props.result.tone === 'error' ? ' is-error' : ''}`}>
      {props.result.message}
    </Text> : null}
    </div>
    {props.children}
    {props.result?.details ? <div className="studio-status__technical">
      <StudioOperationDetails details={props.result.details} />
    </div> : null}
  </section>
}
