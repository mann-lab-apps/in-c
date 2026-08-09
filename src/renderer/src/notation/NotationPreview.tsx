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
  durationToTicks,
  measureDurationTicks,
  resolveNotePitch,
  TICKS_PER_QUARTER,
  type RhythmFeelMarking,
  shouldDisplayAccidental,
  sortVoiceEvents,
  type Measure,
  type Score,
  type TempoMarking,
  type Voice as ScoreVoice,
  type VoiceEvent
} from '../../../score-core'
import { createBeamGroups } from './beam-groups'
import {
  createSystemLayout,
  leadingNotationPadding
} from './system-layout'
import {
  toVexFlowAccidental,
  toVexFlowClef,
  toVexFlowDuration,
  toVexFlowKey,
  toVexFlowKeySignature
} from './vexflow-adapter'
import {
  resolveHairpinOpenings,
  resolveHairpinSegments
} from './hairpin-rendering'
import { resolveMixedTupletOnsetShifts } from './tuplet-spacing'
import { resolveNotationEventTone } from './visual-state'

interface NotationPreviewProps {
  score: Score
  inlineLyricEditor?: InlineLyricEditor
  selectedEventId?: string
  selectedEventIds?: string[]
  selectedMeasureId?: string
  playbackEventId?: string
  onSelectEvent: (eventId: string, extendRange?: boolean) => void
  onSelectEventRange: (anchorEventId: string, focusEventId: string) => void
  onSelectMeasure: (measureId: string) => void
}

interface InlineLyricEditor {
  eventId: string
  value: string
  syllabic: 'single' | 'begin' | 'middle' | 'end'
  extend?: boolean
  onCommit: (
    text: string,
    options?: {
      syllabic?: 'single' | 'begin' | 'middle' | 'end'
      extend?: boolean
      moveNext?: boolean
    }
  ) => void
}

const MIN_RENDER_WIDTH = 560
const STABLE_BEAM_MAX_SLOPE = 0.12
const STABLE_BEAM_SLOPE_COST = 220
const REHEARSAL_MARK_Y_OFFSET = -62
const STAFF_TEXT_Y_OFFSET = -24
const DYNAMIC_MARK_Y_OFFSET = 122
const HAIRPIN_Y_OFFSET = 126

interface CursorPoint {
  x: number
  y: number
  noteHeadTopY?: number
  noteHeadBottomY?: number
  noteHeadBeginX?: number
  noteHeadEndX?: number
  stemDirection?: number
}

interface SystemBounds {
  x1: number
  x2: number
  noteStartX?: number
  y: number
}

export function NotationPreview({
  score,
  inlineLyricEditor,
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
      drawTempoMarking(svg, score.tempo)
    }

    if (svg && score.rhythmFeel) {
      drawRhythmFeelMarking(svg, score.rhythmFeel, Boolean(score.tempo))
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
    const harmoniesByMeasureId = new Map<string, NonNullable<Score['harmonies']>>()
    const tempoEventsByMeasureId = new Map<string, NonNullable<Score['tempoEvents']>>()

    for (const harmony of score.harmonies ?? []) {
      harmoniesByMeasureId.set(harmony.measureId, [
        ...(harmoniesByMeasureId.get(harmony.measureId) ?? []),
        harmony
      ])
    }

    for (const tempoEvent of score.tempoEvents ?? []) {
      tempoEventsByMeasureId.set(tempoEvent.measureId, [
        ...(tempoEventsByMeasureId.get(tempoEvent.measureId) ?? []),
        tempoEvent
      ])
    }

    layout.placements.forEach((placement, placementIndex) => {
      const { measure } = placement
      const systemBounds = boundsBySystemIndex.get(placement.systemIndex)
      boundsBySystemIndex.set(placement.systemIndex, {
        x1: Math.min(systemBounds?.x1 ?? placement.x, placement.x),
        x2: Math.max(
          systemBounds?.x2 ?? placement.x + placement.width,
          placement.x + placement.width
        ),
        noteStartX: systemBounds?.noteStartX,
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
      let selectionTarget: SVGRectElement | undefined

      if (svg) {
        selectionTarget = document.createElementNS(
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

      const showsClef =
        placement.isSystemStart ||
        !previousMeasure ||
        !sameClef(previousMeasure, measure)
      const showsKeySignature =
        placement.isSystemStart ||
        !previousMeasure ||
        !sameKeySignature(previousMeasure, measure)
      const showsTimeSignature =
        placement.isSystemStart ||
        !previousMeasure ||
        !sameTimeSignature(previousMeasure, measure)

      if (showsClef) {
        stave.addClef(clef)
      }

      if (showsKeySignature) {
        stave.addKeySignature(toVexFlowKeySignature(measure.keySignature))
      }

      if (showsTimeSignature) {
        stave.addTimeSignature(
          `${measure.timeSignature.beats}/${measure.timeSignature.beatType}`
        )
      }

      stave.setContext(context).draw()
      const defaultNoteStartX = stave.getNoteStartX()

      if (showsClef || showsKeySignature || showsTimeSignature) {
        stave.setNoteStartX(
          defaultNoteStartX +
            leadingNotationPadding(measure, {
              showsClef,
              showsKeySignature,
              showsTimeSignature
            })
        )
      }

      selectionTarget?.setAttribute(
        'data-full-measure-rest-start-x',
        String(defaultNoteStartX)
      )
      selectionTarget?.setAttribute(
        'data-full-measure-rest-end-x',
        String(stave.getNoteEndX())
      )
      selectionTarget?.setAttribute(
        'data-note-start-x',
        String(stave.getNoteStartX())
      )

      if (placement.isSystemStart) {
        const bounds = boundsBySystemIndex.get(placement.systemIndex)

        if (bounds) {
          boundsBySystemIndex.set(placement.systemIndex, {
            ...bounds,
            noteStartX: stave.getNoteStartX()
          })
        }
      }
      selectionTarget?.setAttribute(
        'data-note-end-x',
        String(stave.getNoteEndX())
      )

      if (svg && measure.repeat) {
        drawRepeatMark(svg, placement.x, placement.y, placement.width, measure.repeat)
      }

      const rehearsalMark = rehearsalMarksByMeasureId.get(measure.id)

      if (svg && rehearsalMark) {
        drawRehearsalMark(
          svg,
          placement.x + 14,
          placement.y + REHEARSAL_MARK_Y_OFFSET,
          rehearsalMark.text
        )
      }

      const staffText = staffTextsByMeasureId.get(measure.id)

      if (svg && staffText) {
        drawStaffText(
          svg,
          placement.x + 14,
          placement.y + STAFF_TEXT_Y_OFFSET,
          staffText.text
        )
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
            bracketed: groupEvents.some(
              (event) =>
                event?.type === 'rest' ||
                (event && !isNotationBeamable(event))
            ),
            ratioed: group.actualNotes !== 3 || group.normalNotes !== 2
          })
        })
        const vexVoice = new Voice({
          numBeats: measure.timeSignature.beats,
          beatValue: measure.timeSignature.beatType
        })

        vexVoice.setMode(Voice.Mode.SOFT)
        vexVoice.addTickables(notes)
        return {
          beams,
          events,
          notes,
          scoreTuplets: voice.tuplets,
          tuplets,
          vexVoice
        }
      })

      new Formatter()
        .joinVoices(voices.map(({ vexVoice }) => vexVoice))
        .formatToStave(
          voices.map(({ vexVoice }) => vexVoice),
          stave
        )

      voices.forEach(({ events, notes, scoreTuplets }) => {
        const notesByVoiceEventId = new Map(
          notes.map((note, index) => [events[index].id, note])
        )
        const eventXs = new Map(
          notes.map((note, index) => [events[index].id, getVisibleNoteX(note)])
        )
        const onsetShifts = resolveMixedTupletOnsetShifts(
          events,
          scoreTuplets,
          eventXs
        )

        onsetShifts.forEach((shift, eventId) => {
          const note = notesByVoiceEventId.get(eventId)

          if (note) {
            note.setXShift(note.getXShift() + shift)
          }
        })
      })

      let firstEventX: number | undefined

      voices.forEach(({ beams, events, notes, tuplets, vexVoice }) => {
        vexVoice.draw(context, stave)
        beams.forEach((beam) => beam.setContext(context).draw())
        tuplets.forEach((tuplet) => tuplet.setContext(context).draw())

        notes.forEach((note, noteIndex) => {
          const event = events[noteIndex]
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

          const centeredRestShift =
            event?.type === 'rest' && event.fullMeasure
              ? centerFullMeasureRest(svgElement, {
                  x: defaultNoteStartX,
                  width: stave.getNoteEndX() - defaultNoteStartX
                })
              : 0
          const eventX = getVisibleNoteX(note) + centeredRestShift

          if (eventId === playbackEventId) {
            playbackPoint = {
              x: eventX,
              y: placement.y
            }
          }

          pointsByEventId.set(eventId, {
            x: eventX,
            y: placement.y,
            ...resolveSlurAnchorMetrics(note)
          })
          firstEventX = Math.min(firstEventX ?? eventX, eventX)

          if (svg && event?.type === 'note' && event.articulations?.length) {
            drawArticulations(
              svg,
              eventX,
              placement.y,
              event.articulations
            )
          }

          if (svg && event?.fermata) {
            drawFermata(svg, eventX, placement.y)
          }

          if (svg && event?.breathMark) {
            drawBreathMark(
              svg,
              eventX,
              placement.y,
              event.breathMark,
              Boolean(event.fermata)
            )
          }

          if (svg && event?.type === 'note' && event.tremolo) {
            drawTremoloMark(
              svg,
              placement.y,
              note,
              event.tremolo.marks
            )
          }

          if (svg && event?.type === 'note' && event.ornaments?.length) {
            drawOrnaments(svg, eventX, placement.y, event.ornaments)
          }

          if (svg && event?.type === 'note' && event.graceNotes?.length) {
            drawGraceNotes(svg, eventX, placement.y, event.graceNotes)
          }

          if (svg && event?.type === 'note' && event.lyrics?.length) {
            drawLyrics(svg, eventX, placement.y, event.lyrics)
          }

          if (svg && eventId === inlineLyricEditor?.eventId) {
            drawInlineLyricEditor(
              svg,
              eventX,
              placement.y,
              inlineLyricEditor
            )
          }
        })
      })

      const dynamic = dynamicsByMeasureId.get(measure.id)

      if (svg && dynamic) {
        drawDynamicMark(
          svg,
          (firstEventX ?? placement.x + 88) - 2,
          placement.y + DYNAMIC_MARK_Y_OFFSET,
          dynamic.value,
          measure.id
        )
      }

      if (svg) {
        for (const tempoEvent of tempoEventsByMeasureId.get(measure.id) ?? []) {
          drawPositionedTempoMarking(
            svg,
            placement.x +
              18 +
              (tempoEvent.tick / measureDurationTicks(measure)) * Math.max(1, placement.width - 36),
            placement.y,
            tempoEvent
          )
        }

        for (const harmony of harmoniesByMeasureId.get(measure.id) ?? []) {
          drawHarmonyMark(
            svg,
            placement.x +
              18 +
              (harmony.tick / measureDurationTicks(measure)) * Math.max(1, placement.width - 36),
            placement.y,
            harmony.text
          )
        }
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

      for (const octaveShift of score.octaveShifts ?? []) {
        const start = pointsByEventId.get(octaveShift.startEventId)
        const end = pointsByEventId.get(octaveShift.endEventId)
        const startSystem = systemsByEventId.get(octaveShift.startEventId)
        const endSystem = systemsByEventId.get(octaveShift.endEventId)

        if (!start || !end || startSystem === undefined || endSystem === undefined) {
          continue
        }

        drawOctaveShiftSegments(
          svg,
          start,
          end,
          octaveShift.type,
          startSystem,
          endSystem,
          boundsBySystemIndex
        )
      }
    }

    const overlayGroup =
      svg && playbackPoint
        ? document.createElementNS('http://www.w3.org/2000/svg', 'g')
        : undefined

    if (overlayGroup) {
      overlayGroup.classList.add('notation-state-overlays')
      overlayGroup.setAttribute('aria-label', '재생 커서 상태 표시')
      svg?.append(overlayGroup)
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
    inlineLyricEditor,
    playbackEventId,
    selectedEventId,
    selectedEventIds,
    selectedMeasureId
  ])

  return <div className="notation-preview" ref={containerRef} />
}

function drawTempoMarking(svg: SVGSVGElement, tempo: TempoMarking): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-tempo-marking')
  if (tempo.transparent) {
    text.classList.add('notation-tempo-marking--transparent')
  }
  text.setAttribute('x', '32')
  text.setAttribute('y', '36')
  text.textContent = formatTempoMarking(tempo)
  svg.append(text)
}

function drawPositionedTempoMarking(
  svg: SVGSVGElement,
  x: number,
  staffY: number,
  tempo: TempoMarking
): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-tempo-marking', 'notation-tempo-marking--positioned')
  if (tempo.transparent) {
    text.classList.add('notation-tempo-marking--transparent')
  }
  text.setAttribute('x', String(x))
  text.setAttribute('y', String(staffY - 42))
  text.textContent = formatTempoMarking(tempo)
  svg.append(text)
}

function drawRhythmFeelMarking(
  svg: SVGSVGElement,
  rhythmFeel: RhythmFeelMarking,
  hasTempo: boolean
): void {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  const x = hasTempo ? 126 : 32

  group.classList.add('notation-rhythm-feel-marking')
  group.setAttribute('transform', `translate(${x} 36)`)
  if (rhythmFeel.text) {
    appendRhythmFeelText(group, formatRhythmFeelMarkingText(rhythmFeel), 0, 0)
  } else {
    appendRhythmFeelText(group, rhythmFeel.unit === '16th' ? '♬' : '♫', 0, 0)
    appendRhythmFeelText(group, '=', 31, 0)
    appendRhythmFeelTripletNotes(group, 50, 0, rhythmFeel.unit)
    appendRhythmFeelTriplet(group, 50, -26, 43)
  }
  svg.append(group)
}

function formatTempoMarking(tempo: TempoMarking): string {
  if (tempo.text) {
    return tempo.text
  }

  const beatUnit = tempo.beatUnit ?? 'quarter'
  const dots = '.'.repeat(tempo.dots ?? 0)
  const symbol =
    beatUnit === 'whole'
      ? '𝅝'
      : beatUnit === 'half'
        ? '𝅗𝅥'
        : beatUnit === 'eighth'
          ? '♪'
          : beatUnit === '16th'
            ? '𝅘𝅥𝅯'
            : beatUnit === '32nd'
              ? '𝅘𝅥𝅰'
              : beatUnit === '64th'
                ? '𝅘𝅥𝅱'
                : '♩'

  return `${symbol}${dots} = ${tempo.bpm}`
}

function formatRhythmFeelMarkingText(
  rhythmFeel: RhythmFeelMarking
): string {
  if (rhythmFeel.text) {
    return rhythmFeel.text
  }

  return rhythmFeel.unit === '16th' ? '♬ = ³♪ 𝅘𝅥𝅯' : '♫ = ³♩ ♪'
}

function appendRhythmFeelText(
  parent: SVGElement,
  content: string,
  x: number,
  y: number,
  className = 'notation-rhythm-feel-marking__text'
): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add(className)
  text.setAttribute('x', String(x))
  text.setAttribute('y', String(y))
  text.textContent = content
  parent.append(text)
}

function appendRhythmFeelTriplet(
  parent: SVGElement,
  x: number,
  y: number,
  width: number
): void {
  const bracket = document.createElementNS('http://www.w3.org/2000/svg', 'path')

  bracket.classList.add('notation-rhythm-feel-marking__triplet-bracket')
  bracket.setAttribute(
    'd',
    `M ${x} ${y + 8} L ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + 8}`
  )
  parent.append(bracket)
  appendRhythmFeelText(
    parent,
    '3',
    x + width / 2 - 3.5,
    y - 2,
    'notation-rhythm-feel-marking__triplet-number'
  )
}

function appendRhythmFeelTripletNotes(
  parent: SVGElement,
  x: number,
  y: number,
  unit: RhythmFeelMarking['unit']
): void {
  appendRhythmFeelText(parent, unit === '16th' ? '♪' : '♩', x, y)
  appendRhythmFeelText(parent, unit === '16th' ? '𝅘𝅥𝅯' : '♪', x + 26, y)
}

function drawRepeatMark(
  svg: SVGSVGElement,
  x: number,
  y: number,
  width: number,
  repeat: NonNullable<Measure['repeat']>
): void {
  if (repeat.start) {
    drawRepeatBarline(svg, x + 8, y, 'start')
  }

  if (repeat.end) {
    drawRepeatBarline(svg, x + width - 8, y, 'end', repeat.times)
  }
}

function drawRepeatBarline(
  svg: SVGSVGElement,
  x: number,
  staffY: number,
  type: 'start' | 'end',
  times?: number
): void {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  const thick = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  const thin = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  const dots = [0, 1].map((index) =>
    document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  )
  const thickX = type === 'start' ? x : x - 4
  const thinX = type === 'start' ? x + 4 : x

  group.classList.add('notation-repeat-mark')
  thick.setAttribute('x1', String(thickX))
  thick.setAttribute('x2', String(thickX))
  thick.setAttribute('y1', String(staffY))
  thick.setAttribute('y2', String(staffY + 40))
  thick.setAttribute('stroke-width', '3')
  thin.setAttribute('x1', String(thinX))
  thin.setAttribute('x2', String(thinX))
  thin.setAttribute('y1', String(staffY))
  thin.setAttribute('y2', String(staffY + 40))
  thin.setAttribute('stroke-width', '1')

  dots.forEach((dot, index) => {
    dot.setAttribute('cx', String(type === 'start' ? x + 12 : x - 12))
    dot.setAttribute('cy', String(staffY + 15 + index * 10))
    dot.setAttribute('r', '2')
  })

  group.append(thick, thin, ...dots)

  if (times && times > 2) {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

    text.setAttribute('x', String(x - 20))
    text.setAttribute('y', String(staffY - 8))
    text.textContent = `x${times}`
    group.append(text)
  }

  svg.append(group)
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

function drawHarmonyMark(
  svg: SVGSVGElement,
  x: number,
  staffY: number,
  label: string
): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-harmony-mark')
  text.setAttribute('x', String(x))
  text.setAttribute('y', String(staffY - 42))
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

function centerFullMeasureRest(
  element: SVGElement,
  placement: { width: number; x: number }
): number {
  const box = (element as SVGGraphicsElement).getBBox()
  const targetCenterX = placement.x + placement.width / 2
  const currentCenterX = box.x + box.width / 2
  const shiftX = targetCenterX - currentCenterX

  if (Math.abs(shiftX) < 0.5) {
    return 0
  }

  const transform = element.getAttribute('transform')
  element.setAttribute(
    'transform',
    transform ? `${transform} translate(${shiftX} 0)` : `translate(${shiftX} 0)`
  )

  return shiftX
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
  for (const segment of resolveHairpinSegments(
    start,
    end,
    startSystem,
    endSystem,
    boundsBySystemIndex
  )) {
    drawHairpinSegment(
      svg,
      segment.x1,
      segment.x2,
      segment.staffY,
      type,
      segment.isFirst,
      segment.isLast
    )
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
  const y = staffY + HAIRPIN_Y_OFFSET
  const openings = resolveHairpinOpenings(type, isFirst, isLast)
  const leftOpening = openings.left
  const rightOpening = openings.right

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

function drawOctaveShiftSegments(
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
    const x1 = isFirst ? start.x + 8 : bounds.x1 + 22
    const x2 = isLast ? Math.max(x1 + 34, end.x + 26) : bounds.x2 - 18
    const y = bounds.y + (type.endsWith('vb') ? 92 : -30)

    drawOctaveShiftSegment(svg, x1, x2, y, type, isFirst, isLast)
  }
}

function drawOctaveShiftSegment(
  svg: SVGSVGElement,
  x1: number,
  x2: number,
  y: number,
  label: string,
  isFirst: boolean,
  isLast: boolean
): void {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')

  group.classList.add('notation-octave-shift')
  line.setAttribute('x1', String(x1))
  line.setAttribute('x2', String(x2))
  line.setAttribute('y1', String(y))
  line.setAttribute('y2', String(y))
  line.setAttribute('stroke-dasharray', '5 4')
  group.append(line)

  if (isFirst) {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

    text.setAttribute('x', String(x1 - 2))
    text.setAttribute('y', String(y - 4))
    text.textContent = label
    group.append(text)
  }

  if (isLast) {
    const end = document.createElementNS('http://www.w3.org/2000/svg', 'line')

    end.setAttribute('x1', String(x2))
    end.setAttribute('x2', String(x2))
    end.setAttribute('y1', String(y))
    end.setAttribute('y2', String(y + (label.endsWith('vb') ? -10 : 10)))
    group.append(end)
  }

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
  const side = resolveSlurSide(start)

  for (let systemIndex = firstSystem; systemIndex <= lastSystem; systemIndex += 1) {
    const bounds = boundsBySystemIndex.get(systemIndex)

    if (!bounds) {
      continue
    }

    const isFirst = systemIndex === startSystem
    const isLast = systemIndex === endSystem
    const x1 = isFirst
      ? resolveSlurEndpointX(start, side, 'start')
      : resolveSlurContinuationStartX(bounds)
    const x2 = isLast
      ? Math.max(x1 + 28, resolveSlurEndpointX(end, side, 'end'))
      : resolveSlurContinuationEndX(bounds, x1)
    const startY = resolveSlurEndpointY(start, side)
    const endY = resolveSlurEndpointY(end, side)
    const continuationY = resolveSlurContinuationY(bounds, side)
    const y1 = isFirst ? startY : isLast ? endY : continuationY
    const y2 = isLast ? endY : isFirst ? startY : continuationY

    if (x2 <= x1 + 8) {
      continue
    }

    drawSlurSegment(svg, x1, x2, y1, y2, side, slurIndex, isFirst, isLast)
  }
}

function drawSlurSegment(
  svg: SVGSVGElement,
  x1: number,
  x2: number,
  y1: number,
  y2: number,
  side: 'above' | 'below',
  slurIndex: number,
  isFirst: boolean,
  isLast: boolean
): void {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  const offset = (slurIndex % 3) * 6
  const span = Math.abs(x2 - x1)
  const curveDepth = Math.min(22, Math.max(10, span * 0.09)) + offset
  const controlX = (x1 + x2) / 2
  const controlY =
    side === 'above'
      ? Math.min(y1, y2) - curveDepth
      : Math.max(y1, y2) + curveDepth
  const startX = isFirst ? x1 : x1 - 8
  const endX = isLast ? x2 : x2 + 8

  path.classList.add('notation-slur')
  path.setAttribute(
    'd',
    `M ${startX} ${y1} Q ${controlX} ${controlY} ${endX} ${y2}`
  )
  svg.append(path)
}

function resolveSlurAnchorMetrics(note: StaveNote): Partial<CursorPoint> {
  try {
    const bounds = note.getNoteHeadBounds()

    return {
      noteHeadTopY: bounds.yTop,
      noteHeadBottomY: bounds.yBottom,
      noteHeadBeginX: note.getNoteHeadBeginX(),
      noteHeadEndX: note.getNoteHeadEndX(),
      stemDirection: note.getStemDirection()
    }
  } catch {
    return {}
  }
}

function resolveSlurSide(start: CursorPoint): 'above' | 'below' {
  return (start.stemDirection ?? -1) > 0 ? 'below' : 'above'
}

function resolveSlurEndpointX(
  point: CursorPoint,
  side: 'above' | 'below',
  endpoint: 'start' | 'end'
): number {
  if (side === 'above') {
    return endpoint === 'start'
      ? (point.noteHeadEndX ?? point.x + 10) - 2
      : (point.noteHeadBeginX ?? point.x) + 8
  }

  return endpoint === 'start'
    ? (point.noteHeadEndX ?? point.x + 10) - 3
    : (point.noteHeadBeginX ?? point.x) + 7
}

function resolveSlurContinuationStartX(bounds: SystemBounds): number {
  return Math.max(bounds.x1 + 22, (bounds.noteStartX ?? bounds.x1 + 36) - 14)
}

function resolveSlurContinuationEndX(bounds: SystemBounds, x1: number): number {
  return Math.max(bounds.x2 - 8, x1 + 18)
}

function resolveSlurEndpointY(
  point: CursorPoint,
  side: 'above' | 'below'
): number {
  if (side === 'above') {
    return (point.noteHeadTopY ?? point.y) - 8
  }

  return (point.noteHeadBottomY ?? point.y + 40) + 8
}

function resolveSlurContinuationY(
  bounds: SystemBounds,
  side: 'above' | 'below'
): number {
  return side === 'above' ? bounds.y - 12 : bounds.y + 56
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

function drawTremoloMark(
  svg: SVGSVGElement,
  staffY: number,
  note: StaveNote,
  marks: number
): void {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  const stemGeometry = resolveStemGeometry(note, staffY)
  const centerY = (stemGeometry.topY + stemGeometry.baseY) / 2
  const firstY = centerY - ((marks - 1) * 5) / 2

  group.classList.add('notation-tremolo-mark')

  for (let index = 0; index < marks; index += 1) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    const y = firstY + index * 5

    line.setAttribute('x1', String(stemGeometry.x - 8))
    line.setAttribute('x2', String(stemGeometry.x + 8))
    line.setAttribute('y1', String(y + 4))
    line.setAttribute('y2', String(y - 4))
    line.setAttribute('stroke-width', '2')
    group.append(line)
  }

  svg.append(group)
}

function resolveStemGeometry(
  note: StaveNote,
  staffY: number
): { x: number; topY: number; baseY: number } {
  try {
    const extents = note.getStemExtents()

    return {
      x: note.getStemX(),
      topY: extents.topY,
      baseY: extents.baseY
    }
  } catch {
    const x = note.getAbsoluteX() + 12

    return {
      x,
      topY: staffY - 20,
      baseY: staffY + 20
    }
  }
}

function drawOrnaments(
  svg: SVGSVGElement,
  x: number,
  staffY: number,
  ornaments: string[]
): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-ornament')
  text.setAttribute('x', String(x + 4))
  text.setAttribute('y', String(staffY - 34))
  text.textContent = ornaments.map(ornamentLabel).join(' ')
  svg.append(text)
}

function ornamentLabel(ornament: string): string {
  if (ornament === 'trill') {
    return 'tr'
  }

  if (ornament === 'mordent') {
    return '𝆝'
  }

  return '𝆗'
}

function drawGraceNotes(
  svg: SVGSVGElement,
  x: number,
  staffY: number,
  graceNotes: NonNullable<Extract<VoiceEvent, { type: 'note' }>['graceNotes']>
): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-grace-notes')
  text.setAttribute('x', String(x - 22))
  text.setAttribute('y', String(staffY + 2))
  text.textContent = graceNotes.map((note) => note.pitch.step.toLowerCase()).join('')
  svg.append(text)
}

function drawLyrics(
  svg: SVGSVGElement,
  x: number,
  staffY: number,
  lyrics: NonNullable<Extract<VoiceEvent, { type: 'note' }>['lyrics']>
): void {
  lyrics.forEach((lyric, index) => {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

    text.classList.add('notation-lyric')
    text.setAttribute('x', String(x + 4))
    text.setAttribute('y', String(staffY + 116 + index * 16))
    text.textContent = `${lyric.text}${
      lyric.syllabic === 'begin' || lyric.syllabic === 'middle' ? '-' : ''
    }${lyric.extend ? '_' : ''}`
    svg.append(text)
  })
}

function drawInlineLyricEditor(
  svg: SVGSVGElement,
  x: number,
  staffY: number,
  editor: InlineLyricEditor
): void {
  const container = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'foreignObject'
  )
  const input = document.createElementNS(
    'http://www.w3.org/1999/xhtml',
    'input'
  ) as HTMLInputElement
  const commit = (
    options?: Parameters<InlineLyricEditor['onCommit']>[1]
  ) => {
    editor.onCommit(input.value, {
      syllabic: editor.syllabic,
      extend: editor.extend,
      ...options
    })
  }

  container.classList.add('notation-lyric-editor')
  container.setAttribute('x', String(x - 26))
  container.setAttribute('y', String(staffY + 98))
  container.setAttribute('width', '108')
  container.setAttribute('height', '42')

  input.setAttribute('aria-label', '선택 음표 가사')
  input.maxLength = 48
  input.placeholder = '가사'
  input.type = 'text'
  input.value = editor.value
  input.addEventListener('blur', () => commit())
  input.addEventListener('keydown', (event) => {
    event.stopPropagation()

    if (event.isComposing) {
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      commit({ moveNext: true })
    } else if (event.key === '-') {
      event.preventDefault()
      commit({ syllabic: 'begin', moveNext: true })
    } else if (event.key === '_') {
      event.preventDefault()
      commit({ syllabic: 'single', extend: true, moveNext: true })
    } else if (event.key === 'Escape') {
      event.preventDefault()
      input.value = editor.value
      input.blur()
    }
  })

  container.append(input)
  svg.append(container)
  const focusInput = () => {
    input.focus()
    input.select()
  }

  focusInput()
  window.requestAnimationFrame(focusInput)
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

function isNotationBeamable(event: VoiceEvent): boolean {
  if (event.type !== 'note') {
    return false
  }

  return durationToTicks({
    ...event.duration,
    tuplet: undefined
  }) < TICKS_PER_QUARTER
}

function getVisibleNoteX(note: StaveNote): number {
  return note.getAbsoluteX() + note.getXShift()
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
  const keys =
    event.type === 'note' && event.pitches?.length
      ? event.pitches.map(toVexFlowKey)
      : isRest
        ? ['b/4']
        : [toVexFlowKey(pitch!)]
  const note = new StaveNote({
    clef,
    keys,
    duration: toVexFlowDuration(event.duration, isRest),
    alignCenter: event.type === 'rest' && Boolean(event.fullMeasure),
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
