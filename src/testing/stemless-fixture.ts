// Synthetic notation-loss fixture only, never a user document.
export function createStemlessFixture({ value = 'quarter', stem = 'none', owner = 'main', partCount = 1, targetPart = 1, targetMeasure = 1 }: {
  value?: 'eighth' | 'quarter' | 'half' | 'whole'; stem?: 'none' | 'up' | 'down' | 'omitted'
  owner?: 'main' | 'chord' | 'grace' | 'rest'; partCount?: number; targetPart?: number; targetMeasure?: number
} = {}) {
  const duration = { eighth: 1, quarter: 2, half: 4, whole: 8 }[value]
  const pitch = (step: string) => `<pitch><step>${step}</step><octave>4</octave></pitch>`
  const stemXml = stem === 'omitted' ? '' : `<stem>${stem}</stem>`
  const parts = Array.from({ length: partCount }, (_, p) => `<part id="P${p + 1}">${[1, 2].map(m => {
    const active = p + 1 === targetPart && m === targetMeasure
    const principal = `<note>${active && owner === 'rest' ? '<rest/>' : pitch('C')}<duration>${duration}</duration><type>${value}</type>${active && ['main', 'rest'].includes(owner) ? stemXml : ''}</note>`
    const grace = active && owner === 'grace' ? `<note><grace slash="yes"/>${pitch('G')}<type>eighth</type>${stemXml}</note>` : ''
    const chord = active && owner === 'chord' ? `<note><chord/>${pitch('E')}<duration>${duration}</duration><type>${value}</type>${stemXml}</note>` : ''
    const remainder = 8 - duration, rest = remainder ? `<note><rest/><duration>${remainder}</duration><type>half</type>${remainder === 7 ? '<dot/><dot/>' : remainder === 6 ? '<dot/>' : ''}</note>` : ''
    return `<measure number="${m}">${m === 1 ? '<attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>' : ''}${grace}${principal}${chord}${rest}</measure>`
  }).join('')}</part>`).join('')
  return `<?xml version="1.0"?><score-partwise version="4.0"><work><work-title>줄기 숨김 검증 ${value} ${owner}</work-title></work><part-list>${Array.from({ length: partCount }, (_, p) => `<score-part id="P${p + 1}"><part-name>Stem ${p + 1}</part-name></score-part>`).join('')}</part-list>${parts}</score-partwise>`
}
