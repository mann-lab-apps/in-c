import {expect,it} from 'vitest'
import {taperedSlurPath} from './slur-profile'
it.each([['M 10 20 Q 60 0 110 20',0],['M 10 20 Q 60 50 110 30',50],['M 10 20 Q 60 20 110 20',20]])('tapers %s with exact endpoints and original centerline', (source,controlY)=>{
 const outline=taperedSlurPath(source,1.6)!
 expect(outline.endsWith(' Z')).toBe(true)
 const tokens=outline.split(/\s+/)
 expect(tokens.slice(0,3)).toEqual(source.split(' ').slice(0,3))
 expect(tokens.filter(t=>t==='Q')).toHaveLength(2)
 expect(tokens.slice(6,8)).toEqual(source.split(' ').slice(6,8))
 const middle=(Number(tokens[5])+Number(tokens[10]))/2
 expect(middle).toBe(controlY)
 expect((Number(tokens[10])-Number(tokens[5]))/2).toBeCloseTo(1.6)
})
it.each(['M 0 0 L 10 10','M 0 0 Q NaN 2 10 10','M 0 0 Q 5 2 0 0'])('leaves unsupported geometry untouched: %s',source=>expect(taperedSlurPath(source,1.6)).toBeUndefined())
it.each([[false,true],[true,false],[false,false]])('keeps hanging ends open at a system break, taperStart=%s taperEnd=%s',(taperStart,taperEnd)=>{
 const d=taperedSlurPath('M 10 20 Q 60 0 110 20',1.6,{taperStart,taperEnd})!
 const t=d.split(' ')
 expect(Number(t[2])).toBeCloseTo(taperStart?20:19.2)
 expect(Number(t[7])).toBeCloseTo(taperEnd?20:19.2)
 expect(Number(t[10])).toBeCloseTo(taperEnd?20:20.8)
 expect(Number(t[15])).toBeCloseTo(taperStart?20:20.8)
})
