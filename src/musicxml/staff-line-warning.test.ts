import { expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createStaffLineFixture, type StaffLineKind } from '../testing/staff-line-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'

const notice = (xml: string) => parseMusicXmlWithReport(xml).report.warnings.filter(w => w.message.startsWith('Unrepresented staff line count '))
it.each(['one', 'six', 'zero', 'second-staff', 'multiple', 'normalized'] as const)('reports %s source line count without changing the existing score', kind => {
  const source = createStaffLineFixture(kind), plain = source.replace(/<staff-details\b[\s\S]*?<\/staff-details>/g, '')
  const result = parseMusicXmlWithReport(source), control = parseMusicXmlWithReport(plain), marks = notice(source)
  const number = kind === 'normalized' ? 2 : 10
  expect(marks).toHaveLength(kind === 'multiple' ? 2 : 1)
  expect(marks[0]).toMatchObject({ code: 'unsupported-notation', partNumber: 2, measureNumber: number,
    path: 'part[2].measure[' + number + '].attributes[1].staff-details[1].staff-lines',
    message: expect.stringContaining('"staffNumber":"' + (kind === 'second-staff' ? 2 : 1) + '"') })
  if (kind === 'multiple') expect(marks[1]).toMatchObject({ path: 'part[2].measure[10].attributes[1].staff-details[2].staff-lines', message: expect.stringContaining('"staffNumber":"2"') })
  expect(result.score).toEqual(control.score)
  const native = encodeNativeProject(createNativeProject(result.score)), controlNative = encodeNativeProject(createNativeProject(control.score))
  expect(decodeNativeProject(native)).toEqual(decodeNativeProject(controlNative))
  const copy = serializeMusicXml(result.score), midi = serializeMidi(control.score)
  expect(copy).toBe(serializeMusicXml(control.score)); expect(copy).not.toContain('staff-details')
  expect(notice(copy)).toEqual([]); expect(serializeMidi(result.score)).toEqual(midi)
  expect(serializeMidi(parseMusicXmlWithReport(copy).score)).toEqual(midi)
  expect(result.report.warnings.filter(w => !w.message.startsWith('Unrepresented staff line count '))).toEqual(control.report.warnings)
  expect(source).toBe(createStaffLineFixture(kind))
})
it.each(['none', 'five', 'padded-five', 'size-only'] as const)('does not claim non-five-line loss for %s', kind => expect(notice(createStaffLineFixture(kind))).toEqual([]))
it('writes optional generated source/native/copy/MIDI audit artifacts', () => {
  const dir = process.env.STUDIO_STAFF_LINES_QA_DIR
  if (!dir) return
  mkdirSync(dir, { recursive: true })
  const kinds: StaffLineKind[] = ['one', 'six', 'zero', 'second-staff', 'multiple', 'normalized', 'none', 'five', 'padded-five', 'size-only']
  for (const kind of kinds) {
    const source = createStaffLineFixture(kind), { score } = parseMusicXmlWithReport(source)
    for (const [name, value] of Object.entries({ [kind + '.musicxml']: source, [kind + '-expected.chromatics']: encodeNativeProject(createNativeProject(score)),
      [kind + '-copy.musicxml']: serializeMusicXml(score), [kind + '-expected.mid']: Buffer.from(serializeMidi(score)) })) writeFileSync(join(dir, name), value, { flag: 'wx' })
  }
})
