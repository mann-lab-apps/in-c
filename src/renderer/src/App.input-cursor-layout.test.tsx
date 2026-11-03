// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createScore } from '../../score-core'
import { createNativeProject, encodeNativeProject } from '../../project/schema'
import { playbackMockState, registerAppTestHooks } from './App.test-harness'
import {restoreNotationFocus} from './notation/focus-viewport'

registerAppTestHooks()
it.each(['footer', 'shell', 'manual-wheel', 'newer-focus', 'unmount', 'left-clip', 'right-clip', 'manual-horizontal', 'dock-edge', 'dock-inside', 'dock-contained', 'dock-short-contained', 'dock-short-auto', 'dock-fractional-bottom', 'dock-bottom-room', 'touch-fractional-bottom', 'touch-bottom-room', 'touch-short-contained', 'touch-short-auto', 'dock-edge-return', 'dock-edge-redraw', 'target-focus-wheel', 'touch-edge', 'touch-inside', 'touch-contained', 'overlay-drag', 'overlay-click'] as const)(
  'keeps the next input cursor exposed across layout feedback: %s', async kind => {
    const originalObserver = globalThis.ResizeObserver
    const observers = new Set<{ callback: ResizeObserverCallback; targets: Set<Element> }>()
    vi.stubGlobal('ResizeObserver', class {
      targets = new Set<Element>()
      constructor(readonly callback: ResizeObserverCallback) { observers.add(this) }
      observe(target: Element) { this.targets.add(target) }
      unobserve(target: Element) { this.targets.delete(target) }
      disconnect() { observers.delete(this); this.targets.clear() }
    })
    const frames = new Map<number, FrameRequestCallback>(); let next = 0
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { frames.set(++next, cb); return next })
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id) })
    const scroll = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
    const flush = () => act(() => { const batch = [...frames.values()]; frames.clear(); batch.forEach(cb => cb(0)) })
    try {
      const source = createScore()
      vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/test/cursor.chromatics', fileName: 'cursor.chromatics', contents: encodeNativeProject(createNativeProject(source)) })
      window.history.replaceState({}, '', '/?fixture=release-test')
      const { App } = await import('./App'); const view = render(<App />)
      fireEvent.click(screen.getByRole('button', { name: '파일' }))
      fireEvent.click(screen.getByRole('menuitem', { name: '프로젝트 열기' }))
      await waitFor(() => expect(playbackMockState.lastScore).toEqual(source))
      const preview = screen.getByTestId('notation-preview')
      const [partId, staffId, measureId, voiceId, eventId] = preview.getAttribute('data-all-event-pitches')!.split(',')[0]!.split(':')
      fireEvent.click(screen.getByRole('button', { name: `${eventId} 선택` }))
      fireEvent.click(screen.getByRole('button', { name: '음표 입력 전환, 단축키 N' }))
      fireEvent.keyDown(window, { key: 'd', code: 'KeyD' })
      fireEvent.keyDown(window, { key: 'e', code: 'KeyE' })
      expect(preview).toHaveAttribute('data-input-tick', '26880')
      const current = structuredClone(playbackMockState.lastScore!)
      const selection = preview.getAttribute('data-selected-event-id')
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      const cursor = document.createElementNS(svg.namespaceURI, 'g') as SVGGElement
      cursor.classList.add('notation-note-input-cursor')
      Object.assign(cursor.dataset, { partId, staffId, measureId, voiceId, tick: '26880' })
      cursor.scrollIntoView = vi.fn()
      // A next-position cue, not the selected note at the preceding tick.
      let top = 400, left = 400
      const horizontal = ['left-clip', 'right-clip', 'manual-horizontal'].includes(kind)
      vi.spyOn(cursor, 'getBoundingClientRect').mockImplementation(() => new DOMRect(left, top, 8, 56))
      svg.append(cursor); preview.append(svg)
      const canvas = screen.getByLabelText('악보 캔버스')
      let redrawnTarget: SVGGElement | undefined
      if (horizontal) {
        canvas.style.overflowX = 'auto'
        vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(new DOMRect(280, 200, 680, 1000))
        Object.defineProperties(canvas, { clientWidth: { configurable: true, value: 680 }, scrollWidth: { configurable: true, value: 1992 } })
        canvas.scrollLeft = 600
      }
      const footer = document.querySelector('main > .studio-status')!
      const shell = canvas.closest('main')!
      vi.spyOn(footer, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 600, 960, 150))
      act(() => canvas.focus()); flush(); frames.clear(); vi.mocked(cursor.scrollIntoView).mockClear(); scroll.mockClear()
      if (kind === 'manual-wheel') fireEvent.wheel(canvas, { deltaY: -400 })
      if (kind === 'manual-horizontal') fireEvent.wheel(canvas, { deltaX: 400 })
      if (kind === 'overlay-drag' || kind === 'overlay-click') {
        const originalY=Object.getOwnPropertyDescriptor(window,'scrollY')!;let viewportY=100
        const width=vi.spyOn(document.documentElement,'clientWidth','get').mockReturnValue(1024)
        try {
          Object.defineProperty(window,'scrollY',{configurable:true,get:()=>viewportY})
          vi.spyOn(document.documentElement,'clientHeight','get').mockReturnValue(768)
          vi.spyOn(document.documentElement,'scrollHeight','get').mockReturnValue(1200)
          vi.spyOn(document.body,'getBoundingClientRect').mockReturnValue(new DOMRect(0,-100,1024,1200))
          fireEvent.pointerDown(document.documentElement,{clientX:1021,button:0})
          if(kind==='overlay-drag'){viewportY=20;fireEvent.scroll(document)}
        } finally { width.mockRestore();Object.defineProperty(window,'scrollY',originalY) }
      }
      if (kind === 'target-focus-wheel') {
        redrawnTarget = document.createElementNS(svg.namespaceURI, 'g') as SVGGElement
        redrawnTarget.classList.add('notation-event'); redrawnTarget.setAttribute('tabindex', '0')
        Object.assign(redrawnTarget.dataset, {eventId: selection, partId, staffId, measureId, voiceId})
        vi.spyOn(redrawnTarget, 'getBoundingClientRect').mockReturnValue(new DOMRect(400,620,20,60))
        redrawnTarget.scrollIntoView = vi.fn(); svg.append(redrawnTarget)
        act(() => redrawnTarget!.focus()); fireEvent.wheel(document.documentElement, {deltaY: -20})
      }
      if (kind.startsWith('dock-') || kind.startsWith('touch-')) {
        const dock = document.createElement('div')
        dock.style.overflowY = 'auto'; dock.style.overscrollBehaviorY = kind.endsWith('contained') ? 'contain' : 'auto'
        Object.defineProperties(dock, { clientHeight: { value: 50 }, scrollHeight: { value: kind.includes('short') ? 50 : 100 } })
        dock.scrollTop = kind.includes('fractional') ? 49.5 : kind.endsWith('bottom-room') ? 49 : kind.endsWith('inside') ? 25 : 0
        document.querySelector('.studio-palette-dock')!.append(dock)
        let original: SVGGElement | undefined
        if (kind === 'dock-edge-redraw') {
          original = document.createElementNS(svg.namespaceURI, 'g') as SVGGElement
          original.classList.add('notation-event'); original.setAttribute('tabindex', '0')
          Object.assign(original.dataset, {eventId: selection, partId, staffId, measureId, voiceId})
          svg.append(original); act(() => original!.focus())
        }
        if (kind.startsWith('touch-')) act(() => {
          dock.dispatchEvent(new TouchEvent('touchstart', {bubbles:true,touches:[{identifier:1,clientY:100} as Touch]}))
          dock.dispatchEvent(new TouchEvent('touchmove', {bubbles:true,touches:[{identifier:1,clientY:kind.includes('bottom')?80:120} as Touch]}))
        })
        else fireEvent.wheel(dock, { deltaY: kind.includes('bottom') ? 20 : -20 })
        if (original) {
          redrawnTarget = original.cloneNode(true) as SVGGElement; original.remove(); svg.append(redrawnTarget)
          vi.spyOn(redrawnTarget, 'getBoundingClientRect').mockReturnValue(new DOMRect(400,620,20,60))
          redrawnTarget.scrollIntoView = vi.fn()
          act(() => restoreNotationFocus(redrawnTarget!,redrawnTarget!,new DOMRect(400,620,20,60),canvas,false))
        }
        if (kind === 'dock-edge-return') {
          fireEvent.click(screen.getByRole('button', { name: '악보로 이동' })); flush(); frames.clear()
          vi.mocked(cursor.scrollIntoView).mockClear(); scroll.mockClear()
        }
      }
      const other = screen.getByRole('button', { name: '악보로 이동' })
      if (kind === 'newer-focus') act(() => other.focus())
      top = horizontal ? 400 : 620
      if (horizontal) left = kind === 'right-clip' ? 954 : 275
      const target = kind === 'shell' ? shell : footer
      act(() => {
        for (const observer of observers) if (observer.targets.has(target)) observer.callback([], observer as unknown as ResizeObserver)
      })
      if (kind === 'unmount') view.unmount()
      flush()
      if (kind === 'left-clip' || kind === 'right-clip') {
        expect(cursor.scrollIntoView).toHaveBeenCalledOnce()
        expect(canvas.scrollLeft).toBe(kind === 'left-clip' ? 587 : 610)
        expect(scroll).not.toHaveBeenCalled()
      } else if (['footer', 'shell', 'dock-inside', 'dock-contained', 'dock-short-contained', 'dock-edge-return', 'touch-inside', 'touch-contained', 'touch-short-contained', 'dock-bottom-room', 'touch-bottom-room'].includes(kind)) {
        expect(cursor.scrollIntoView).toHaveBeenCalledOnce()
        expect(scroll.mock.calls.some(([, y]) => typeof y === 'number' && y >= 76)).toBe(true)
      } else {
        expect(cursor.scrollIntoView).not.toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled()
      }
      if (kind === 'manual-horizontal') expect(canvas.scrollLeft).toBe(600)
      if (kind !== 'unmount') {
        expect(kind === 'newer-focus' ? other : redrawnTarget ?? canvas).toHaveFocus()
        if (redrawnTarget) expect(redrawnTarget.scrollIntoView).not.toHaveBeenCalled()
        expect(preview).toHaveAttribute('data-selected-event-id', selection!)
        expect(preview).toHaveAttribute('data-input-tick', '26880')
        expect(document.querySelector('.editor-status')).toHaveTextContent('2회 수정')
      }
      expect(playbackMockState.lastScore).toEqual(current)
      expect(window.inC.project.save).not.toHaveBeenCalled()
    } finally { cleanup(); raf.mockRestore(); cancel.mockRestore(); scroll.mockRestore(); vi.stubGlobal('ResizeObserver', originalObserver) }
  })
