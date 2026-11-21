import { createWordsPositionFixture } from './words-position-fixture'
export const expressionPositionCases = ['implicit-mid', 'offset-start', 'divisions4', 'relative-negative', 'fractional', 'backup-forward', 'cancel-relative', 'inherited-divisions', 'origin-control', 'studio-divisions-control', 'repeat-mid'] as const
export type ExpressionPositionCase = typeof expressionPositionCases[number]

export function createExpressionPositionFixture(kind: ExpressionPositionCase) {
  const sourceKind = kind === 'divisions4' || kind === 'inherited-divisions' ? 'staff-divisions4'
    : kind === 'relative-negative' ? 'staff-offset-mid-negative'
    : kind === 'backup-forward' ? 'staff-cursor-backup-forward'
    : kind === 'cancel-relative' ? 'staff-cancel-control'
    : kind === 'implicit-mid' || kind === 'repeat-mid' ? 'staff-mid'
    : kind === 'origin-control' ? 'staff-zero-control' : 'staff-offset-start'
  const base = createWordsPositionFixture(sourceKind)
  let xml = base.xml.replace(/<direction>/g, '<direction placement="below">').replace(/<words>/g, '<words font-style="italic">').replace('보표 글자 원본 시점', '표현 글자 원본 시점')
  let beat = base.beat
  if (kind === 'fractional') { xml = xml.replace('<offset>1</offset>', '<offset>0.5</offset>'); beat = 0.5 }
  if (kind === 'studio-divisions-control') xml = xml.replace('<divisions>1</divisions>', '<divisions>13440</divisions>').replace(/<duration>2<\/duration>/g, '<duration>26880</duration>').replace('<offset>1</offset>', '<offset>13440</offset>')
  if (kind === 'inherited-divisions') {
    const attrs = xml.match(/<attributes>[\s\S]*?<\/attributes>/)![0]
    xml = xml.replace('<measure number="7">' + attrs, `<measure number="6">${attrs}<note><rest/><duration>16</duration><type>whole</type></note></measure><measure number="7">`)
  }
  if (kind === 'repeat-mid') xml = xml.replace('</attributes>', '</attributes><barline location="left"><repeat direction="forward"/></barline>').replace('</measure>', '<barline location="right"><repeat direction="backward" times="2"/></barline></measure>')
  return { kind, xml, beat, tick: beat * 13440, text: 'dolce' }
}
