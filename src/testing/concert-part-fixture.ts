export function concertPartFixture(partSettings: string, defaults = '<defaults><concert-score/></defaults>') {
  return `<score-partwise version="4.0">
    ${defaults}
    <part-list><score-part id="P1"><part-name>Clarinet</part-name></score-part></part-list>
    <part id="P1"><measure number="1">
      <attributes><divisions>1</divisions><time><beats>1</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>${partSettings}
      </attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    </measure></part>
  </score-partwise>`
}

export const concertPartSettings = '<for-part number="1"><part-clef><sign>F</sign><line>4</line></part-clef>' +
  '<part-transpose><diatonic>-1</diatonic><chromatic>-2</chromatic></part-transpose></for-part>'
