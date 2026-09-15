import { describe, expect, it } from 'vitest'
import { parseMusicXml, serializeMusicXml } from './index'
import { TICKS_PER_QUARTER } from '../score-core'

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
})
