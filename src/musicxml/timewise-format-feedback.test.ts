import { expect, it } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { parseMusicXml, parseMusicXmlWithReport } from './index'
import { createTimewiseFormatFixture } from '../testing/timewise-format-fixture'

const fixture = createTimewiseFormatFixture()
const unsupported = '현재 가져오기에서 지원하지 않는 MusicXML 형식입니다: score-timewise'
for (const parse of [parseMusicXml, parseMusicXmlWithReport]) {
  it.each([['direct', fixture.timewise], ['commented', fixture.timewise.replace('<measure ', '<!-- score-partwise is not the root --><measure ')]])(
    `${parse.name} distinguishes a valid unsupported root from a missing element: %s`, (_name, xml) => {
      expect(() => parse(xml)).toThrow(unsupported)
    })
  it('does not mistake score-timewise text, comments or CDATA for the root', () => {
    const xml = fixture.partwise.replace(fixture.title, 'score-timewise')
      .replace('<part-list>', '<!-- score-timewise --><part-list>')
      .replace('<work-title>score-timewise</work-title>', '<work-title><![CDATA[score-timewise]]></work-title>')
    expect(parseMusicXml(xml).title).toBe('score-timewise')
    expect(parseMusicXmlWithReport(xml).report.warnings).toEqual([])
  })
  it('keeps malformed and multi-root XML guards ahead of unsupported-format feedback', () => {
    for (const xml of [fixture.timewise.replace('</score-timewise>', '</wrong>'), `${fixture.timewise}<other/>`]) {
      expect(() => parse(xml)).toThrow('MusicXML 문서를 읽을 수 없습니다:')
      expect(() => parse(xml)).not.toThrow(unsupported)
    }
  })
  it('keeps the existing missing-root diagnostic for unrelated XML', () => {
    expect(() => parse('<unrelated/>')).toThrow('MusicXML 필수 요소가 없습니다: score-partwise')
  })
}

const schema = resolve('src/musicxml/schema/musicxml-4.0')
it.skipIf(spawnSync('xmllint', ['--version']).status !== 0)('checks both equivalent source structures against the pinned offline full XSD', () => {
  const pin = JSON.parse(readFileSync(join(schema, 'SOURCE.json'), 'utf8')) as { files: { file: string; sha256: string }[] }
  for (const file of pin.files) expect(createHash('sha256').update(readFileSync(join(schema, file.file))).digest('hex')).toBe(file.sha256)
  const dir = mkdtempSync(join(tmpdir(), 'studio-timewise-'))
  try {
    for (const [name, xml] of Object.entries({ partwise: fixture.partwise, timewise: fixture.timewise })) {
      const file = join(dir, `${name}.musicxml`); writeFileSync(file, xml)
      const result = spawnSync('xmllint', ['--nonet', '--noout', '--schema', join(schema, 'musicxml.xsd'), file], {
        encoding: 'utf8', timeout: 10000, env: { ...process.env, XML_CATALOG_FILES: join(schema, 'catalog.xml') }
      })
      expect(result.status, result.stderr).toBe(0)
    }
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
