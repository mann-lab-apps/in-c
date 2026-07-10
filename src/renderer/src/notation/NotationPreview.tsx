import { useEffect, useRef, useState } from 'react'
import {
  Accidental,
  Beam,
  Dot,
  Formatter,
  Renderer,
  Stave,
  StaveNote,
  StaveTie,
  Tuplet as VexTuplet,
  Voice
} from 'vexflow'

import {
  collectTiePairs,
  measureDurationTicks,
  resolveNotePitch,
  shouldDisplayAccidental,
  sortVoiceEvents,
  type Measure,
  type Score,
  type Voice as ScoreVoice,
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
import { resolveNotationEventTone } from './visual-state'

interface NotationPreviewProps {
  score: Score
  inputCursor?: {
    measureId: string
    tick: number
  }
  selectedEventId?: string
  selectedEventIds?: string[]
  selectedMeasureId?: string
  playbackEventId?: string
  onSelectEvent: (eventId: string, extendRange?: boolean) => void
  onSelectEventRange: (anchorEventId: string, focusEventId: string) => void
  onSelectMeasure: (measureId: string) => void
}

const MIN_RENDER_WIDTH = 560
const STABLE_BEAM_MAX_SLOPE = 0.12
const STABLE_BEAM_SLOPE_COST = 220

interface CursorPoint {
  x: number
  y: number
}

export function NotationPreview({
  score,
  inputCursor,
  selectedEventId,
  selectedEventIds = [],
  selectedMeasureId,
  playbackEventId,
  onSelectEvent,
  onSelectEventRange,
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
    const layout = createSystemLayout(measures, renderWidth, {
      layout: score.layout
    })
    const renderer = new Renderer(container, Renderer.Backends.SVG)
    renderer.resize(renderWidth, layout.height)
    const context = renderer.getContext()
    const svg = container.querySelector('svg')
    let inputPoint: CursorPoint | undefined
    let playbackPoint: CursorPoint | undefined
    const notesByEventId = new Map<string, StaveNote>()
    const systemsByEventId = new Map<string, number>()
    const selectedEventIdSet = new Set(selectedEventIds)
    let dragAnchorEventId: string | undefined

    const clearDragAnchor = () => {
      dragAnchorEventId = undefined
    }

    window.addEventListener('mouseup', clearDragAnchor)

    if (svg && score.tempo) {
      drawTempoMarking(svg, score.tempo.text ?? `♩ = ${score.tempo.bpm}`)
    }

    const rehearsalMarksByMeasureId = new Map(
      (score.rehearsalMarks ?? []).map((mark) => [mark.measureId, mark])
    )
    const staffTextsByMeasureId = new Map(
      (score.staffTexts ?? []).map((text) => [text.measureId, text])
    )
    const dynamicsByMeasureId = new Map(
      (score.dynamics ?? []).map((dynamic) => [dynamic.measureId, dynamic])
    )

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

      const rehearsalMark = rehearsalMarksByMeasureId.get(measure.id)

      if (svg && rehearsalMark) {
        drawRehearsalMark(svg, placement.x + 18, placement.y - 28, rehearsalMark.text)
      }

      const staffText = staffTextsByMeasureId.get(measure.id)

      if (svg && staffText) {
        drawStaffText(svg, placement.x + 18, placement.y - 8, staffText.text)
      }

      const dynamic = dynamicsByMeasureId.get(measure.id)

      if (svg && dynamic) {
        drawDynamicMark(svg, placement.x + 22, placement.y + 78, dynamic.value)
      }

      const voices = measure.voices.map((voice) => {
        const events = sortVoiceEvents(voice.events)
        const notes = events.map((event) =>
          createStaveNote(
            event,
            measure,
            voice,
            selectedEventIdSet,
            selectedEventId,
            playbackEventId
          )
        )
        const measureNotesByEventId = new Map(
          notes.map((note) => [
            note.getAttribute('data-event-id') as string,
            note
          ])
        )
        notes.forEach((note) => {
          const eventId = note.getAttribute('data-event-id') as string
          notesByEventId.set(eventId, note)
          systemsByEventId.set(eventId, placement.systemIndex)
        })
        const beams = createBeamGroups(measure, voice).map((group) =>
          createStableBeam(
            group.eventIds.map((eventId) => {
              const note = measureNotesByEventId.get(eventId)

              if (!note) {
                throw new Error(`Beam event not found: ${eventId}`)
              }

              return note
            })
          )
        )
        const tuplets = (voice.tuplets ?? []).map((group) => {
          const groupEvents = group.eventIds.map((eventId) =>
            events.find((event) => event.id === eventId)
          )
          const groupNotes = group.eventIds.map((eventId) => {
            const note = measureNotesByEventId.get(eventId)

            if (!note) {
              throw new Error(`Tuplet event not found: ${eventId}`)
            }

            return note
          })

          return new VexTuplet(groupNotes, {
            numNotes: group.actualNotes,
            notesOccupied: group.normalNotes,
            bracketed: groupEvents.some((event) => event?.type === 'rest'),
            ratioed: group.actualNotes !== 3 || group.normalNotes !== 2
          })
        })
        const vexVoice = new Voice({
          numBeats: measure.timeSignature.beats,
          beatValue: measure.timeSignature.beatType
        })

        vexVoice.setMode(Voice.Mode.SOFT)
        vexVoice.addTickables(notes)
        return { beams, events, notes, tuplets, vexVoice }
      })

      new Formatter()
        .joinVoices(voices.map(({ vexVoice }) => vexVoice))
        .formatToStave(
          voices.map(({ vexVoice }) => vexVoice),
          stave
        )

      voices.forEach(({ beams, events, notes, tuplets, vexVoice }) => {
        vexVoice.draw(context, stave)
        beams.forEach((beam) => beam.setContext(context).draw())
        tuplets.forEach((tuplet) => tuplet.setContext(context).draw())

        notes.forEach((note, noteIndex) => {
          const eventId = note.getAttribute('data-event-id') as string
          const svgElement = note.getSVGElement()

          if (!svgElement) {
            return
          }

          svgElement.classList.add('notation-event')
          svgElement.classList.toggle('is-preview', isPreviewEventId(eventId))
          svgElement.classList.toggle(
            'is-selected',
            resolveNotationEventTone(
              eventId,
              selectedEventIdSet,
              selectedEventId,
              playbackEventId
            ) === 'selected'
          )
          svgElement.classList.toggle(
            'is-playback',
            resolveNotationEventTone(
              eventId,
              selectedEventIdSet,
              selectedEventId,
              playbackEventId
            ) === 'playback'
          )
          svgElement.setAttribute('data-event-id', eventId)

          if (!isPreviewEventId(eventId)) {
            svgElement.setAttribute('role', 'button')
            svgElement.setAttribute('tabindex', '0')
            svgElement.addEventListener('click', (event) => {
              event.stopPropagation()
              onSelectEvent(eventId, event.shiftKey)
            })
            svgElement.addEventListener('mousedown', (event) => {
              event.preventDefault()
              event.stopPropagation()
              dragAnchorEventId = eventId
              onSelectEvent(eventId, event.shiftKey)
            })
            svgElement.addEventListener('mouseenter', (event) => {
              if (!dragAnchorEventId || event.buttons !== 1) {
                return
              }

              event.preventDefault()
              onSelectEventRange(dragAnchorEventId, eventId)
            })
          }

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

        if (
          !inputPoint &&
          measure.id === inputCursor?.measureId &&
          inputCursor.tick === measureDurationTicks(measure)
        ) {
          inputPoint = {
            x: placement.x + placement.width,
            y: placement.y
          }
        }
      })
    })

    collectTiePairs(score).forEach((pair) => {
      const firstNote = notesByEventId.get(pair.fromEventId)
      const lastNote = notesByEventId.get(pair.toEventId)

      if (!firstNote || !lastNote) {
        return
      }

      if (
        systemsByEventId.get(pair.fromEventId) ===
        systemsByEventId.get(pair.toEventId)
      ) {
        drawTie(context, firstNote, lastNote)
      } else {
        drawTie(context, firstNote, null)
        drawTie(context, null, lastNote)
      }
    })

    const overlayGroup =
      svg && (inputPoint || playbackPoint)
        ? document.createElementNS('http://www.w3.org/2000/svg', 'g')
        : undefined

    if (overlayGroup) {
      overlayGroup.classList.add('notation-state-overlays')
      overlayGroup.setAttribute(
        'aria-label',
        '입력 커서와 재생 커서 상태 표시'
      )
      svg?.append(overlayGroup)
    }

    if (overlayGroup && inputPoint) {
      const cursor = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'line'
      )

      cursor.classList.add('notation-input-cursor')
      cursor.setAttribute('aria-label', '다음 입력 위치')
      cursor.setAttribute('x1', String(inputPoint.x - 7))
      cursor.setAttribute('x2', String(inputPoint.x - 7))
      cursor.setAttribute('y1', String(inputPoint.y - 4))
      cursor.setAttribute('y2', String(inputPoint.y + 98))
      overlayGroup.append(cursor)
    }

    if (overlayGroup && playbackPoint) {
      const playhead = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'line'
      )

      playhead.classList.add('notation-playhead')
      playhead.setAttribute('aria-label', '재생 위치')
      playhead.setAttribute('x1', String(playbackPoint.x))
      playhead.setAttribute('x2', String(playbackPoint.x))
      playhead.setAttribute('y1', String(playbackPoint.y - 10))
      playhead.setAttribute('y2', String(playbackPoint.y + 104))
      overlayGroup.append(playhead)
    }

    return () => {
      window.removeEventListener('mouseup', clearDragAnchor)
    }
  }, [
    onSelectEvent,
    onSelectEventRange,
    onSelectMeasure,
    renderWidth,
    score,
    inputCursor,
    playbackEventId,
    selectedEventId,
    selectedEventIds,
    selectedMeasureId
  ])

  return <div className="notation-preview" ref={containerRef} />
}

function drawTempoMarking(svg: SVGSVGElement, label: string): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-tempo-marking')
  text.setAttribute('x', '32')
  text.setAttribute('y', '22')
  text.textContent = label
  svg.append(text)
}

function drawRehearsalMark(
  svg: SVGSVGElement,
  x: number,
  y: number,
  label: string
): void {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  const width = Math.max(24, label.length * 10 + 14)

  group.classList.add('notation-rehearsal-mark')
  rect.setAttribute('x', String(x))
  rect.setAttribute('y', String(y))
  rect.setAttribute('width', String(width))
  rect.setAttribute('height', '24')
  rect.setAttribute('rx', '3')
  text.setAttribute('x', String(x + width / 2))
  text.setAttribute('y', String(y + 17))
  text.textContent = label
  group.append(rect, text)
  svg.append(group)
}

function drawStaffText(
  svg: SVGSVGElement,
  x: number,
  y: number,
  label: string
): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-staff-text')
  text.setAttribute('x', String(x))
  text.setAttribute('y', String(y))
  text.textContent = label
  svg.append(text)
}

function drawDynamicMark(
  svg: SVGSVGElement,
  x: number,
  y: number,
  label: string
): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-dynamic-mark')
  text.setAttribute('x', String(x))
  text.setAttribute('y', String(y))
  text.textContent = label
  svg.append(text)
}

function drawTie(
  context: ReturnType<Renderer['getContext']>,
  firstNote: StaveNote | null,
  lastNote: StaveNote | null
): void {
  new StaveTie({
    firstNote,
    lastNote,
    firstIndexes: [0],
    lastIndexes: [0]
  })
    .setContext(context)
    .draw()
}

function isPreviewEventId(eventId: string): boolean {
  return eventId.startsWith('preview-')
}

function createStableBeam(notes: StaveNote[]): Beam {
  const beam = new Beam(notes, true)

  beam.renderOptions.maxSlope = STABLE_BEAM_MAX_SLOPE
  beam.renderOptions.minSlope = -STABLE_BEAM_MAX_SLOPE
  beam.renderOptions.slopeCost = STABLE_BEAM_SLOPE_COST

  return beam
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
  voice: ScoreVoice,
  selectedEventIds: Set<string>,
  selectedEventId?: string,
  playbackEventId?: string
): StaveNote {
  const clef = toVexFlowClef(measure.clef)
  const isRest = event.type === 'rest'
  const pitch =
    event.type === 'note' ? resolveNotePitch(measure, voice, event) : undefined
  const note = new StaveNote({
    clef,
    keys: isRest ? ['b/4'] : [toVexFlowKey(pitch!)],
    duration: toVexFlowDuration(event.duration, isRest),
    autoStem: true
  })

  note.setAttribute('data-event-id', event.id)

  switch (
    resolveNotationEventTone(
      event.id,
      selectedEventIds,
      selectedEventId,
      playbackEventId
    )
  ) {
    case 'selected':
      note.setStyle({
        fillStyle: '#b43d2f',
        strokeStyle: '#b43d2f'
      })
      break
    case 'playback':
      note.setStyle({
        fillStyle: '#25766f',
        strokeStyle: '#25766f'
      })
      break
  }

  if (
    event.type === 'note' &&
    pitch &&
    !event.ties?.stop &&
    shouldDisplayAccidental(measure, voice, event)
  ) {
    const accidental = toVexFlowAccidental(pitch)

    if (accidental) {
      note.addModifier(new Accidental(accidental), 0)
    }
  }

  for (let dotIndex = 0; dotIndex < event.duration.dots; dotIndex += 1) {
    Dot.buildAndAttach([note], { all: true })
  }

  return note
}
