import { expect,it } from 'vitest'
import { resolveTieModifierDepth,resolveTieModifierPlacement,type TieModifierCurve } from './tie-modifier-clearance'

const above:TieModifierCurve={firstX:151,lastX:371.92,firstYs:[257,242],lastYs:[257,242],direction:-1,yShift:7,cp1:8,cp2:12}
const sharp=[{x:319,y:218,width:9.96,height:27.92},{x:329.96,y:233,width:9.96,height:27.92}]
it('deepens a complete chord tie over measured interior key ink without changing caller geometry',()=>{
 const before=structuredClone(above),ink=structuredClone(sharp),depth=resolveTieModifierDepth(above,sharp)
 expect(depth).toBeGreaterThan(0);expect(above).toEqual(before);expect(sharp).toEqual(ink)
 // All chord members receive the same added depth,so their parallel spacing is retained.
 expect(depth).toBe(Math.max(...above.firstYs.map((y,i)=>resolveTieModifierDepth({...above,firstYs:[y],lastYs:[above.lastYs[i]]},sharp))))
})
it('puts the entire conservative filled lens above both glyphs including eight units clearance',()=>{
 const depth=resolveTieModifierDepth(above,sharp)
 for(const y of above.firstYs)for(const glyph of sharp)for(const x of [glyph.x,glyph.x+glyph.width]){
  const t=(x-above.firstX)/(above.lastX-above.firstX),endpoint=y-7
  const near=(1-t)**2*endpoint+2*(1-t)*t*(endpoint-8-depth)+t*t*endpoint
  expect(near).toBeLessThanOrEqual(glyph.y-8)
 }
})
it('is symmetric for below ties and reversed vertical coordinates',()=>{
 const below={...above,direction:1,firstYs:above.firstYs.map(y=>-y),lastYs:above.lastYs.map(y=>-y)}
 expect(resolveTieModifierDepth(below,sharp.map(s=>({...s,y:-s.y-s.height})))).toBeCloseTo(resolveTieModifierDepth(above,sharp),2)
})
it('leaves ordinary separated ties and symbols outside the endpoints unchanged',()=>{
 expect(resolveTieModifierDepth(above,[])).toBe(0)
 expect(resolveTieModifierDepth(above,[{x:220,y:300,width:10,height:20}])).toBe(0)
 expect(resolveTieModifierDepth(above,[{x:120,y:218,width:10,height:80}])).toBe(0)
 expect(resolveTieModifierDepth(above,[{x:370,y:218,width:10,height:80}])).toBe(0)
})
it('does not respond to invalid or unpainted bounds',()=>{
 expect(resolveTieModifierDepth(above,[{x:320,y:220,width:0,height:30},{x:NaN,y:220,width:10,height:30}])).toBe(0)
 expect(resolveTieModifierDepth({...above,lastX:above.firstX},sharp)).toBe(0)
 expect(resolveTieModifierDepth({...above,direction:0},sharp)).toBe(0)
})
it('chooses the smaller automatic bow only after the default side meets interior ink',()=>{
 const choice=resolveTieModifierPlacement(above,sharp)
 expect(choice.direction).toBe(1)
 expect(choice.depth).toBeLessThan(resolveTieModifierDepth(above,sharp))
 expect(resolveTieModifierPlacement(above,[])).toEqual({direction:-1,depth:0})
 expect(resolveTieModifierPlacement(above,[{x:220,y:300,width:10,height:20}])).toEqual({direction:-1,depth:0})
})

it('uses the existing automatic side policy for a concurrent voice head without mutating chord anchors',()=>{
 const curve:TieModifierCurve={firstX:100,lastX:400,firstYs:[100,90],lastYs:[100,90],direction:1,yShift:7,cp1:8,cp2:12}
 const head={x:240,y:111,width:10,height:8},before=structuredClone(curve)
 const placement=resolveTieModifierPlacement(curve,[head])
 expect(placement).toEqual({direction:-1,depth:0});expect(curve).toEqual(before)
})
it('mirrors the same-voice-lane clearance policy for a competing head above the tie',()=>{
 const curve:TieModifierCurve={firstX:100,lastX:400,firstYs:[-100,-90],lastYs:[-100,-90],direction:-1,yShift:7,cp1:8,cp2:12}
 expect(resolveTieModifierPlacement(curve,[{x:240,y:-119,width:10,height:8}])).toEqual({direction:1,depth:0})
})
it('leaves a distant concurrent voice on the default bow and preserves parallel member spacing',()=>{
 const curve:TieModifierCurve={firstX:100,lastX:400,firstYs:[100,90],lastYs:[100,90],direction:1,yShift:7,cp1:8,cp2:12}
 expect(resolveTieModifierPlacement(curve,[{x:240,y:180,width:10,height:8}])).toEqual({direction:1,depth:0})
})

it('clears the measured outgoing beam on its original side without moving either endpoint',()=>{
 const curve:TieModifierCurve={firstX:126.52,lastX:742,firstYs:[150,140],lastYs:[150,140],direction:1,yShift:7,cp1:8,cp2:12}
 const beam={x:363.018,y:162.454,width:107.849,height:7.564},original=structuredClone(curve)
 const depth=resolveTieModifierDepth(curve,[beam]);expect(depth).toBeGreaterThan(0)
 for(const y of curve.firstYs)for(const x of[beam.x,beam.x+beam.width]){
  const t=(x-curve.firstX)/(curve.lastX-curve.firstX),endpoint=y+curve.yShift
  const near=endpoint+2*(1-t)*t*(curve.cp1+depth)
  expect(near).toBeGreaterThanOrEqual(beam.y+beam.height+8-.02)
 }
 expect(curve).toEqual(original)
})

it('preserves the near-anchor exclusion when a short piece has no eligible interior',()=>{
 const curve:TieModifierCurve={firstX:100,lastX:108,firstYs:[100],lastYs:[100],direction:1,yShift:7,cp1:2,cp2:8}
 const symbol={x:103.8,y:109,width:.4,height:6},depth=resolveTieModifierDepth(curve,[symbol])
 // Existing policy excludes eight units at each attached endpoint. A shorter
 // piece cannot invent interior clearance by moving the note attachment.
 // Native 12/24.72-unit incoming pieces are measured separately, not assumed bad.
 expect(depth).toBe(0)
})
