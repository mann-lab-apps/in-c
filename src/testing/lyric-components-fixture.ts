import { createLyricVisibilityFixture } from './lyric-visibility-fixture'

export const lyricComponentCases = [
  {id:'korean',components:'<text>사</text><text>랑</text>',expected:'사랑'},
  {id:'formatted',components:'<text font-style="italic">ca</text><text font-weight="bold">fé</text>',expected:'café'},
  {id:'boundary-space',components:'<text>좋은 </text><text>날</text>',expected:'좋은 날'},
  {id:'double-space',components:'<text>한  </text><text>번</text>',expected:'한  번'},
  {id:'leading-next-space',components:'<text>기쁜</text><text> 날</text>',expected:'기쁜 날'},
  {id:'empty-fragment',components:'<text></text><text>사랑</text>',expected:'사랑'},
  {id:'default-elision',components:'<text>한</text><elision/><text>음절</text>',expected:'한 음절'},
  {id:'single',components:'<text>두 단어</text>',expected:'두 단어'},
  {id:'three-fragments',components:'<text>한</text><text>글</text><text>자</text>',expected:'한글자'},
  {id:'entity',components:'<text>A&amp;</text><text>B</text>',expected:'A&B'}
] as const
export type LyricComponentCase=typeof lyricComponentCases[number]
const escape=(text:string)=>text.replaceAll('&','&amp;').replaceAll('<','&lt;')
export function createLyricComponentsFixture(example:LyricComponentCase,scalar=false): string {
  const seed=createLyricVisibilityFixture('default')
  const target='<lyric number="1"><syllabic>single</syllabic><text>첫 절</text></lyric>'
  if(!seed.includes(target))throw Error('Synthetic lyric components owner missing')
  return seed.replace(target,`<lyric number="1"><syllabic>single</syllabic>${scalar?'<text>'+escape(example.expected)+'</text>':example.components}</lyric>`)
}
