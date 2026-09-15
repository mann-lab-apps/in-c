import { describe, expect, it } from 'vitest'
import { createScore } from '../score-core'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'

function xml(system: string) {
  return `<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
    <part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    <direction system="${system}"><direction-type><words>Chorus</words></direction-type></direction>
    <note><rest/><duration>4</duration><type>whole</type></note></measure></part></score-partwise>`
}

describe('MusicXML system text relation', () => {
  it('collects global text from every part without multiplying repeated part exports', () => {
    const part = (id: string, texts: string[]) => `<part id="${id}"><measure number="1"><attributes><divisions>1</divisions></attributes>${texts.map(text =>
      `<direction system="only-top"><direction-type><words>${text}</words></direction-type><direction-type><rehearsal>${text}</rehearsal></direction-type></direction>`).join('')}<note><rest/><duration>4</duration><type>whole</type></note></measure></part>`
    const input = `<score-partwise version="4.0"><part-list>${['P1', 'P2', 'P3'].map(id => `<score-part id="${id}"><part-name>${id}</part-name></score-part>`).join('')}</part-list>${part('P1', ['Shared'])}${part('P2', ['Shared', 'Lower only', 'Lower only'])}${part('P3', ['Shared', 'Lower only', 'Third only'])}</score-partwise>`
    const score = parseMusicXmlWithReport(input).score
    for (const key of ['systemTexts', 'rehearsalMarks'] as const) {
      expect(score[key]?.map(mark => mark.text)).toEqual(['Shared', 'Lower only', 'Lower only', 'Third only'])
      expect(new Set(score[key]?.map(mark => mark.id)).size).toBe(4)
      expect(score[key]?.every(mark => mark.measureId === 'measure-1')).toBe(true)
      expect(parseMusicXmlWithReport(serializeMusicXml(score)).score[key]?.map(mark => mark.text)).toEqual(score[key]?.map(mark => mark.text))
    }
  })
  it.each(['only-top', 'yes'])('imports %s as system text rather than staff text', relation => {
    const { score, report } = parseMusicXmlWithReport(xml(relation))
    expect(score.systemTexts).toEqual([expect.objectContaining({ text: 'Chorus', measureId: 'measure-1' })])
    expect(score.staffTexts).toBeUndefined()
    expect(report.warnings).toEqual([])
  })
  it('reads a global direction on the lower staff even when the first part has no marks', () => {
    const input = xml('only-top').replace('<direction system="only-top">', '<direction system="only-top"><staff>2</staff>')
      .replace('<divisions>1</divisions>', '<divisions>1</divisions><staves>2</staves>')
      .replace('<direction-type><words>Chorus</words></direction-type>', '<direction-type><words>Chorus</words></direction-type><direction-type><rehearsal>B</rehearsal></direction-type>')
      .replace('<part id="P1">', '<part id="empty"><measure number="1"><attributes><divisions>1</divisions></attributes><note><rest/><duration>4</duration><type>whole</type></note></measure></part><part id="P1">')
      .replace('<score-part id="P1">', '<score-part id="empty"><part-name>Empty</part-name></score-part><score-part id="P1">')
    const score = parseMusicXmlWithReport(input).score
    expect(score.systemTexts).toEqual([expect.objectContaining({ text: 'Chorus', measureId: 'measure-1' })])
    expect(score.rehearsalMarks).toEqual([expect.objectContaining({ text: 'B', measureId: 'measure-1' })])
    expect(score.staffTexts).toBeUndefined()
  })
  it('keeps none part-local and reports also-top additional-placement loss', () => {
    const local = parseMusicXmlWithReport(xml('none'))
    expect(local.score.systemTexts).toBeUndefined()
    expect(local.score.staffTexts).toHaveLength(1)
    const also = parseMusicXmlWithReport(xml('also-top'))
    expect(also.score.systemTexts).toHaveLength(1)
    expect(also.report.warnings).toContainEqual(expect.objectContaining({ code: 'unsupported-direction', path: 'measure[1].direction[1].@system' }))
  })
  it('exports the standard only-top value and reopens without changing the text type', () => {
    const score = createScore({ title: 'System text', systemTexts: [{ id: 'text', measureId: 'measure-1', text: 'Chorus' }] })
    const exported = serializeMusicXml(score)
    expect(exported).toContain('system="only-top"')
    expect(exported).not.toContain('system="yes"')
    expect(parseMusicXmlWithReport(exported).score.systemTexts).toHaveLength(1)
  })
})
