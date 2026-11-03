// @vitest-environment jsdom
import { Stave, Voice } from 'vexflow'
import { expect, it } from 'vitest'
import { createVoiceOrderFixture } from '../../../testing/voice-order-fixture'
import { createStaveNote } from './NotationPreview'
import { formatNotationVoices } from './format-voices'
import { formatSharedRhythm } from './shared-rhythm-layout'
import { paintNotationEventTone } from './notation-event-tone'

function formatted(tone: 'default' | 'selected' | 'playback', shared: boolean) {
  const score = createVoiceOrderFixture()
  const measure = score.parts[0].staves[0].measures[0]
  const first = measure.voices[0].events[0]
  if (first.type === 'note') first.graceNotes = [{ pitch: { step: 'G', octave: 5 }, slash: true }]
  const source = structuredClone(score)
  const stave = new Stave(8, 0, 600).addClef('treble')
  const groups = measure.voices.map(voice => ({ events: voice.events, notes: voice.events.map(event =>
    createStaveNote(event, measure, voice, new Set(tone === 'selected' ? [first.id] : []),
      undefined, tone === 'playback' && event.id === first.id)) }))
  if (shared) formatSharedRhythm([{ measure, stave, voices: groups }])
  else formatNotationVoices(groups.map(group => new Voice({ numBeats: 4, beatValue: 4 })
    .setMode(Voice.Mode.SOFT).addTickables(group.notes)), stave)
  expect(score).toEqual(source)
  const beforePaint = groups.flatMap(group => group.notes.map(note => ({
    begin: note.getNoteHeadBeginX(), end: note.getNoteHeadEndX(), shift: note.getXShift()
  })))
  groups.forEach(group => group.notes.forEach(paintNotationEventTone))
  const colored = groups[0].notes[0].getStyle()
  if (tone !== 'default') expect(colored).toMatchObject({
    fillStyle: tone === 'selected' ? '#b43d2f' : '#25766f',
    strokeStyle: tone === 'selected' ? '#b43d2f' : '#25766f'
  })
  expect(groups.flatMap(group => group.notes.map(note => ({
    begin: note.getNoteHeadBeginX(), end: note.getNoteHeadEndX(), shift: note.getXShift()
  })))).toEqual(beforePaint)
  return beforePaint
}

it.each(['selected', 'playback'] as const)('keeps %s color out of single-staff voice displacement', tone => {
  expect(formatted(tone, false)).toEqual(formatted('default', false))
})
it.each(['selected', 'playback'] as const)('keeps %s color out of shared rhythm layout', tone => {
  expect(formatted(tone, true)).toEqual(formatted('default', true))
})
