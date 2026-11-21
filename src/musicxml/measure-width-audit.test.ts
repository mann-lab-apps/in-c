import { expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createStemlessFixture } from '../testing/stemless-fixture'
import { parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

// Characterizes a documented unsupported layout hint, not a preservation claim.
// Adding authored width support or a width-warning policy is a separate design scope.
it.each([180, 360])('audits discarded MusicXML global measure width %s separately from musical/native preservation', width => {
  const control = createStemlessFixture({ value: 'whole', stem: 'omitted' })
  const input = control.replace('<measure number="1">', `<measure number="1" width="${width}">`)
  expect(input).not.toBe(control)
  const baseline = parseMusicXmlWithReport(control), observed = parseMusicXmlWithReport(input)
  expect(observed.score).toEqual(baseline.score)
  expect(observed.report).toEqual(baseline.report)
  const native = createNativeProject(observed.score)
  expect(decodeNativeProject(encodeNativeProject(native))).toEqual(native)
  const copy = serializeMusicXml(observed.score)
  expect(copy).not.toMatch(/<measure\b[^>]*\bwidth=/)
  expect(serializeMidi(observed.score)).toEqual(serializeMidi(baseline.score))
  expect(serializeMidi(parseMusicXmlWithReport(copy).score)).toEqual(serializeMidi(observed.score))
  const directory = process.env.STUDIO_MEASURE_WIDTH_AUDIT_DIR
  if (directory) {
    mkdirSync(directory, { recursive: true })
    writeFileSync(join(directory, `width-${width}.musicxml`), input)
    writeFileSync(join(directory, `width-${width}-copy.musicxml`), copy)
    writeFileSync(join(directory, `width-${width}.json`), JSON.stringify({ width, inputReport: observed.report, controlReport: baseline.report, scope: 'Layout width omitted; model/native/MIDI equal, not visual or external-consumer approval' }, null, 2))
    writeFileSync(join(directory, 'control.musicxml'), control)
  }
})
