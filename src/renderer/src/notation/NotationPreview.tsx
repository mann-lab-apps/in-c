import { useEffect, useRef, useState } from 'react'
import {
  Accidental,
  BarlineType,
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
  type Staff,
  type TempoMarking,
  type Voice as ScoreVoice,
  type VoiceAddress,
  type VoiceEvent
} from '../../../score-core'
import { createBeamGroups } from './beam-groups'
import {
  createSystemLayout,
  leadingNotationPadding,
  type MeasurePlacement
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
import {
  countMeasureLyricLines,
  DYNAMIC_MARK_Y_OFFSET,
  EXPRESSION_TEXT_Y_OFFSET,
  HAIRPIN_Y_OFFSET,
  HARMONY_MARK_Y_OFFSET,
  REHEARSAL_MARK_Y_OFFSET,
  resolveAnnotationVerticalExtension,
  resolveHairpinSpanYOffset,
  resolveMeasureAnnotationLanes,
  resolveSlurSideForAnnotationLanes,
  STAFF_TEXT_Y_OFFSET,
  SYSTEM_TEXT_Y_OFFSET,
  type MeasureAnnotationLanes
} from './annotation-lanes'
import type { PrintLayoutPlan } from './print-layout'
import {
  resolveRangeSelectionBands,
  type RangeSelectionPoint
} from './range-selection-bands'
import { resolveMixedTupletOnsetShifts } from './tuplet-spacing'
import { resolveNotationEventTone, sameVoiceLane } from './visual-state'

interface NotationPreviewProps {
  score: Score
  inlineLyricEditor?: InlineLyricEditor
  selectedEventAddress?: VoiceAddress
  selectedEventId?: string
  selectedEventIds?: string[]
  selectedMeasureId?: string
  playbackEventId?: string
  playbackEventAddress?: VoiceAddress
  printLayout?: boolean
  printLayoutPlan?: PrintLayoutPlan
  onSelectEvent: (
    eventId: string,
    extendRange?: boolean,
    address?: VoiceAddress
  ) => void
  onSelectEventRange: (
    anchorEventId: string,
    focusEventId: string,
    address?: VoiceAddress
  ) => void
  onSelectLyric: (eventId: string, verse: number) => void
  onSelectMeasure: (measureId: string) => void
  onOpenMeasureContextMenu: (
    measureId: string,
    position: { x: number; y: number }
  ) => void
}

interface InlineLyricEditor {
  eventId: string
  number: number
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
  onMoveVerse: (direction: 1 | -1) => void
}

const MIN_RENDER_WIDTH = 560
const STABLE_BEAM_MAX_SLOPE = 0.12
const STABLE_BEAM_SLOPE_COST = 220
const SINGLE_STAFF_SYSTEM_HEIGHT = 154
const DEFAULT_SYSTEM_TOP = 72
const STACKED_STAFF_Y_OFFSET = 96
const MEASURE_STAFF_VERTICAL_PADDING = 18
const LYRIC_EDITOR_WIDTH = 148
const LYRIC_EDITOR_HEIGHT = 34
const LYRIC_EDITOR_BASELINE_OFFSET = 22

interface CursorPoint {
  measureId?: string
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

interface MeasureAnnotationMaps {
  dynamicsByMeasureId: Map<string, NonNullable<Score['dynamics']>[number]>
  expressionTextsByMeasureId: Map<string, NonNullable<Score['expressionTexts']>>
  harmoniesByMeasureId: Map<string, NonNullable<Score['harmonies']>>
  rehearsalMarksByMeasureId: Map<string, NonNullable<Score['rehearsalMarks']>[number]>
  staffTextsByMeasureId: Map<string, NonNullable<Score['staffTexts']>[number]>
  systemTextsByMeasureId: Map<string, NonNullable<Score['systemTexts']>>
  tempoEventsByMeasureId: Map<string, NonNullable<Score['tempoEvents']>>
}

interface MeasureContextTarget {
  measureId: string
  x1: number
  x2: number
  y1: number
  y2: number
}

interface RenderedStaffTarget {
  globalStaffIndex: number
  partId: string
  partName: string
  staff: Staff
  staffId: string
  staffIndex: number
}

interface RenderedStaffInteraction {
  selectedEventAddress?: VoiceAddress
  selectedEventId?: string
  selectedEventIdSet: Set<string>
  playbackEventId?: string
  playbackEventAddress?: VoiceAddress
  onSelectEvent: NotationPreviewProps['onSelectEvent']
  onSelectEventRange: NotationPreviewProps['onSelectEventRange']
  getDragAnchor: () => DragAnchor | undefined
  setDragAnchor: (anchor: DragAnchor) => void
}

interface DragAnchor {
  address?: VoiceAddress
  eventId: string
}

interface RenderedStaffState {
  boundsByStaffSystemKey: Map<string, SystemBounds>
  notesByEventId: Map<string, StaveNote>
  pointsByEventId: Map<string, CursorPoint>
  staffIndexByEventId: Map<string, number>
  systemsByEventId: Map<string, number>
}

export function NotationPreview({
  score,
  inlineLyricEditor,
  selectedEventAddress,
  selectedEventId,
  selectedEventIds = [],
  selectedMeasureId,
  playbackEventId,
  playbackEventAddress,
  printLayout = false,
  printLayoutPlan,
  onSelectEvent,
  onSelectEventRange,
  onSelectLyric,
  onSelectMeasure,
  onOpenMeasureContextMenu
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

    const renderedStaffTargets = createRenderedStaffTargets(score)
    const renderedPart = score.parts[0]
    const renderedStaff = renderedPart?.staves[0]
    const measures = renderedStaff?.measures ?? []
    const effectiveRenderWidth = printLayoutPlan?.renderWidth ?? renderWidth
    const printScale = printLayoutPlan?.scale ?? 1
    const lyricScale = Math.max(0.82, printScale)
    const annotationMaps = createMeasureAnnotationMaps(score)
    const annotationLanesByMeasureId = createMeasureAnnotationLaneMap(
      score,
      annotationMaps,
      lyricScale
    )
    const annotationExtension = resolveAnnotationVerticalExtension(
      annotationLanesByMeasureId.values()
    )
    const visibleStaffCount = Math.max(1, renderedStaffTargets.length)
    const systemHeight =
      (printLayoutPlan?.systemHeight ?? SINGLE_STAFF_SYSTEM_HEIGHT) +
      (visibleStaffCount - 1) * STACKED_STAFF_Y_OFFSET +
      annotationExtension.below
    const layout = createSystemLayout(measures, effectiveRenderWidth, {
      compactSpacing: Boolean(printLayoutPlan?.compactSpacing),
      layout: score.layout,
      lyricScale,
      pageHeight: printLayoutPlan?.pageHeight,
      systemHeight,
      systemTop:
        (printLayoutPlan?.systemTop ?? DEFAULT_SYSTEM_TOP) +
        annotationExtension.above
    })
    const renderer = new Renderer(container, Renderer.Backends.SVG)
    renderer.resize(effectiveRenderWidth, layout.height)
    const context = renderer.getContext()
    const svg = container.querySelector<SVGSVGElement>('svg')
    let playbackPoint: CursorPoint | undefined
    const staffRenderState: RenderedStaffState = {
      boundsByStaffSystemKey: new Map(),
      notesByEventId: new Map(),
      pointsByEventId: new Map(),
      staffIndexByEventId: new Map(),
      systemsByEventId: new Map()
    }
    const selectedEventIdSet = new Set(selectedEventIds)
    const measureContextTargets: MeasureContextTarget[] = []
    let dragAnchor: DragAnchor | undefined
    let activeVolta: { number: 1 | 2 } | undefined
    const primaryMeasureIndexById = new Map(
      measures.map((measure, index) => [measure.id, index])
    )

    const clearDragAnchor = () => {
      dragAnchor = undefined
    }

    const openMeasureContextMenuAtPointer = (event: MouseEvent): boolean => {
      if (isNotationEventContextTarget(event.target)) {
        return false
      }

      const pointer = resolveSvgPointer(svg, event)

      if (!pointer) {
        return false
      }

      let target: MeasureContextTarget | undefined

      for (let index = measureContextTargets.length - 1; index >= 0; index -= 1) {
        const candidate = measureContextTargets[index]

        if (
          pointer.x >= candidate.x1 &&
          pointer.x <= candidate.x2 &&
          pointer.y >= candidate.y1 &&
          pointer.y <= candidate.y2
        ) {
          target = candidate
          break
        }
      }

      if (!target) {
        return false
      }

      event.preventDefault()
      event.stopPropagation()
      onOpenMeasureContextMenu(target.measureId, {
        x: event.clientX,
        y: event.clientY
      })
      return true
    }

    const openMeasureContextMenuFromSecondaryMouse = (event: MouseEvent) => {
      if (event.button !== 2) {
        return
      }

      openMeasureContextMenuAtPointer(event)
    }

    window.addEventListener('mouseup', clearDragAnchor)
    container.addEventListener('contextmenu', openMeasureContextMenuAtPointer, true)
    container.addEventListener(
      'mouseup',
      openMeasureContextMenuFromSecondaryMouse,
      true
    )

    if (svg) {
      svg.setAttribute('viewBox', `0 0 ${effectiveRenderWidth} ${layout.height}`)
      svg.setAttribute('preserveAspectRatio', 'xMinYMin meet')
      svg.setAttribute('data-print-scale', String(printScale))
    }

    if (svg && score.tempo) {
      drawTempoMarking(svg, score.tempo)
    }

    if (svg && score.rhythmFeel) {
      drawRhythmFeelMarking(svg, score.rhythmFeel, Boolean(score.tempo))
    }

    layout.placements.forEach((placement, placementIndex) => {
      const { measure } = placement
      const primaryStaffTarget = renderedStaffTargets[0]
      const primaryStaffIndex = primaryStaffTarget?.globalStaffIndex ?? 0
      updateStaffSystemBounds(
        staffRenderState.boundsByStaffSystemKey,
        placement,
        primaryStaffIndex,
        placement.y
      )
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

      if (measure.repeat?.start) {
        stave.setBegBarType(BarlineType.REPEAT_BEGIN)
      }

      if (measure.repeat?.end) {
        stave.setEndBarType(BarlineType.REPEAT_END)
      }

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
        selectionTarget.setAttribute('width', String(placement.width))
        selectionTarget.setAttribute('rx', '4')
        selectionTarget.addEventListener('click', () => onSelectMeasure(measure.id))
        selectionTarget.addEventListener('contextmenu', (event) => {
          event.preventDefault()
          event.stopPropagation()
          onOpenMeasureContextMenu(measure.id, {
            x: event.clientX,
            y: event.clientY
          })
        })
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

      if (
        svg &&
        primaryStaffTarget &&
        visibleStaffCount > 1 &&
        placement.isSystemStart
      ) {
        drawStaffLabel(
          svg,
          placement.x + 4,
          placement.y - 12,
          primaryStaffTarget.partName,
          primaryStaffTarget
        )
      }

      const measureStaffTarget = resolveMeasureStaffTarget(
        measure.id,
        placement.x,
        placement.width,
        stave
      )

      selectionTarget?.setAttribute('y', String(measureStaffTarget.y1))
      selectionTarget?.setAttribute(
        'height',
        String(measureStaffTarget.y2 - measureStaffTarget.y1)
      )
      measureContextTargets.push(measureStaffTarget)

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
        updateStaffSystemBounds(
          staffRenderState.boundsByStaffSystemKey,
          placement,
          primaryStaffIndex,
          placement.y,
          stave.getNoteStartX()
        )
      }
      selectionTarget?.setAttribute(
        'data-note-end-x',
        String(stave.getNoteEndX())
      )

      if (
        measure.volta?.start &&
        hasLaterVoltaEnd(measures, placementIndex, measure.volta.number)
      ) {
        activeVolta = {
          number: measure.volta.number
        }
      }

      const displayVolta =
        measure.volta || activeVolta
          ? {
              number: (measure.volta ?? activeVolta)?.number ?? 1,
              start: measure.volta?.start,
              end: measure.volta?.end
            }
          : undefined

      if (svg && displayVolta) {
        const staffTopY = stave.getYForLine(0)
        const notationStartX = displayVolta.start
          ? Math.max(placement.x + 8, stave.getNoteStartX() - 12)
          : placement.x
        const notationEndX = displayVolta.end
          ? Math.min(
              placement.x + placement.width - 8,
              stave.getNoteEndX() + 8
            )
          : placement.x + placement.width

        drawVoltaMark(
          svg,
          notationStartX,
          notationEndX,
          staffTopY,
          displayVolta
        )
      }

      if (measure.volta?.end) {
        activeVolta = undefined
      }

      if (svg && measure.repeat?.end && measure.repeat.times && measure.repeat.times > 2) {
        drawRepeatTimes(
          svg,
          placement.x + placement.width - 26,
          stave.getYForLine(0) - 8,
          measure.repeat.times
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
            isPlaybackEventTarget(event.id, measure.id, voice.id, {
              partId: renderedPart?.id,
              staffId: renderedStaff?.id,
              eventId: playbackEventId,
              address: playbackEventAddress
            }),
            renderedPart && renderedStaff
              ? {
                  partId: renderedPart.id,
                  staffId: renderedStaff.id,
                  measureId: measure.id,
                  voiceId: voice.id
                }
              : undefined,
            selectedEventAddress
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
          staffRenderState.notesByEventId.set(eventId, note)
          staffRenderState.systemsByEventId.set(eventId, placement.systemIndex)
          staffRenderState.staffIndexByEventId.set(eventId, primaryStaffIndex)
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
          vexVoice,
          voiceId: voice.id
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

      voices.forEach(({ beams, events, notes, tuplets, vexVoice, voiceId }) => {
        vexVoice.draw(context, stave)
        beams.forEach((beam) => beam.setContext(context).draw())
        tuplets.forEach((tuplet) => tuplet.setContext(context).draw())

        notes.forEach((note, noteIndex) => {
          const event = events[noteIndex]
          const eventId = note.getAttribute('data-event-id') as string
          const svgElement = note.getSVGElement()
          const eventAddress =
            renderedPart && renderedStaff
              ? {
                  partId: renderedPart.id,
                  staffId: renderedStaff.id,
                  measureId: measure.id,
                  voiceId
                }
              : undefined

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
              isPlaybackEventTarget(eventId, measure.id, voiceId, {
                partId: renderedPart?.id,
                staffId: renderedStaff?.id,
                eventId: playbackEventId,
                address: playbackEventAddress
              }),
              eventAddress,
              selectedEventAddress
            ) === 'selected'
          )
          svgElement.classList.toggle(
            'is-playback',
            resolveNotationEventTone(
              eventId,
              selectedEventIdSet,
              selectedEventId,
              isPlaybackEventTarget(eventId, measure.id, voiceId, {
                partId: renderedPart?.id,
                staffId: renderedStaff?.id,
                eventId: playbackEventId,
                address: playbackEventAddress
              }),
              eventAddress,
              selectedEventAddress
            ) === 'playback'
          )
          svgElement.setAttribute('data-event-id', eventId)
          if (eventAddress) {
            svgElement.setAttribute('data-part-id', eventAddress.partId)
            svgElement.setAttribute('data-staff-id', eventAddress.staffId)
            svgElement.setAttribute('data-measure-id', eventAddress.measureId)
            svgElement.setAttribute('data-voice-id', eventAddress.voiceId)
          }

          if (!isPreviewEventId(eventId)) {
            svgElement.setAttribute('role', 'button')
            svgElement.setAttribute('tabindex', '0')
            svgElement.addEventListener('click', (event) => {
              event.stopPropagation()
              onSelectEvent(eventId, event.shiftKey, eventAddress)
            })
            svgElement.addEventListener('mousedown', (event) => {
              if (event.button !== 0) {
                return
              }

              event.preventDefault()
              event.stopPropagation()
              dragAnchor = { address: eventAddress, eventId }
              onSelectEvent(eventId, event.shiftKey, eventAddress)
            })
            svgElement.addEventListener('mouseenter', (event) => {
              if (!dragAnchor || event.buttons !== 1) {
                return
              }

              if (
                !dragAnchorMatchesVoiceAddress(dragAnchor, eventAddress)
              ) {
                return
              }

              event.preventDefault()
              onSelectEventRange(dragAnchor.eventId, eventId, eventAddress)
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

          if (
            isPlaybackEventTarget(eventId, measure.id, voiceId, {
              partId: renderedPart?.id,
              staffId: renderedStaff?.id,
              eventId: playbackEventId,
              address: playbackEventAddress
            })
          ) {
            playbackPoint = {
              x: eventX,
              y: placement.y
            }
          }

          staffRenderState.pointsByEventId.set(eventId, {
            measureId: measure.id,
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
            drawLyrics(
              svg,
              eventId,
              eventX,
              placement.y,
              event.lyrics,
              lyricScale,
              onSelectLyric
            )
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

      drawMeasureAnnotations(
        svg,
        placement,
        measure,
        placement.y,
        annotationMaps,
        annotationLanesByMeasureId,
        firstEventX
      )
    })

    for (const placement of layout.placements) {
      const measureIndex = primaryMeasureIndexById.get(placement.measure.id)

      if (measureIndex === undefined) {
        continue
      }

      for (const target of renderedStaffTargets.slice(1)) {
        const measure = target.staff.measures[measureIndex]

        if (!measure) {
          continue
        }

        drawPassiveStaffMeasure(
          context,
          svg,
          placement,
          target,
          measure,
          target.staff.measures[measureIndex - 1],
          annotationMaps,
          annotationLanesByMeasureId,
          {
            selectedEventAddress,
            selectedEventId,
            selectedEventIdSet,
            playbackEventId,
            playbackEventAddress,
            onSelectEvent,
            onSelectEventRange,
            getDragAnchor: () => dragAnchor,
            setDragAnchor: (anchor) => {
              dragAnchor = anchor
            }
          },
          staffRenderState
        )
      }
    }

    drawRangeSelectionBands(svg, selectedEventIdSet, staffRenderState)

    collectTiePairs(score).forEach((pair) => {
      const firstNote = staffRenderState.notesByEventId.get(pair.fromEventId)
      const lastNote = staffRenderState.notesByEventId.get(pair.toEventId)

      if (!firstNote || !lastNote) {
        return
      }

      if (
        staffRenderState.systemsByEventId.get(pair.fromEventId) ===
        staffRenderState.systemsByEventId.get(pair.toEventId)
      ) {
        drawTie(context, firstNote, lastNote)
      } else {
        drawTie(context, firstNote, null)
        drawTie(context, null, lastNote)
      }
    })

    if (svg) {
      ;(score.slurs ?? []).forEach((slur, slurIndex) => {
        const start = staffRenderState.pointsByEventId.get(slur.startEventId)
        const end = staffRenderState.pointsByEventId.get(slur.endEventId)
        const startSystem = staffRenderState.systemsByEventId.get(slur.startEventId)
        const endSystem = staffRenderState.systemsByEventId.get(slur.endEventId)
        const staffBounds = resolveEventStaffSystemBounds(
          staffRenderState,
          slur.startEventId
        )

        if (
          !start ||
          !end ||
          startSystem === undefined ||
          endSystem === undefined ||
          !staffBounds
        ) {
          return
        }

        const slurSide = resolveSlurSideForAnnotationLanes(resolveSlurSide(start), [
          start.measureId
            ? annotationLanesByMeasureId.get(start.measureId)
            : undefined,
          end.measureId ? annotationLanesByMeasureId.get(end.measureId) : undefined
        ])

        drawSlurSegments(
          svg,
          start,
          end,
          startSystem,
          endSystem,
          staffBounds,
          slurIndex,
          slurSide
        )
      })

      for (const hairpin of score.hairpins ?? []) {
        const start = staffRenderState.pointsByEventId.get(hairpin.startEventId)
        const end = staffRenderState.pointsByEventId.get(hairpin.endEventId)
        const startSystem = staffRenderState.systemsByEventId.get(hairpin.startEventId)
        const endSystem = staffRenderState.systemsByEventId.get(hairpin.endEventId)
        const staffBounds = resolveEventStaffSystemBounds(
          staffRenderState,
          hairpin.startEventId
        )

        if (
          !start ||
          !end ||
          startSystem === undefined ||
          endSystem === undefined ||
          !staffBounds
        ) {
          continue
        }

        drawHairpinSegments(
          svg,
          start,
          end,
          hairpin.type,
          startSystem,
          endSystem,
          staffBounds,
          resolveHairpinSpanYOffset([
            start.measureId
              ? annotationLanesByMeasureId.get(start.measureId)
              : undefined,
            end.measureId ? annotationLanesByMeasureId.get(end.measureId) : undefined
          ])
        )
      }

      for (const octaveShift of score.octaveShifts ?? []) {
        const start = staffRenderState.pointsByEventId.get(octaveShift.startEventId)
        const end = staffRenderState.pointsByEventId.get(octaveShift.endEventId)
        const startSystem = staffRenderState.systemsByEventId.get(octaveShift.startEventId)
        const endSystem = staffRenderState.systemsByEventId.get(octaveShift.endEventId)
        const staffBounds = resolveEventStaffSystemBounds(
          staffRenderState,
          octaveShift.startEventId
        )

        if (
          !start ||
          !end ||
          startSystem === undefined ||
          endSystem === undefined ||
          !staffBounds
        ) {
          continue
        }

        drawOctaveShiftSegments(
          svg,
          start,
          end,
          octaveShift.type,
          startSystem,
          endSystem,
          staffBounds
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
      container.removeEventListener(
        'contextmenu',
        openMeasureContextMenuAtPointer,
        true
      )
      container.removeEventListener(
        'mouseup',
        openMeasureContextMenuFromSecondaryMouse,
        true
      )
    }
  }, [
    onSelectEvent,
    onSelectEventRange,
    onSelectLyric,
    onSelectMeasure,
    onOpenMeasureContextMenu,
    renderWidth,
    score,
    inlineLyricEditor,
    playbackEventId,
    playbackEventAddress,
    printLayout,
    printLayoutPlan,
    selectedEventAddress,
    selectedEventId,
    selectedEventIds,
    selectedMeasureId
  ])

  return <div className="notation-preview" ref={containerRef} />
}

function resolveSvgPointer(
  svg: SVGSVGElement | null,
  event: MouseEvent
): { x: number; y: number } | undefined {
  if (!svg) {
    return undefined
  }

  const transform = svg.getScreenCTM()

  if (!transform) {
    return undefined
  }

  const point = svg.createSVGPoint()
  point.x = event.clientX
  point.y = event.clientY

  const svgPoint = point.matrixTransform(transform.inverse())
  return {
    x: svgPoint.x,
    y: svgPoint.y
  }
}

function createRenderedStaffTargets(score: Score): RenderedStaffTarget[] {
  return score.parts.flatMap((part) =>
    part.staves.map((staff, staffIndex) => ({
      globalStaffIndex: 0,
      partId: part.id,
      partName: part.name,
      staff,
      staffId: staff.id,
      staffIndex
    }))
  ).map((target, globalStaffIndex) => ({
    ...target,
    globalStaffIndex
  }))
}

function createStaffSystemKey(systemIndex: number, globalStaffIndex: number): string {
  return `${systemIndex}:${globalStaffIndex}`
}

function updateStaffSystemBounds(
  boundsByStaffSystemKey: Map<string, SystemBounds>,
  placement: MeasurePlacement,
  globalStaffIndex: number,
  staffY: number,
  noteStartX?: number
): void {
  const key = createStaffSystemKey(placement.systemIndex, globalStaffIndex)
  const bounds = boundsByStaffSystemKey.get(key)

  boundsByStaffSystemKey.set(key, {
    x1: Math.min(bounds?.x1 ?? placement.x, placement.x),
    x2: Math.max(
      bounds?.x2 ?? placement.x + placement.width,
      placement.x + placement.width
    ),
    noteStartX: noteStartX ?? bounds?.noteStartX,
    y: staffY
  })
}

function resolveEventStaffSystemBounds(
  renderState: RenderedStaffState,
  eventId: string
): Map<number, SystemBounds> | undefined {
  const staffIndex = renderState.staffIndexByEventId.get(eventId)

  if (staffIndex === undefined) {
    return undefined
  }

  const bounds = new Map<number, SystemBounds>()

  for (const [key, value] of renderState.boundsByStaffSystemKey) {
    const [systemIndexText, staffIndexText] = key.split(':')

    if (Number(staffIndexText) === staffIndex) {
      bounds.set(Number(systemIndexText), value)
    }
  }

  return bounds
}

function createMeasureAnnotationMaps(score: Score): MeasureAnnotationMaps {
  const annotationMaps: MeasureAnnotationMaps = {
    dynamicsByMeasureId: new Map(
      (score.dynamics ?? []).map((dynamic) => [dynamic.measureId, dynamic])
    ),
    expressionTextsByMeasureId: new Map(),
    harmoniesByMeasureId: new Map(),
    rehearsalMarksByMeasureId: new Map(
      (score.rehearsalMarks ?? []).map((mark) => [mark.measureId, mark])
    ),
    staffTextsByMeasureId: new Map(
      (score.staffTexts ?? []).map((text) => [text.measureId, text])
    ),
    systemTextsByMeasureId: new Map(),
    tempoEventsByMeasureId: new Map()
  }

  for (const harmony of score.harmonies ?? []) {
    annotationMaps.harmoniesByMeasureId.set(harmony.measureId, [
      ...(annotationMaps.harmoniesByMeasureId.get(harmony.measureId) ?? []),
      harmony
    ])
  }

  for (const tempoEvent of score.tempoEvents ?? []) {
    annotationMaps.tempoEventsByMeasureId.set(tempoEvent.measureId, [
      ...(annotationMaps.tempoEventsByMeasureId.get(tempoEvent.measureId) ?? []),
      tempoEvent
    ])
  }

  for (const systemText of score.systemTexts ?? []) {
    annotationMaps.systemTextsByMeasureId.set(systemText.measureId, [
      ...(annotationMaps.systemTextsByMeasureId.get(systemText.measureId) ?? []),
      systemText
    ])
  }

  for (const expressionText of score.expressionTexts ?? []) {
    annotationMaps.expressionTextsByMeasureId.set(expressionText.measureId, [
      ...(annotationMaps.expressionTextsByMeasureId.get(expressionText.measureId) ?? []),
      expressionText
    ])
  }

  return annotationMaps
}

function createMeasureAnnotationLaneMap(
  score: Score,
  annotationMaps: MeasureAnnotationMaps,
  lyricScale: number
): Map<string, MeasureAnnotationLanes> {
  const hairpinMeasureIds = collectHairpinMeasureIds(score)
  const lanesByMeasureId = new Map<string, MeasureAnnotationLanes>()

  for (const part of score.parts) {
    for (const staff of part.staves) {
      for (const measure of staff.measures) {
        lanesByMeasureId.set(
          measure.id,
          resolveMeasureAnnotationLanes({
            expressionTextCount:
              annotationMaps.expressionTextsByMeasureId.get(measure.id)?.length,
            harmonyCount:
              annotationMaps.harmoniesByMeasureId.get(measure.id)?.length,
            hasDynamic: annotationMaps.dynamicsByMeasureId.has(measure.id),
            hasHairpin: hairpinMeasureIds.has(measure.id),
            hasRehearsalMark:
              annotationMaps.rehearsalMarksByMeasureId.has(measure.id),
            hasStaffText: annotationMaps.staffTextsByMeasureId.has(measure.id),
            lyricLineCount: countMeasureLyricLines(measure),
            lyricScale,
            systemTextCount:
              annotationMaps.systemTextsByMeasureId.get(measure.id)?.length
          })
        )
      }
    }
  }

  return lanesByMeasureId
}

function collectHairpinMeasureIds(score: Score): Set<string> {
  const measureIdByEventId = new Map<string, string>()

  for (const part of score.parts) {
    for (const staff of part.staves) {
      for (const measure of staff.measures) {
        for (const voice of measure.voices) {
          for (const event of voice.events) {
            measureIdByEventId.set(event.id, measure.id)
          }
        }
      }
    }
  }

  return new Set(
    (score.hairpins ?? []).flatMap((hairpin) =>
      [hairpin.startEventId, hairpin.endEventId]
        .map((eventId) => measureIdByEventId.get(eventId))
        .filter((measureId): measureId is string => Boolean(measureId))
    )
  )
}

function drawRangeSelectionBands(
  svg: SVGSVGElement | null,
  selectedEventIds: Set<string>,
  renderState: RenderedStaffState
): void {
  if (!svg || selectedEventIds.size < 2) {
    return
  }

  const points: RangeSelectionPoint[] = []

  for (const eventId of selectedEventIds) {
    const point = renderState.pointsByEventId.get(eventId)
    const staffIndex = renderState.staffIndexByEventId.get(eventId)
    const systemIndex = renderState.systemsByEventId.get(eventId)

    if (!point || staffIndex === undefined || systemIndex === undefined) {
      continue
    }

    points.push({
      eventId,
      noteHeadBeginX: point.noteHeadBeginX,
      noteHeadBottomY: point.noteHeadBottomY,
      noteHeadEndX: point.noteHeadEndX,
      noteHeadTopY: point.noteHeadTopY,
      staffIndex,
      systemIndex,
      x: point.x,
      y: point.y
    })
  }

  if (points.length < 2) {
    return
  }

  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  group.classList.add('notation-range-selection-layer')
  group.setAttribute('aria-hidden', 'true')

  for (const band of resolveRangeSelectionBands(points)) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.classList.add('notation-range-selection-band')
    rect.setAttribute('data-system-index', String(band.systemIndex))
    rect.setAttribute('data-staff-index', String(band.staffIndex))
    rect.setAttribute('x', String(band.x))
    rect.setAttribute('y', String(band.y))
    rect.setAttribute('width', String(band.width))
    rect.setAttribute('height', String(band.height))
    rect.setAttribute('rx', '7')
    group.append(rect)
  }

  svg.insertBefore(group, svg.firstChild)
}

function drawMeasureAnnotations(
  svg: SVGSVGElement | null,
  placement: MeasurePlacement,
  measure: Measure,
  staffY: number,
  annotationMaps: MeasureAnnotationMaps,
  annotationLanesByMeasureId: Map<string, MeasureAnnotationLanes>,
  firstEventX: number | undefined
): void {
  if (!svg) {
    return
  }

  const lanes =
    annotationLanesByMeasureId.get(measure.id) ??
    resolveMeasureAnnotationLanes({
      lyricLineCount: countMeasureLyricLines(measure)
    })
  const rehearsalMark = annotationMaps.rehearsalMarksByMeasureId.get(measure.id)

  if (rehearsalMark) {
    drawRehearsalMark(
      svg,
      placement.x + 14,
      staffY + (lanes.rehearsalMarkYOffset ?? REHEARSAL_MARK_Y_OFFSET),
      rehearsalMark.text
    )
  }

  for (const [index, systemText] of (
    annotationMaps.systemTextsByMeasureId.get(measure.id) ?? []
  ).entries()) {
    drawSystemText(
      svg,
      placement.x + 14,
      staffY + (lanes.systemTextYOffsets[index] ?? SYSTEM_TEXT_Y_OFFSET),
      systemText.text,
      measure.id
    )
  }

  const staffText = annotationMaps.staffTextsByMeasureId.get(measure.id)

  if (staffText) {
    drawStaffText(
      svg,
      placement.x + 14,
      staffY + (lanes.staffTextYOffset ?? STAFF_TEXT_Y_OFFSET),
      staffText.text,
      measure.id
    )
  }

  const dynamic = annotationMaps.dynamicsByMeasureId.get(measure.id)

  if (dynamic) {
    drawDynamicMark(
      svg,
      (firstEventX ?? placement.x + 88) - 2,
      staffY + (lanes.dynamicMarkYOffset ?? DYNAMIC_MARK_Y_OFFSET),
      dynamic.value,
      measure.id
    )
  }

  for (const tempoEvent of annotationMaps.tempoEventsByMeasureId.get(measure.id) ?? []) {
    drawPositionedTempoMarking(
      svg,
      resolveTickX(placement, measure, tempoEvent.tick),
      staffY,
      tempoEvent,
      measure.id
    )
  }

  for (const [index, harmony] of (
    annotationMaps.harmoniesByMeasureId.get(measure.id) ?? []
  ).entries()) {
    drawHarmonyMark(
      svg,
      resolveTickX(placement, measure, harmony.tick),
      staffY + (lanes.harmonyMarkYOffsets[index] ?? HARMONY_MARK_Y_OFFSET),
      harmony.text,
      measure.id
    )
  }

  for (const [index, expressionText] of (
    annotationMaps.expressionTextsByMeasureId.get(measure.id) ?? []
  ).entries()) {
    drawExpressionText(
      svg,
      resolveTickX(placement, measure, expressionText.tick),
      staffY + (lanes.expressionTextYOffsets[index] ?? EXPRESSION_TEXT_Y_OFFSET),
      expressionText.text,
      measure.id
    )
  }
}

function resolveTickX(
  placement: MeasurePlacement,
  measure: Measure,
  tick: number
): number {
  return (
    placement.x +
    18 +
    (tick / measureDurationTicks(measure)) * Math.max(1, placement.width - 36)
  )
}

function drawPassiveStaffMeasure(
  context: ReturnType<Renderer['getContext']>,
  svg: SVGSVGElement | null,
  placement: MeasurePlacement,
  target: RenderedStaffTarget,
  measure: Measure,
  previousMeasure: Measure | undefined,
  annotationMaps: MeasureAnnotationMaps,
  annotationLanesByMeasureId: Map<string, MeasureAnnotationLanes>,
  interaction: RenderedStaffInteraction,
  renderState: RenderedStaffState
): void {
  const y = placement.y + target.globalStaffIndex * STACKED_STAFF_Y_OFFSET
  const stave = new Stave(placement.x, y, placement.width)
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

  if (measure.repeat?.start) {
    stave.setBegBarType(BarlineType.REPEAT_BEGIN)
  }

  if (measure.repeat?.end) {
    stave.setEndBarType(BarlineType.REPEAT_END)
  }

  if (showsClef) {
    stave.addClef(toVexFlowClef(measure.clef))
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
  updateStaffSystemBounds(
    renderState.boundsByStaffSystemKey,
    placement,
    target.globalStaffIndex,
    y
  )

  if (svg && placement.isSystemStart) {
    drawStaffLabel(
      svg,
      placement.x + 4,
      y - 12,
      target.staffIndex === 0 ? target.partName : `Staff ${target.staffIndex + 1}`,
      target
    )
  }

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

  if (placement.isSystemStart) {
    updateStaffSystemBounds(
      renderState.boundsByStaffSystemKey,
      placement,
      target.globalStaffIndex,
      y,
      stave.getNoteStartX()
    )
  }

  const voices = measure.voices.map((voice) => {
    const events = sortVoiceEvents(voice.events)
    const notes = events.map((event) =>
      createStaveNote(
        event,
        measure,
        voice,
        interaction.selectedEventIdSet,
        interaction.selectedEventId,
        isPlaybackEventTarget(event.id, measure.id, voice.id, {
          partId: target.partId,
          staffId: target.staffId,
          eventId: interaction.playbackEventId,
          address: interaction.playbackEventAddress
        }),
        {
          partId: target.partId,
          staffId: target.staffId,
          measureId: measure.id,
          voiceId: voice.id
        },
        interaction.selectedEventAddress
      )
    )
    const measureNotesByEventId = new Map(
      notes.map((note) => [
        note.getAttribute('data-event-id') as string,
        note
      ])
    )
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
      vexVoice,
      voiceId: voice.id
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

  voices.forEach(({ beams, events, notes, tuplets, vexVoice, voiceId }) => {
    vexVoice.draw(context, stave)
    beams.forEach((beam) => beam.setContext(context).draw())
    tuplets.forEach((tuplet) => tuplet.setContext(context).draw())

    notes.forEach((note, noteIndex) => {
      const event = events[noteIndex]
      const svgElement = note.getSVGElement()
      const eventAddress = {
        partId: target.partId,
        staffId: target.staffId,
        measureId: measure.id,
        voiceId
      }

      if (!svgElement) {
        return
      }

      svgElement.classList.add('notation-event', 'notation-event--passive-staff')
      svgElement.classList.toggle('is-preview', isPreviewEventId(event.id))
      svgElement.classList.toggle(
        'is-selected',
        resolveNotationEventTone(
          event.id,
          interaction.selectedEventIdSet,
          interaction.selectedEventId,
          isPlaybackEventTarget(event.id, measure.id, voiceId, {
            partId: target.partId,
            staffId: target.staffId,
            eventId: interaction.playbackEventId,
            address: interaction.playbackEventAddress
          }),
          eventAddress,
          interaction.selectedEventAddress
        ) === 'selected'
      )
      svgElement.classList.toggle(
        'is-playback',
        resolveNotationEventTone(
          event.id,
          interaction.selectedEventIdSet,
          interaction.selectedEventId,
          isPlaybackEventTarget(event.id, measure.id, voiceId, {
            partId: target.partId,
            staffId: target.staffId,
            eventId: interaction.playbackEventId,
            address: interaction.playbackEventAddress
          }),
          eventAddress,
          interaction.selectedEventAddress
        ) === 'playback'
      )
      svgElement.setAttribute('data-event-id', event.id)
      svgElement.setAttribute('data-part-id', target.partId)
      svgElement.setAttribute('data-staff-id', target.staffId)
      svgElement.setAttribute('data-measure-id', measure.id)
      svgElement.setAttribute('data-voice-id', voiceId)
      renderState.notesByEventId.set(event.id, note)
      renderState.systemsByEventId.set(event.id, placement.systemIndex)
      renderState.staffIndexByEventId.set(event.id, target.globalStaffIndex)

      const centeredRestShift =
        event.type === 'rest' && event.fullMeasure
          ? centerFullMeasureRest(svgElement, {
              x: defaultNoteStartX,
              width: stave.getNoteEndX() - defaultNoteStartX
            })
          : 0
      const eventX = getVisibleNoteX(note) + centeredRestShift

      renderState.pointsByEventId.set(event.id, {
        measureId: measure.id,
        x: eventX,
        y,
        ...resolveSlurAnchorMetrics(note)
      })
      firstEventX = Math.min(firstEventX ?? eventX, eventX)

      if (isPreviewEventId(event.id)) {
        return
      }

      svgElement.setAttribute('role', 'button')
      svgElement.setAttribute('tabindex', '0')
      svgElement.addEventListener('click', (mouseEvent) => {
        mouseEvent.stopPropagation()
        interaction.onSelectEvent(event.id, mouseEvent.shiftKey, eventAddress)
      })
      svgElement.addEventListener('mousedown', (mouseEvent) => {
        if (mouseEvent.button !== 0) {
          return
        }

        mouseEvent.preventDefault()
        mouseEvent.stopPropagation()
        interaction.setDragAnchor({ address: eventAddress, eventId: event.id })
        interaction.onSelectEvent(event.id, mouseEvent.shiftKey, eventAddress)
      })
      svgElement.addEventListener('mouseenter', (mouseEvent) => {
        const dragAnchor = interaction.getDragAnchor()

        if (!dragAnchor || mouseEvent.buttons !== 1) {
          return
        }

        if (!dragAnchorMatchesVoiceAddress(dragAnchor, eventAddress)) {
          return
        }

        mouseEvent.preventDefault()
        interaction.onSelectEventRange(
          dragAnchor.eventId,
          event.id,
          eventAddress
        )
      })
    })
  })

  drawMeasureAnnotations(
    svg,
    placement,
    measure,
    y,
    annotationMaps,
    annotationLanesByMeasureId,
    firstEventX
  )
}

function resolveMeasureStaffTarget(
  measureId: string,
  x: number,
  width: number,
  stave: Stave
): MeasureContextTarget {
  const topLineY = stave.getYForLine(0)
  const bottomLineY = stave.getYForLine(4)

  return {
    measureId,
    x1: x,
    x2: x + width,
    y1: topLineY - MEASURE_STAFF_VERTICAL_PADDING,
    y2: bottomLineY + MEASURE_STAFF_VERTICAL_PADDING
  }
}

function isNotationEventContextTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('.notation-event'))
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
  tempo: TempoMarking,
  measureId?: string
): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-tempo-marking', 'notation-tempo-marking--positioned')
  if (tempo.transparent) {
    text.classList.add('notation-tempo-marking--transparent')
  }
  if (measureId) {
    text.setAttribute('data-measure-id', measureId)
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

function drawVoltaMark(
  svg: SVGSVGElement,
  startX: number,
  endX: number,
  staffTopY: number,
  volta: NonNullable<Measure['volta']>
): void {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  const bracketY = staffTopY - 22
  const leftX = startX
  const rightX = endX
  const horizontal = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  group.classList.add('notation-volta-mark')
  horizontal.setAttribute('x1', String(leftX))
  horizontal.setAttribute('x2', String(rightX))
  horizontal.setAttribute('y1', String(bracketY))
  horizontal.setAttribute('y2', String(bracketY))

  if (volta.start) {
    const leftHook = document.createElementNS('http://www.w3.org/2000/svg', 'line')

    leftHook.setAttribute('x1', String(leftX))
    leftHook.setAttribute('x2', String(leftX))
    leftHook.setAttribute('y1', String(bracketY))
    leftHook.setAttribute('y2', String(bracketY + 12))
    group.append(leftHook)
  }

  if (volta.end) {
    const rightHook = document.createElementNS('http://www.w3.org/2000/svg', 'line')

    rightHook.setAttribute('x1', String(rightX))
    rightHook.setAttribute('x2', String(rightX))
    rightHook.setAttribute('y1', String(bracketY))
    rightHook.setAttribute('y2', String(bracketY + 12))
    group.append(rightHook)
  }

  if (volta.start) {
    label.setAttribute('x', String(leftX + 8))
    label.setAttribute('y', String(bracketY - 4))
    label.textContent = `${volta.number}.`
    group.append(label)
  }

  group.append(horizontal)
  svg.append(group)
}

function drawRepeatTimes(
  svg: SVGSVGElement,
  x: number,
  y: number,
  times: number
): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-repeat-times')
  text.setAttribute('x', String(x))
  text.setAttribute('y', String(y))
  text.textContent = `x${times}`
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
  label: string,
  measureId?: string
): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-staff-text')
  if (measureId) {
    text.setAttribute('data-measure-id', measureId)
  }
  text.setAttribute('x', String(x))
  text.setAttribute('y', String(y))
  text.textContent = label
  svg.append(text)
}

function drawStaffLabel(
  svg: SVGSVGElement,
  x: number,
  y: number,
  label: string,
  target: RenderedStaffTarget
): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-staff-label')
  text.setAttribute('data-part-id', target.partId)
  text.setAttribute('data-staff-id', target.staffId)
  text.setAttribute('x', String(x))
  text.setAttribute('y', String(y))
  text.textContent = label
  svg.append(text)
}

function drawSystemText(
  svg: SVGSVGElement,
  x: number,
  y: number,
  label: string,
  measureId?: string
): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-system-text')
  if (measureId) {
    text.setAttribute('data-measure-id', measureId)
  }
  text.setAttribute('x', String(x))
  text.setAttribute('y', String(y))
  text.textContent = label
  svg.append(text)
}

function drawExpressionText(
  svg: SVGSVGElement,
  x: number,
  y: number,
  label: string,
  measureId?: string
): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-expression-text')
  if (measureId) {
    text.setAttribute('data-measure-id', measureId)
  }
  text.setAttribute('x', String(x))
  text.setAttribute('y', String(y))
  text.textContent = label
  svg.append(text)
}

function drawHarmonyMark(
  svg: SVGSVGElement,
  x: number,
  y: number,
  label: string,
  measureId?: string
): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-harmony-mark')
  if (measureId) {
    text.setAttribute('data-measure-id', measureId)
  }
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
  boundsBySystemIndex: Map<number, SystemBounds>,
  yOffset = HAIRPIN_Y_OFFSET
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
      segment.isLast,
      yOffset
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
  isLast: boolean,
  yOffset = HAIRPIN_Y_OFFSET
): void {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  const upper = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  const lower = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  const y = staffY + yOffset
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
  slurIndex: number,
  side: 'above' | 'below'
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
    } else {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      const symbolByArticulation: Record<string, string> = {
        accent: '>',
        tenuto: '−',
        marcato: '^'
      }
      const symbol = symbolByArticulation[articulation]

      if (!symbol) {
        return
      }

      text.classList.add('notation-articulation')
      text.setAttribute('x', String(x))
      text.setAttribute('y', String(y + 4))
      text.textContent = symbol
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
  eventId: string,
  x: number,
  staffY: number,
  lyrics: NonNullable<Extract<VoiceEvent, { type: 'note' }>['lyrics']>,
  lyricScale: number,
  onSelectLyric: (eventId: string, verse: number) => void
): void {
  sortLyricsForDisplay(lyrics).forEach((lyric, index) => {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    const lineIndex = Math.max(0, (lyric.number ?? index + 1) - 1)
    const verse = lyric.number ?? index + 1

    text.classList.add('notation-lyric')
    text.setAttribute('data-event-id', eventId)
    text.setAttribute('data-lyric-number', String(verse))
    text.setAttribute('role', 'button')
    text.setAttribute('tabindex', '0')
    text.setAttribute('x', String(x + 4))
    text.setAttribute(
      'y',
      String(staffY + 116 * lyricScale + lineIndex * 16 * lyricScale)
    )
    text.setAttribute('font-size', String(13 * lyricScale))
    text.textContent = `${lyric.text}${
      lyric.syllabic === 'begin' || lyric.syllabic === 'middle' ? '-' : ''
    }${lyric.extend ? '_' : ''}`
    text.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      onSelectLyric(eventId, verse)
    })
    text.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      onSelectLyric(eventId, verse)
    })
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
  let isComposing = false
  let commitAfterComposition = false
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
  const lyricAnchorX = x + 4
  const lyricLineY = staffY + 116 + (editor.number - 1) * 16
  container.setAttribute('x', String(lyricAnchorX - LYRIC_EDITOR_WIDTH / 2))
  container.setAttribute('y', String(lyricLineY - LYRIC_EDITOR_BASELINE_OFFSET))
  container.setAttribute('width', String(LYRIC_EDITOR_WIDTH))
  container.setAttribute('height', String(LYRIC_EDITOR_HEIGHT))

  input.setAttribute('aria-label', '선택 음표 가사')
  input.maxLength = 48
  input.placeholder = '가사'
  input.type = 'text'
  input.value = editor.value
  input.addEventListener('beforeinput', stopLyricEditorEvent)
  input.addEventListener('input', stopLyricEditorEvent)
  input.addEventListener('compositionstart', (event) => {
    stopLyricEditorEvent(event)
    isComposing = true
  })
  input.addEventListener('compositionend', (event) => {
    stopLyricEditorEvent(event)
    isComposing = false

    if (commitAfterComposition) {
      commitAfterComposition = false
      commit()
    }
  })
  input.addEventListener('blur', () => {
    if (isComposing) {
      commitAfterComposition = true
      return
    }

    commit()
  })
  input.addEventListener('keydown', (event) => {
    stopLyricEditorEvent(event)

    if (event.isComposing || isComposing || event.key === 'Process') {
      return
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      commit()
      editor.onMoveVerse(event.key === 'ArrowDown' ? 1 : -1)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      commit({ moveNext: true })
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
  }

  focusInput()
}

function sortLyricsForDisplay(
  lyrics: NonNullable<Extract<VoiceEvent, { type: 'note' }>['lyrics']>
): NonNullable<Extract<VoiceEvent, { type: 'note' }>['lyrics']> {
  return [...lyrics].sort(
    (left, right) => (left.number ?? 1) - (right.number ?? 1)
  )
}

function hasLaterVoltaEnd(
  measures: Measure[],
  startIndex: number,
  number: 1 | 2
): boolean {
  for (let index = startIndex + 1; index < measures.length; index += 1) {
    if (measures[index].volta?.number === number && measures[index].volta?.end) {
      return true
    }
  }

  return false
}

function stopLyricEditorEvent(event: Event): void {
  event.stopPropagation()
  event.stopImmediatePropagation()
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

function dragAnchorMatchesVoiceAddress(
  anchor: DragAnchor,
  eventAddress?: VoiceAddress
): boolean {
  if (!anchor.address || !eventAddress) {
    return true
  }

  return sameVoiceLane(anchor.address, eventAddress)
}

function createStaveNote(
  event: VoiceEvent,
  measure: Measure,
  voice: ScoreVoice,
  selectedEventIds: Set<string>,
  selectedEventId?: string,
  isPlaybackEvent = false,
  eventAddress?: VoiceAddress,
  selectedEventAddress?: VoiceAddress
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
      isPlaybackEvent,
      eventAddress,
      selectedEventAddress
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

function isPlaybackEventTarget(
  eventId: string,
  measureId: string,
  voiceId: string,
  playback?: {
    partId?: string
    staffId?: string
    eventId?: string
    address?: VoiceAddress
  }
): boolean {
  if (!playback?.eventId || eventId !== playback.eventId) {
    return false
  }

  if (!playback.address) {
    return true
  }

  return (
    (!playback.partId || playback.address.partId === playback.partId) &&
    (!playback.staffId || playback.address.staffId === playback.staffId) &&
    playback.address.measureId === measureId &&
    playback.address.voiceId === voiceId
  )
}
