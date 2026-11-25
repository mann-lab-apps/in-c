import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'

const control = readFileSync(new URL('./fixtures/hairpin-continuation.musicxml', import.meta.url), 'utf8')
const middleSystem = '<print new-system="yes"/>'

it.each([
  { label: 'a plain marker', attributes: '' },
  { label: 'a marker with geometry and line styling', attributes: ' spread="18" default-y="-44" line-type="dashed"' }
])('imports the complete hairpin around $label', ({ attributes }) => {
  const baseline = parseMusicXmlWithReport(control)
  const input = control.replace(middleSystem, `${middleSystem}
      <direction><direction-type><wedge type="continue" number="2"${attributes}/></direction-type><voice>1</voice></direction>`)
  const { score, report } = parseMusicXmlWithReport(input)
  expect(score).toEqual(baseline.score)
  expect(score.hairpins).toHaveLength(1)
  expect(score.layout?.systemBreakBeforeMeasureIds).toHaveLength(2)
  expect(createPlaybackTimeline(score)).toEqual(createPlaybackTimeline(baseline.score))
  expect(serializeMidi(score)).toEqual(serializeMidi(baseline.score))
  const native = decodeNativeProject(encodeNativeProject(createNativeProject(score))).score
  expect(native).toEqual(baseline.score)
  const output = serializeMusicXml(native)
  expect(output).toBe(serializeMusicXml(baseline.score))
  expect(parseMusicXmlWithReport(output).report.warnings).toEqual([])

  if (!attributes) {
    expect(report.warnings).toEqual([])
    return
  }
  expect(report.warnings).toEqual([{
    code: 'unsupported-direction',
    partNumber: 1,
    measureNumber: 2,
    path: 'part[1].measure[2].direction[1].direction-type[1].wedge',
    message: expect.stringContaining('Unrepresented hairpin continuation appearance ')
  }])
  expect(report.warnings[0].message).toContain('"spread":"18"')
  expect(report.warnings[0].message).toContain('"default-y":"-44"')
  expect(report.warnings[0].message).toContain('"line-type":"dashed"')
})
