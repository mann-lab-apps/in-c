// @vitest-environment jsdom
import {expect,it} from 'vitest'
import {createNote,createScore,TICKS_PER_QUARTER} from '../../../score-core'
import {createSystemLayout,type MeasureWidthRequirements} from './system-layout'
import {minimumTextScoreWidths} from './use-lyric-layout'

const measures=()=>{
 const score=createScore(),base=score.parts[0].staves[0].measures[0]
 score.parts[0].staves[0].measures=Array.from({length:8},(_,i)=>({...structuredClone(base),id:`bar-${i}`,number:i+1,voices:[{id:'voice-1',events:Array.from({length:4},(_,j)=>createNote({id:`n-${i}-${j}`,position:{tick:j*TICKS_PER_QUARTER},duration:{value:'quarter',dots:0},pitch:{step:'C',octave:4}}))}]}))
 return score
}
it('reserves system-start widths only where the measure actually begins a system',()=>{
 const score=measures(),bars=score.parts[0].staves[0].measures,source=structuredClone(score)
 const widths:MeasureWidthRequirements=Object.assign(new Map<string,number>(),{systemStart:new Map(bars.map(b=>[b.id,280]))})
 const layout=createSystemLayout(bars,750,{minimumMeasureWidths:widths})
 for(const p of layout.placements)if(p.isSystemStart)expect(p.width).toBeGreaterThanOrEqual(280)
 expect(layout.placements.some(p=>!p.isSystemStart&&p.width<280)).toBe(true)
 expect(score).toEqual(source)
})
it.each([0,4,7,-4,-7])('measures each potential line start with initial key %i without reserving headers in every body bar',fifths=>{
 const score=measures();for(const m of score.parts[0].staves[0].measures)m.keySignature={fifths}
 const source=structuredClone(score),widths:MeasureWidthRequirements=minimumTextScoreWidths(score,new Map())
 expect(widths.size).toBe(0)
 for(const m of score.parts[0].staves[0].measures)expect(widths.systemStart?.get(m.id)).toBeGreaterThan(0)
 expect(score).toEqual(source)
})
