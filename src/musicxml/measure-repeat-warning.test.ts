import { expect, it } from 'vitest'
import { createMeasureRepeatFixture, measureRepeatCases } from '../testing/measure-repeat-fixture'
import { parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../project/schema'

const repeatWarnings = (xml: string) => parseMusicXmlWithReport(xml).report.warnings.filter(w => w.message.startsWith('Unrepresented measure repeat '))
const facts = (message: string) => JSON.parse(message.slice('Unrepresented measure repeat '.length).split(' is not retained')[0])

it.each(measureRepeatCases)('reports each original repeat-style occurrence without reinterpreting notes: $id', spec => {
  const xml = createMeasureRepeatFixture(spec)
  const plain = createMeasureRepeatFixture(spec, { include: false })
  const { score } = parseMusicXmlWithReport(xml)
  const control = parseMusicXmlWithReport(plain).score
  expect(score).toEqual(control)
  expect(createPlaybackTimeline(score)).toEqual(createPlaybackTimeline(control))
  expect(serializeMidi(score)).toEqual(serializeMidi(control))
  const native = encodeNativeProject(createNativeProject(score))
  expect(native).toBe(encodeNativeProject(createNativeProject(control)))
  expect(decodeNativeProject(native).score).toEqual(score)
  const copy = serializeMusicXml(score)
  expect(copy).toBe(serializeMusicXml(control))
  expect(copy).not.toContain('measure-repeat')
  expect(serializeMidi(parseMusicXmlWithReport(copy).score)).toEqual(serializeMidi(score))
  expect(repeatWarnings(copy)).toEqual([])
  const warnings = repeatWarnings(xml)
  expect(warnings).toHaveLength(spec.stop === undefined ? 1 : 2)
  expect(warnings[0]).toMatchObject({ code: 'unsupported-notation', partNumber: 1, measureNumber: spec.start,
    path: `part[1].measure[${spec.start}].attributes[1].measure-style[1].measure-repeat[1]` })
  expect(facts(warnings[0].message)).toEqual({ type: 'start', count: String(spec.count), slashes: '1' })
  if (spec.stop !== undefined) {
    expect(warnings[1]).toMatchObject({ measureNumber: spec.stop,
      path: `part[1].measure[${spec.stop}].attributes[1].measure-style[1].measure-repeat[1]` })
    expect(facts(warnings[1].message)).toEqual({ type: 'stop' })
  }
})

it('retains explicit staff/slashes and distinguishes absent defaults and separate style containers', () => {
  const explicit = createMeasureRepeatFixture(measureRepeatCases[0], { staff: '1', slashes: '2' })
  const implicit = createMeasureRepeatFixture(measureRepeatCases[0], { slashes: 'omitted' })
  const combined = explicit.replace('</measure-style>', '</measure-style><measure-style><measure-repeat type="start">1</measure-repeat></measure-style>')
  const warnings = repeatWarnings(combined)
  expect(warnings).toHaveLength(3)
  expect(facts(warnings[0].message)).toEqual({ type: 'start', count: '1', slashes: '2', staff: '1' })
  expect(warnings[1].path).toBe('part[1].measure[2].attributes[1].measure-style[2].measure-repeat[1]')
  expect(facts(warnings[1].message)).toEqual({ type: 'start', count: '1' })
  expect(facts(repeatWarnings(implicit)[0].message)).toEqual({ type: 'start', count: '1' })
  expect(facts(repeatWarnings(explicit)[1].message)).toEqual({ type: 'stop', staff: '1' })
})

it('does not diagnose ordinary measures or a barline repeat as measure-repeat style', () => {
  const plain = createMeasureRepeatFixture(measureRepeatCases[0], { include: false })
  const barline = plain.replace('</measure>', '<barline location="left"><repeat direction="forward"/></barline></measure>')
  expect(repeatWarnings(plain)).toEqual([])
  expect(repeatWarnings(barline)).toEqual([])
})
