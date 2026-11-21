// Owned MusicXML source audit. No new fretboard or guitar playback model.
export type FretboardFixtureKind='basic'|'barre'|'hidden'|'multiple'|'normalized'|'control'|'none'
export const stripFretboardFrames=(xml:string)=>xml.replace(/<frame(?:\s[^>]*)?>[\s\S]*?<\/frame>/g,'')
export function createFretboardFixture(kind:FretboardFixtureKind='basic'){
 const basic='<frame><frame-strings>6</frame-strings><frame-frets>4</frame-frets><frame-note><string>3</string><fret>0</fret></frame-note><frame-note><string>2</string><fret>1</fret><fingering>1</fingering></frame-note></frame>'
 const barre='<frame unplayed="x"><frame-strings>6</frame-strings><frame-frets>5</frame-frets><first-fret>3</first-fret><frame-note><string>6</string><fret>3</fret><barre type="start"/></frame-note><frame-note><string>1</string><fret>3</fret><barre type="stop"/></frame-note></frame>'
 const chord=(frame=true)=>`<harmony${kind==='hidden'?' print-frame="no"':''}><root><root-step>C</root-step></root><kind>major</kind>${frame?(kind==='barre'?barre:basic):''}</harmony>`
 const parts=[1,2].map(p=>`<part id="P${p}">${[1,2,3].map(b=>`<measure number="${kind==='normalized'&&p===2&&b===2?'intro':b}">${b===1?'<attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>':''}${p===2&&b===2&&kind!=='none'?chord(kind!=='control')+(kind==='multiple'?chord():''):kind==='multiple'&&p===1&&b===3?chord():''}<note><pitch><step>${p===1?'C':'D'}</step><octave>4</octave></pitch><duration>16</duration><type>whole</type></note></measure>`).join('')}</part>`).join('')
 return `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><work><work-title>프렛보드 보존 조사</work-title></work><part-list><score-part id="P1"><part-name>Flute 1</part-name></score-part><score-part id="P2"><part-name>Flute 2</part-name></score-part></part-list>${parts}</score-partwise>`
}
