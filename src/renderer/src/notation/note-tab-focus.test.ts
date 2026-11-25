// @vitest-environment jsdom
import { act, render } from '@testing-library/react'
import { createElement } from 'react'
import { expect, it, vi } from 'vitest'
import { createMeasure, createNote, createPart, createScore, createStaff, createTimePosition, createVoice, TICKS_PER_QUARTER } from '../../../score-core'
import { NotationPreview, type NotationPreviewProps } from './NotationPreview'
import {resolveTabNoteFocusTarget} from './focus-viewport'
function note(){
 const n=document.createElementNS('http://www.w3.org/2000/svg','g');n.classList.add('notation-event');for(const key of['event','part','staff','measure','voice'])n.setAttribute('data-'+key+'-id',key+'-one');n.setAttribute('aria-pressed','false');return n
}
it('retains the full tabbed note address without changing selection or DOM order',()=>{
 const root=document.createElementNS('http://www.w3.org/2000/svg','svg'),before=note(),target=note(),other=note();other.dataset.eventId='other';root.append(other,target);const order=[...root.children]
 expect(resolveTabNoteFocusTarget(root,before,true)).toBe(target);expect(target.getAttribute('aria-pressed')).toBe('false');expect([...root.children]).toEqual(order)
})
it.each(['part','staff','measure','voice'])('does not conflate matching event ids in another %s',key=>{
 const root=document.createElementNS('http://www.w3.org/2000/svg','svg'),before=note(),wrong=note(),target=note();wrong.setAttribute('data-'+key+'-id','different');root.append(wrong,target);expect(resolveTabNoteFocusTarget(root,before,true)).toBe(target)
})
it('leaves normal note selection and new span/document intent to the existing resolver',()=>{
 const root=document.createElementNS('http://www.w3.org/2000/svg','svg'),target=note();root.append(target);expect(resolveTabNoteFocusTarget(root,note(),false)).toBeUndefined()
})
it('does not focus readonly tuplet previews or an event removed by undo',()=>{
 const root=document.createElementNS('http://www.w3.org/2000/svg','svg'),preview=note();preview.classList.add('is-preview');root.append(preview);expect(resolveTabNoteFocusTarget(root,note(),true)).toBeUndefined();preview.remove();expect(resolveTabNoteFocusTarget(root,note(),true)).toBeUndefined()
})
it('rejects incomplete addresses and non-note focus',()=>{
 const root=document.createElementNS('http://www.w3.org/2000/svg','svg'),target=note(),missing=note();root.append(target);missing.removeAttribute('data-voice-id');expect(resolveTabNoteFocusTarget(root,missing,true)).toBeUndefined();expect(resolveTabNoteFocusTarget(root,document.createElement('input'),true)).toBeUndefined();expect(resolveTabNoteFocusTarget(root,null,true)).toBeUndefined()
})


it('retains a separately focused note on width-only redraw and follows an explicit selection change', () => {
  let resize: ResizeObserverCallback
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: ResizeObserverCallback) {
      resize = callback
    }
    observe() {}
    disconnect() {}
  })
  const context = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    measureText: (text: string) => ({ width: text.length * 10, actualBoundingBoxLeft: 0, actualBoundingBoxRight: 10,
      actualBoundingBoxAscent: 6, actualBoundingBoxDescent: 4 })
  } as CanvasRenderingContext2D)
  const scroll = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
  const events = (['C', 'D', 'E', 'F'] as const).map((step, index) => createNote({
    id: 'test-note-' + index, pitch: { step, octave: 4 }, position: createTimePosition(index * TICKS_PER_QUARTER)
  }))
  const voice = createVoice({ events }), bar = createMeasure({ voices: [voice] })
  const part = createPart({ staves: [createStaff({ measures: [bar] })] })
  const score = createScore({ parts: [part] })
  const address = { partId: part.id, staffId: part.staves[0].id, measureId: bar.id, voiceId: voice.id }
  const props: NotationPreviewProps = {
    score, selectedEventId: events[0].id, selectedEventAddress: address,
    onSelectEvent: vi.fn(), onSelectEventRange: vi.fn(), onSelectLyric: vi.fn(),
    onSelectMeasure: vi.fn(), onOpenMeasureContextMenu: vi.fn()
  }
  const view = render(createElement(NotationPreview, props))
  const noteElement = (index: number) => view.container.querySelector<SVGElement>(
    '.notation-event[data-event-id="' + events[index].id + '"]'
  )!
  try {
    const before = noteElement(1)
    act(() => before.focus())
    expect(document.activeElement).toBe(before)
    expect(noteElement(0).classList.contains('is-selected')).toBe(true)

    act(() => resize([{ contentRect: { width: 804 } } as ResizeObserverEntry], {} as ResizeObserver))

    expect(before.isConnected).toBe(false)
    expect(document.activeElement).toBe(noteElement(1))
    expect(noteElement(0).classList.contains('is-selected')).toBe(true)

    view.rerender(createElement(NotationPreview, { ...props, selectedEventId: events[2].id }))
    expect(document.activeElement).toBe(noteElement(2))
    expect(noteElement(2).classList.contains('is-selected')).toBe(true)
    expect(props.onSelectEvent).not.toHaveBeenCalled()
  } finally {
    view.unmount()
    scroll.mockRestore()
    context.mockRestore()
    vi.unstubAllGlobals()
  }
})
