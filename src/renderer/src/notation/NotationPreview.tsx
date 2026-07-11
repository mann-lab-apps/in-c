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

interface SystemBounds {
  x1: number
  x2: number
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
    const pointsByEventId = new Map<string, CursorPoint>()
    const boundsBySystemIndex = new Map<number, SystemBounds>()
    const selectedEventIdSet = new Set(selectedEventIds)
    let dragAnchorEventId: string | undefined

    const clearDragAnchor = () => {
      dragAnchorEventId = undefined
    }

    window.addEventListener('mouseup', clearDragAnchor)

    if (svg) {
      svg.setAttribute('viewBox', `0 0 ${renderWidth} ${layout.height}`)
      svg.setAttribute('preserveAspectRatio', 'xMinYMin meet')
    }

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
      const systemBounds = boundsBySystemIndex.get(placement.systemIndex)
      boundsBySystemIndex.set(placement.systemIndex, {
        x1: Math.min(systemBounds?.x1 ?? placement.x, placement.x),
        x2: Math.max(
          systemBounds?.x2 ?? placement.x + placement.width,
          placement.x + placement.width
        ),
        y: placement.y
      })
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

      let firstEventX: number | undefined

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

          pointsByEventId.set(eventId, {
            x: note.getAbsoluteX(),
            y: placement.y
          })
          firstEventX = Math.min(firstEventX ?? note.getAbsoluteX(), note.getAbsoluteX())

          const event = events[noteIndex]

          if (svg && event?.type === 'note' && event.articulations?.length) {
            drawArticulations(
              svg,
              note.getAbsoluteX(),
              placement.y,
              event.articulations
            )
          }

          if (svg && event?.fermata) {
            drawFermata(svg, note.getAbsoluteX(), placement.y)
          }

          if (svg && event?.breathMark) {
            drawBreathMark(
              svg,
              note.getAbsoluteX(),
              placement.y,
              event.breathMark,
              Boolean(event.fermata)
            )
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

      const dynamic = dynamicsByMeasureId.get(measure.id)

      if (svg && dynamic) {
        drawDynamicMark(
          svg,
          (firstEventX ?? placement.x + 88) - 2,
          placement.y + 78,
          dynamic.value,
          measure.id
        )
      }
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

    if (svg) {
      ;(score.slurs ?? []).forEach((slur, slurIndex) => {
        const start = pointsByEventId.get(slur.startEventId)
        const end = pointsByEventId.get(slur.endEventId)
        const startSystem = systemsByEventId.get(slur.startEventId)
        const endSystem = systemsByEventId.get(slur.endEventId)

        if (
          !start ||
          !end ||
          startSystem === undefined ||
          endSystem === undefined
        ) {
          return
        }

        drawSlurSegments(
          svg,
          start,
          end,
          startSystem,
          endSystem,
          boundsBySystemIndex,
          slurIndex
        )
      })

      for (const hairpin of score.hairpins ?? []) {
        const start = pointsByEventId.get(hairpin.startEventId)
        const end = pointsByEventId.get(hairpin.endEventId)
        const startSystem = systemsByEventId.get(hairpin.startEventId)
        const endSystem = systemsByEventId.get(hairpin.endEventId)

        if (!start || !end || startSystem === undefined || endSystem === undefined) {
          continue
        }

        drawHairpinSegments(
          svg,
          start,
          end,
          hairpin.type,
          startSystem,
          endSystem,
          boundsBySystemIndex
        )
      }
    }

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
  text.setAttribute('y', '36')
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
  label: string,
  measureId: string
): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-dynamic-mark')
  text.setAttribute('data-measure-id', measureId)
  text.setAttribute('x', String(x))
  text.setAttribute('y', String(y))
  text.textContent = label
  svg.append(text)
}

function drawHairpinSegments(
  svg: SVGSVGElement,
  start: CursorPoint,
  end: CursorPoint,
  type: string,
  startSystem: number,
  endSystem: number,
  boundsBySystemIndex: Map<number, SystemBounds>
): void {
  const firstSystem = Math.min(startSystem, endSystem)
  const lastSystem = Math.max(startSystem, endSystem)

  for (let systemIndex = firstSystem; systemIndex <= lastSystem; systemIndex += 1) {
    const bounds = boundsBySystemIndex.get(systemIndex)

    if (!bounds) {
      continue
    }

    const isFirst = systemIndex === startSystem
    const isLast = systemIndex === endSystem
    const x1 = isFirst ? start.x + 10 : bounds.x1 + 22
    const x2 = isLast ? Math.max(x1 + 24, end.x + 22) : bounds.x2 - 18

    if (x2 <= x1 + 8) {
      continue
    }

    drawHairpinSegment(svg, x1, x2, bounds.y, type, isFirst, isLast)
  }
}

function drawHairpinSegment(
  svg: SVGSVGElement,
  x1: number,
  x2: number,
  staffY: number,
  type: string,
  isFirst: boolean,
  isLast: boolean
): void {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  const upper = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  const lower = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  const y = staffY + 82
  const leftOpening =
    type === 'diminuendo'
      ? 10
      : isFirst
        ? 0
        : 8
  const rightOpening =
    type === 'crescendo'
      ? 10
      : isLast
        ? 0
        : 8

  group.classList.add('notation-hairpin')

  upper.setAttribute('x1', String(x1))
  upper.setAttribute('y1', String(y - leftOpening))
  upper.setAttribute('x2', String(x2))
  upper.setAttribute('y2', String(y - rightOpening))
  lower.setAttribute('x1', String(x1))
  lower.setAttribute('y1', String(y + leftOpening))
  lower.setAttribute('x2', String(x2))
  lower.setAttribute('y2', String(y + rightOpening))

  group.append(upper, lower)
  svg.append(group)
}

function drawSlurSegments(
  svg: SVGSVGElement,
  start: CursorPoint,
  end: CursorPoint,
  startSystem: number,
  endSystem: number,
  boundsBySystemIndex: Map<number, SystemBounds>,
  slurIndex: number
): void {
  const firstSystem = Math.min(startSystem, endSystem)
  const lastSystem = Math.max(startSystem, endSystem)

  for (let systemIndex = firstSystem; systemIndex <= lastSystem; systemIndex += 1) {
    const bounds = boundsBySystemIndex.get(systemIndex)

    if (!bounds) {
      continue
    }

    const isFirst = systemIndex === startSystem
    const isLast = systemIndex === endSystem
    const x1 = isFirst ? start.x + 6 : bounds.x1 + 22
    const x2 = isLast ? Math.max(x1 + 28, end.x + 12) : bounds.x2 - 18

    if (x2 <= x1 + 8) {
      continue
    }

    drawSlurSegment(svg, x1, x2, bounds.y, slurIndex, isFirst, isLast)
  }
}

function drawSlurSegment(
  svg: SVGSVGElement,
  x1: number,
  x2: number,
  staffY: number,
  slurIndex: number,
  isFirst: boolean,
  isLast: boolean
): void {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  const offset = (slurIndex % 3) * 8
  const y = staffY - 10 - offset
  const controlX = (x1 + x2) / 2
  const controlY = y - 26 - offset
  const startX = isFirst ? x1 : x1 - 8
  const endX = isLast ? x2 : x2 + 8

  path.classList.add('notation-slur')
  path.setAttribute(
    'd',
    `M ${startX} ${y} Q ${controlX} ${controlY} ${endX} ${y}`
  )
  svg.append(path)
}

function drawArticulations(
  svg: SVGSVGElement,
  x: number,
  staffY: number,
  articulations: string[]
): void {
  articulations.forEach((articulation, index) => {
    const y = staffY - 12 - index * 12

    if (articulation === 'staccato') {
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle')

      dot.classList.add('notation-articulation')
      dot.setAttribute('cx', String(x + 4))
      dot.setAttribute('cy', String(y))
      dot.setAttribute('r', '2.6')
      svg.append(dot)
    } else if (articulation === 'accent') {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

      text.classList.add('notation-articulation')
      text.setAttribute('x', String(x))
      text.setAttribute('y', String(y + 4))
      text.textContent = '>'
      svg.append(text)
    }
  })
}

function drawFermata(svg: SVGSVGElement, x: number, staffY: number): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-fermata')
  text.setAttribute('x', String(x + 4))
  text.setAttribute('y', String(staffY - 22))
  text.textContent = '𝄐'
  svg.append(text)
}

function drawBreathMark(
  svg: SVGSVGElement,
  x: number,
  staffY: number,
  breathMark: string,
  hasFermata: boolean
): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-breath-mark')
  text.setAttribute('x', String(x + 14))
  text.setAttribute('y', String(staffY - (hasFermata ? 2 : 16)))
  text.textContent = breathMark === 'caesura' ? '//' : ','
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
