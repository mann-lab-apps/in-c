import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { parseMusicXml, serializeMusicXml } from './index'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createChordAccidentalMemoryScore } from '../testing/chord-accidental-memory-fixture'
import { tempoSymbols, tempoLabelCases, tempoLabelFixture } from '../testing/tempo-label-fixture'

beforeAll(() => {
  const out = process.env.DDIRORI_TEMPO_LABEL_QA_DIR
  if (!out) return
  tempoLabelCases.forEach((contract,index) => {
    const {source,explicit} = tempoLabelFixture(index),dir=join(out,contract.name)
    mkdirSync(dir,{recursive:true})
    writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(createNativeProject(source)))
    writeFileSync(join(dir,'expected.mid'),serializeMidi(explicit))
    writeFileSync(join(dir,'contract.json'),JSON.stringify({title:source.title,tempoText:contract.expectedText,tempo:contract.tempo,parsedTempo:{...contract.tempo,beatUnit:contract.tempo.beatUnit ?? 'quarter',dots:contract.tempo.dots ?? 0,text:contract.expectedText}},null,2))
  })
})
describe('tempo.label roundtrip', () => {
  for (const [beatUnit,symbol] of tempoSymbols) for (const dots of [0,1,2]) {
    it(`${beatUnit} dots${dots} derives the same visible label without explicit words`, () => {
      const score=createChordAccidentalMemoryScore();score.tempo={bpm:96,beatUnit,dots}
      const before=structuredClone(score),parsed=parseMusicXml(serializeMusicXml(score))
      expect(parsed.tempo).toEqual({bpm:96,beatUnit,dots,text:`${symbol}${'.'.repeat(dots)} = 96`})
      expect(serializeMidi(parsed)).toEqual(serializeMidi(score))
      expect(score).toEqual(before)
    })
  }
  it('preserves explicit words and transparent status independently of default label generation', () => {
    const score=createChordAccidentalMemoryScore();score.tempo={bpm:96,beatUnit:'half',dots:1,text:'Andante espressivo',transparent:true}
    expect(parseMusicXml(serializeMusicXml(score)).tempo).toEqual(score.tempo)
  })
})
