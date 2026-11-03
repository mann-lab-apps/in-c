import { expect, it } from 'vitest'
import { createMeasure } from '../../../score-core'
import { keySignatureCancellation } from './key-signature-header'
import { leadingNotationPadding } from './system-layout'

it.each([[4,'E'],[-3,'Eb'],[7,'C#'],[-7,'Cb']]as const)('cancels all %i prior accidentals on a neutral major or minor change without mutating keys',(fifths,keySpec)=>{
 for(const mode of ['major','minor']as const){
  const current={fifths:0,mode},previous={fifths,mode:'major'as const},before=structuredClone({current,previous})
  expect(keySignatureCancellation(current,previous)).toEqual({keySpec,count:Math.abs(fifths)})
  expect({current,previous}).toEqual(before)
 }
})
it('uses the previous minor signature and leaves initial/repeated neutral or other key transitions unchanged',()=>{
 expect(keySignatureCancellation({fifths:0,mode:'minor'},{fifths:4,mode:'minor'})).toEqual({keySpec:'C#m',count:4})
 expect(keySignatureCancellation({fifths:0})).toBeUndefined()
 for(const old of [{fifths:0},{fifths:0,mode:'minor'as const}])expect(keySignatureCancellation({fifths:0,mode:'major'},old)).toBeUndefined()
 for(const fifths of [4,-3])expect(keySignatureCancellation({fifths},{fifths:4})).toBeUndefined()
})
it('reserves the actual cancellation glyph count within existing leading-padding limits and does not add hidden padding',()=>{
 const measure=createMeasure({keySignature:{fifths:0,mode:'major'}}),header={showsClef:true,showsKeySignature:true,showsTimeSignature:true}
 expect(leadingNotationPadding(measure,header)).toBe(24)
 expect(leadingNotationPadding(measure,{...header,cancelledKeyAccidentals:4})).toBe(40)
 expect(leadingNotationPadding(measure,{...header,cancelledKeyAccidentals:7})).toBe(52)
 expect(leadingNotationPadding(measure,{showsClef:false,showsKeySignature:false,showsTimeSignature:false,cancelledKeyAccidentals:7})).toBe(0)
})
