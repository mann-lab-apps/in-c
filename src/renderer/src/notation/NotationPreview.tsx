import { useEffect, useRef, useState } from 'react'
import {
  Accidental,
  Beam,
  Dot,
  Formatter,
  Renderer,
  Stave,
  StaveNote,
  Voice
} from 'vexflow'

import {
  sortVoiceEvents,
  type Measure,
  type Score,
  type VoiceEvent
} from '../../../score-core'
import { createBeamGroups } from './beam-groups'
import { createSystemLayout } from './system-layout'
import {
  toVexFlowAccidental,
  toVexFlowClef,
  toVexFlowDuration,
  toVexFlowKey,
  toVexFlowKeySignature
} from './vexflow-adapter'

interface NotationPreviewProps {
  score: Score
  inputCursor?: {
    measureId: string
    tick: number
  }
  selectedEventId?: string
  selectedMeasureId?: string
  playbackEventId?: string
  onSelectEvent: (eventId: string) => void
  onSelectMeasure: (measureId: string) => void
}

const MIN_RENDER_WIDTH = 560

interface CursorPoint {
  x: number
  y: number
}

export function NotationPreview({
  score,
  inputCursor,
  selectedEventId,
  selectedMeasureId,
  playbackEventId,
  onSelectEvent,
  onSelectMeasure
}: NotationPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [renderWidth, setRenderWidth] = useState(MIN_RENDER_WIDTH)

  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    const resizeObserver = new ResizeObserver(([entry]) => {
      setRenderWidth(Math.max(MIN_RENDER_WIDTH, Math.floor(entry.contentRect.width)))
    })

    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [])

  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    container.replaceChildren()

    const measures = score.parts[0]?.staves[0]?.measures ?? []
    const layout = createSystemLayout(measures, renderWidth)
    const renderer = new Renderer(container, Renderer.Backends.SVG)
    renderer.resize(renderWidth, layout.height)
    const context = renderer.getContext()
    const svg = container.querySelector('svg')
    let inputPoint: CursorPoint | undefined
    let playbackPoint: CursorPoint | undefined

    layout.placements.forEach((placement, placementIndex) => {
      const { measure } = placement
      const previousPlacement = layout.placements[placementIndex - 1]
      const previousMeasure =
        previousPlacement?.systemIndex === placement.systemIndex
          ? previousPlacement.measure
          : undefined
      const stave = new Stave(
        placement.x,
        placement.y,
        placement.width
      )
      const clef = toVexFlowClef(measure.clef)

      if (svg) {
        const selectionTarget = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'rect'
        )

        selectionTarget.classList.add('notation-measure')
        selectionTarget.classList.toggle('is-selected', measure.id === selectedMeasureId)
        selectionTarget.setAttribute('data-measure-id', measure.id)
        selectionTarget.setAttribute('data-system-index', String(placement.systemIndex))
        selectionTarget.setAttribute('x', String(placement.x))
        selectionTarget.setAttribute('y', String(placement.y - 10))
        selectionTarget.setAttribute('width', String(placement.width))
        selectionTarget.setAttribute('height', '112')
        selectionTarget.setAttribute('rx', '4')
        selectionTarget.addEventListener('click', () => onSelectMeasure(measure.id))
        svg.append(selectionTarget)
      }

      if (
        placement.isSystemStart ||
        !previousMeasure ||
        !sameClef(previousMeasure, measure)
      ) {
        stave.addClef(clef)
      }

      if (
        placement.isSystemStart ||
        !previousMeasure ||
        !sameKeySignature(previousMeasure, measure)
      ) {
        stave.addKeySignature(toVexFlowKeySignature(measure.keySignature))
      }

      if (
        placement.isSystemStart ||
        !previousMeasure ||
        !sameTimeSignature(previousMeasure, measure)
      ) {
        stave.addTimeSignature(
          `${measure.timeSignature.beats}/${measure.timeSignature.beatType}`
        )
      }

      stave.setContext(context).draw()

      const voices = measure.voices.map((voice) => {
        const events = sortVoiceEvents(voice.events)
        const notes = events.map((event) =>
          createStaveNote(event, measure, selectedEventId, playbackEventId)
        )
        const notesByEventId = new Map(
          notes.map((note) => [
            note.getAttribute('data-event-id') as string,
            note
          ])
        )
        const beams = createBeamGroups(measure, voice).map(
          (group) =>
            new Beam(
              group.eventIds.map((eventId) => {
                const note = notesByEventId.get(eventId)

                if (!note) {
                  throw new Error(`Beam event not found: ${eventId}`)
                }

                return note
              })
            )
        )
        const vexVoice = new Voice({
          numBeats: measure.timeSignature.beats,
          beatValue: measure.timeSignature.beatType
        })

        vexVoice.setMode(Voice.Mode.SOFT)
        vexVoice.addTickables(notes)
        return { beams, events, notes, vexVoice }
      })

      new Formatter()
        .joinVoices(voices.map(({ vexVoice }) => vexVoice))
        .formatToStave(
          voices.map(({ vexVoice }) => vexVoice),
          stave
        )

      voices.forEach(({ beams, events, notes, vexVoice }) => {
        vexVoice.draw(context, stave)
        beams.forEach((beam) => beam.setContext(context).draw())

        notes.forEach((note, noteIndex) => {
          const eventId = note.getAttribute('data-event-id') as string
          const svgElement = note.getSVGElement()

          if (!svgElement) {
            return
          }

          svgElement.classList.add('notation-event')
          svgElement.setAttribute('data-event-id', eventId)
          svgElement.setAttribute('role', 'button')
          svgElement.setAttribute('tabindex', '0')
          svgElement.addEventListener('click', (event) => {
            event.stopPropagation()
            onSelectEvent(eventId)
          })

          if (eventId === playbackEventId) {
            playbackPoint = {
              x: note.getAbsoluteX(),
              y: placement.y
            }
          }

          if (
            measure.id === inputCursor?.measureId &&
            events[noteIndex]?.position.tick === inputCursor.tick
          ) {
            inputPoint = {
              x: note.getAbsoluteX(),
              y: placement.y
            }
          }
        })
      })
    })

    if (svg && inputPoint) {
      const cursor = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'line'
      )

      cursor.classList.add('notation-input-cursor')
      cursor.setAttribute('x1', String(inputPoint.x - 7))
      cursor.setAttribute('x2', String(inputPoint.x - 7))
      cursor.setAttribute('y1', String(inputPoint.y - 4))
      cursor.setAttribute('y2', String(inputPoint.y + 98))
      svg.append(cursor)
    }

    if (svg && playbackPoint) {
      const playhead = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'line'
      )

      playhead.classList.add('notation-playhead')
      playhead.setAttribute('x1', String(playbackPoint.x))
      playhead.setAttribute('x2', String(playbackPoint.x))
      playhead.setAttribute('y1', String(playbackPoint.y - 10))
      playhead.setAttribute('y2', String(playbackPoint.y + 104))
      svg.append(playhead)
    }
  }, [
    onSelectEvent,
    onSelectMeasure,
    renderWidth,
    score,
    inputCursor,
    playbackEventId,
    selectedEventId,
    selectedMeasureId
  ])

  return <div className="notation-preview" ref={containerRef} />
}

function sameClef(previous: Measure, current: Measure): boolean {
  return (
    previous.clef.sign === current.clef.sign &&
    previous.clef.line === current.clef.line &&
    previous.clef.octaveChange === current.clef.octaveChange
  )
}

function sameKeySignature(previous: Measure, current: Measure): boolean {
  return (
    previous.keySignature.fifths === current.keySignature.fifths &&
    previous.keySignature.mode === current.keySignature.mode
  )
}

function sameTimeSignature(previous: Measure, current: Measure): boolean {
  return (
    previous.timeSignature.beats === current.timeSignature.beats &&
    previous.timeSignature.beatType === current.timeSignature.beatType
  )
}

function createStaveNote(
  event: VoiceEvent,
  measure: Measure,
  selectedEventId?: string,
  playbackEventId?: string
): StaveNote {
  const clef = toVexFlowClef(measure.clef)
  const isRest = event.type === 'rest'
  const note = new StaveNote({
    clef,
    keys: isRest ? ['b/4'] : [toVexFlowKey(event.pitch)],
    duration: toVexFlowDuration(event.duration, isRest),
    autoStem: true
  })

  note.setAttribute('data-event-id', event.id)

  if (event.id === playbackEventId) {
    note.setStyle({
      fillStyle: '#25766f',
      strokeStyle: '#25766f'
    })
  } else if (event.id === selectedEventId) {
    note.setStyle({
      fillStyle: '#b43d2f',
      strokeStyle: '#b43d2f'
    })
  }

  if (event.type === 'note') {
    const accidental = toVexFlowAccidental(event.pitch)

    if (accidental) {
      note.addModifier(new Accidental(accidental), 0)
    }
  }

  for (let dotIndex = 0; dotIndex < event.duration.dots; dotIndex += 1) {
    Dot.buildAndAttach([note], { all: true })
  }

  return note
}
