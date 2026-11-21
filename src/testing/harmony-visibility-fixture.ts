import { createHarmonyDegreeFixture } from './harmony-degree-fixture'

export type HarmonyVisibilityFixtureKind = 'hidden' | 'visible' | 'default' | 'mixed'
export function createHarmonyVisibilityFixture(kind: HarmonyVisibilityFixtureKind): string {
  const plain = createHarmonyDegreeFixture('control').replace('코드 구성음 보존 조사', '코드 표시 설정 보존 조사')
  if (kind === 'default') return plain
  const xml = plain.replace('<harmony>', `<harmony print-object="${kind === 'visible' ? 'yes' : 'no'}">`)
  return kind === 'mixed'
    ? xml.replace('</harmony>', '</harmony><harmony print-object="yes"><root><root-step>D</root-step></root><kind>minor</kind><offset>4</offset></harmony>')
    : xml
}
export function removeHarmonyVisibility(xml: string): string {
  return xml.replace(/(<harmony[^>]*?) print-object="(?:no|yes)"/g, '$1')
}
