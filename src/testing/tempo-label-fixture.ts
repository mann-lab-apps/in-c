// Owned scores, not external app/user fixtures. Labels spell the existing UI contract.
import type { DurationValue, TempoMarking } from '../score-core'
import { createChordAccidentalMemoryScore, explicitChordMemoryOracle } from './chord-accidental-memory-fixture'
export const tempoSymbols = [
  ['whole','𝅝'],['half','𝅗𝅥'],['quarter','♩'],['eighth','♪'],['16th','𝅘𝅥𝅯'],['32nd','𝅘𝅥𝅰'],['64th','𝅘𝅥𝅱']
] as const satisfies readonly (readonly [DurationValue,string])[]
export const tempoLabelCases: { name: string; tempo: TempoMarking; expectedText: string }[] = [
  { name:'quarter-absent',tempo:{bpm:96},expectedText:'♩ = 96' },
  { name:'quarter-empty',tempo:{bpm:96,text:''},expectedText:'♩ = 96' },
  { name:'eighth-absent',tempo:{bpm:96,beatUnit:'eighth'},expectedText:'♪ = 96' },
  { name:'dotted-quarter',tempo:{bpm:96,beatUnit:'quarter',dots:1},expectedText:'♩. = 96' },
  { name:'half-absent',tempo:{bpm:96,beatUnit:'half'},expectedText:'𝅗𝅥 = 96' },
  { name:'explicit-words',tempo:{bpm:96,beatUnit:'quarter',text:'Andante espressivo'},expectedText:'Andante espressivo' }
]
export function tempoLabelFixture(index: number) {
  const contract = tempoLabelCases[index]!
  const source = createChordAccidentalMemoryScore()
  source.title = `Tempo label ${contract.name}`
  source.tempo = structuredClone(contract.tempo)
  return { source, explicit: explicitChordMemoryOracle(source), ...contract }
}
