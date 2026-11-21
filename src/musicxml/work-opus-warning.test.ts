import { expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createWorkOpusFixture, workOpusKinds } from '../testing/work-opus-fixture'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
it.each(workOpusKinds)('reports %s collection-link loss while preserving current music and original metadata policy', kind => {
  const xml = createWorkOpusFixture(kind), actual = parseMusicXmlWithReport(xml), control = parseMusicXmlWithReport(createWorkOpusFixture(kind,true))
  expect(actual.score).toEqual(control.score)
  expect(serializeMusicXml(actual.score)).toBe(serializeMusicXml(control.score)); expect(serializeMidi(actual.score)).toEqual(serializeMidi(control.score))
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(actual.score))).score).toEqual(actual.score)
  expect(parseMusicXmlWithReport(serializeMusicXml(actual.score)).report.warnings).toEqual([])
  expect(xml).toBe(createWorkOpusFixture(kind))
  expect(actual.report.warnings.filter(warning=>warning.path!=='work.opus')).toEqual(control.report.warnings)
  const losses = actual.report.warnings.filter(warning=>warning.path==='work.opus')
  expect(losses).toHaveLength(kind==='absent'?0:1)
  if (kind!=='absent') expect(losses[0]).toMatchObject({code:'unsupported-notation',path:'work.opus',message:expect.stringContaining('work.opus')})
  expect(losses.every(warning=>warning.partNumber===undefined&&warning.measureNumber===undefined)).toBe(true)
  if (kind==='attributes') { expect(losses[0].message).toContain('collection.opus.xml?part=1&name=연결'); expect(losses[0].message).toContain('모음 & <검증>') }
})
const schema = resolve('src/musicxml/schema/musicxml-4.0'), available = spawnSync('xmllint',['--version'],{encoding:'utf8'}).status===0
it.skipIf(!available).each(workOpusKinds)('validates actual %s source and normalized copy with pinned full offline XSD', kind => {
  const dir = mkdtempSync(join(tmpdir(),'studio-work-opus-'))
  try {
    const xml = createWorkOpusFixture(kind)
    for (const [name,bytes] of [['source',xml],['copy',serializeMusicXml(parseMusicXmlWithReport(xml).score)]]) {
      const file = join(dir,name+'.musicxml');writeFileSync(file,bytes)
      const checked = spawnSync('xmllint',['--nonet','--noout','--schema',join(schema,'musicxml.xsd'),file],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:join(schema,'catalog.xml')}})
      expect(checked.status,checked.stderr).toBe(0)
    }
  } finally { rmSync(dir,{recursive:true,force:true}) }
})
