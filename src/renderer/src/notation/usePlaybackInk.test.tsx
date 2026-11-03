// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react'
import { memo, useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSingleVoiceMvpScore } from '../../../testing/single-voice-mvp-fixture'
import type { NotationPreviewProps } from './NotationPreview'
import { usePlaybackInk } from './usePlaybackInk'

const paints = vi.fn()
let invoke: NotationPreviewProps['onSelectEvent']
let viewportPermission: NotationPreviewProps['shouldRestoreFocusViewport']
const Canvas = memo(function Canvas(props: NotationPreviewProps) {
  useEffect(() => { paints(); invoke = props.onSelectEvent; viewportPermission = props.shouldRestoreFocusViewport }, [props])
  return <svg><g className="notation-event" data-event-id="a" data-playback-x="10" data-playback-y="10"><path d="M0 0" /></g>
    <g className="notation-event" data-event-id="b" data-playback-x="20" data-playback-y="10"><path d="M1 1" /></g></svg>
})
function Harness(props: NotationPreviewProps) {
  const { root, canvasProps } = usePlaybackInk(props)
  return <div ref={root}><Canvas {...canvasProps} /></div>
}
afterEach(() => { cleanup(); paints.mockClear() })
describe('notation playback surface', () => {
  it('reads the current viewport ownership without repainting or replacing focused notation',()=>{
    const props:NotationPreviewProps={score:createSingleVoiceMvpScore(),onSelectEvent:vi.fn(),onSelectEventRange:vi.fn(),
      onSelectLyric:vi.fn(),onSelectMeasure:vi.fn(),onOpenMeasureContextMenu:vi.fn(),shouldRestoreFocusViewport:()=>true}
    const {container,rerender}=render(<Harness {...props}/>),node=container.querySelector('[data-event-id="a"]')
    expect(viewportPermission?.()).toBe(true)
    rerender(<Harness {...props} shouldRestoreFocusViewport={()=>false}/> )
    expect(viewportPermission?.()).toBe(false);expect(paints).toHaveBeenCalledOnce()
    expect(container.querySelector('[data-event-id="a"]')).toBe(node)
  })
  it('updates a projected range address without repainting the VexFlow canvas', () => {
    const score = createSingleVoiceMvpScore()
    const anchor = { partId: 'p', staffId: 's', measureId: 'm1', voiceId: 'v' }
    const end = { ...anchor, measureId: 'm2' }
    const props: NotationPreviewProps = { score, onSelectEvent: vi.fn(), onSelectEventRange: vi.fn(),
      onSelectLyric: vi.fn(), onSelectMeasure: vi.fn(), onOpenMeasureContextMenu: vi.fn(),
      playbackRunning: true, selectedEventIds: ['a', 'b'], selectedEventId: 'b', selectedEventAddress: anchor,
      selectedEventAddresses: new Map([['a', anchor], ['b', end]]) }
    const { container, rerender } = render(<Harness {...props} />)
    const a = container.querySelector<SVGElement>('[data-event-id="a"]')!
    const b = container.querySelector<SVGElement>('[data-event-id="b"]')!
    Object.assign(a.dataset, anchor); Object.assign(b.dataset, end)
    rerender(<Harness {...props} selectedEventAddresses={new Map([['a', anchor], ['b', { ...end, measureId: 'm3' }]])} />)
    expect(a.classList.contains('is-selected')).toBe(true)
    expect(b.classList.contains('is-selected')).toBe(false)
    rerender(<Harness {...props} selectedEventAddresses={new Map([['a', anchor], ['b', end]])} />)
    expect(b.classList.contains('is-selected')).toBe(true)
    expect(container.querySelector('[data-event-id="b"]')).toBe(b)
    expect(paints).toHaveBeenCalledOnce()
  })

  it('does not repaint the canvas for new playhead/selection and calls the current editor handler', () => {
    const first = vi.fn(), next = vi.fn()
    const props: NotationPreviewProps = { score: createSingleVoiceMvpScore(), onSelectEvent: first,
      onSelectEventRange: vi.fn(), onSelectLyric: vi.fn(), onSelectMeasure: vi.fn(), onOpenMeasureContextMenu: vi.fn(),
      playbackRunning: true, playbackEventId: 'a', selectedEventId: 'a' }
    const { rerender, container } = render(<Harness {...props} />)
    const node = container.querySelector('[data-event-id="a"]')
    rerender(<Harness {...props} playbackEventId="b" selectedEventId="b" onSelectEvent={next} />)
    expect(paints).toHaveBeenCalledOnce()
    expect(container.querySelector('[data-event-id="a"]')).toBe(node)
    act(() => invoke('a'))
    expect(first).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledWith('a')
    rerender(<Harness {...props} score={{ ...props.score, title: 'Edited' }} />)
    expect(paints).toHaveBeenCalledTimes(2)
    rerender(<Harness {...props} playbackRunning={false} />)
    expect(paints).toHaveBeenCalledTimes(3)
  })
})
