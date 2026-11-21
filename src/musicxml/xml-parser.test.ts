import { expect,it } from 'vitest'
import { createMusicXmlParser } from './xml-parser'
it('resolves numeric XML references once without enabling HTML-only names',()=>{
 const p=createMusicXmlParser({parseTagValue:false})
 expect(p.parse('<x>&#233;|&#xE9;|&amp;#233;|&copy;</x>')).toEqual({x:'é|é|&#233;|&copy;'})
})
it('keeps all five predefined XML names',()=>{
 const p=createMusicXmlParser({parseTagValue:false})
 expect(p.parse('<x>&amp;|&lt;|&gt;|&quot;|&apos;</x>')).toEqual({x:'&|<|>|"|\''})
})
it('preserves literal CDATA while resolving adjacent normal text',()=>{
 const p=createMusicXmlParser({parseTagValue:false})
 expect(p.parse('<x><![CDATA[&#233;]]>&#233;</x>')).toEqual({x:'&#233;é'})
})
it('preserves the ordered fragment and attribute contract',()=>{
 const p=createMusicXmlParser({ignoreAttributes:false,parseTagValue:false,trimValues:false,preserveOrder:true})
 expect(p.parse('<lyric number="&#49;"><text>&#38;</text><text>#233;</text></lyric>')).toEqual([{lyric:[{text:[{'#text':'&'}]},{text:[{'#text':'#233;'}]}],':@':{'@_number':'1'}}])
})
it('retains declared entity behavior without leaking it to the next document',()=>{
 const p=createMusicXmlParser({parseTagValue:false})
 expect(p.parse('<!DOCTYPE x [<!ENTITY word "원문">]><x>&word;</x>')).toEqual({x:'원문'})
 expect(p.parse('<x>&word;</x>')).toEqual({x:'&word;'})
})
it('keeps existing entity expansion limits and resets after failure',()=>{
 const p=createMusicXmlParser({parseTagValue:false,processEntities:{maxTotalExpansions:2,maxExpandedLength:10}})
 expect(()=>p.parse('<x>&amp;&amp;&amp;</x>')).toThrow(/Entity expansion count limit exceeded: 3 > 2/)
 expect(p.parse('<x>&amp;</x>')).toEqual({x:'&'})
})
it('keeps the existing blocked input-entity registration hook',()=>{
 const p=createMusicXmlParser({parseTagValue:false})
 expect(p.parse('<!DOCTYPE x [<!ENTITY payload "<script>owned</script>">]><x>&payload;</x>')).toEqual({x:'&payload;'})
})
