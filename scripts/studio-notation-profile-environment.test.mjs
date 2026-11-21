import {createRequire} from 'node:module'
import {expect,it} from 'vitest'
const {selectStudioNotationProfileEnvironment:select}=createRequire(import.meta.url)('./studio-notation-profile-environment.cjs')
const samples=(size=0)=>Object.fromEntries([960,1400].map(width=>[width,{innerWidth:width,innerHeight:1000,nativeScrollbarWidth:size,viewportScrollbarWidth:size,documentClientWidth:width-size,rootOverflowing:true}]))
it('keeps the original strict profile for a measured overlay environment',()=>{
 expect(select(samples())).toEqual({kind:'overlay-0',fileName:'studio-r3-notation-profile.json',nativeScrollbarWidth:0})
})
it('selects a separate classic15 profile only from agreeing native probe and viewport measurements',()=>{
 expect(select(samples(15))).toEqual({kind:'classic-15',fileName:'studio-r3-notation-profile-classic-15.json',nativeScrollbarWidth:15})
})
it.each([
 ['application-only gutter',()=>{const s=samples();s[960].viewportScrollbarWidth=15;s[960].documentClientWidth=945;return s}],
 ['missing expected native gutter',()=>{const s=samples(15);s[960].viewportScrollbarWidth=0;s[960].documentClientWidth=960;return s}],
 ['unknown native width',()=>samples(17)],
 ['fractional native width',()=>samples(14.5)],
 ['different environments between captures',()=>({...samples(),1400:samples(15)[1400]})],
 ['inconsistent document client width',()=>{const s=samples(15);s[1400].documentClientWidth=1400;return s}],
 ['missing viewport',()=>({960:samples()[960]})],
 ['wrong viewport identity',()=>{const s=samples();s[960].innerWidth=961;return s}],
 ['changed explicit height',()=>{const s=samples();s[1400].innerHeight=900;return s}],
 ['unexpected non-scrollable fixture',()=>{const s=samples(15);s[960].rootOverflowing=false;return s}]
])('rejects %s instead of choosing a convenient baseline',(_name,create)=>{expect(()=>select(create())).toThrow(/environment|scrollbar|viewport|fixture/i)})
