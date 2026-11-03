import { useEffect, useMemo, useRef } from 'react'
import type { NotationPreviewProps } from './NotationPreview'
import { createPlaybackInk } from './playback-ink'

const EMPTY_IDS: string[] = []
const HANDLERS = ['onSelectSpan', 'onSelectRehearsalMark', 'onSelectSystemText', 'onSelectStaffText',
  'onSelectDynamic', 'onSelectHarmony', 'onSelectExpressionText', 'onSelectEvent', 'onSelectEventRange',
  'onSelectLyric', 'onSelectMeasure', 'onOpenMeasureContextMenu', 'shouldRestoreFocusViewport'] as const

/** Stable canvas callbacks read current editor state; highlight-only updates do
 * not rebuild VexFlow. Resizes/score edits still repaint and refresh the ink. */
export function usePlaybackInk(props: NotationPreviewProps) {
  const root = useRef<HTMLDivElement>(null)
  const live = useRef(props)
  live.current = props
  const ink = useRef<ReturnType<typeof createPlaybackInk> | undefined>(undefined)
  const handlers = useMemo(() => Object.fromEntries(HANDLERS.map(key => [key, (...args: unknown[]) =>
    (live.current[key] as ((...args: unknown[]) => unknown) | undefined)?.(...args)])), [])
  const canvasProps = { ...props }
  for (const key of HANDLERS) {
    Object.assign(canvasProps, { [key]: props[key] ? handlers[key] : undefined })
  }
  const enabled = Boolean(props.playbackRunning && !props.printLayout && !props.inlineLyricEditor)
  if (enabled) Object.assign(canvasProps, {
    selectedEventId: undefined, selectedEventAddress: undefined, selectedEventAddresses: undefined, selectedEventIds: EMPTY_IDS,
    selectedMeasureId: undefined, playbackEventId: undefined, playbackEventAddress: undefined
  })
  useEffect(() => {
    if (!enabled || !root.current) return
    const layer = createPlaybackInk(root.current)
    ink.current = layer
    layer.update(live.current)
    const observer = new MutationObserver(() => layer.update(live.current))
    observer.observe(root.current, { childList: true, subtree: true })
    return () => { observer.disconnect(); layer.dispose(); ink.current = undefined }
  }, [enabled])
  const inkKey = JSON.stringify([props.selectedEventId, props.selectedEventIds, props.selectedEventAddress,
    props.playbackEventId, props.playbackEventAddress])
  useEffect(() => { ink.current?.update(live.current) }, [inkKey, enabled, props.selectedEventAddresses])
  return { root, canvasProps }
}
