import { createStemlessFixture } from './stemless-fixture'

export type LyricVisibilityKind =
  | 'verse-hidden' | 'note-lyrics-hidden' | 'note-hidden'
  | 'verse-visible-override' | 'note-visible-override' | 'note-print-lyric-override'
  | 'mixed-verses' | 'verse-hidden-override' | 'padded-token' | 'default' | 'explicit-visible' | 'no-lyrics'

// Only generated source: ordinary pitched notes with two supported text verses.
export function createLyricVisibilityFixture(kind: LyricVisibilityKind = 'verse-hidden'): string {
  const seed = createStemlessFixture({value:'whole',stem:'omitted',partCount:2,targetPart:2,targetMeasure:2})
  const target = seed.indexOf('<measure number="2">', seed.indexOf('<part id="P2">'))
  const start = seed.indexOf('<note>', target)
  const end = seed.indexOf('</note>', start)
  if (start < 0 || end < 0) throw Error('Synthetic lyric owner missing')
  const noteAttributes: Partial<Record<LyricVisibilityKind,string>> = {
    'note-lyrics-hidden':' print-lyric="no"',
    'verse-hidden-override':' print-lyric="yes"',
    'note-hidden':' print-object="no"',
    'verse-visible-override':' print-lyric="no"',
    'note-visible-override':' print-object="no"',
    'note-print-lyric-override':' print-object="no" print-lyric="yes"',
    'mixed-verses':' print-lyric="no"',
    'no-lyrics':' print-lyric="no"'
  }
  const noteAttrs = noteAttributes[kind] ?? ''
  const verseAttr = (index:number) => {
    if (kind==='verse-hidden' || kind==='verse-hidden-override') return ' print-object="no"'
    if (kind==='padded-token') return ' print-object=" no "'
    if (['explicit-visible','verse-visible-override','note-visible-override'].includes(kind)) return ' print-object="yes"'
    if (kind==='mixed-verses' && index===1) return ' print-object="yes"'
    return ''
  }
  const lyrics = kind==='no-lyrics' ? '' : [1,2].map(i =>
    `<lyric number="${i}"${verseAttr(i)}><syllabic>single</syllabic><text>${i===1?'첫 절':'둘째 절'}</text></lyric>`).join('')
  return seed.slice(0,start)+'<note'+noteAttrs+'>'+seed.slice(start+6,end)+lyrics+seed.slice(end)
}

export function createRepeatedLyricVisibilityFixture(): string {
  const seed=createLyricVisibilityFixture('verse-hidden')
  return seed.replace(/<part id="P2">[\s\S]*?<\/part>/, part => {
    const target=part.match(/<measure number="2">[\s\S]*?<\/measure>/)?.[0]
    if (!target) throw Error('Repeated lyric owner missing')
    return part.replace(target,Array.from({length:15},(_,i)=>target.replace('number="2"',`number="${i+2}"`)).join(''))
  })
}
