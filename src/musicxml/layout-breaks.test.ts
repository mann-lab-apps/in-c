import { describe, expect, it } from 'vitest'
import { XMLParser } from 'fast-xml-parser'
import { parseMusicXml, serializeMusicXmlWithReport } from './index'
import { createNewScore } from '../renderer/src/editor/new-score'
import { createNativeProject } from '../project/schema'

describe('MusicXML explicit layout breaks', () => {
  it.each(['solo-melody', 'piano-grand-staff', 'string-quartet'] as const)('preserves system/page breaks in %s and emits the same positions in every part', templateId => {
    const score = createNewScore({ title: 'Break interchange', templateId, measureCount: 4, keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 } })
    const anchorStaff = score.parts.at(-1)!.staves.at(-1)!
    score.layout = { systemBreakBeforeMeasureIds: [anchorStaff.measures[1]!.id], pageBreakBeforeMeasureIds: [anchorStaff.measures[2]!.id] }
    const { contents, report } = serializeMusicXmlWithReport(score)
    const document = new XMLParser({ ignoreAttributes: false }).parse(contents)['score-partwise']
    for (const part of [document.part].flat()) {
      expect(part.measure[1].print?.['@_new-system']).toBe('yes')
      expect(part.measure[2].print?.['@_new-page']).toBe('yes')
      expect(part.measure[0].print).toBeUndefined()
      expect(part.measure[3].print).toBeUndefined()
    }
    expect(report.warnings).toEqual([])
    const reopened = parseMusicXml(contents)
    expect(reopened.layout?.systemBreakBeforeMeasureIds).toEqual([reopened.parts[0]!.staves[0]!.measures[1]!.id])
    expect(reopened.layout?.pageBreakBeforeMeasureIds).toEqual([reopened.parts[0]!.staves[0]!.measures[2]!.id])
    expect(() => createNativeProject(reopened)).not.toThrow()
    expect(parseMusicXml(serializeMusicXmlWithReport(reopened).contents).layout).toEqual(reopened.layout)
  })

  it('reads standard print flags, ignoring no flags and implicit first-page layout', () => {
    const score = parseMusicXml(`<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Solo</part-name></score-part></part-list><part id="P1">
      <measure number="1"><print><system-layout/></print><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes><note><rest measure="yes"/><duration>4</duration><type>whole</type></note></measure>
      <measure number="2"><print new-system="no" new-page="no"/><note><rest measure="yes"/><duration>4</duration><type>whole</type></note></measure>
      <measure number="3"><print new-system="yes" new-page="yes"/><note><rest measure="yes"/><duration>4</duration><type>whole</type></note></measure>
    </part></score-partwise>`)
    expect(score.layout).toEqual({ systemBreakBeforeMeasureIds: ['measure-3'], pageBreakBeforeMeasureIds: ['measure-3'] })
  })
})
