import { createScore, TICKS_PER_QUARTER, type Note, type Measure, type Score } from '../score-core'

export const sharedLyricKinds = ['ensemble-upper', 'ensemble-lower', 'grand-upper', 'grand-lower', 'rhythms', 'impossible',
  'ties-single-same', 'ties-single-cross', 'ties-chord-same', 'ties-chord-cross'] as const
export type SharedLyricKind = typeof sharedLyricKinds[number]
const q = TICKS_PER_QUARTER

export function sharedLyricFixture(kind: SharedLyricKind): Score {
  const score = createScore(), part = score.parts[0], staff = part.staves[0]
  const note = (id: string, tick: number, value: Note['duration']['value'] = 'whole'): Note => ({
    id, type: 'note', position: { tick }, duration: { value, dots: 0 }, pitch: { step: 'C', octave: 4 }
  })
  const base = staff.measures[0]
  staff.measures = Array.from({ length: 6 }, (_, index): Measure => ({
    ...structuredClone(base), id: `upper-bar-${index}`, number: index + 1,
    voices: [{ id: 'voice-1', events: [note(`upper-${index}`, 0)] }]
  }))
  const lower = structuredClone(staff)
  lower.id = 'lower-staff'
  lower.measures.forEach((measure, index) => {
    measure.id = `lower-bar-${index}`
    measure.clef = { sign: 'F', line: 4 }
    measure.voices[0].events = [note(`lower-${index}`, 0)]
  })
  if (kind.startsWith('grand')) part.staves.push(lower)
  else score.parts.push({ ...structuredClone(part), id: 'second-part', name: 'Lower part', staves: [lower] })
  const lyricsStaff = kind.endsWith('lower') ? lower : staff
  for (let i = 0; i < 2; i++) {
    const event = lyricsStaff.measures[i].voices[0].events[0] as Note
    event.lyrics = [{ number: 1, text: (i ? '나' : '가').repeat(kind === 'impossible' ? 300 : 48) }]
  }
  if (kind === 'rhythms') {
    const top0 = [note('top-dotted', 0, 'quarter'), note('top-eighth', q * 1.5, 'eighth'), note('top-half', q * 2, 'half')]
    top0[0].duration.dots = 1
    top0[0].lyrics = [{ text: '함께 부르는 긴 노래' }]
    staff.measures[0].voices[0].events = top0
    lower.measures[0].voices[0].events = [note('bottom-zero', 0, 'eighth'), note('bottom-eighth', q / 2, 'eighth'),
      note('bottom-quarter', q, 'quarter'), note('bottom-half-onset', q * 2, 'quarter'), note('bottom-last', q * 3, 'quarter')]
    const mixed = [note('mixed-zero', 0, 'eighth'), note('mixed-second', q / 3, 'quarter'), note('mixed-next', q, 'half')]
    mixed[2].duration.dots = 1
    for (const n of mixed.slice(0, 2)) n.duration.tuplet = { actualNotes: 3, normalNotes: 2 }
    staff.measures[1].voices[0] = { id: 'voice-1', events: mixed,
      tuplets: [{ id: 'mixed', actualNotes: 3, normalNotes: 2, eventIds: mixed.slice(0, 2).map(n => n.id) }] }
    const regular = [0, 1, 2].map(i => note(`regular-${i}`, q * i / 3, 'eighth'))
    for (const n of regular) n.duration.tuplet = { actualNotes: 3, normalNotes: 2 }
    regular[1].lyrics = [{ text: '같은 위치' }]
    const last = note('regular-next', q, 'half'); last.duration.dots = 1
    lower.measures[1].voices[0] = { id: 'voice-1', events: [...regular, last],
      tuplets: [{ id: 'regular', actualNotes: 3, normalNotes: 2, eventIds: regular.map(n => n.id) }] }
    staff.measures[2].voices.push({ id: 'voice-2', events: [0, 1, 2, 3].map(i => ({
      id: `rest-${i}`, type: 'rest', position: { tick: i * q }, duration: { value: 'quarter', dots: 0 }
    })) })
    for (const s of [staff, lower]) {
      s.measures[3].timing = { type: 'pickup', durationTicks: q }
      s.measures[3].voices = [{ id: 'voice-1', events: [note(`${s.id}-pickup`, 0, 'quarter')] }]
      s.measures[4].keySignature = { fifths: 4 }
    }
  }
  score.title = `Shared lyric QA ${kind}`
  score.layout = { systemBreakBeforeMeasureIds: [staff.measures[4].id] }
  score.slurs = [{ id: 'manual', startEventId: staff.measures[0].voices[0].events[0].id,
    endEventId: staff.measures[1].voices[0].events[0].id, engraving: { offsetX: 0, height: 3 } }]
  if (kind.startsWith('ties-')) {
    for (let i = 0; i < 2; i++) {
      const event = staff.measures[i].voices[0].events[0] as Note
      event.lyrics = [{ number: 1, text: (i ? '이어서부르는노래' : '함께부르는긴노래') }]
      event.ties = i ? { stop: true } : { start: true }
      if (kind.includes('-chord-')) event.pitches = [{ step: 'C', octave: 4 }, { step: 'E', octave: 4 }]
    }
    if (kind.endsWith('-cross')) score.layout.systemBreakBeforeMeasureIds!.unshift(staff.measures[1].id)
  }
  return score
}
