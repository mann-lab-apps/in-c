import { createFretboardFixture, stripFretboardFrames } from './fretboard-fixture'

export type HarmonyDegreeFixtureKind = 'add' | 'alter' | 'subtract' | 'multiple' | 'hidden' | 'diagram' | 'normalized' | 'control' | 'none'

export function createHarmonyDegreeFixture(kind: HarmonyDegreeFixtureKind = 'add'): string {
  const source = createFretboardFixture(kind === 'none' ? 'none' : kind === 'diagram' ? 'basic' : kind === 'normalized' ? 'normalized' : 'control')
    .replace('프렛보드 보존 조사', '코드 구성음 보존 조사')
    .replace('<kind>major</kind>', '<kind>dominant</kind>')
  const plain = kind === 'diagram' ? source : stripFretboardFrames(source)
  if (kind === 'control' || kind === 'none') return plain
  const degree = (value: number, alter: number, type: string, hidden = false) =>
    `<degree${hidden ? ' print-object="no"' : ''}><degree-value>${value}</degree-value><degree-alter>${alter}</degree-alter><degree-type>${type}</degree-type></degree>`
  const extra = kind === 'multiple' ? degree(9, 1, 'add') + degree(5, -1, 'alter') + degree(3, 0, 'subtract')
    : kind === 'alter' ? degree(5, -1, 'alter') : kind === 'subtract' ? degree(5, 0, 'subtract')
      : degree(9, 1, 'add', kind === 'hidden')
  const xml = plain.replace('</kind>', '</kind>' + extra)
  return kind === 'hidden' ? xml.replace('<kind>dominant</kind>', '<kind text="C7(#9)">dominant</kind>') : xml
}

export function stripHarmonyDegrees(xml: string): string {
  return xml.replace(/<degree(?:\s[^>]*)?>[\s\S]*?<\/degree>/g, '')
}
