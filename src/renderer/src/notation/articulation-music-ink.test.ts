// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
const { ink } = vi.hoisted(() => ({ ink: { x: 136.4, y: 254.0001, width: 6.2, height: 6.2 } }))
vi.mock('./staff-ink-spacing', () => ({ readSvgTextInk: () => ink, readSvgShapeInk: () => ink }))
import { readStaffMusicInk, resolveLyricInkSpacing } from './lyric-ink-spacing'
import { resolveDynamicInkSpacing } from './dynamic-ink-spacing'
let svg: SVGSVGElement
const owner = { partId: 'p', staffId: 's', staffIndex: 0, systemIndex: 0 }
const owners = new Map([['m', owner]])
const context = {} as CanvasRenderingContext2D
beforeEach(() => {
 document.body.innerHTML = '<svg><g class="notation-event" data-event-id="n" data-measure-id="m" data-part-id="p" data-staff-id="s"></g><circle class="notation-articulation" data-articulation-event-id="n" data-articulation-measure-id="m" /></svg>'
 svg = document.querySelector('svg')!
})
it('includes standalone actual articulation ink in shared lyric/dynamic clearance', () => {
 const music = readStaffMusicInk(svg, owners, context)
 expect(music).toEqual([{ ...ink, ...owner }])
 const text = { x: 131.8832, y: 257.84375, width: 31.4746, height: 19.4922, ...owner, measureId: 'm' }
 const gap = resolveDynamicInkSpacing(music, [text], new Map()).get(0)!
 expect(gap).toBe(10.36)
 expect(text.y + gap - ink.y - ink.height).toBeGreaterThanOrEqual(8)
 expect(resolveLyricInkSpacing(music, [text], new Map()).get(0)).toBe(gap)
})
it('rejects ambiguous or unmatched event/measure ownership instead of moving another staff', () => {
 const node=svg.querySelector('.notation-event')!;svg.append(node.cloneNode(true))
 expect(readStaffMusicInk(svg, owners, context)).toEqual([])
 node.remove();svg.querySelector('.notation-articulation')!.setAttribute('data-articulation-measure-id','other')
 expect(readStaffMusicInk(svg, owners, context)).toEqual([])
})
it('reads tenuto text ink with the same owner while ignoring transparent selection siblings', () => {
 const mark=svg.querySelector('.notation-articulation')!,text=document.createElementNS('http://www.w3.org/2000/svg','text')
 for(const a of mark.attributes)text.setAttribute(a.name,a.value)
 mark.replaceWith(text)
 const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');rect.setAttribute('opacity','0');svg.append(rect)
 expect(readStaffMusicInk(svg,owners,context)).toEqual([{...ink,...owner}])
})
