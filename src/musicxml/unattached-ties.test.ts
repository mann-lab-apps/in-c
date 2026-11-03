import { describe, expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseMusicXml, parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createWholeChordTieScore } from '../testing/chord-tie-fixture'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { unattachedTieXml } from '../testing/unattached-tie-fixture'

// MusicXML 4.0 tied: start then stop on one note means a visual tie attached
// only to that note, not the supported stop-then-start middle of a sound chain.
describe('unattached notation tie import diagnosis', () => {
  it.each(['first', 'last', 'chord'] as const)('identifies unsupported valid %s notation without pretending to import it', kind => {
    const xml = unattachedTieXml(kind)
    const out = process.env.DDIRORI_UNATTACHED_TIE_QA_DIR
    if (out) { mkdirSync(out, { recursive: true }); writeFileSync(join(out, `${kind}.musicxml`), xml) }
    expect(() => parseMusicXmlWithReport(xml)).toThrow('한 음표에만 연결된 타이 표기는 현재 가져오기에서 지원하지 않습니다')
    expect(() => parseMusicXml(xml)).toThrow('원본 MusicXML을 보관')
    expect(() => parseMusicXml(xml)).toThrow(/part\[1\]\.measure\[[12]\]\.note\[1\]/)
  })

  it('preserves supported ordinary tie conversion and MIDI', () => {
    const source = createWholeChordTieScore(false, false), xml = serializeMusicXml(source)
    const result = parseMusicXmlWithReport(xml)
    expect(result.report.warnings).toEqual([])
    expect(serializeMidi(result.score)).toEqual(serializeMidi(source))
    expect(serializeMusicXml(result.score)).toContain('<tied type="start"')
  })

  it('preserves the supported stop-then-start middle of a sound chain', () => {
    const source = createWholeChordTieScore(false, false)
    const middle = source.parts[0].staves[0].measures[1]
    const end = structuredClone(middle)
    end.id = 'chain-end'; end.number = 3; end.voices[0].events[0].id = 'chain-end-note'
    const note = middle.voices[0].events[0]
    if (note.type !== 'note') throw Error('Fixture')
    note.ties = { stop: true, start: true }
    source.parts[0].staves[0].measures.push(end)
    const result = parseMusicXmlWithReport(serializeMusicXml(source))
    expect(result.report.warnings).toEqual([])
    expect(serializeMidi(result.score)).toEqual(serializeMidi(source))
  })

  it('retains the existing diagnostic for an unrelated invalid ordinary tie', () => {
    const source = createWholeChordTieScore(false, false)
    // The serializer correctly rejects invalid native ties; form malformed
    // external input by removing both stop channels from a valid XML instead.
    const xml = serializeMusicXml(source).replace(/<tie(?:d)? type="stop"\s*\/>/g, '')
    expect(() => parseMusicXml(xml)).toThrow('MusicXML 타이 관계가 올바르지 않습니다')
    expect(() => parseMusicXml(xml)).not.toThrow('한 음표에만 연결된 타이')
  })
})
