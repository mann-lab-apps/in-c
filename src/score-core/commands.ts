import type {
  CommandResult,
  Measure,
  Score,
  ScoreCommand,
  StaffAddress,
  Voice,
  VoiceAddress,
  VoiceEvent
} from './types'
import { sortVoiceEvents, validateMeasureRhythm } from './timing'
import { validateVoiceTuplets } from './tuplets'

export function applyScoreCommand(score: Score, command: ScoreCommand): CommandResult {
  switch (command.type) {
    case 'score-metadata.update':
      return updateScoreMetadata(score, command.title, command.composer)
    case 'score-tempo.update':
      return updateScoreTempo(score, command.tempo)
    case 'score-rehearsal-marks.update':
      return updateScoreRehearsalMarks(score, command.rehearsalMarks)
    case 'score-staff-texts.update':
      return updateScoreStaffTexts(score, command.staffTexts)
    case 'score-dynamics.update':
      return updateScoreDynamics(score, command.dynamics)
    case 'score-hairpins.update':
      return updateScoreHairpins(score, command.hairpins)
    case 'score-slurs.update':
      return updateScoreSlurs(score, command.slurs)
    case 'score-layout.update':
      return updateScoreLayout(score, command.layout)
    case 'voice-event.insert':
      return insertVoiceEvent(score, command.target, command.event, command.index)
    case 'voice-event.remove':
      return removeVoiceEvent(score, command.target, command.eventId)
    case 'voice-event.replace':
      return replaceVoiceEvent(score, command.target, command.eventId, command.event)
    case 'voice-events.replace':
      return replaceVoiceEvents(
        score,
        command.target,
        command.events,
        command.editedEventId
      )
    case 'voice-content.replace':
      return replaceVoiceContent(
        score,
        command.target,
        command.events,
        command.tuplets,
        command.editedEventId
      )
    case 'staff-measure.insert':
      return insertStaffMeasure(
        score,
        command.target,
        command.measure,
        command.index
      )
    case 'staff-measure.remove':
      return removeStaffMeasure(score, command.target, command.measureId)
    case 'staff-measures.replace':
      return replaceStaffMeasures(score, command.target, command.measures)
    case 'score.batch':
      return applyCommandBatch(score, command.commands)
  }
}

function updateScoreSlurs(score: Score, slurs: Score['slurs']): CommandResult {
  return {
    score: {
      ...score,
      slurs
    },
    undo: {
      type: 'score-slurs.update',
      slurs: score.slurs
    }
  }
}

function updateScoreHairpins(
  score: Score,
  hairpins: Score['hairpins']
): CommandResult {
  return {
    score: {
      ...score,
      hairpins
    },
    undo: {
      type: 'score-hairpins.update',
      hairpins: score.hairpins
    }
  }
}

function updateScoreDynamics(
  score: Score,
  dynamics: Score['dynamics']
): CommandResult {
  return {
    score: {
      ...score,
      dynamics
    },
    undo: {
      type: 'score-dynamics.update',
      dynamics: score.dynamics
    }
  }
}

function updateScoreStaffTexts(
  score: Score,
  staffTexts: Score['staffTexts']
): CommandResult {
  return {
    score: {
      ...score,
      staffTexts
    },
    undo: {
      type: 'score-staff-texts.update',
      staffTexts: score.staffTexts
    }
  }
}

function updateScoreRehearsalMarks(
  score: Score,
  rehearsalMarks: Score['rehearsalMarks']
): CommandResult {
  return {
    score: {
      ...score,
      rehearsalMarks
    },
    undo: {
      type: 'score-rehearsal-marks.update',
      rehearsalMarks: score.rehearsalMarks
    }
  }
}

function updateScoreTempo(
  score: Score,
  tempo: Score['tempo']
): CommandResult {
  return {
    score: {
      ...score,
      tempo
    },
    undo: {
      type: 'score-tempo.update',
      tempo: score.tempo
    }
  }
}

function updateScoreLayout(
  score: Score,
  layout: Score['layout']
): CommandResult {
  return {
    score: {
      ...score,
      layout
    },
    undo: {
      type: 'score-layout.update',
      layout: score.layout
    }
  }
}

function updateScoreMetadata(
  score: Score,
  title: string,
  composer: string | undefined
): CommandResult {
  return {
    score: {
      ...score,
      title,
      composer
    },
    undo: {
      type: 'score-metadata.update',
      title: score.title,
      composer: score.composer
    }
  }
}

function insertStaffMeasure(
  score: Score,
  target: StaffAddress,
  measure: Measure,
  index = Number.POSITIVE_INFINITY
): CommandResult {
  return updateStaffMeasures(score, target, (measures) => {
    const insertionIndex = clampIndex(index, measures.length)
    const nextMeasures = [...measures]
    nextMeasures.splice(insertionIndex, 0, measure)

    return {
      measures: renumberMeasures(nextMeasures),
      undo: {
        type: 'staff-measure.remove',
        target,
        measureId: measure.id
      }
    }
  })
}

function removeStaffMeasure(
  score: Score,
  target: StaffAddress,
  measureId: string
): CommandResult {
  return updateStaffMeasures(score, target, (measures) => {
    const index = measures.findIndex((measure) => measure.id === measureId)

    if (index === -1) {
      throw new Error(`Measure not found: ${measureId}`)
    }

    if (measures.length === 1) {
      throw new Error('A staff must contain at least one measure.')
    }

    return {
      measures: renumberMeasures(
        measures.filter((measure) => measure.id !== measureId)
      ),
      undo: {
        type: 'staff-measure.insert',
        target,
        measure: measures[index],
        index
      }
    }
  })
}

function replaceStaffMeasures(
  score: Score,
  target: StaffAddress,
  measures: Measure[]
): CommandResult {
  if (measures.length === 0) {
    throw new Error('A staff must contain at least one measure.')
  }

  return updateStaffMeasures(score, target, (previousMeasures) => ({
    measures: renumberMeasures(measures),
    undo: {
      type: 'staff-measures.replace',
      target,
      measures: previousMeasures
    }
  }))
}

function applyCommandBatch(
  score: Score,
  commands: ScoreCommand[]
): CommandResult {
  if (commands.length === 0) {
    throw new Error('A score batch must contain at least one command.')
  }

  let nextScore = score
  const undoCommands: ScoreCommand[] = []

  for (const command of commands) {
    const result = applyScoreCommand(nextScore, command)
    nextScore = result.score
    undoCommands.unshift(result.undo)
  }

  return {
    score: nextScore,
    undo: {
      type: 'score.batch',
      commands: undoCommands
    }
  }
}

function updateStaffMeasures(
  score: Score,
  target: StaffAddress,
  update: (
    measures: Measure[]
  ) => { measures: Measure[]; undo: ScoreCommand }
): CommandResult {
  let undo: ScoreCommand | undefined

  const parts = score.parts.map((part) => {
    if (part.id !== target.partId) {
      return part
    }

    return {
      ...part,
      staves: part.staves.map((staff) => {
        if (staff.id !== target.staffId) {
          return staff
        }

        const result = update(staff.measures)
        undo = result.undo
        return {
          ...staff,
          measures: result.measures
        }
      })
    }
  })

  if (!undo) {
    throw new Error(`Staff not found: ${target.staffId}`)
  }

  return {
    score: {
      ...score,
      parts
    },
    undo
  }
}

function replaceVoiceEvents(
  score: Score,
  target: VoiceAddress,
  events: VoiceEvent[],
  editedEventId?: string
): CommandResult {
  return updateVoice(score, target, (voice, measure) => {
    const nextVoice = {
      ...voice,
      events: sortVoiceEvents(events)
    }
    const tupletErrors = validateVoiceTuplets(nextVoice)

    if (tupletErrors.length > 0) {
      throw new Error(`Tuplet transaction is invalid: ${tupletErrors.join(', ')}`)
    }
    const nextMeasure = {
      ...measure,
      voices: measure.voices.map((candidate) =>
        candidate.id === voice.id ? nextVoice : candidate
      )
    }
    const rhythm = validateMeasureRhythm(nextMeasure)

    if (!rhythm.isExact) {
      throw new Error(
        `Rhythm transaction must preserve an exact measure: ${rhythm.status}`
      )
    }

    return {
      voice: nextVoice,
      undo: {
        type: 'voice-events.replace',
        target,
        events: voice.events,
        editedEventId
      }
    }
  })
}

function replaceVoiceContent(
  score: Score,
  target: VoiceAddress,
  events: VoiceEvent[],
  tuplets: Voice['tuplets'],
  editedEventId?: string
): CommandResult {
  return updateVoice(score, target, (voice, measure) => {
    const nextVoice = {
      ...voice,
      events: sortVoiceEvents(events),
      tuplets
    }
    const nextMeasure = {
      ...measure,
      voices: measure.voices.map((candidate) =>
        candidate.id === voice.id ? nextVoice : candidate
      )
    }
    const rhythm = validateMeasureRhythm(nextMeasure)
    const tupletErrors = validateVoiceTuplets(nextVoice)

    if (!rhythm.isExact) {
      throw new Error(
        `Tuplet transaction must preserve an exact measure: ${rhythm.status}`
      )
    }

    if (tupletErrors.length > 0) {
      throw new Error(`Tuplet transaction is invalid: ${tupletErrors.join(', ')}`)
    }

    return {
      voice: nextVoice,
      undo: {
        type: 'voice-content.replace',
        target,
        events: voice.events,
        tuplets: voice.tuplets,
        editedEventId
      }
    }
  })
}

function insertVoiceEvent(
  score: Score,
  target: VoiceAddress,
  event: VoiceEvent,
  index = Number.POSITIVE_INFINITY
): CommandResult {
  return updateVoice(score, target, (voice) => {
    const insertionIndex = clampIndex(index, voice.events.length)
    const events = [...voice.events]
    events.splice(insertionIndex, 0, event)

    return {
      voice: {
        ...voice,
        events: sortVoiceEvents(events)
      },
      undo: {
        type: 'voice-event.remove',
        target,
        eventId: event.id
      }
    }
  })
}

function removeVoiceEvent(score: Score, target: VoiceAddress, eventId: string): CommandResult {
  return updateVoice(score, target, (voice) => {
    const eventIndex = voice.events.findIndex((event) => event.id === eventId)

    if (eventIndex === -1) {
      throw new Error(`Voice event not found: ${eventId}`)
    }

    const event = voice.events[eventIndex]
    const events = voice.events.filter((candidate) => candidate.id !== eventId)

    return {
      voice: {
        ...voice,
        events
      },
      undo: {
        type: 'voice-event.insert',
        target,
        event,
        index: eventIndex
      }
    }
  })
}

function replaceVoiceEvent(
  score: Score,
  target: VoiceAddress,
  eventId: string,
  event: VoiceEvent
): CommandResult {
  return updateVoice(score, target, (voice) => {
    const eventIndex = voice.events.findIndex((candidate) => candidate.id === eventId)

    if (eventIndex === -1) {
      throw new Error(`Voice event not found: ${eventId}`)
    }

    const previousEvent = voice.events[eventIndex]
    const events = voice.events.map((candidate) => (candidate.id === eventId ? event : candidate))

    return {
      voice: {
        ...voice,
        events: sortVoiceEvents(events)
      },
      undo: {
        type: 'voice-event.replace',
        target,
        eventId: event.id,
        event: previousEvent
      }
    }
  })
}

function updateVoice(
  score: Score,
  target: VoiceAddress,
  update: (
    voice: Voice,
    measure: Measure
  ) => { voice: Voice; undo: ScoreCommand }
): CommandResult {
  let didUpdate = false
  let undo: ScoreCommand | undefined

  const parts = score.parts.map((part) => {
    if (part.id !== target.partId) {
      return part
    }

    return {
      ...part,
      staves: part.staves.map((staff) => {
        if (staff.id !== target.staffId) {
          return staff
        }

        return {
          ...staff,
          measures: staff.measures.map((measure) => {
            if (measure.id !== target.measureId) {
              return measure
            }

            return {
              ...measure,
              voices: measure.voices.map((voice) => {
                if (voice.id !== target.voiceId) {
                  return voice
                }

                const result = update(voice, measure)
                didUpdate = true
                undo = result.undo
                return result.voice
              })
            }
          })
        }
      })
    }
  })

  if (!didUpdate || !undo) {
    throw new Error(`Voice not found: ${target.voiceId}`)
  }

  return {
    score: {
      ...score,
      parts
    },
    undo
  }
}

function clampIndex(index: number, length: number): number {
  if (index < 0) {
    return 0
  }

  if (index > length) {
    return length
  }

  return index
}

function renumberMeasures(measures: Measure[]): Measure[] {
  return measures.map((measure, index) => ({
    ...measure,
    number: index + 1
  }))
}
