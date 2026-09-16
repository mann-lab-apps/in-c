import { describe, expect, it } from 'vitest'
import { parseMusicXml, serializeMusicXml } from './index'
import { TICKS_PER_QUARTER } from '../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'

describe('expression text musical position', () => {
  it.each([
    { divisions: 2, before: 2, offset: -1, expected: TICKS_PER_QUARTER / 2 },
    { divisions: 4, before: 4, offset: 2, expected: TICKS_PER_QUARTER * 1.5 },
    { divisions: 2, before: 0, offset: 1, expected: TICKS_PER_QUARTER / 2 }
  ])('normalizes cursor and offset $before/$offset at divisions=$divisions', ({ divisions, before, offset, expected }) => {
    const rest = (duration: number) => `<note><rest/><duration>${duration}</duration><type>quarter</type></note>`
    const xml = `<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list>
      <part id="P1"><measure number="1"><attributes><divisions>${divisions}</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      ${before ? rest(before) : ''}<direction placement="below"><direction-type><words font-style="italic">dolce</words></direction-type><offset>${offset}</offset></direction>
      ${Array.from({ length: 4 - before / divisions }, () => rest(divisions)).join('')}
      </measure></part></score-partwise>`
    const score = parseMusicXml(xml)
    expect(score.expressionTexts).toEqual([expect.objectContaining({ text: 'dolce', tick: expected })])
    expect(parseMusicXml(serializeMusicXml(score)).expressionTexts).toEqual(score.expressionTexts)
  })

  it('preserves lower-staff backup timing with inherited divisions through XML and native', () => {
    const xml = `<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
      <part id="P1">
        <measure number="1"><attributes><divisions>2</divisions><staves>2</staves><time><beats>4</beats><beat-type>4</beat-type></time>
          <clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>
          <note><rest/><duration>8</duration><type>whole</type><staff>1</staff></note>
          <backup><duration>8</duration></backup>
          <note><rest/><duration>8</duration><type>whole</type><staff>2</staff></note>
        </measure>
        <measure number="2">
          <note><rest/><duration>8</duration><type>whole</type><staff>1</staff></note>
          <backup><duration>8</duration></backup>
          <note><rest/><duration>2</duration><type>quarter</type><staff>2</staff></note>
          <direction placement="below"><direction-type><words font-style="italic">cantabile</words></direction-type><offset>1</offset><staff>2</staff></direction>
          <note><rest/><duration>6</duration><type>half</type><dot/><staff>2</staff></note>
        </measure>
      </part></score-partwise>`
    const score = parseMusicXml(xml)
    const lowerMeasure = score.parts[0]!.staves[1]!.measures[1]!
    expect(score.expressionTexts).toEqual([expect.objectContaining({
      measureId: lowerMeasure.id,
      tick: TICKS_PER_QUARTER * 1.5,
      text: 'cantabile'
    })])
    expect(parseMusicXml(serializeMusicXml(score)).expressionTexts).toEqual(score.expressionTexts)
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score.expressionTexts)
      .toEqual(score.expressionTexts)
  })
})
