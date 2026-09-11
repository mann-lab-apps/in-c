import type { Part, Score } from '../../../score-core'
import {
  createPlaybackTimeline,
  tempoMarkingToQuarterBpm
} from '../playback/timeline'

const MIDI_TICKS_PER_QUARTER = 480
const DEFAULT_QUARTER_BPM = 120
const DEFAULT_PROGRAM = 0
const PERCUSSION_CHANNEL = 9

const MIDI_PROGRAM_BY_PART_NAME: ReadonlyArray<readonly [RegExp, number]> = [
  [/piano|피아노/i, 0],
  [/violin|바이올린/i, 40],
  [/viola|비올라/i, 41],
  [/cello|violoncello|첼로/i, 42],
  [/contrabass|double bass|bass|콘트라베이스/i, 43],
  [/flute|플루트/i, 73],
  [/clarinet|클라리넷/i, 71],
  [/oboe|오보에/i, 68],
  [/bassoon|바순/i, 70],
  [/voice|vocal|soprano|alto|tenor|baritone|bass voice|성악/i, 52]
]

interface TimedMidiMessage {
  tick: number
  order: number
  bytes: number[]
}

export interface MidiExportWarning {
  code: 'unsupported-midi-clef'
  path: string
  message: string
}

export interface MidiExportReport {
  bytes: Uint8Array
  warnings: MidiExportWarning[]
}

export function serializeMidi(score: Score): Uint8Array {
  return serializeMidiWithReport(score).bytes
}

export function serializeMidiWithReport(score: Score): MidiExportReport {
  const unsupportedMeasureKeys = collectUnsupportedMidiMeasureKeys(score)
  const tempoTrack = createTempoTrack(score)
  const partTracks = score.parts.map((part, partIndex) =>
    createPartNoteTrack(
      score,
      part,
      resolveMidiChannel(partIndex),
      resolveMidiProgram(part),
      unsupportedMeasureKeys
    )
  )

  return {
    bytes: concatBytes([
      ascii('MThd'),
      uint32(6),
      uint16(1),
      uint16(1 + partTracks.length),
      uint16(MIDI_TICKS_PER_QUARTER),
      createTrackChunk(tempoTrack),
      ...partTracks.map((track) => createTrackChunk(track))
    ]),
    warnings: collectUnsupportedMidiWarnings(score)
  }
}

function createTempoTrack(score: Score): number[] {
  const timeline = createPlaybackTimeline(score)
  const initialQuarterBpm = score.tempo
    ? tempoMarkingToQuarterBpm(score.tempo)
    : DEFAULT_QUARTER_BPM
  const messages: TimedMidiMessage[] = [
    {
      tick: 0,
      order: 0,
      bytes: metaText(0x03, 'Chromatics Tempo')
    },
    {
      tick: 0,
      order: 1,
      bytes: tempoMetaEvent(initialQuarterBpm)
    },
    ...timeline.tempoEvents.map((event, index) => ({
      tick: beatToMidiTick(event.startBeat),
      order: index + 2,
      bytes: tempoMetaEvent(event.quarterBpm)
    }))
  ]

  return renderTimedMessages(messages)
}

function createPartNoteTrack(
  score: Score,
  part: Part,
  channel: number,
  program: number,
  unsupportedMeasureKeys: Set<string>
): number[] {
  const timeline = createPlaybackTimeline(score)
  const messages: TimedMidiMessage[] = [
    {
      tick: 0,
      order: 0,
      bytes: metaText(0x03, part.name || score.title || 'Chromatics Part')
    },
    {
      tick: 0,
      order: 1,
      bytes: [0xc0 | channel, program]
    }
  ]
  let order = 2

  for (const event of timeline.events.filter((candidate) => candidate.partId === part.id)) {
    if (
      unsupportedMeasureKeys.has(
        createMeasureKey(event.partId, event.staffId, event.measureId)
      )
    ) {
      continue
    }

    const frequencies = event.frequencies ?? []

    if (frequencies.length === 0) {
      continue
    }

    const startTick = beatToMidiTick(event.startBeat)
    const durationTick = Math.max(1, beatToMidiTick(event.durationBeats))
    const velocity = velocityToMidi(event.velocityStart)

    for (const frequency of frequencies) {
      const note = frequencyToMidiNote(frequency)

      messages.push({
        tick: startTick,
        order,
        bytes: [0x90 | channel, note, velocity]
      })
      order += 1
      messages.push({
        tick: startTick + durationTick,
        order,
        bytes: [0x80 | channel, note, 0]
      })
      order += 1
    }
  }

  return renderTimedMessages(messages)
}

function collectUnsupportedMidiMeasureKeys(score: Score): Set<string> {
  return new Set(
    score.parts.flatMap((part) =>
      part.staves.flatMap((staff) =>
        staff.measures
          .filter((measure) => isUnsupportedMidiClef(measure.clef.sign))
          .map((measure) => createMeasureKey(part.id, staff.id, measure.id))
      )
    )
  )
}

function collectUnsupportedMidiWarnings(score: Score): MidiExportWarning[] {
  const warnings: MidiExportWarning[] = []
  const seen = new Set<string>()

  score.parts.forEach((part, partIndex) => {
    part.staves.forEach((staff, staffIndex) => {
      staff.measures.forEach((measure, measureIndex) => {
        const sign = measure.clef.sign

        if (!isUnsupportedMidiClef(sign)) {
          return
        }

        const key = `${part.id}:${staff.id}:${sign}`

        if (seen.has(key)) {
          return
        }

        seen.add(key)
        warnings.push({
          code: 'unsupported-midi-clef',
          path: `part[${partIndex + 1}].staff[${staffIndex + 1}].measure[${measureIndex + 1}].clef`,
          message:
            sign === 'percussion'
              ? 'Percussion notation is not interpreted in V1 MIDI export; notes on this staff were skipped.'
              : 'Tab notation is not interpreted in V1 MIDI export; notes on this staff were skipped.'
        })
      })
    })
  })

  return warnings
}

function createMeasureKey(
  partId: string,
  staffId: string,
  measureId: string
): string {
  return `${partId}:${staffId}:${measureId}`
}

function isUnsupportedMidiClef(sign: string): boolean {
  return sign === 'percussion' || sign === 'tab'
}

function resolveMidiChannel(partIndex: number): number {
  const channel = partIndex % 15

  return channel >= PERCUSSION_CHANNEL ? channel + 1 : channel
}

function resolveMidiProgram(part: Part): number {
  const partLabel = `${part.name} ${part.abbreviation ?? ''}`
  const match = MIDI_PROGRAM_BY_PART_NAME.find(([pattern]) =>
    pattern.test(partLabel)
  )

  return match?.[1] ?? DEFAULT_PROGRAM
}

function renderTimedMessages(messages: TimedMidiMessage[]): number[] {
  const bytes: number[] = []
  let previousTick = 0

  const sortedMessages = [...messages].sort((left, right) =>
    left.tick - right.tick || left.order - right.order
  )

  for (const message of sortedMessages) {
    bytes.push(...variableLengthQuantity(message.tick - previousTick))
    bytes.push(...message.bytes)
    previousTick = message.tick
  }

  bytes.push(0x00, 0xff, 0x2f, 0x00)
  return bytes
}

function createTrackChunk(trackBytes: number[]): number[] {
  return [
    ...ascii('MTrk'),
    ...uint32(trackBytes.length),
    ...trackBytes
  ]
}

function tempoMetaEvent(quarterBpm: number): number[] {
  const microsecondsPerQuarter = Math.round(60_000_000 / quarterBpm)

  return [
    0xff,
    0x51,
    0x03,
    (microsecondsPerQuarter >> 16) & 0xff,
    (microsecondsPerQuarter >> 8) & 0xff,
    microsecondsPerQuarter & 0xff
  ]
}

function metaText(type: number, value: string): number[] {
  const text = Array.from(new TextEncoder().encode(value))

  return [0xff, type, ...variableLengthQuantity(text.length), ...text]
}

function frequencyToMidiNote(frequency: number): number {
  const midi = Math.round(69 + 12 * Math.log2(frequency / 440))

  return Math.min(127, Math.max(0, midi))
}

function velocityToMidi(velocity: number): number {
  return Math.min(127, Math.max(1, Math.round((velocity / 0.24) * 112)))
}

function beatToMidiTick(beat: number): number {
  return Math.round(beat * MIDI_TICKS_PER_QUARTER)
}

function variableLengthQuantity(value: number): number[] {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid MIDI delta time: ${value}`)
  }

  const bytes = [value & 0x7f]
  let remaining = value >> 7

  while (remaining > 0) {
    bytes.unshift((remaining & 0x7f) | 0x80)
    remaining >>= 7
  }

  return bytes
}

function concatBytes(chunks: number[][]): Uint8Array {
  return new Uint8Array(chunks.flat())
}

function ascii(value: string): number[] {
  return [...value].map((character) => character.charCodeAt(0))
}

function uint16(value: number): number[] {
  return [(value >> 8) & 0xff, value & 0xff]
}

function uint32(value: number): number[] {
  return [
    (value >> 24) & 0xff,
    (value >> 16) & 0xff,
    (value >> 8) & 0xff,
    value & 0xff
  ]
}
