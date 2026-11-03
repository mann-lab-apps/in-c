// @vitest-environment jsdom
import {expect,it} from 'vitest'
import {hasClippedLyricInk,hasOverlappingLyricInk,readLyricInk,type LyricInk} from './lyric-overlap'
const svg=document.createElementNS('http://www.w3.org/2000/svg','svg')
const a:LyricInk={eventId:'a',verse:'1',svg,x:10,y:100,width:80,height:16}
it('warns for distinct same-verse lyric ink and preserves input order/geometry',()=>{
 const inks=[{...a,eventId:'b',x:50},a],original=inks.map(ink=>({...ink}))
 expect(hasOverlappingLyricInk(inks)).toBe(true)
 expect(inks).toEqual(original)
})
it.each([
 {x:90}, {y:116}, {verse:'2'}, {svg:document.createElementNS(svg.namespaceURI,'svg')},
 {eventId:'a'}, {width:0}, {x:NaN}
])('does not conflate nonoverlap/other verse/system/SVG/same-event/empty ink: %j',patch=>{
 expect(hasOverlappingLyricInk([a,{...a,eventId:'b',x:50,...patch}])).toBe(false)
})
it('reads only actual lyric text, excluding selection and inline editor hit areas',()=>{
 const root=document.createElement('div');root.innerHTML='<div class="notation-preview"><svg><rect class="notation-lyric-hit"/><foreignObject class="notation-lyric-editor"/><text class="notation-lyric" data-event-id="lyric-note" data-lyric-number="2">한글</text></svg></div>'
 const text=root.querySelector('.notation-lyric') as SVGGraphicsElement
 text.getBBox=()=>({x:2,y:3,width:40,height:15} as DOMRect)
 expect(readLyricInk(root)).toEqual([{eventId:'lyric-note',verse:'2',svg:root.querySelector('svg'),x:2,y:3,width:40,height:15}])
})
it('reports oversized lyric ink using the real viewBox, preserving manual SVG margins',()=>{
 const page=document.createElementNS(svg.namespaceURI,'svg');page.setAttribute('width','100')
 expect(hasClippedLyricInk([{...a,svg:page,x:-2}])).toBe(true)
 expect(hasClippedLyricInk([{...a,svg:page,x:50}])).toBe(true)
 expect(hasClippedLyricInk([{...a,svg:page,x:10}])).toBe(false)
 page.setAttribute('viewBox','-10 0 140 200')
 expect(hasClippedLyricInk([{...a,svg:page,x:-2}])).toBe(false)
})
