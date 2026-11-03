export function lyricDisplayText(lyric: {text:string;syllabic?:string;extend?:boolean}): string {
  return `${lyric.text}${lyric.syllabic==='begin'||lyric.syllabic==='middle'?'-':''}${lyric.extend?'_':''}`
}
