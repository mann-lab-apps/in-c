import { createHarmonyDegreeFixture } from './harmony-degree-fixture'

export type RelativeHarmonyFixtureKind = 'function' | 'numeral' | 'numeral-key' | 'mixed' | 'absolute' | 'none'
export function createRelativeHarmonyFixture(kind: RelativeHarmonyFixtureKind = 'function'): string {
  const base = createHarmonyDegreeFixture(kind === 'none' ? 'none' : 'control')
    .replace('코드 구성음 보존 조사', '상대 화성 보존 조사')
    .replace(/<divisions>4<\/divisions>/g, '<divisions>4</divisions><key><fifths>0</fifths><mode>major</mode></key>')
  if (kind === 'absolute' || kind === 'none') return base
  const anchor = kind === 'function' || kind === 'mixed' ? '<function>V</function>'
    : kind === 'numeral' ? '<numeral><numeral-root text="V">5</numeral-root></numeral>'
      : '<numeral><numeral-root text="5">5</numeral-root><numeral-alter>-1</numeral-alter><numeral-key><numeral-fifths>1</numeral-fifths><numeral-mode>minor</numeral-mode></numeral-key></numeral>'
  const source = base.replace('<root><root-step>C</root-step></root>', anchor)
    .replace('<kind>dominant</kind>', `<kind text="${kind === 'numeral-key' ? 'b5m7' : 'V7'}">dominant</kind>`)
  return kind === 'mixed' ? source.replace('</harmony>', '</harmony><harmony><root><root-step>G</root-step></root><kind>minor</kind></harmony>') : source
}
