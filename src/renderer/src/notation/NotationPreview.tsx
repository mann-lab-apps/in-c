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
import {
  toVexFlowAccidental,
  toVexFlowClef,
  toVexFlowDuration,
  toVexFlowKey
} from './vexflow-adapter'

interface NotationPreviewProps {
  score: Score
  selectedEventId?: string
  selectedMeasureId?: string
  playbackEventId?: string
  onSelectEvent: (eventId: string) => void
  onSelectMeasure: (measureId: string) => void
}

const MIN_RENDER_WIDTH = 560
const RENDER_HEIGHT = 190

export function NotationPreview({
  score,
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

    const renderer = new Renderer(container, Renderer.Backends.SVG)
    renderer.resize(renderWidth, RENDER_HEIGHT)
    const context = renderer.getContext()
    const measures = score.parts[0]?.staves[0]?.measures ?? []
    const measureWidth = (renderWidth - 32) / Math.max(measures.length, 1)
    const svg = container.querySelector('svg')
    let playbackX: number | undefined

    measures.forEach((measure, measureIndex) => {
      const measureX = 16 + measureIndex * measureWidth
      const stave = new Stave(measureX, 34, measureWidth)
      const clef = toVexFlowClef(measure.clef)

      if (svg) {
        const selectionTarget = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'rect'
        )

        selectionTarget.classList.add('notation-measure')
        selectionTarget.classList.toggle('is-selected', measure.id === selectedMeasureId)
        selectionTarget.setAttribute('data-measure-id', measure.id)
        selectionTarget.setAttribute('x', String(measureX))
        selectionTarget.setAttribute('y', '24')
        selectionTarget.setAttribute('width', String(measureWidth))
        selectionTarget.setAttribute('height', '112')
        selectionTarget.setAttribute('rx', '4')
        selectionTarget.addEventListener('click', () => onSelectMeasure(measure.id))
        svg.append(selectionTarget)
      }

      if (measureIndex === 0) {
        stave
          .addClef(clef)
          .addTimeSignature(`${measure.timeSignature.beats}/${measure.timeSignature.beatType}`)
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
        return { beams, notes, vexVoice }
      })

      new Formatter()
        .joinVoices(voices.map(({ vexVoice }) => vexVoice))
        .formatToStave(
          voices.map(({ vexVoice }) => vexVoice),
          stave
        )

      voices.forEach(({ beams, notes, vexVoice }) => {
        vexVoice.draw(context, stave)
        beams.forEach((beam) => beam.setContext(context).draw())

        notes.forEach((note) => {
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
            playbackX = note.getAbsoluteX()
          }
        })
      })
    })

    if (svg && playbackX !== undefined) {
      const playhead = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'line'
      )

      playhead.classList.add('notation-playhead')
      playhead.setAttribute('x1', String(playbackX))
      playhead.setAttribute('x2', String(playbackX))
      playhead.setAttribute('y1', '24')
      playhead.setAttribute('y2', '138')
      svg.append(playhead)
    }
  }, [
    onSelectEvent,
    onSelectMeasure,
    renderWidth,
    score,
    playbackEventId,
    selectedEventId,
    selectedMeasureId
  ])

  return <div className="notation-preview" ref={containerRef} />
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
