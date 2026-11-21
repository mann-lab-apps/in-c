import { createLyricVisibilityFixture } from './lyric-visibility-fixture'
export const lyricElisionCases = [
 {id:'none',parts:'<text>한 음절</text>',values:[]},
 {id:'default',parts:'<text>한</text><elision/><text>음절</text>',values:[]},
 {id:'underscore',parts:'<text>한</text><elision>_</elision><text>음절</text>',values:['_']},
 {id:'undertie',parts:'<text>한</text><elision>‿</elision><text>음절</text>',values:['‿']},
 {id:'nbsp',parts:'<text>한</text><elision>\u00a0</elision><text>음절</text>',values:['\u00a0']},
 {id:'nbsp-reference',parts:'<text>한</text><elision>&#160;</elision><text>음절</text>',values:['\u00a0']},
 {id:'escaped-reference',parts:'<text>한</text><elision>&amp;#160;</elision><text>음절</text>',values:['&#160;']},
 {id:'smufl',parts:'<text>한</text><elision smufl="lyricsElisionNarrow"/><text>음절</text>',values:['lyricsElisionNarrow']},
 {id:'text-priority',parts:'<text>한</text><elision smufl="lyricsElisionNarrow">_</elision><text>음절</text>',values:['_']},
 {id:'multiple',parts:'<text>한</text><elision>_</elision><text>둘</text><elision>‿</elision><text>셋</text>',values:['_','‿']},
 {id:'second-verse',parts:'<text>두</text><elision>_</elision><text>음절</text>',values:['_']}
] as const
export type LyricElisionCase = typeof lyricElisionCases[number]
export function createLyricElisionFixture(example:LyricElisionCase):string {
 const verse=example.id==='second-verse'?2:1,seed=createLyricVisibilityFixture('default')
 const target='<lyric number="'+verse+'"><syllabic>single</syllabic><text>'+(verse===1?'첫 절':'둘째 절')+'</text></lyric>'
 if(!seed.includes(target))throw Error('Synthetic lyric owner missing')
 return seed.replace(target,'<lyric number="'+verse+'"><syllabic>single</syllabic>'+example.parts+'</lyric>')
}
export const plainLyricElisionControl=(xml:string)=>xml.replace(/<elision\b[^>]*\/>|<elision\b[^>]*>[\s\S]*?<\/elision>/g,'<elision/>')
