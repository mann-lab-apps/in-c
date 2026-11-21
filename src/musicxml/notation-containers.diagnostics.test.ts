import { expect, it } from 'vitest'
import { createNotationContainerFixture as fixture } from '../testing/notation-container-fixture'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'

const technical = '<technical><fingering>1</fingering></technical>'
const art = (body: string) => `<articulations>${body}</articulations>`
const orn = (body: string) => `<ornaments>${body}</ornaments>`
const base = 'part[1].measure[1].note[1].notations'

it.each([
  { body: technical + technical, control: [technical, technical], paths: [`${base}.technical[1]`, `${base}.technical[2]`] },
  { body: art('<staccato/>') + art('<scoop/>'), control: [art('<staccato/><scoop/>')], paths: [`${base}.articulations[2].scoop`] },
  { body: orn('<trill-mark/>') + orn('<schleifer/>'), control: [orn('<trill-mark/><schleifer/>')], paths: [`${base}.ornaments[2].schleifer`] }
])('reports unsupported repeated inner groups without changing music: $paths', ({ body, control, paths }) => {
  const actual = parseMusicXmlWithReport(fixture([body])), reference = parseMusicXmlWithReport(fixture(control))
  expect(actual.report.warnings.map(w => w.path)).toEqual(paths)
  expect(actual.report.warnings.every(w => w.code === 'unsupported-notation')).toBe(true)
  expect(actual.score).toEqual(reference.score)
  expect(encodeNativeProject(createNativeProject(actual.score))).toBe(encodeNativeProject(createNativeProject(reference.score)))
  expect(serializeMidi(actual.score)).toEqual(serializeMidi(reference.score))
  expect(serializeMusicXml(actual.score)).toBe(serializeMusicXml(reference.score))
})

it.each([
  { body: '<technical/>' + technical, path: `${base}.technical[2]` },
  { body: '<articulations/>' + art('<scoop/>'), path: `${base}.articulations[2].scoop` },
  { body: '<ornaments/>' + orn('<schleifer/>'), path: `${base}.ornaments[2].schleifer` }
])('keeps the original group address after an empty group: $path', ({ body, path }) => {
  expect(parseMusicXmlWithReport(fixture([body])).report.warnings.map(w => w.path)).toEqual([path])
})

it.each([false, true])('retains strong-accent direction, position and owning rest diagnostics across inner groups rest=%s', rest => {
  let xml = fixture([art('<staccato/>') + art('<strong-accent type="down" placement="below" default-y="0"/>')])
  if (rest) xml = xml.replace('<pitch><step>C</step><octave>4</octave></pitch>', '<rest/>')
  const warnings = parseMusicXmlWithReport(xml).report.warnings
  expect(warnings).toHaveLength(rest ? 4 : 3)
  expect(warnings.every(w => w.path === `${base}.articulations[2].strong-accent[1]`)).toBe(true)
  expect(warnings.some(w => w.message === 'downward strong-accent placement is not imported yet.')).toBe(true)
  expect(warnings.some(w => w.message === 'below-staff strong-accent placement is not imported yet.')).toBe(true)
  expect(warnings.some(w => w.message === 'strong-accent manual position is not imported yet.')).toBe(true)
  expect(warnings.some(w => w.message.includes('on a rest'))).toBe(rest)
})

it('keeps legacy singleton paths and the existing outer-container owner prefix', () => {
  expect(parseMusicXmlWithReport(fixture([technical])).report.warnings[0].path).toBe(`${base}.technical`)
  const result = parseMusicXmlWithReport(fixture(['', art('<staccato/>') + art('<scoop/>')]))
  expect(result.report.warnings.map(w => w.path)).toEqual([`${base}[2].articulations[2].scoop`])
})

it('does not warn for empty or entirely supported repeated groups', () => {
  const body = '<technical/><articulations/>' + art('<staccato/>') + art('<accent/>') + '<ornaments/>' + orn('<trill-mark/>') + orn('<turn/>')
  expect(parseMusicXmlWithReport(fixture([body])).report.warnings).toEqual([])
})
