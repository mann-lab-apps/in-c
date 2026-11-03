import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { createNativeProject, encodeNativeProject } from '../../../project/schema'
import { createMidiWarningScore, midiWarningRestOracle } from '../../../testing/midi-warning-fixture'
import { serializeMidi, serializeMidiWithReport } from './serialize-midi'

beforeAll(() => {
  const out = process.env.DDIRORI_MIDI_WARNING_QA_DIR
  if (!out) return
  for (const sign of ['percussion','tab'] as const) {
    const score = createMidiWarningScore(sign), dir = join(out,sign)
    mkdirSync(dir,{recursive:true})
    writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(createNativeProject(score)))
    writeFileSync(join(dir,'expected.mid'),serializeMidi(midiWarningRestOracle(score)))
    writeFileSync(join(dir,'warnings.json'),JSON.stringify(serializeMidiWithReport(score).warnings,null,2))
  }
})

describe.each(['percussion','tab'] as const)('MIDI warning mixed-staff policy %s', sign => {
  it('skips only the unsupported measure and preserves later supported music and source', () => {
    const score = createMidiWarningScore(sign), before = structuredClone(score)
    const report = serializeMidiWithReport(score)
    expect(report.warnings).toHaveLength(1)
    expect(report.warnings[0]).toMatchObject({code:'unsupported-midi-clef',path:'part[2].staff[1].measure[1].clef'})
    expect(report.bytes).toEqual(serializeMidi(midiWarningRestOracle(score)))
    expect(score).toEqual(before)
  })
})
