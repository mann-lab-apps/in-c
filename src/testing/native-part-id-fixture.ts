import { parseMusicXml } from '../musicxml'
import type { Score } from '../score-core'

/** Keep all non-part IDs ordinary and unique; only the Native part ID is under test. */
export function createNativePartIdFixture(ids: string[]): Score {
  const source = parseMusicXml(`<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0"><work><work-title>Native part identifiers</work-title></work>
<part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
<part id="P1"><measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
<note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>
</measure></part></score-partwise>`)
  return { ...source, parts: ids.map((id, index) => {
    const part = JSON.parse(JSON.stringify(source.parts[0], (key, value) =>
      key === 'id' ? `Fixture${index + 1}-${value}` : value)) as Score['parts'][number]
    return { ...part, id, name: `Piano ${index + 1}` }
  }) }
}
