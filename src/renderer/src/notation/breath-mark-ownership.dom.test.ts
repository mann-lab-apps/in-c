// @vitest-environment jsdom
import {afterEach, expect, it, vi} from 'vitest'
import {drawBreathMark} from './NotationPreview'
import {readPrintSystemInk} from './print-system-ink'
import * as ink from './staff-ink-spacing'

afterEach(() => {document.body.replaceChildren();vi.restoreAllMocks()})

it.each([
  {kind:'breath', glyph:',', fermata:false, system:0, measure:'upper-2', event:'upper-note'},
  {kind:'caesura', glyph:'//', fermata:false, system:1, measure:'lower-2', event:'lower-note'},
  {kind:'breath', glyph:',', fermata:true, system:1, measure:'lower-2', event:'lower-note'},
  {kind:'caesura', glyph:'//', fermata:true, system:0, measure:'upper-2', event:'upper-note'}
])('keeps $kind with its owned measure and print system (fermata=$fermata)', ({kind,glyph,fermata,system,measure,event}) => {
  document.body.innerHTML='<svg width="804"></svg>'
  const svg=document.querySelector('svg')!
  // Ownership is independent of font metrics; real glyph ink is checked in Electron/PDF.
  vi.spyOn(ink,'readSvgTextInk').mockImplementation(node => ({x:Number(node.getAttribute('x')), y:Number(node.getAttribute('y'))-10, width:12, height:12}))
  drawBreathMark(svg,240,300,kind,fermata,measure,event)
  const mark=svg.querySelector<SVGTextElement>('.notation-breath-mark')!
  expect(mark.textContent).toBe(glyph)
  expect(mark.dataset.printMeasureId).toBe(measure)
  expect(mark.dataset.breathEventId).toBe(event)
  expect(mark.getAttribute('x')).toBe('254')
  expect(mark.getAttribute('y')).toBe(String(300-(fermata?2:16)))
  const bands=readPrintSystemInk(svg,{} as CanvasRenderingContext2D,new Map([[system,200]]),new Map([[measure,system]]))
  expect(bands.unknown).toBe(0)
  expect(bands.bands).toHaveLength(1)
  expect(bands.bands[0].systemIndex).toBe(system)
})
