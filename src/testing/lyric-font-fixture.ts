import { createLyricVisibilityFixture } from './lyric-visibility-fixture'
export type LyricFontKind='italic'|'bold'|'combined'|'fragmented'|'normalized'|'second-verse'|'default'|'normal'|'empty'
export function createLyricFontFixture(kind:LyricFontKind='italic'): string {
  const verse=kind==='second-verse'?2:1
  const target=`<lyric number="${verse}"><syllabic>single</syllabic><text>${verse===1?'첫 절':'둘째 절'}</text></lyric>`
  const parts:Record<LyricFontKind,string>={
    italic:'<text font-style="italic">사랑</text>',bold:'<text font-weight="bold">사랑</text>',
    combined:'<text font-style="italic" font-weight="bold">사랑</text>',
    fragmented:'<text font-style="italic">사</text><text font-weight="bold">랑</text>',
    normalized:'<text font-style=" italic " font-weight=" bold ">사랑</text>',
    'second-verse':'<text font-style="italic">둘째 절</text>',default:'<text>사랑</text>',
    normal:'<text font-style="normal" font-weight="normal">사랑</text>',
    empty:'<text font-style="italic"></text><text>사랑</text>'
  }
  const seed=createLyricVisibilityFixture('default')
  if(!seed.includes(target))throw Error('Synthetic lyric style owner missing')
  return seed.replace(target,`<lyric number="${verse}"><syllabic>single</syllabic>${parts[kind]}</lyric>`)
}
export function createRepeatedLyricFontFixture(): string {
  const seed=createLyricFontFixture('fragmented')
  return seed.replace(/<part id="P2">[\s\S]*?<\/part>/,part=>{
    const target=part.match(/<measure number="2">[\s\S]*?<\/measure>/)?.[0]
    if(!target)throw Error('Repeated font owner missing')
    return part.replace(target,Array.from({length:15},(_,i)=>target.replace('number="2"',`number="${i+2}"`)).join(''))
  })
}
