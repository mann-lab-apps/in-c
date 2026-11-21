export const wordsPositionCases = ['staff-mid', 'system-mid', 'staff-offset-start', 'staff-offset-mid-negative', 'staff-divisions4', 'staff-cursor-backup-forward', 'staff-zero-control', 'staff-cancel-control', 'system-zero-control', 'expression-zero-control'] as const
export type WordsPositionCase = typeof wordsPositionCases[number]

export function createWordsPositionFixture(kind: WordsPositionCase) {
  const scope = kind.startsWith('system') ? 'system' : kind.startsWith('expression') ? 'expression' : 'staff'
  const mid = ['staff-mid', 'system-mid', 'staff-offset-mid-negative', 'staff-cursor-backup-forward', 'staff-cancel-control'].includes(kind)
  const divisions = kind === 'staff-divisions4' ? 4 : 1
  const offset = kind === 'staff-offset-start' ? 1 : kind === 'staff-offset-mid-negative' ? -1 : kind === 'staff-divisions4' ? 4 : kind === 'staff-cancel-control' ? -2 : kind.endsWith('zero-control') && scope !== 'system' ? 0 : undefined
  const backup = kind === 'staff-cursor-backup-forward' ? 1 : 0
  const beat = (mid ? 2 : 0) - backup + (offset ?? 0) / divisions
  const note = (step: string) => `<note><pitch><step>${step}</step><octave>4</octave></pitch><duration>${2 * divisions}</duration><type>half</type></note>`
  const direction = `<direction${scope === 'system' ? ' system="only-top"' : scope === 'expression' ? ' placement="below"' : ''}><direction-type><words${scope === 'expression' ? ' font-style="italic"' : ''}>dolce</words></direction-type>${offset === undefined ? '' : `<offset>${offset}</offset>`}${scope === 'expression' ? '<voice>1</voice>' : ''}</direction>`
  const attrs = `<attributes><divisions>${divisions}</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>`
  const body = attrs + (mid ? note('C') + (backup ? `<backup><duration>${backup * divisions}</duration></backup>` : '') + direction + (backup ? `<forward><duration>${backup * divisions}</duration></forward>` : '') + note('D') : direction + note('C') + note('D'))
  const wrap = (content: string) => `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><work><work-title>보표 글자 원본 시점</work-title></work><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1"><measure number="7">${content}</measure></part></score-partwise>`
  return {kind, scope, beat, offset, xml: wrap(body), plain: wrap(attrs + direction.replace(/<offset>.*?<\/offset>/, '') + note('C') + note('D')), path: 'part[1].measure[7].direction[1].direction-type[1].words'}
}
