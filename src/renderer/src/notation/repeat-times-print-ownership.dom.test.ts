// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest'
import {drawRepeatTimes} from './NotationPreview'
import {readPrintSystemInk} from './print-system-ink'
import * as readers from './staff-ink-spacing'
afterEach(()=>{document.body.replaceChildren();vi.restoreAllMocks()})
it.each([{times:3,system:0},{times:3,system:1},{times:4,system:1}])('retains x$times ink while owning its rendered system $system',({times,system})=>{
 document.body.innerHTML='<svg width="1087"></svg>';const svg=document.querySelector('svg')!
 vi.spyOn(readers,'readSvgTextInk').mockImplementation(n=>({x:Number(n.getAttribute('x'))+.144,y:Number(n.getAttribute('y'))-8.448,width:12.756,height:8.628}))
 drawRepeatTimes(svg,1053,258,times,system)
 const measured=readPrintSystemInk(svg,{}as CanvasRenderingContext2D,new Map([[system,226]]),new Map()),text=svg.querySelector('.notation-repeat-times')!
 expect(measured.unknown).toBe(0);expect(measured.bands).toHaveLength(1);expect(measured.bands[0].systemIndex).toBe(system)
 expect(text.getAttribute('data-system-index')).toBe(String(system));expect(text.getAttribute('x')).toBe('1053');expect(text.getAttribute('y')).toBe('258');expect(text.textContent).toBe(`x${times}`)
})
