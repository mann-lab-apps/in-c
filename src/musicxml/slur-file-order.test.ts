import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { parseMusicXml, serializeMusicXml } from './index'

const source = readFileSync(new URL('./fixtures/slur-file-order.musicxml', import.meta.url), 'utf8')
const unmarked = source.replaceAll(/<notations>.*?<\/notations>/g, '')

function slurLocations(score: ReturnType<typeof parseMusicXml>) {
  const voices = score.parts[0].staves[0].measures[0].voices
  const addresses = new Map(voices.flatMap(voice =>
    voice.events.map((event, i) => [event.id, [voice.id, i]] as const)
  ))
  return (score.slurs ?? []).map(slur => [
    addresses.get(slur.startEventId), addresses.get(slur.endEventId), slur.number
  ])
}

it('pairs a stop written before its start and reuses a number between complete pairs in file order', () => {
  const score = parseMusicXml(source)
  const native = decodeNativeProject(encodeNativeProject(createNativeProject(score))).score
  expect(native).toEqual(score)
  const expected = [
    [['voice-1', 1], ['voice-1', 2], 1],
    [['voice-2', 0], ['voice-1', 3], 1],
    [['voice-2', 1], ['voice-2', 2], 1]
  ]
  for (const candidate of [native, parseMusicXml(serializeMusicXml(native))]) {
    expect(slurLocations(candidate)).toEqual(expected)
    expect(serializeMidi(candidate)).toEqual(serializeMidi(parseMusicXml(unmarked)))
  }
})

it('uses distinct numbers for slurs that share a stored number and overlap in output order', () => {
  const score = parseMusicXml(unmarked)
  const [first, second] = score.parts[0].staves[0].measures[0].voices
  score.slurs = [
    { id: 'across', startEventId: second.events[0].id, endEventId: first.events[3].id, number: 1 },
    { id: 'within', startEventId: second.events[1].id, endEventId: second.events[3].id, number: 1 },
    { id: 'overlap', startEventId: first.events[2].id, endEventId: second.events[3].id, number: 1 }
  ]
  const before = structuredClone(score)
  const reopened = parseMusicXml(serializeMusicXml(score))
  expect(slurLocations(reopened)).toEqual([
    [['voice-2', 0], ['voice-1', 3], 2],
    [['voice-2', 1], ['voice-2', 3], 2],
    [['voice-1', 2], ['voice-2', 3], 1]
  ])
  expect(score).toEqual(before)
})

it('refuses more than 16 slurs that share the same interval in file order', () => {
  const score = parseMusicXml(unmarked)
  const [first] = score.parts[0].staves[0].measures[0].voices
  score.slurs = Array.from({ length: 17 }, (_, i) => ({
    id: `slur-${i}`, startEventId: first.events[0].id, endEventId: first.events[3].id
  }))
  expect(() => serializeMusicXml(score)).toThrow(/슬러.*16/)
})
