// @vitest-environment jsdom
import {afterEach, expect, it, vi} from 'vitest'
import type {StaveNote} from 'vexflow'
import {drawTremoloMark} from './NotationPreview'
import {readPrintSystemInk} from './print-system-ink'
import * as ink from './staff-ink-spacing'

afterEach(() => {document.body.replaceChildren();vi.restoreAllMocks()})
it.each([1,2,3])('owns every one of %i tremolo strokes without changing stem geometry', marks => {
  document.body.innerHTML='<svg><g data-measure-id="lower-bar" data-event-id="lower-note"/></svg>'
  const svg=document.querySelector('svg')!,event=svg.querySelector('g')!
  const note={getSVGElement:()=>event,getStemX:()=>260,getStemExtents:()=>({topY:100,baseY:140})} as unknown as StaveNote
  // Stable shape metrics check ownership only; production tests inspect real strokes.
  vi.spyOn(ink,'readSvgShapeInk').mockImplementation(n=>({x:Number(n.getAttribute('x1')),y:Number(n.getAttribute('y2')),width:16,height:8}))
  drawTremoloMark(svg,80,note,marks)
  const group=svg.querySelector<SVGGElement>('.notation-tremolo-mark')!
  expect(group.dataset.printMeasureId).toBe('lower-bar')
  expect(group.dataset.tremoloEventId).toBe('lower-note')
  const lines=[...group.querySelectorAll('line')]
  expect(lines).toHaveLength(marks)
  for(const [i,line]of lines.entries()){
    const center=120-(marks-1)*2.5+i*5
    expect(line.getAttribute('x1')).toBe('252');expect(line.getAttribute('x2')).toBe('268')
    expect(line.getAttribute('y1')).toBe(String(center+4));expect(line.getAttribute('y2')).toBe(String(center-4))
    expect(line.getAttribute('stroke-width')).toBe('2')
  }
  const result=readPrintSystemInk(svg,{} as CanvasRenderingContext2D,new Map([[1,80]]),new Map([['lower-bar',1]]))
  expect(result.unknown).toBe(0);expect(result.bands).toHaveLength(1);expect(result.bands[0].systemIndex).toBe(1)
})
