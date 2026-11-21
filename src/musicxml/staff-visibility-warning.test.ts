import { expect, it } from 'vitest'
import { createStaffVisibilityFixture } from '../testing/staff-visibility-fixture'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'

const prefix = 'Unrepresented staff visibility '
it.each(['hidden-second','hidden-default','hidden-spacing','padded-hidden','normalized','multiple','line-mixed'] as const)('reports %s display loss without changing the current music or dropping a staff', kind => {
  const source = createStaffVisibilityFixture(kind), plain = source.replace(/<staff-details\b[\s\S]*?(?:\/>|<\/staff-details>)/g, '')
  const result = parseMusicXmlWithReport(source), control = parseMusicXmlWithReport(plain), notices = result.report.warnings.filter(w => w.message.startsWith(prefix))
  expect(notices).toHaveLength(kind === 'multiple' ? 2 : 1)
  const number = kind === 'normalized' ? 2 : 10
  expect(notices[0]).toMatchObject({code:'unsupported-notation',partNumber:2,measureNumber:number,path:`part[2].measure[${number}].attributes[1].staff-details[1].@print-object`})
  expect(notices[0].message).toContain('"staffNumber":"'+(kind === 'hidden-default' ? 1 : 2)+'"')
  expect(notices[0].message).toContain('"printObject":"no"')
  if (kind === 'hidden-spacing') expect(notices[0].message).toContain('"printSpacing":"no"')
  if (kind === 'multiple') expect(notices[1]).toMatchObject({path:`part[2].measure[10].attributes[1].staff-details[2].@print-object`})
  if (kind === 'line-mixed') expect(result.report.warnings.some(w=>w.message.startsWith('Unrepresented staff line count '))).toBe(true)
  expect(result.score).toEqual(control.score)
  expect(result.score.parts.map(part=>part.staves.length)).toEqual([1,2])
  const native = encodeNativeProject(createNativeProject(result.score))
  expect(decodeNativeProject(native).score).toEqual(JSON.parse(JSON.stringify(control.score)))
  expect(serializeMidi(result.score)).toEqual(serializeMidi(control.score))
  const copy = serializeMusicXml(result.score)
  expect(copy).toBe(serializeMusicXml(control.score)); expect(copy).not.toContain('staff-details')
  expect(serializeMidi(parseMusicXmlWithReport(copy).score)).toEqual(serializeMidi(control.score))
  expect(source).toBe(createStaffVisibilityFixture(kind))
})
it.each(['none','default-visible','explicit-visible','spacing-only'] as const)('does not invent hidden staff loss for %s', kind => {
  expect(parseMusicXmlWithReport(createStaffVisibilityFixture(kind)).report.warnings.filter(w=>w.message.startsWith(prefix))).toEqual([])
})
