import { useEffect, useRef, useState } from 'react'
import {
  Accidental,
  Dot,
  Formatter,
  Renderer,
  Stave,
  StaveNote,
  Voice
} from 'vexflow'

import type { Measure, Score, VoiceEvent } from '../../../score-core'
import {
  toVexFlowAccidental,
  toVexFlowClef,
  toVexFlowDuration,
  toVexFlowKey
} from './vexflow-adapter'

interface NotationPreviewProps {
  score: Score
  selectedEventId?: string
  onSelectEvent: (eventId: string) => void
}

const MIN_RENDER_WIDTH = 560
const RENDER_HEIGHT = 190

export function NotationPreview({
  score,
  selectedEventId,
  onSelectEvent
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

    measures.forEach((measure, measureIndex) => {
      const stave = new Stave(16 + measureIndex * measureWidth, 34, measureWidth)
      const clef = toVexFlowClef(measure.clef)

      if (measureIndex === 0) {
        stave
          .addClef(clef)
          .addTimeSignature(`${measure.timeSignature.beats}/${measure.timeSignature.beatType}`)
      }

      stave.setContext(context).draw()

      const voices = measure.voices.map((voice) => {
        const notes = voice.events.map((event) =>
          createStaveNote(event, measure, selectedEventId)
        )
        const vexVoice = new Voice({
          numBeats: measure.timeSignature.beats,
          beatValue: measure.timeSignature.beatType
        })

        vexVoice.addTickables(notes)
        return { notes, vexVoice }
      })

      new Formatter()
        .joinVoices(voices.map(({ vexVoice }) => vexVoice))
        .formatToStave(
          voices.map(({ vexVoice }) => vexVoice),
          stave
        )

      voices.forEach(({ notes, vexVoice }) => {
        vexVoice.draw(context, stave)

        notes.forEach((note) => {
          const eventId = note.getAttribute('data-event-id') as string
          const svgElement = note.getSVGElement()

          if (!svgElement) {
            return
          }

          svgElement.classList.add('notation-event')
          svgElement.setAttribute('data-event-id', eventId)
          svgElement.addEventListener('click', () => onSelectEvent(eventId))
        })
      })
    })
  }, [onSelectEvent, renderWidth, score, selectedEventId])

  return <div className="notation-preview" ref={containerRef} />
}

function createStaveNote(
  event: VoiceEvent,
  measure: Measure,
  selectedEventId?: string
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

  if (event.id === selectedEventId) {
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
