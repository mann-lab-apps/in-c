export function makeNavigationSoundXml(options: {
  attribute?: string; value?: string; container?: 'direction' | 'direct'; partCount?: number; targetPart?: number; targetMeasure?: number; wordsOnly?: boolean
} = {}) {
  const { attribute = 'dacapo', value = 'yes', container = 'direction', partCount = 2, targetPart = partCount, targetMeasure = 2, wordsOnly = false } = options
  const escape = (s: string) => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
  const attrs = '<attributes><divisions>4</divisions><key><fifths>0</fifths><mode>major</mode></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>'
  const sound = wordsOnly || attribute === '' ? '' : `<sound ${attribute}="${escape(value)}"/>`
  const direction = container === 'direct' && !wordsOnly ? sound : `<direction><direction-type><words>D.C. al Fine</words></direction-type>${sound}</direction>`
  const parts = Array.from({ length: partCount }, (_, p) => `<part id="P${p + 1}">${[1, 2].map(n => `<measure number="${n}">${n === 1 ? attrs : ''}<note><pitch><step>${p === 0 ? (n === 1 ? 'C' : 'D') : (n === 1 ? 'E' : 'F')}</step><octave>4</octave></pitch><duration>16</duration><type>whole</type></note>${p + 1 === targetPart && n === targetMeasure ? direction : ''}</measure>`).join('')}</part>`).join('')
  return `<?xml version="1.0" encoding="utf-8"?><score-partwise version="4.0"><work><work-title>재생 이동 안내 검증 ${escape(attribute)}</work-title></work><part-list>${Array.from({ length: partCount }, (_, p) => `<score-part id="P${p + 1}"><part-name>Part ${p + 1}</part-name></score-part>`).join('')}</part-list>${parts}</score-partwise>`
}
