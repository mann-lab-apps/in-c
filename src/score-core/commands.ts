import type { CommandResult, Score, ScoreCommand, Voice, VoiceAddress, VoiceEvent } from './types'
import { sortVoiceEvents } from './timing'

export function applyScoreCommand(score: Score, command: ScoreCommand): CommandResult {
  switch (command.type) {
    case 'voice-event.insert':
      return insertVoiceEvent(score, command.target, command.event, command.index)
    case 'voice-event.remove':
      return removeVoiceEvent(score, command.target, command.eventId)
    case 'voice-event.replace':
      return replaceVoiceEvent(score, command.target, command.eventId, command.event)
  }
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
  update: (voice: Voice) => { voice: Voice; undo: ScoreCommand }
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

                const result = update(voice)
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
