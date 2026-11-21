// Owned source data for import-loss auditing, not a new text or accompaniment model.
export type FiguredBassFixtureKind='stacked'|'hidden'|'extend'|'empty'|'control'|'harmony'
export function createFiguredBassFixture(kind:FiguredBassFixtureKind='stacked'){
 const marks={
  stacked:'<figured-bass parentheses="yes"><figure><prefix>sharp</prefix><figure-number>6</figure-number></figure><figure><figure-number>5</figure-number><suffix>slash</suffix></figure><duration>8</duration></figured-bass>',
  hidden:'<figured-bass print-object="no" placement="below"><figure><figure-number>6</figure-number></figure></figured-bass>',
  extend:'<figured-bass><figure><figure-number>6</figure-number><extend type="start"/></figure></figured-bass>',
  empty:'<figured-bass><figure/></figured-bass>',control:'',
  harmony:'<harmony><root><root-step>C</root-step></root><kind>major</kind></harmony>'
 }
 const parts=[1,2].map(p=>`<part id="P${p}">${[1,2,3].map(b=>`<measure number="${b}">${b===1?'<attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>':''}${p===2&&b===2?marks[kind]:p===2&&b===3&&kind==='extend'?'<figured-bass><figure><extend type="stop"/></figure></figured-bass>':''}<note><pitch><step>${p===1?'C':'D'}</step><octave>4</octave></pitch><duration>16</duration><type>whole</type></note></measure>`).join('')}</part>`).join('')
 return `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><work><work-title>숫자저음 조사 ${kind}</work-title></work><part-list><score-part id="P1"><part-name>Flute 1</part-name></score-part><score-part id="P2"><part-name>Flute 2</part-name></score-part></part-list>${parts}</score-partwise>`
}
