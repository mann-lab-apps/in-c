import { createLyricVisibilityFixture } from './lyric-visibility-fixture'
export const xmlCharacterCases = [
 {id:'decimal',parts:'<text>caf&#233;</text>',expected:'café'},
 {id:'hex',parts:'<text>caf&#xE9;</text>',expected:'café'},
 {id:'korean-fragments',parts:'<text>&#54620;</text><text>&#44544;</text>',expected:'한글'},
 {id:'nbsp',parts:'<text>한&#160;음절</text>',expected:'한\u00a0음절'},
 {id:'split-amp',parts:'<text>&#38;</text><text>#233;</text>',expected:'&#233;'},
 {id:'escaped-literal',parts:'<text>caf&amp;#233;</text>',expected:'caf&#233;'},
 {id:'cdata-literal',parts:'<text><![CDATA[caf&#233;]]></text>',expected:'caf&#233;'},
 {id:'mixed-cdata',parts:'<text><![CDATA[&#233;]]>&#233;</text>',expected:'&#233;é'},
 {id:'verse-reference',parts:'<text>원문</text>',expected:'원문',number:'&#49;'}
] as const
export type XmlCharacterCase = typeof xmlCharacterCases[number]
const escape=(value:string)=>value.replaceAll('&','&amp;').replaceAll('<','&lt;')
export function createXmlCharacterFixture(example:XmlCharacterCase,scalar=false):string {
 const seed=createLyricVisibilityFixture('default'),target='<lyric number="1"><syllabic>single</syllabic><text>첫 절</text></lyric>'
 if(!seed.includes(target))throw Error('Synthetic character owner missing')
 const number=scalar?'1':'number' in example?example.number:'1',parts=scalar?'<text>'+escape(example.expected)+'</text>':example.parts
 return seed.replace(target,'<lyric number="'+number+'"><syllabic>single</syllabic>'+parts+'</lyric>')
}
