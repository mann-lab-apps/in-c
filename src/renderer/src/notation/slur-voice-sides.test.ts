import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { parseMusicXml } from '../../../musicxml'
import { planSlurVoiceSides } from './slur-voice-sides'

const xml = readFileSync(new URL('../../../musicxml/fixtures/slur-file-order.musicxml', import.meta.url), 'utf8')
const fixture = () => parseMusicXml(xml)

it('puts overlapping first- and second-voice slurs on the outside of the staff', () => {
  const score = fixture()
  const original = structuredClone(score)
  expect([...planSlurVoiceSides(score)]).toEqual([
    ['slur-1', 'above'], ['slur-2', 'below'], ['slur-3', 'below']
  ])
  expect(score).toEqual(original)
})

it('keeps authored placement and a manual zero offset out of automatic placement', () => {
  const score = fixture()
  score.slurs![0].engraving = { offsetY: 0 }
  score.slurs![1].engraving = { placement: 'above' }
  expect([...planSlurVoiceSides(score)]).toEqual([['slur-3', 'below']])
})

it('applies the onset window through the final note and excludes another staff', () => {
  const score = fixture()
  const staff = score.parts[0].staves[0]
  const [first] = staff.measures
  const second = structuredClone(first)
  second.id = 'second-bar'
  second.number = 2
  for (const voice of second.voices) {
    for (const event of voice.events) event.id += '-second'
  }
  first.voices.length = 1
  staff.measures.push(second)
  const [slur] = score.slurs!
  score.slurs = [slur]
  slur.endEventId = first.voices[0].events[3].id
  expect(planSlurVoiceSides(score).size).toBe(0)
  slur.endEventId = second.voices[0].events[1].id
  expect(planSlurVoiceSides(score).get(slur.id)).toBe('above')
  staff.measures.pop()
  score.parts[0].staves.push({ ...staff, id: 'other-staff', measures: [second] })
  expect(planSlurVoiceSides(score).size).toBe(0)
})
