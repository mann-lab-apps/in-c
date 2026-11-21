import { expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createStaffSizeFixture, type StaffSizeKind } from '../testing/staff-size-fixture'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'

const notice = (xml: string) => parseMusicXmlWithReport(xml).report.warnings.filter(w => w.message.startsWith('Unrepresented individual staff size '))
it.each(['space70', 'notation70', 'notes100space70', 'enlarged', 'fractional', 'zero', 'second-staff', 'combined', 'normalized'] as const)('reports %s individual size loss without changing existing music or line warnings', kind => {
  const source = createStaffSizeFixture(kind), plain = source.replace(/<staff-size\b[^>]*>[\s\S]*?<\/staff-size>/g, '')
  const result = parseMusicXmlWithReport(source), control = parseMusicXmlWithReport(plain), marks = notice(source)
  const number = kind === 'normalized' ? 2 : 10
  expect(marks).toHaveLength(1)
  expect(marks[0]).toMatchObject({ code: 'unsupported-notation', partNumber: 2, measureNumber: number,
    path: 'part[2].measure[' + number + '].attributes[1].staff-details[1].staff-size',
    message: expect.stringContaining('"staffNumber":"' + (kind === 'second-staff' ? 2 : 1) + '"') })
  if (kind === 'notation70') expect(marks[0].message).toContain('"scaling":"70"')
  if (kind === 'fractional') expect(marks[0].message).toContain('"size":"75.5"')
  if (kind === 'zero') expect(marks[0].message).toContain('"size":"0"')
  expect(result.score).toEqual(control.score)
  expect(encodeNativeProject(createNativeProject(result.score))).toBe(encodeNativeProject(createNativeProject(control.score)))
  const copy = serializeMusicXml(result.score), midi = serializeMidi(control.score)
  expect(copy).toBe(serializeMusicXml(control.score)); expect(copy).not.toContain('staff-size')
  expect(serializeMidi(result.score)).toEqual(midi); expect(serializeMidi(parseMusicXmlWithReport(copy).score)).toEqual(midi)
  expect(result.report.warnings.filter(w => !w.message.startsWith('Unrepresented individual staff size '))).toEqual(control.report.warnings)
  expect(source).toBe(createStaffSizeFixture(kind))
})
it.each(['none', 'default100', 'both100', 'line-only'] as const)('does not invent non-default staff size loss for %s', kind => expect(notice(createStaffSizeFixture(kind))).toEqual([]))
it('writes optional source/native/copy/MIDI artifacts from the same contract', () => {
  const dir = process.env.STUDIO_STAFF_SIZE_QA_DIR
  if (!dir) return
  mkdirSync(dir, { recursive: true })
  const kinds: StaffSizeKind[] = ['space70', 'notation70', 'notes100space70', 'enlarged', 'fractional', 'zero', 'second-staff', 'combined', 'normalized', 'none', 'default100', 'both100', 'line-only']
  for (const kind of kinds) {
    const source = createStaffSizeFixture(kind), { score } = parseMusicXmlWithReport(source)
    for (const [name, value] of Object.entries({ [kind + '.musicxml']: source, [kind + '-expected.chromatics']: encodeNativeProject(createNativeProject(score)),
      [kind + '-copy.musicxml']: serializeMusicXml(score), [kind + '-expected.mid']: Buffer.from(serializeMidi(score)) })) writeFileSync(join(dir, name), value, { flag: 'wx' })
  }
})
