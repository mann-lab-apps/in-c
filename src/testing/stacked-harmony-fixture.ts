import { createHarmonyDegreeFixture } from './harmony-degree-fixture'
export type StackedHarmonyFixtureKind = 'vertical' | 'triple' | 'diagonal' | 'default' | 'single' | 'separate'
export const stackedHarmonyRoots = (kind: StackedHarmonyFixtureKind) => kind === 'triple' ? ['C', 'D', 'F'] : kind === 'single' ? ['C'] : ['C', 'D']
export function createStackedHarmonyFixture(kind: StackedHarmonyFixtureKind): string {
  const group = (step: string, chordKind: string) => `<root><root-step>${step}</root-step></root><kind>${chordKind}</kind>`
  const entries = stackedHarmonyRoots(kind).map((step, i) => group(step, ['major', 'minor', 'dominant'][i]))
  const source = createHarmonyDegreeFixture('control').replace('코드 구성음 보존 조사', '겹친 화음 보존 조사')
  if (kind === 'separate') return source.replace('<harmony>' + group('C', 'dominant') + '</harmony>', entries.map(g => `<harmony>${g}</harmony>`).join(''))
  return source.replace(group('C', 'dominant'), entries.join(''))
    .replace('<harmony>', `<harmony${kind === 'default' || kind === 'single' ? '' : ` arrangement="${kind === 'diagonal' ? 'diagonal' : 'vertical'}"`}>`)
}
export function removeHarmonyContainers(xml: string): string {
  return xml.replace(/<harmony(?:\s[^>]*)?>[\s\S]*?<\/harmony>/g, '')
}
