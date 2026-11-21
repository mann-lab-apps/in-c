import { expect, it } from 'vitest'
import { createMeasureStyleFixture, measureStyleCases } from '../testing/measure-style-fixture'
import { parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'

const prefixes = ['Unrepresented beat repeat ', 'Unrepresented slash notation ']
const warnings = (xml: string) => parseMusicXmlWithReport(xml).report.warnings.filter(w => prefixes.some(p => w.message.startsWith(p)))
const facts = (message: string) => JSON.parse(message.slice(prefixes.find(p => message.startsWith(p))!.length).split(' is not retained')[0])

it.each(measureStyleCases)('diagnoses original style occurrences and preserves explicit music: $id', spec => {
  const xml = createMeasureStyleFixture(spec), plain = createMeasureStyleFixture(spec, false)
  const score = parseMusicXmlWithReport(xml).score, control = parseMusicXmlWithReport(plain).score
  expect(score).toEqual(control)
  expect(createPlaybackTimeline(score)).toEqual(createPlaybackTimeline(control))
  expect(serializeMidi(score)).toEqual(serializeMidi(control))
  const native = encodeNativeProject(createNativeProject(score))
  expect(native).toBe(encodeNativeProject(createNativeProject(control)))
  expect(decodeNativeProject(native).score).toEqual(score)
  const copy = serializeMusicXml(score)
  expect(copy).toBe(serializeMusicXml(control))
  expect(copy).not.toContain('measure-style')
  expect(serializeMidi(parseMusicXmlWithReport(copy).score)).toEqual(serializeMidi(score))
  expect(warnings(copy)).toEqual([])
  const found = warnings(xml)
  expect(found).toHaveLength(2)
  expect(found[0]).toMatchObject({ code: 'unsupported-notation', partNumber: 1, measureNumber: 2,
    path: `part[1].measure[2].attributes[1].measure-style[1].${spec.kind}[1]` })
  expect(found[1]).toMatchObject({ measureNumber: 3,
    path: `part[1].measure[3].attributes[1].measure-style[1].${spec.kind}[1]` })
  expect(facts(found[0].message)).toEqual(spec.id === 'beat-repeat'
    ? { type: 'start', slashes: '2', useDots: 'yes', slashType: 'eighth', slashDots: 1 }
    : spec.id === 'slash-rhythm' ? { type: 'start', useStems: 'yes', slashType: 'quarter' }
      : { type: 'start', useStems: 'no', useDots: 'yes' })
  expect(facts(found[1].message)).toEqual({ type: 'stop' })
})

it.each(['beat-repeat', 'slash'] as const)('retains raw staff, no, dots and ordered excluded voices without injecting defaults: %s', kind => {
  const spec = measureStyleCases.find(s => s.kind === kind)!
  const attrs = kind === 'beat-repeat' ? 'slashes="3" use-dots="no"' : 'use-stems="no" use-dots="no"'
  const mark = `<${kind} type="start" ${attrs}><slash-type>16th</slash-type><slash-dot/><slash-dot/><except-voice>2</except-voice><except-voice>solo</except-voice></${kind}>`
  const xml = createMeasureStyleFixture(spec).replaceAll('<measure-style>', '<measure-style number="1">').replace(spec.start, mark)
  const found = warnings(xml)
  expect(found).toHaveLength(2)
  expect(facts(found[0].message)).toEqual({ type: 'start', staff: '1', useDots: 'no',
    ...(kind === 'beat-repeat' ? { slashes: '3' } : { useStems: 'no' }),
    slashType: '16th', slashDots: 2, exceptVoices: ['2', 'solo'] })
  expect(facts(found[1].message)).toEqual({ type: 'stop', staff: '1' })
  const omitted = xml.replace(mark, `<${kind} type="start"/>`)
  expect(facts(warnings(omitted)[0].message)).toEqual({ type: 'start', staff: '1' })
})

it('keeps different style container paths in XML order', () => {
  const xml = createMeasureStyleFixture().replace('</measure-style>', '</measure-style><measure-style><slash type="start" use-stems="yes"/></measure-style>')
  expect(warnings(xml).map(w => w.path)).toEqual([
    'part[1].measure[2].attributes[1].measure-style[1].beat-repeat[1]',
    'part[1].measure[2].attributes[1].measure-style[2].slash[1]',
    'part[1].measure[3].attributes[1].measure-style[1].beat-repeat[1]'
  ])
})

it('does not report ordinary explicit notes as repeat or slash style', () => {
  for (const spec of measureStyleCases) expect(parseMusicXmlWithReport(createMeasureStyleFixture(spec, false)).report.warnings).toEqual([])
})
