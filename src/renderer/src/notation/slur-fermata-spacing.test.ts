import { describe, expect, it } from 'vitest'
import { resolveSlurFermataControlY, resolveSlurFermataCurve, resolveSlurContinuationStartCurve, type AutomaticSlurCurve } from './slur-fermata-spacing'

describe('automatic slur interior fermata ink clearance',()=>{
 const curve:AutomaticSlurCurve={x1:124.51997375488281,x2:430.3333333333333,controlX:277.42665354410804,y1:112,y2:112,controlY:90,side:'above',strokeWidth:1.6}
 const ink={x:233.20928478240967,y:98.22644805908203,width:12.681012153625488,height:8.765625}
 it('clears both edges of the actual reproduced glyph, stays stable and preserves inputs',()=>{
  const before=structuredClone({curve,ink}),cy=resolveSlurFermataControlY(curve,[ink]);expect(cy).toBeLessThan(90)
  for(const x of [ink.x-0.8,ink.x+ink.width+0.8]){const t=(x-curve.x1)/(curve.x2-curve.x1),y=(1-t)**2*curve.y1+2*(1-t)*t*cy+t*t*curve.y2;expect(y+0.8+8).toBeLessThanOrEqual(ink.y)}
  expect(resolveSlurFermataControlY({...curve,controlY:cy},[ink])).toBe(cy);expect({curve,ink}).toEqual(before)
 })
 it('preserves a slur already below a clearly separated upper fermata',()=>{
  expect(resolveSlurFermataControlY(curve,[{...ink,y:75.3564453125}])).toBe(90)
 })
 it('clears the actual stroke-expanded staccato circle without moving endpoints',()=>{
  const source={...curve,y1:122,y2:122,controlY:100},dot={x:236.56666564941406,y:107.9000015258789,width:6.199999809265137,height:6.199999809265137}
  const before=structuredClone({source,dot}),next=resolveSlurFermataCurve(source,[dot],false,false)
  expect(next.controlY).toBeLessThan(source.controlY);expect(next.y1).toBe(source.y1);expect(next.y2).toBe(source.y2)
  for(let i=0;i<=1000;i++){const t=i/1000,x=(1-t)**2*next.x1+2*(1-t)*t*next.controlX+t*t*next.x2,y=(1-t)**2*next.y1+2*(1-t)*t*next.controlY+t*t*next.y2;if(x>=dot.x-0.8&&x<=dot.x+dot.width+0.8)expect(y+8+0.8).toBeLessThanOrEqual(dot.y)}
  expect({source,dot}).toEqual(before);expect(resolveSlurFermataCurve(next,[dot],false,false)).toBe(next)
 })
 it('clears actual accent ink and dot together regardless of collection order',()=>{
  const source={...curve,y1:122,y2:122,controlY:98.45},accent={x:231.43932801485062,y:106.79199981689453,width:8.512000262737274,height:8.44800090789795},dot={x:236.56666564941406,y:119.9000015258789,width:6.199999809265137,height:6.199999809265137}
  const before=structuredClone({source,accent,dot}),next=resolveSlurFermataCurve(source,[accent,dot],false,false)
  expect(next).toEqual(resolveSlurFermataCurve(source,[dot,accent],false,false));expect(next.y1).toBe(source.y1);expect(next.y2).toBe(source.y2)
  for(const ink of [accent,dot])for(let i=0;i<=1000;i++){const t=i/1000,x=(1-t)**2*next.x1+2*(1-t)*t*next.controlX+t*t*next.x2,y=(1-t)**2*next.y1+2*(1-t)*t*next.controlY+t*t*next.y2;if(x>=ink.x-0.8&&x<=ink.x+ink.width+0.8)expect(y+8+0.8).toBeLessThanOrEqual(ink.y)}
  expect({source,accent,dot}).toEqual(before);expect(resolveSlurFermataCurve(next,[accent,dot],false,false)).toBe(next)
 })
 it('resolves newly encountered glyphs in geometric order without depending on DOM order',()=>{
  const higher={...ink,y:75.3564453125},before=structuredClone([ink,higher])
  const forward=resolveSlurFermataControlY(curve,[ink,higher]),reverse=resolveSlurFermataControlY(curve,[higher,ink])
  expect(forward).toBe(reverse);expect(resolveSlurFermataControlY({...curve,controlY:forward},[higher,ink])).toBe(forward)
  expect([ink,higher]).toEqual(before)
 })
 it('retains ordinary clear curves, endpoint policy and missing measurements',()=>{
  expect(resolveSlurFermataControlY(curve,[])).toBe(90)
  expect(resolveSlurFermataControlY(curve,[{...ink,y:200}])).toBe(90)
  expect(resolveSlurFermataControlY(curve,[{...ink,x:curve.x1}])).toBe(90)
  expect(resolveSlurFermataControlY(curve,[{...ink,width:0}])).toBe(90)
  expect(resolveSlurFermataControlY({...curve,controlX:NaN},[ink])).toBe(90)
 })
 it('handles a non-midpoint control X and an independently known quadratic point',()=>{
  const source={...curve,x1:0,x2:200,controlX:70,y1:100,y2:110,controlY:80},t=0.2,x=2*(1-t)*t*70+t*t*200,glyph={x:x+0.8,y:85,width:5,height:8}
  const cy=resolveSlurFermataControlY(source,[glyph]),y=(1-t)**2*100+2*(1-t)*t*cy+t*t*110
  expect(y+8+0.8).toBeLessThanOrEqual(85)
 })
 it('reserves the lower side without changing endpoints',()=>{
  const lower={...curve,y1:0,y2:0,controlY:22,side:'below' as const},glyph={...ink,y:10}
  const cy=resolveSlurFermataControlY(lower,[glyph]);expect(cy).toBeGreaterThan(22)
  const t=(glyph.x-lower.x1)/(lower.x2-lower.x1),y=2*(1-t)*t*cy
  expect(y-0.8-8).toBeGreaterThanOrEqual(glyph.y+glyph.height)
 })
 it('uses a free continuation start to avoid the reproduced unnecessarily deep bow',()=>{
  const source={...curve,x1:33.839996337890625,x2:333,controlX:187.4199981689453,y1:339,y2:339,controlY:317},glyph={...ink,x:65.3826093673706,y:325.2264404296875}
  const bowOnly=resolveSlurFermataControlY(source,[glyph]),next=resolveSlurFermataCurve(source,[glyph],true,false)
  expect(next.y2).toBe(source.y2);expect(next.y1).toBeLessThan(source.y1);expect(next.controlY).toBeGreaterThan(bowOnly)
  for(let i=0;i<=1000;i++){const t=i/1000,x=(1-t)**2*next.x1+2*(1-t)*t*next.controlX+t*t*next.x2,y=(1-t)**2*next.y1+2*(1-t)*t*next.controlY+t*t*next.y2;if(x>=glyph.x-0.8&&x<=glyph.x+glyph.width+0.8)expect(y+8+0.8).toBeLessThanOrEqual(glyph.y)}
  const attached=resolveSlurFermataCurve(source,[glyph],false,false);expect(attached.y1).toBe(source.y1);expect(attached.y2).toBe(source.y2)
 })
 it('keeps already clear hanging endpoints unchanged',()=>{
  expect(resolveSlurFermataCurve(curve,[{...ink,y:75.3564453125}],true,true)).toBe(curve)
 })
 it('preserves a separated notehead rectangle while retaining ordinary mark padding',()=>{
  const source={...curve,y1:122,y2:122,controlY:100},head={x:233,y:115,width:17,height:10}
  expect(resolveSlurFermataCurve(source,[{...head,collisionOnly:true}],false,false)).toBe(source)
  expect(resolveSlurFermataCurve(source,[head],false,false).controlY).toBeLessThan(source.controlY)
 })
 it('clears the actual higher middle notehead without changing authored endpoints',()=>{
  const source={...curve,x1:124.51997375488281,x2:477,controlX:300.7599868774414,y1:137,y2:137,controlY:115},head={x:328.9599999971688,y:125,width:16.999999087303877,height:10,collisionOnly:true}
  const next=resolveSlurFermataCurve(source,[head],false,false)
  expect(next.controlY).toBeLessThan(source.controlY);expect(next.y1).toBe(source.y1);expect(next.y2).toBe(source.y2)
  for(let i=0;i<=1000;i++){const t=i/1000,x=(1-t)**2*next.x1+2*(1-t)*t*next.controlX+t*t*next.x2,y=(1-t)**2*next.y1+2*(1-t)*t*next.controlY+t*t*next.y2;if(x>=head.x-0.8&&x<=head.x+head.width+0.8)expect(y+8+0.8).toBeLessThanOrEqual(head.y)}
  expect(resolveSlurFermataCurve(next,[head],false,false)).toBe(next)
 })
 it('clears the stroke-expanded actual quarter-note stem and preserves separated stems',()=>{
  const source={...curve,x2:483.3065991811441,controlX:303.91328646801344,y1:114,y2:114,controlY:92},stem={x:326.68701171875,y:101.25,width:1.5,height:46.5,collisionOnly:true}
  const before=structuredClone({source,stem}),next=resolveSlurFermataCurve(source,[stem],false,false)
  expect(next.controlY).toBeLessThan(source.controlY);expect(next.y1).toBe(source.y1);expect(next.y2).toBe(source.y2)
  for(let i=0;i<=2000;i++){const t=i/2000,x=(1-t)**2*next.x1+2*(1-t)*t*next.controlX+t*t*next.x2,y=(1-t)**2*next.y1+2*(1-t)*t*next.controlY+t*t*next.y2;if(x>=stem.x-0.8&&x<=stem.x+stem.width+0.8)expect(y+8+0.8).toBeLessThanOrEqual(stem.y)}
  expect(resolveSlurFermataCurve(source,[{...stem,y:106}],false,false)).toBe(source);expect({source,stem}).toEqual(before);expect(resolveSlurFermataCurve(next,[stem],false,false)).toBe(next)
 })
 it('clears the reproduced sloping beam and both real beamed stems in either collection order',()=>{
  const source={...curve,x2:494.8913470034388,controlX:309.7056603791608,y1:114,y2:114,controlY:92}
  const ink=[{x:303.517,y:97.063,width:30.126,height:7.447},{x:303.5169982910156,y:99.4469985961914,width:1.5,height:48.303001403808594},{x:332.64300537109375,y:97,width:1.5,height:45.75}].map(b=>({...b,collisionOnly:true}))
  const before=structuredClone({source,ink}),next=resolveSlurFermataCurve(source,ink,false,false)
  expect(next.controlY).toBeLessThan(source.controlY);expect(next.y1).toBe(source.y1);expect(next.y2).toBe(source.y2)
  expect(next).toEqual(resolveSlurFermataCurve(source,[...ink].reverse(),false,false))
  for(const bounds of ink)for(let i=0;i<=2000;i++){const t=i/2000,x=(1-t)**2*next.x1+2*(1-t)*t*next.controlX+t*t*next.x2,y=(1-t)**2*next.y1+2*(1-t)*t*next.controlY+t*t*next.y2;if(x>=bounds.x-.8&&x<=bounds.x+bounds.width+.8)expect(y+8+.8).toBeLessThanOrEqual(bounds.y)}
  expect(resolveSlurFermataCurve(next,ink,false,false)).toBe(next);expect({source,ink}).toEqual(before)
 })
 it('floats the reproduced incoming start above real sharp ink while retaining length and the attached tip',()=>{
  const source={...curve,x1:57.79998779296875,x2:119.08765943507468,controlX:92.44382361402171,y1:498.25,y2:498.25,controlY:482.25},sharp={x:49.84000015258789,y:498,width:9.960000038146973,height:27.920000076293945}
  const before=structuredClone({source,sharp}),next=resolveSlurContinuationStartCurve(source,[sharp])
  expect(next.x1).toBe(source.x1);expect(next.x2).toBe(source.x2);expect(next.y2).toBe(source.y2);expect(next.y1).toBeLessThan(source.y1)
  for(let i=0;i<=1000;i++){const t=i/1000,x=(1-t)**2*next.x1+2*(1-t)*t*next.controlX+t*t*next.x2,y=(1-t)**2*next.y1+2*(1-t)*t*next.controlY+t*t*next.y2;if(x>=sharp.x-.8&&x<=sharp.x+sharp.width+.8)expect(y+8+.8).toBeLessThanOrEqual(sharp.y)}
  expect(resolveSlurContinuationStartCurve(next,[sharp])).toBe(next);expect({source,sharp}).toEqual(before)
  expect(resolveSlurContinuationStartCurve(source,[{...sharp,y:450}])).toBe(source);expect(resolveSlurContinuationStartCurve(source,[])).toBe(source)
 })
 it('floats a lower hanging start away from mirrored symbol ink without moving its attached end',()=>{
  const source={...curve,x1:57.79998779296875,x2:119.08765943507468,controlX:92.44382361402171,y1:-498.25,y2:-498.25,controlY:-482.25,side:'below' as const},symbol={x:49.84000015258789,y:-525.9200000762939,width:9.960000038146973,height:27.920000076293945}
  const next=resolveSlurContinuationStartCurve(source,[symbol]);expect(next.y1).toBeGreaterThan(source.y1);expect(next.y2).toBe(source.y2)
  for(let i=0;i<=1000;i++){const t=i/1000,x=(1-t)**2*next.x1+2*(1-t)*t*next.controlX+t*t*next.x2,y=(1-t)**2*next.y1+2*(1-t)*t*next.controlY+t*t*next.y2;if(x>=symbol.x-.8&&x<=symbol.x+symbol.width+.8)expect(y-8-.8).toBeGreaterThanOrEqual(symbol.y+symbol.height)}
  expect(resolveSlurContinuationStartCurve(next,[symbol])).toBe(next)
 })
})
