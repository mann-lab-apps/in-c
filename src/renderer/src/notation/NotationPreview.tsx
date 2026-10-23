import { useEffect, useRef, useState } from 'react'
import {
  Accidental,
  BarlineType,
  Beam,
  Clef as VexClef,
  Dot,
  Formatter,
  Ornament,
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
  findVoltaEndIndex,
  measureDurationTicks,
  projectRepeatMarksToStaff,
  scoreRepeatSource,
  resolveNotePitch,
  TICKS_PER_QUARTER,
  type RhythmFeelMarking,
  shouldDisplayAccidental,
  sortVoiceEvents,
  type DurationValue,
  type Measure,
  type Clef,
  type Score,
  type SpanEngraving,
  type SpanSegmentAddress,
  resolveSpanSegmentEngraving,
  spanSegmentKey,
  type Staff,
  type TempoMarking,
  type Voice as ScoreVoice,
  type VoiceAddress,
  type VoiceEvent
} from '../../../score-core'
import { createBeamGroups } from './beam-groups'
import { projectGlobalAnnotationsForRendering } from './global-annotation-projection'
import { resolveSpanViewport } from './span-viewport'
import type { SpanReference } from '../editor/span-editing'
import {
  createSystemLayout,
  leadingNotationPadding,
  resolveLeadingNotationVisibility,
  type MeasurePlacement
} from './system-layout'
import {
  resolveMeasureClefAtTick,
  toVexFlowAccidental,
  toVexFlowClef,
  toVexFlowDuration,
  toVexFlowKey,
  toVexFlowRestKey,
  toVexFlowKeySignature
} from './vexflow-adapter'
import {
  resolveHairpinOpenings,
  resolveHairpinStemClearance,
  resolveHairpinSegments
} from './hairpin-rendering'
import {
  countMeasureLyricLines,
  DYNAMIC_MARK_Y_OFFSET,
  EXPRESSION_TEXT_Y_OFFSET,
  HAIRPIN_Y_OFFSET,
  HARMONY_MARK_Y_OFFSET,
  REHEARSAL_MARK_Y_OFFSET,
  resolveHairpinSpanYOffset,
  resolveMeasureAnnotationLanes,
  resolveSlurSideForAnnotationLanes,
  STAFF_TEXT_Y_OFFSET,
  SYSTEM_TEXT_Y_OFFSET,
  type MeasureAnnotationLanes
} from './annotation-lanes'
import { resolveScoreVerticalLayout, resolveScoreSystemVerticalLayouts, type SystemStaffInkBounds } from './score-vertical-layout'
import { estimatePrintedPageCount, type PrintLayoutPlan } from './print-layout'
import {
  resolveRangeSelectionBands,
  type RangeSelectionPoint
} from './range-selection-bands'
import { resolveMixedTupletOnsetShifts } from './tuplet-spacing'
import {
  resolveNotationEventTone,
  resolveSameStaffVoicePresentation,
  sameVoiceLane
} from './visual-state'

interface NotationPreviewProps {
  selectedSpan?: SpanReference
  onSelectSpan?: (reference: SpanReference) => void
  onRenderedSpanSegments?: (score: Score, segments: SpanReference[]) => void
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
  onSelectObject?: (
    type: 'harmonies' | 'dynamics' | 'staffTexts' | 'systemTexts' | 'rehearsalMarks' | 'expressionTexts',
    measureId: string,
    id: string
  ) => void
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
const SYSTEM_LABEL_GUTTER = 84
const MEASURE_STAFF_VERTICAL_PADDING = 18
const LYRIC_EDITOR_WIDTH = 148
const LYRIC_EDITOR_HEIGHT = 34
const LYRIC_EDITOR_BASELINE_OFFSET = 22
const MAX_AUTO_VOLTA_VISIBLE_MEASURES = 3
const STACCATO_RADIUS = 1.9

interface InkBounds {
  left: number
  right: number
  top: number
  bottom: number
}

interface CursorPoint {
  voiceLane?: string
  staccatoYs?: number[]
  durationDotInkBounds?: InkBounds[]
  isRest?: boolean
  articulationAboveClearance?: number
  articulationBelowClearance?: number
  tupletAboveClearance?: number
  tupletBelowClearance?: number
  tupletInkBounds?: InkBounds[]
  measureId?: string
  x: number
  y: number
  noteHeadTopY?: number
  noteHeadBottomY?: number
  noteHeadBeginX?: number
  noteHeadEndX?: number
  noteHeadInkBounds?: InkBounds
  stemDirection?: number
  stemX?: number
  stemTopY?: number
  stemBottomY?: number
}

interface RenderedTuplet {
  eventIds: string[]
  tuplet: VexTuplet
}

interface SystemBounds {
  x1: number
  x2: number
  noteStartX?: number
  y: number
  startMeasureId: string
  endMeasureId: string
}

type HairpinRenderSegment = ReturnType<typeof resolveHairpinSegments>[number]

interface HairpinAutoLane {
  globalStaffIndex: number
  yOffset: number
  segment: Pick<HairpinRenderSegment, 'systemIndex' | 'x1' | 'x2'>
}

interface RenderedSpanSegment {
  element: SVGGraphicsElement
  address: SpanSegmentAddress
  staffY: number
  systemIndex: number
}

interface MeasureAnnotationMaps {
  dynamicsByMeasureId: Map<string, NonNullable<Score['dynamics']>>
  expressionTextsByMeasureId: Map<string, NonNullable<Score['expressionTexts']>>
  harmoniesByMeasureId: Map<string, NonNullable<Score['harmonies']>>
  rehearsalMarksByMeasureId: Map<string, NonNullable<Score['rehearsalMarks']>>
  staffTextsByMeasureId: Map<string, NonNullable<Score['staffTexts']>>
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
  partStaffCount: number
  staff: Staff
  staffId: string
  staffIndex: number
}

interface PreparedStaffMeasure {
  measure: Measure
  stave: Stave
  voices: Voice[]
  staffIndex: number
  draw: (shared: boolean) => void
}

interface RenderedStaffInteraction {
  lyricScale: number
  onSelectLyric: NotationPreviewProps['onSelectLyric']
  onSelectObject?: NotationPreviewProps['onSelectObject']
  inlineLyricEditor?: InlineLyricEditor
  selectedMeasureId?: string
  onSelectMeasure: NotationPreviewProps['onSelectMeasure']
  onOpenMeasureContextMenu: NotationPreviewProps['onOpenMeasureContextMenu']
  measureContextTargets: MeasureContextTarget[]
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

interface ActiveVoltaRender {
  endIndex: number
  displayEndIndex: number
  showEnd: boolean
  endStyle?: 'open' | 'closed'
  number: 1 | 2
}

export function NotationPreview({
  selectedSpan,
  onSelectSpan,
  onRenderedSpanSegments,
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
  onSelectObject,
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

  function renderPass(systemInkBounds = new Map<number, { top: number; bottom: number }>(), pass = 0,
    staffInkBounds: SystemStaffInkBounds = new Map(),
    lowerAnnotationOffsets = new Map<string, number>(),
    hairpinStackOffsets = new Map<string, number>()): (() => void) | undefined {
    const container = containerRef.current
    if (!container) return
    container.replaceChildren()

    const repeatSource = scoreRepeatSource(score)
    const renderedStaffTargets = createRenderedStaffTargets(score).map(target => repeatSource
      ? { ...target, staff: projectRepeatMarksToStaff(repeatSource, target.staff) }
      : target)
    const renderedPart = score.parts[0]
    const renderedStaff = renderedStaffTargets[0]?.staff
    const measures = renderedStaff?.measures ?? []
    const effectiveRenderWidth = printLayoutPlan?.renderWidth ?? renderWidth
    const printScale = printLayoutPlan?.scale ?? 1
    const lyricScale = Math.max(0.82, printScale)
    const annotationMaps = createMeasureAnnotationMaps(score)
    const vertical = resolveScoreVerticalLayout(score, lyricScale,
      printLayoutPlan?.systemHeight ?? SINGLE_STAFF_SYSTEM_HEIGHT,
      printLayoutPlan?.systemTop ?? DEFAULT_SYSTEM_TOP, undefined, lowerAnnotationOffsets, hairpinStackOffsets)
    const annotationLanesByMeasureId = vertical.lanesByMeasureId
    const visibleStaffCount = Math.max(1, renderedStaffTargets.length)
    const layoutOptions = {
      parallelMeasures: renderedStaffTargets.slice(1).map(target => target.staff.measures),
      compactSpacing: Boolean(printLayoutPlan?.compactSpacing),
      leadingGutter: SYSTEM_LABEL_GUTTER,
      layout: score.layout,
      lyricScale,
      pageHeight: printLayoutPlan?.pageHeight,
      systemHeight: vertical.systemHeight,
      systemTop: vertical.systemTop,
      topInkPadding: vertical.topInkPadding,
      systemInkBounds
    }
    const initialLayout = createSystemLayout(measures, effectiveRenderWidth, layoutOptions)
    const systemVerticals = resolveScoreSystemVerticalLayouts(score, initialLayout.placements, lyricScale,
      printLayoutPlan?.systemHeight ?? SINGLE_STAFF_SYSTEM_HEIGHT,
      printLayoutPlan?.systemTop ?? DEFAULT_SYSTEM_TOP, staffInkBounds, lowerAnnotationOffsets, hairpinStackOffsets)
    const layout = createSystemLayout(measures, effectiveRenderWidth, { ...layoutOptions, systemMetrics: systemVerticals })
    const measuredSystemInkBounds = new Map<number, { top: number; bottom: number }>()
    const measuredStaffInkBounds: SystemStaffInkBounds = new Map()
    const staffInkFor = (system: number) => {
      if (!measuredStaffInkBounds.has(system)) measuredStaffInkBounds.set(system, new Map())
      return measuredStaffInkBounds.get(system)!
    }
    const renderedSegments: SpanReference[] = []
    const renderedVoltas: { element: SVGGElement; systemIndex: number }[] = []
    const preparedMeasures = new Map<MeasurePlacement, PreparedStaffMeasure[]>()
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
    let activeVolta: ActiveVoltaRender | undefined
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
      const previousMeasure = previousPlacement?.measure
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

      const {
        showsClef,
        showsKeySignature,
        showsTimeSignature
      } = resolveLeadingNotationVisibility(
        measure,
        previousMeasure,
        placement.isSystemStart
      )

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

      if (svg && placement.isSystemStart) {
        drawSystemPartLabels(
          svg,
          placement,
          renderedStaffTargets,
          systemVerticals.get(placement.systemIndex)!.staffOffsets
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

      const voltaEndIndex = measure.volta?.start
        ? findVoltaEndIndex(measures, placementIndex)
        : undefined

      if (measure.volta?.start && voltaEndIndex !== undefined) {
        const visibleMeasureCount = voltaEndIndex - placementIndex + 1
        const explicitEndIndex = measure.volta.displayEndMeasureId
          ? measures.findIndex(item => item.id === measure.volta!.displayEndMeasureId) : -1
        const hasExplicitEnd = explicitEndIndex >= placementIndex && explicitEndIndex <= voltaEndIndex
        const shortened = visibleMeasureCount > MAX_AUTO_VOLTA_VISIBLE_MEASURES && !hasExplicitEnd

        activeVolta = {
          endIndex: voltaEndIndex,
          displayEndIndex: hasExplicitEnd ? explicitEndIndex : shortened ? placementIndex : voltaEndIndex,
          showEnd: !shortened,
          endStyle: measures[voltaEndIndex]!.volta?.endStyle,
          number: measure.volta.number
        }
      }

      const suppressVoltaContinuation = Boolean(
        activeVolta && placementIndex > activeVolta.displayEndIndex
      )
      const displayVolta =
        !suppressVoltaContinuation &&
        (measure.volta || activeVolta)
          ? {
              number: (measure.volta ?? activeVolta)?.number ?? 1,
              start: measure.volta?.start,
              end: activeVolta ? activeVolta.showEnd && placementIndex === activeVolta.displayEndIndex : measure.volta?.end,
              endStyle: activeVolta ? activeVolta.endStyle : measure.volta?.endStyle
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

        renderedVoltas.push({ systemIndex: placement.systemIndex, element: drawVoltaMark(
          svg,
          notationStartX,
          notationEndX,
          staffTopY,
          displayVolta
        ) })
      }

      if (measure.volta?.end || activeVolta?.endIndex === placementIndex) {
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
            }),
            measure.voices.length > 1
          )
        )
        const tuplets: RenderedTuplet[] = (voice.tuplets ?? []).map((group) => {
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

          return {
            eventIds: group.eventIds,
            tuplet: new VexTuplet(groupNotes, {
              numNotes: group.actualNotes,
              notesOccupied: group.normalNotes,
              bracketed: groupEvents.some(
                (event) =>
                  event?.type === 'rest' ||
                  (event && !isNotationBeamable(event))
              ),
              ratioed: group.actualNotes !== 3 || group.normalNotes !== 2
            })
          }
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

      const draw = (shared: boolean) => {
        if (!shared) voices.forEach(({ events, notes, scoreTuplets }) => {
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
          tuplets.forEach(({ tuplet }) => tuplet.setContext(context).draw())
          const tupletClearanceByEventId = resolveTupletAttachmentClearances(
            tuplets,
            new Map(notes.map((note, index) => [events[index].id, note]))
          )

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
            svgElement.setAttribute(
              'data-voice-lane',
              String(note.getAttribute('data-voice-lane') ?? 'neutral')
            )
            const stemDirection = note.getAttribute('data-voice-stem-direction')
            if (stemDirection) {
              svgElement.setAttribute('data-voice-stem-direction', String(stemDirection))
            }

            if (!isPreviewEventId(eventId)) {
              svgElement.setAttribute('role', 'button')
              svgElement.setAttribute('tabindex', '0')
              svgElement.addEventListener('keydown', event => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                event.stopPropagation()
                if (!event.repeat) onSelectEvent(eventId, event.shiftKey, eventAddress)
              })
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
              ...resolveSlurAnchorMetrics(note),
              ...tupletClearanceByEventId.get(eventId),
              ...resolveSlurAttachmentClearance(event, note, placement.y)
            })
            firstEventX = Math.min(firstEventX ?? eventX, eventX)

            if (event?.clefBefore) {
              drawInlineClef(svg, event.clefBefore, eventX - 24, stave, event.id)
            }
            drawEventAttachments(svg, event, note, eventX, placement.y, { lyricScale, onSelectLyric, inlineLyricEditor }, annotationLanesByMeasureId.get(measure.id)?.lowerOffset)
          })
        })

        drawMeasureAnnotations(
          svg,
          placement,
          measure,
          placement.y,
          annotationMaps,
          annotationLanesByMeasureId,
          firstEventX,
          onSelectObject
        )
      }
      preparedMeasures.set(placement, [{ measure, stave, staffIndex: primaryStaffIndex,
        voices: voices.map(({ vexVoice }) => vexVoice), draw }])
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

        const prepared = preparePassiveStaffMeasure(
          context,
          svg,
          placement,
          target,
          systemVerticals.get(placement.systemIndex)!.staffOffsets[target.globalStaffIndex]!,
          measure,
          target.staff.measures[measureIndex - 1],
          annotationMaps,
          annotationLanesByMeasureId,
          {
            lyricScale,
            onSelectLyric,
            inlineLyricEditor,
            selectedMeasureId,
            onSelectMeasure,
            onSelectObject,
            onOpenMeasureContextMenu,
            measureContextTargets,
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
        preparedMeasures.get(placement)!.push(prepared)
      }
    }

    // Share tick positions across aligned staves before drawing notes or attachments.
    for (const [placement, prepared] of preparedMeasures) {
      const compatible = new Map<string, PreparedStaffMeasure[]>()
      for (const item of prepared) {
        const key = `${measureDurationTicks(item.measure)}:${item.voices[0]?.getTotalTicks().value()}`
        compatible.set(key, [...(compatible.get(key) ?? []), item])
      }
      for (const group of compatible.values()) {
        formatStaffMeasures(group, context)
        for (const item of group) {
          const target = svg?.querySelector(`.notation-measure[data-measure-id="${CSS.escape(item.measure.id)}"]`)
          target?.setAttribute('data-note-start-x', String(item.stave.getNoteStartX()))
          if (placement.isSystemStart) updateStaffSystemBounds(staffRenderState.boundsByStaffSystemKey,
            placement, item.staffIndex, item.stave.getY(), item.stave.getNoteStartX(), item.measure.id)
          item.draw(group.length > 1)
        }
      }
    }

    drawRangeSelectionBands(svg, selectedEventIdSet, staffRenderState)

    const tiePairs = collectTiePairs(score)
    const tieInk: { systemIndex: number; bounds: InkBounds }[] = []
    const drawMeasuredTie = (first: StaveNote | null, last: StaveNote | null, eventId: string) => {
      const tie = drawTie(context, first, last)
      const systemIndex = staffRenderState.systemsByEventId.get(eventId)!
      const staffIndex = staffRenderState.staffIndexByEventId.get(eventId)!
      const systemY = layout.placements.find(placement => placement.systemIndex === systemIndex)!.y
      const staffY = staffRenderState.boundsByStaffSystemKey.get(createStaffSystemKey(systemIndex, staffIndex))!.y
      const group = tie.getSVGElement()
      group?.setAttribute('data-tie-system', String(systemIndex))
      // VexFlow owns the curve; measure its filled paths rather than duplicating its geometry.
      for (const path of group?.querySelectorAll('path') ?? []) {
        const box = path.getBBox()
        if (box.width <= 0 || box.height <= 0 || ![box.x, box.y, box.width, box.height].every(Number.isFinite)) continue
        const bounds = { left: box.x, right: box.x + box.width, top: box.y, bottom: box.y + box.height }
        tieInk.push({ systemIndex, bounds })
        const previous = measuredSystemInkBounds.get(systemIndex)
        measuredSystemInkBounds.set(systemIndex, {
          top: Math.min(previous?.top ?? Infinity, bounds.top - systemY),
          bottom: Math.max(previous?.bottom ?? -Infinity, bounds.bottom - systemY)
        })
        const staffInk = staffInkFor(systemIndex), previousStaff = staffInk.get(staffIndex)
        staffInk.set(staffIndex, {
          top: Math.min(previousStaff?.top ?? Infinity, bounds.top - staffY),
          bottom: Math.max(previousStaff?.bottom ?? -Infinity, bounds.bottom - staffY)
        })
      }
    }
    const hangingStarts = new Set<string>()
    const hangingStops = new Set<string>()
    tiePairs.forEach((pair) => {
      const firstNote = staffRenderState.notesByEventId.get(pair.fromEventId)
      const lastNote = staffRenderState.notesByEventId.get(pair.toEventId)

      if (!firstNote || !lastNote) {
        return
      }

      if (pair.isDiscontinuous) {
        if (!tiePairs.some(other => !other.isDiscontinuous && other.fromEventId === pair.fromEventId) && !hangingStarts.has(pair.fromEventId)) {
          drawMeasuredTie(firstNote, null, pair.fromEventId)
          hangingStarts.add(pair.fromEventId)
        }
        if (!hangingStops.has(pair.toEventId)) {
          drawMeasuredTie(null, lastNote, pair.toEventId)
          hangingStops.add(pair.toEventId)
        }
      } else if (
        staffRenderState.systemsByEventId.get(pair.fromEventId) ===
        staffRenderState.systemsByEventId.get(pair.toEventId)
      ) {
        drawMeasuredTie(firstNote, lastNote, pair.fromEventId)
      } else {
        drawMeasuredTie(firstNote, null, pair.fromEventId)
        drawMeasuredTie(null, lastNote, pair.toEventId)
      }
    })

    const measuredLowerOffsets = new Map(lowerAnnotationOffsets)
    const measuredHairpinStacks = new Map(hairpinStackOffsets)
    const slurInk: { systemIndex: number; bounds: InkBounds }[] = []
    const hairpinInk: { systemIndex: number; bounds: InkBounds }[] = []
    const textInk: { systemIndex: number; bounds: InkBounds }[] = []
    let renderedViewportTop = 0
    let renderedViewportLeft = 0
    let renderedViewportWidth = effectiveRenderWidth
    if (svg) {
      const spanBounds: DOMRect[] = []
      const lowerSlurInk: { systemIndex: number; staffIndex: number; bounds: InkBounds }[] = []
      const automaticHairpinLanes: HairpinAutoLane[] = []
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

        const slurSide = resolvePolyphonicSlurSide(start, end) ?? resolveSlurSideForAnnotationLanes(resolveSlurSide(start, end), [
          start.measureId
            ? annotationLanesByMeasureId.get(start.measureId)
            : undefined,
          end.measureId ? annotationLanesByMeasureId.get(end.measureId) : undefined
        ])

        const interiorPoints = new Map<number, CursorPoint[]>()
        for (const [eventId, point] of staffRenderState.pointsByEventId) {
          if (eventId === slur.startEventId || eventId === slur.endEventId ||
            staffRenderState.staffIndexByEventId.get(eventId) !== staffRenderState.staffIndexByEventId.get(slur.startEventId)) continue
          const system = staffRenderState.systemsByEventId.get(eventId)
          if (system === undefined || system < startSystem || system > endSystem) continue
          const points = interiorPoints.get(system) ?? []
          points.push(point)
          interiorPoints.set(system, points)
        }
        const segments = drawSlurSegments(
          svg,
          start,
          end,
          startSystem,
          endSystem,
          staffBounds,
          slurIndex,
          slurSide,
          renderedStaffTargets.find(target => target.globalStaffIndex === staffRenderState.staffIndexByEventId.get(slur.startEventId))!,
          slur.engraving,
          interiorPoints
        )
        for (const segment of segments) {
          segment.element.setAttribute('data-span-staff-y', String(segment.staffY))
          const staffIndex = staffRenderState.staffIndexByEventId.get(slur.startEventId)!
          const staffInk = staffInkFor(segment.systemIndex)
          const previousStaffInk = staffInk.get(staffIndex)
          const staffTop = Number(segment.element.getAttribute('data-slur-ink-top')) - segment.staffY
          const staffBottom = Number(segment.element.getAttribute('data-slur-ink-bottom')) - segment.staffY
          staffInk.set(staffIndex, {
            top: Math.min(previousStaffInk?.top ?? staffTop, staffTop),
            bottom: Math.max(previousStaffInk?.bottom ?? staffBottom, staffBottom)
          })
          slurInk.push({ systemIndex: segment.systemIndex, bounds: {
            left: Number(segment.element.getAttribute('data-slur-ink-left')),
            right: Number(segment.element.getAttribute('data-slur-ink-right')),
            top: Number(segment.element.getAttribute('data-slur-ink-top')),
            bottom: Number(segment.element.getAttribute('data-slur-ink-bottom'))
          } })
          if (!resolveSpanSegmentEngraving(slur.engraving, segment.address)) {
            if (segment.element.getAttribute('data-annotation-lane') === 'lower-slur') {
              lowerSlurInk.push({ systemIndex: segment.systemIndex, staffIndex, bounds: slurInk.at(-1)!.bounds })
            }
            const origin = layout.placements.find(placement => placement.systemIndex === segment.systemIndex)!.y
            const top = Number(segment.element.getAttribute('data-slur-ink-top')) - origin
            const bottom = Number(segment.element.getAttribute('data-slur-ink-bottom')) - origin
            const previous = measuredSystemInkBounds.get(segment.systemIndex)
            measuredSystemInkBounds.set(segment.systemIndex, {
              top: Math.min(previous?.top ?? top, top), bottom: Math.max(previous?.bottom ?? bottom, bottom)
            })
          }
          spanBounds.push(segment.element.getBBox())
          bindSpanSelection(segment.element, { kind: 'slur', id: slur.id, segment: segment.address }, selectedSpan, onSelectSpan)
          renderedSegments.push({ kind: 'slur', id: slur.id, segment: segment.address })
        }
      })

      reserveLowerAnnotationClearance(svg, lowerSlurInk, renderedStaffTargets, layout.placements,
        staffRenderState.pointsByEventId, lowerAnnotationOffsets, measuredLowerOffsets)

      // Neighboring note ink needs room beside measured slur and tie contours.
      const spanStaves = new Map([...measuredStaffInkBounds].map(([system, staves]) => [system, new Set(staves.keys())]))
      for (const [eventId, point] of staffRenderState.pointsByEventId) {
        const index = staffRenderState.staffIndexByEventId.get(eventId)!
        const system = staffRenderState.systemsByEventId.get(eventId)!
        const reserveAbove = spanStaves.get(system)?.has(index - 1), reserveBelow = spanStaves.get(system)?.has(index + 1)
        if (!reserveAbove && !reserveBelow) continue
        const origin = staffRenderState.boundsByStaffSystemKey.get(createStaffSystemKey(system, index))!.y
        const bounds = [point.noteHeadInkBounds, ...point.durationDotInkBounds ?? [], ...point.tupletInkBounds ?? []]
          .filter((ink): ink is InkBounds => ink !== undefined)
        const top = Math.min(...bounds.map(ink => ink.top),
          ...(point.isRest ? [] : [point.stemTopY ?? Infinity, ...(point.staccatoYs ?? []).map(y => y - STACCATO_RADIUS)])) - origin
        const bottom = Math.max(...bounds.map(ink => ink.bottom),
          ...(point.isRest ? [] : [point.stemBottomY ?? -Infinity, ...(point.staccatoYs ?? []).map(y => y + STACCATO_RADIUS)])) - origin
        const staffInk = staffInkFor(system)
        const previous = staffInk.get(index)
        staffInk.set(index, {
          top: Math.min(previous?.top ?? Infinity, reserveAbove ? top : Infinity),
          bottom: Math.max(previous?.bottom ?? -Infinity, reserveBelow ? bottom : -Infinity)
        })
      }

      for (const [systemIndex, ink] of clearVoltaSlurCollisions(renderedVoltas, slurInk)) {
        const origin = layout.placements.find(placement => placement.systemIndex === systemIndex)!.y
        const previous = measuredSystemInkBounds.get(systemIndex)
        measuredSystemInkBounds.set(systemIndex, {
          top: Math.min(previous?.top ?? Infinity, ink.top - origin),
          bottom: Math.max(previous?.bottom ?? -Infinity, ink.bottom - origin)
        })
      }

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

        const staffIndex = staffRenderState.staffIndexByEventId.get(
          hairpin.startEventId
        )
        const renderedStaffTarget = renderedStaffTargets.find(
          target => target.globalStaffIndex === staffIndex
        )

        if (!renderedStaffTarget || staffIndex === undefined) {
          continue
        }

        const hairpinSegments = resolveHairpinSegments(
          start,
          end,
          startSystem,
          endSystem,
          staffBounds
        )
        const endpointHairpinLanes = [
          start.measureId
            ? annotationLanesByMeasureId.get(start.measureId)
            : undefined,
          end.measureId ? annotationLanesByMeasureId.get(end.measureId) : undefined
        ]
        const staffMeasures = renderedStaffTarget.staff.measures
        const firstMeasure = staffMeasures.findIndex(measure => measure.id === start.measureId)
        const lastMeasure = staffMeasures.findIndex(measure => measure.id === end.measureId)
        const traversedMeasures = firstMeasure < 0 || lastMeasure < 0 ? []
          : staffMeasures.slice(Math.min(firstMeasure, lastMeasure), Math.max(firstMeasure, lastMeasure) + 1)
        const hairpinLanes = traversedMeasures.length
          ? traversedMeasures.map(measure => annotationLanesByMeasureId.get(measure.id)) : endpointHairpinLanes
        const stemOffsets = Array.from(staffRenderState.notesByEventId).flatMap(([eventId, note]) => {
          const point = staffRenderState.pointsByEventId.get(eventId)
          const system = staffRenderState.systemsByEventId.get(eventId)
          if (!point || system === undefined || system < startSystem || system > endSystem ||
            staffRenderState.staffIndexByEventId.get(eventId) !== staffIndex ||
            (system === startSystem && point.x < start.x) ||
            (system === endSystem && point.x > end.x) || !note.hasStem()) return []
          const stem = resolveStemGeometry(note, point.y)
          return [{ system, offset: Math.max(stem.topY, stem.baseY) - point.y }]
        })
        const baseYOffset = resolveHairpinStemClearance(resolveHairpinSpanYOffset(hairpinLanes) ?? HAIRPIN_Y_OFFSET, stemOffsets.map(stem => stem.offset))
        const manualYOffset = resolveHairpinStemClearance(Math.max(HAIRPIN_Y_OFFSET,
          ...endpointHairpinLanes.flatMap(lane => lane?.hairpinYOffset === undefined ? [] : [lane.hairpinYOffset - lane.lowerOffset])), stemOffsets.map(stem => stem.offset))
        const automaticOffsets = new Map<number, number>()
        if (!hairpin.engraving) {
          // A continuation only reserves the annotation and stem budget of its own system.
          for (const segment of hairpinSegments) {
            const localLanes = traversedMeasures.filter(measure =>
              layout.placements[staffMeasures.indexOf(measure)]?.systemIndex === segment.systemIndex
            ).map(measure => annotationLanesByMeasureId.get(measure.id))
            const localBase = resolveHairpinStemClearance(
              resolveHairpinSpanYOffset(localLanes.length ? localLanes : hairpinLanes) ?? HAIRPIN_Y_OFFSET,
              stemOffsets.filter(stem => stem.system === segment.systemIndex).map(stem => stem.offset)
            )
            automaticOffsets.set(segment.systemIndex, localBase + reserveHairpinAutoLane(
              automaticHairpinLanes,
              staffIndex,
              [segment],
              localBase
            ))
          }

          for (const [index, placement] of layout.placements.entries()) {
            const measure = renderedStaffTarget.staff.measures[index]
            const offset = automaticOffsets.get(placement.systemIndex)
            if (measure && offset !== undefined) {
              const localBaseline = annotationLanesByMeasureId.get(measure.id)?.hairpinYOffset
              if (localBaseline !== undefined) measuredHairpinStacks.set(measure.id,
                Math.max(measuredHairpinStacks.get(measure.id) ?? 0, offset - localBaseline))
            }
          }
        }

        const segments = drawHairpinSegments(
          svg,
          start,
          end,
          hairpin.type,
          startSystem,
          endSystem,
          staffBounds,
          baseYOffset,
          renderedStaffTarget,
          hairpin.engraving,
          manualYOffset,
          automaticOffsets
        )
        for (const segment of segments) {
          segment.element.setAttribute('data-span-staff-y', String(segment.staffY))
          // Include painted strokes, not the wider transparent selection target.
          for (const line of segment.element.querySelectorAll('line')) {
            const halfStroke = (Number.parseFloat(getComputedStyle(line).strokeWidth) || 1.8) / 2
            const x1 = Number(line.getAttribute('x1')), x2 = Number(line.getAttribute('x2'))
            const y1 = Number(line.getAttribute('y1')), y2 = Number(line.getAttribute('y2'))
            hairpinInk.push({ systemIndex: segment.systemIndex, bounds: {
              left: Math.min(x1, x2) - halfStroke, right: Math.max(x1, x2) + halfStroke,
              top: Math.min(y1, y2) - halfStroke, bottom: Math.max(y1, y2) + halfStroke
            } })
          }
          if (hairpin.engraving) spanBounds.push(segment.element.getBBox())
          bindSpanSelection(segment.element, { kind: 'hairpin', id: hairpin.id, segment: segment.address }, selectedSpan, onSelectSpan)
          renderedSegments.push({ kind: 'hairpin', id: hairpin.id, segment: segment.address })
        }
      }

      const textContext = document.createElement('canvas').getContext('2d')
      if (textContext) {
        const locations = new Map(renderedStaffTargets.flatMap(target => layout.placements.flatMap((placement, index) => {
          const measure = target.staff.measures[index]
          return measure ? [[measure.id, { placement, staffIndex: target.globalStaffIndex }] as const] : []
        })))
        const leadingLocations = new Map<SVGTextElement, { placement: MeasurePlacement; staffIndex: number }>()
        for (const [placement, staves] of preparedMeasures) for (const { stave, staffIndex } of staves) {
          for (const modifier of stave.getModifiers()) {
            const group = modifier.getSVGElement()
            if (!group?.matches('.vf-clef, .vf-keysignature, .vf-timesignature')) continue
            for (const text of group.querySelectorAll('text')) leadingLocations.set(text, { placement, staffIndex })
          }
        }
        for (const text of [...svg.querySelectorAll<SVGTextElement>('.notation-lyric, .notation-dynamic-mark, .notation-expression-text, .notation-staff-text, .notation-system-text, .notation-rehearsal-mark text, .notation-harmony-mark, .notation-inline-clef, .notation-tempo-marking, .notation-rhythm-feel-marking text'), ...leadingLocations.keys()]) {
          if (printLayout && text.classList.contains('notation-tempo-marking--transparent')) continue
          const globalTempo = text.classList.contains('notation-tempo-marking') && !text.classList.contains('notation-tempo-marking--positioned')
          const globalHeader = globalTempo || Boolean(text.closest('.notation-rhythm-feel-marking'))
          const rehearsal = text.closest<SVGGElement>('.notation-rehearsal-mark')
          const measureId = text.dataset.measureId ?? rehearsal?.dataset.measureId ?? staffRenderState.pointsByEventId.get(text.dataset.eventId ?? '')?.measureId
          const location = leadingLocations.get(text) ?? (measureId ? locations.get(measureId) :
            globalHeader && layout.placements[0] ? { placement: layout.placements[0], staffIndex: renderedStaffTargets[0]?.globalStaffIndex ?? 0 } : undefined)
          if (!location) continue
          const bounds = resolveTextInkBounds(text, textContext)
          // The rehearsal frame is painted content, including the outer half of its stroke.
          const frame = rehearsal?.querySelector('rect')
          if (frame) {
            const style = getComputedStyle(frame)
            const strokeWidth = Number.parseFloat(style.strokeWidth)
            const halfStroke = style.stroke === 'none' ? 0 : (Number.isFinite(strokeWidth) ? strokeWidth : 1.5) / 2
            const x = Number(frame.getAttribute('x')), y = Number(frame.getAttribute('y'))
            bounds.left = Math.min(bounds.left, x - halfStroke)
            bounds.right = Math.max(bounds.right, x + Number(frame.getAttribute('width')) + halfStroke)
            bounds.top = Math.min(bounds.top, y - halfStroke)
            bounds.bottom = Math.max(bounds.bottom, y + Number(frame.getAttribute('height')) + halfStroke)
          }
          if (![bounds.top, bounds.bottom, bounds.left, bounds.right].every(Number.isFinite)) continue
          const { placement, staffIndex } = location
          textInk.push({ systemIndex: placement.systemIndex, bounds })
          // Header marks are fixed; moving staves cannot move their ink.
          if (globalHeader) continue
          const previous = measuredSystemInkBounds.get(placement.systemIndex)
          measuredSystemInkBounds.set(placement.systemIndex, {
            top: Math.min(previous?.top ?? Infinity, bounds.top - placement.y),
            bottom: Math.max(previous?.bottom ?? -Infinity, bounds.bottom - placement.y)
          })
          // Leading symbols constrain page extents, not the full-width annotation lanes.
          if (leadingLocations.has(text)) continue
          const origin = staffRenderState.boundsByStaffSystemKey.get(createStaffSystemKey(placement.systemIndex, staffIndex))!.y
          const staffInk = staffInkFor(placement.systemIndex), previousStaff = staffInk.get(staffIndex)
          staffInk.set(staffIndex, {
            top: Math.min(previousStaff?.top ?? Infinity, bounds.top - origin),
            bottom: Math.max(previousStaff?.bottom ?? -Infinity, bounds.bottom - origin)
          })
        }
      }
      const firstPlacement = layout.placements[0]
      if (firstPlacement) for (const bracket of svg.querySelectorAll<SVGPathElement>('.notation-rhythm-feel-marking__triplet-bracket')) {
        const style = getComputedStyle(bracket), strokeWidth = Number.parseFloat(style.strokeWidth)
        if (style.stroke === 'none' || strokeWidth === 0) continue
        const box = bracket.getBBox()
        const halfStroke = (Number.isFinite(strokeWidth) ? strokeWidth : 1.25) / 2
        textInk.push({ systemIndex: firstPlacement.systemIndex, bounds: {
          left: box.x - halfStroke, right: box.x + box.width + halfStroke,
          top: box.y - halfStroke, bottom: box.y + box.height + halfStroke
        } })
      }

      if (spanBounds.length) {
        const viewport = resolveSpanViewport(effectiveRenderWidth, layout.height, spanBounds)
        renderedViewportTop = viewport.y
        renderedViewportLeft = viewport.x
        renderedViewportWidth = viewport.width
        renderer.resize(viewport.width, viewport.height)
        svg.setAttribute('viewBox', `${viewport.x} ${viewport.y} ${viewport.width} ${viewport.height}`)
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

    const cleanup = () => {
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
    // Re-layout before paint so hit targets, staff coordinates and PDF page breaks agree.
    const measuredVerticals = resolveScoreSystemVerticalLayouts(score, layout.placements, lyricScale,
      printLayoutPlan?.systemHeight ?? SINGLE_STAFF_SYSTEM_HEIGHT,
      printLayoutPlan?.systemTop ?? DEFAULT_SYSTEM_TOP, measuredStaffInkBounds, measuredLowerOffsets, measuredHairpinStacks)
    const measuredLayout = createSystemLayout(measures, effectiveRenderWidth, { ...layoutOptions,
      systemMetrics: measuredVerticals, systemInkBounds: measuredSystemInkBounds })
    if (pass < 2 && ([...measuredLowerOffsets].some(([id, offset]) => Math.abs(offset - (lowerAnnotationOffsets.get(id) ?? 0)) > 0.01) ||
      [...measuredHairpinStacks].some(([id, offset]) => Math.abs(offset - (hairpinStackOffsets.get(id) ?? 0)) > 0.01) ||
      [...measuredVerticals].some(([system, measured]) => measured.staffOffsets.some((offset, index) =>
        Math.abs(offset - systemVerticals.get(system)!.staffOffsets[index]!) > 0.01)) ||
      Math.abs(measuredLayout.height - layout.height) > 0.01 ||
      measuredLayout.placements.some((placement, index) => Math.abs(placement.y - layout.placements[index]!.y) > 0.01))) {
      cleanup()
      return renderPass(measuredSystemInkBounds, pass + 1, measuredStaffInkBounds, measuredLowerOffsets, measuredHairpinStacks)
    }
    container.dataset.layoutHeight = String(layout.height)
    container.dataset.layoutPasses = String(pass + 1)
    if (printLayoutPlan) {
      const pages = estimatePrintedPageCount(layout.height, printLayoutPlan.pageHeight)
      container.dataset.printEstimatedPages = String(pages)
      container.dataset.printOverflowedTarget = String(printLayoutPlan.targetPages !== undefined && pages > printLayoutPlan.targetPages)
      let overflowAxis: 'height' | 'width' = 'height'
      const overflow = layout.placements.find(placement => {
        if (!placement.isSystemStart) return false
        const staves = preparedMeasures.get(placement) ?? []
        if (!staves.length) return false
        const top = Math.min(...staves.map(({ stave }) => stave.getYForLine(0))) - renderedViewportTop
        const bottom = Math.max(...staves.map(({ stave }) => stave.getYForLine(4))) - renderedViewportTop
        const pageIndex = Math.floor((top + 0.01) / printLayoutPlan.pageHeight)
        const pageTop = pageIndex * printLayoutPlan.pageHeight
        const systemInk = [...slurInk, ...hairpinInk, ...textInk, ...tieInk].filter(ink => ink.systemIndex === placement.systemIndex)
        if (systemInk.some(ink => ink.bounds.left < renderedViewportLeft - 0.01 ||
          ink.bounds.right > renderedViewportLeft + renderedViewportWidth + 0.01)) {
          overflowAxis = 'width'
          return true
        }
        return pageIndex !== Math.floor((bottom - 0.01) / printLayoutPlan.pageHeight) ||
          systemInk.some(ink => (
            ink.bounds.top - renderedViewportTop < pageTop - 0.01 ||
            ink.bounds.bottom - renderedViewportTop > pageTop + printLayoutPlan.pageHeight + 0.01
          ))
      })
      if (overflow) {
        container.dataset.printOverflowMeasure = String(overflow.measure.number)
        container.dataset.printOverflowAxis = overflowAxis
      } else {
        delete container.dataset.printOverflowMeasure
        delete container.dataset.printOverflowAxis
      }
    } else {
      delete container.dataset.printEstimatedPages
      delete container.dataset.printOverflowedTarget
      delete container.dataset.printOverflowMeasure
      delete container.dataset.printOverflowAxis
    }
    onRenderedSpanSegments?.(score, renderedSegments)
    return cleanup
  }

  useEffect(() => renderPass(), [
    onRenderedSpanSegments,
    onSelectSpan,
    selectedSpan,
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

function resolveTextInkBounds(text: SVGTextElement, context: CanvasRenderingContext2D): InkBounds {
  const style = getComputedStyle(text)
  context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
  const ink = context.measureText(text.textContent ?? '')
  const anchor = style.textAnchor === 'middle' ? ink.width / 2 : style.textAnchor === 'end' ? ink.width : 0
  const x = Number(text.getAttribute('x')) - anchor, y = Number(text.getAttribute('y'))
  return { left: x - ink.actualBoundingBoxLeft, right: x + ink.actualBoundingBoxRight,
    top: y - ink.actualBoundingBoxAscent, bottom: y + ink.actualBoundingBoxDescent }
}

function reserveLowerAnnotationClearance(
  svg: SVGSVGElement,
  slurs: { systemIndex: number; staffIndex: number; bounds: InkBounds }[],
  targets: RenderedStaffTarget[],
  placements: MeasurePlacement[],
  points: Map<string, CursorPoint>,
  currentOffsets: ReadonlyMap<string, number>,
  measuredOffsets: Map<string, number>
): void {
  if (!slurs.length) return
  const context = document.createElement('canvas').getContext('2d')
  if (!context) return
  const groups = new Map<string, { measureIds: string[]; boxes: InkBounds[] }>()
  const groupByMeasure = new Map<string, string>()
  for (const target of targets) for (const [index, placement] of placements.entries()) {
    const measure = target.staff.measures[index]
    if (!measure) continue
    const key = createStaffSystemKey(placement.systemIndex, target.globalStaffIndex)
    if (!groups.has(key)) groups.set(key, { measureIds: [], boxes: [] })
    groups.get(key)!.measureIds.push(measure.id)
    groupByMeasure.set(measure.id, key)
  }
  for (const text of svg.querySelectorAll<SVGTextElement>('.notation-lyric, .notation-dynamic-mark, .notation-expression-text')) {
    const measureId = text.dataset.measureId ?? points.get(text.dataset.eventId ?? '')?.measureId
    const key = measureId ? groupByMeasure.get(measureId) : undefined
    if (!key) continue
    groups.get(key)!.boxes.push(resolveTextInkBounds(text, context))
  }
  for (const slur of slurs) {
    const group = groups.get(createStaffSystemKey(slur.systemIndex, slur.staffIndex))
    if (!group?.boxes.length) continue
    const overlaps = group.boxes.some(box => box.right >= slur.bounds.left && box.left <= slur.bounds.right &&
      box.bottom > slur.bounds.top - 6 && box.top < slur.bounds.bottom + 6)
    if (!overlaps) continue
    // Move the complete lower row together, keeping lyrics, dynamics and text in order.
    const delta = slur.bounds.bottom + 6 - Math.min(...group.boxes.map(box => box.top))
    for (const id of group.measureIds) measuredOffsets.set(id,
      Math.max(measuredOffsets.get(id) ?? 0, (currentOffsets.get(id) ?? 0) + delta))
  }
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
      partStaffCount: part.staves.length,
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
  noteStartX?: number,
  measureId = placement.measure.id
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
    y: staffY,
    startMeasureId: !bounds || placement.x < bounds.x1 ? measureId : bounds.startMeasureId,
    endMeasureId: !bounds || placement.x + placement.width >= bounds.x2 ? measureId : bounds.endMeasureId
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
  score = projectGlobalAnnotationsForRendering(score)
  const annotationMaps: MeasureAnnotationMaps = {
    dynamicsByMeasureId: new Map(),
    expressionTextsByMeasureId: new Map(),
    harmoniesByMeasureId: new Map(),
    rehearsalMarksByMeasureId: new Map(),
    staffTextsByMeasureId: new Map(),
    systemTextsByMeasureId: new Map(),
    tempoEventsByMeasureId: new Map()
  }

  for (const mark of score.rehearsalMarks ?? []) {
    annotationMaps.rehearsalMarksByMeasureId.set(mark.measureId, [
      ...(annotationMaps.rehearsalMarksByMeasureId.get(mark.measureId) ?? []), mark
    ])
  }

  for (const dynamic of score.dynamics ?? []) {
    annotationMaps.dynamicsByMeasureId.set(dynamic.measureId, [
      ...(annotationMaps.dynamicsByMeasureId.get(dynamic.measureId) ?? []),
      dynamic
    ])
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

  for (const staffText of score.staffTexts ?? []) {
    annotationMaps.staffTextsByMeasureId.set(staffText.measureId, [
      ...(annotationMaps.staffTextsByMeasureId.get(staffText.measureId) ?? []),
      staffText
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
  firstEventX: number | undefined,
  onSelectObject?: NotationPreviewProps['onSelectObject']
): void {
  if (!svg) {
    return
  }

  const lanes =
    annotationLanesByMeasureId.get(measure.id) ??
    resolveMeasureAnnotationLanes({
      lyricLineCount: countMeasureLyricLines(measure)
    })
  for (const [index, rehearsalMark] of (
    annotationMaps.rehearsalMarksByMeasureId.get(measure.id) ?? []
  ).entries()) {
    drawRehearsalMark(
      svg,
      placement.x + 14,
      staffY + (lanes.rehearsalMarkYOffsets[index] ?? REHEARSAL_MARK_Y_OFFSET),
      rehearsalMark.text,
      measure.id,
      rehearsalMark.id,
      onSelectObject
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
      measure.id,
      systemText.id,
      onSelectObject
    )
  }

  for (const [index, staffText] of (
    annotationMaps.staffTextsByMeasureId.get(measure.id) ?? []
  ).entries()) {
    drawStaffText(
      svg,
      placement.x + 14,
      staffY + (lanes.staffTextYOffsets[index] ?? lanes.staffTextYOffset ?? STAFF_TEXT_Y_OFFSET),
      staffText.text,
      measure.id,
      staffText.id,
      onSelectObject
    )
  }

  for (const [index, dynamic] of (
    annotationMaps.dynamicsByMeasureId.get(measure.id) ?? []
  ).entries()) {
    drawDynamicMark(
      svg,
      (firstEventX ?? placement.x + 88) - 2,
      staffY + (lanes.dynamicMarkYOffsets[index] ?? lanes.dynamicMarkYOffset ?? DYNAMIC_MARK_Y_OFFSET),
      dynamic.value,
      measure.id,
      dynamic.id,
      onSelectObject
    )
  }

  for (const [index, tempoEvent] of (annotationMaps.tempoEventsByMeasureId.get(measure.id) ?? []).entries()) {
    drawPositionedTempoMarking(
      svg,
      resolveTickX(placement, measure, tempoEvent.tick),
      staffY + (lanes.tempoYOffsets[index] ?? -42),
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
      measure.id,
      harmony.id,
      onSelectObject
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
      measure.id,
      expressionText.tick,
      expressionText.id,
      onSelectObject
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

function drawEventAttachments(
  svg: SVGSVGElement | null,
  event: VoiceEvent | undefined,
  note: StaveNote,
  x: number,
  y: number,
  interaction: Pick<RenderedStaffInteraction, 'lyricScale' | 'onSelectLyric' | 'inlineLyricEditor'>,
  lowerOffset = 0
): void {
  if (!svg || !event) return
  if (event.fermata) drawFermata(svg, event.id, x, y)
  if (event.breathMark) drawBreathMark(svg, event.id, x, y, event.breathMark, Boolean(event.fermata))
  if (event.type === 'note') {
    if (event.articulations?.length) drawArticulations(svg, event.id, x, y, note, event.articulations)
    if (event.tremolo) drawTremoloMark(svg, event.id, y, note, event.tremolo.marks)
    if (event.ornaments?.length) drawOrnaments(svg, event.id, x, y, event.ornaments, event.fermata ? 58 : 34)
    if (event.graceNotes?.length) drawGraceNotes(svg, event.id, x, y, event.graceNotes)
    if (event.lyrics?.length) drawLyrics(svg, event.id, x, y + lowerOffset, event.lyrics, interaction.lyricScale, interaction.onSelectLyric)
  }
  if (event.id === interaction.inlineLyricEditor?.eventId) drawInlineLyricEditor(svg, x, y + lowerOffset, interaction.inlineLyricEditor)
}

function preparePassiveStaffMeasure(
  context: ReturnType<Renderer['getContext']>,
  svg: SVGSVGElement | null,
  placement: MeasurePlacement,
  target: RenderedStaffTarget,
  staffOffset: number,
  measure: Measure,
  previousMeasure: Measure | undefined,
  annotationMaps: MeasureAnnotationMaps,
  annotationLanesByMeasureId: Map<string, MeasureAnnotationLanes>,
  interaction: RenderedStaffInteraction,
  renderState: RenderedStaffState
): PreparedStaffMeasure {
  const y = placement.y + staffOffset
  const stave = new Stave(placement.x, y, placement.width)
  if (svg) {
    const bounds = resolveMeasureStaffTarget(measure.id, placement.x, placement.width, stave)
    interaction.measureContextTargets.push(bounds)
    const selectionTarget = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    selectionTarget.classList.add('notation-measure')
    selectionTarget.classList.toggle('is-selected', measure.id === interaction.selectedMeasureId)
    selectionTarget.setAttribute('data-measure-id', measure.id)
    selectionTarget.setAttribute('data-system-index', String(placement.systemIndex))
    selectionTarget.setAttribute('data-part-id', target.partId)
    selectionTarget.setAttribute('data-staff-id', target.staffId)
    selectionTarget.setAttribute('x', String(bounds.x1))
    selectionTarget.setAttribute('y', String(bounds.y1))
    selectionTarget.setAttribute('width', String(bounds.x2 - bounds.x1))
    selectionTarget.setAttribute('height', String(bounds.y2 - bounds.y1))
    selectionTarget.setAttribute('rx', '4')
    selectionTarget.addEventListener('click', () => interaction.onSelectMeasure(measure.id))
    selectionTarget.addEventListener('contextmenu', event => {
      event.preventDefault()
      event.stopPropagation()
      interaction.onOpenMeasureContextMenu(measure.id, { x: event.clientX, y: event.clientY })
    })
    svg.append(selectionTarget)
  }
  const {
    showsClef,
    showsKeySignature,
    showsTimeSignature
  } = resolveLeadingNotationVisibility(
    measure,
    previousMeasure,
    placement.isSystemStart
  )

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
    y,
    undefined,
    measure.id
  )

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
      stave.getNoteStartX(),
      measure.id
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
        }),
        measure.voices.length > 1
      )
    )
    const tuplets: RenderedTuplet[] = (voice.tuplets ?? []).map((group) => {
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

      return {
        eventIds: group.eventIds,
        tuplet: new VexTuplet(groupNotes, {
          numNotes: group.actualNotes,
          notesOccupied: group.normalNotes,
          bracketed: groupEvents.some(
            (event) =>
              event?.type === 'rest' ||
              (event && !isNotationBeamable(event))
          ),
          ratioed: group.actualNotes !== 3 || group.normalNotes !== 2
        })
      }
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

  const draw = (shared: boolean) => {
    if (!shared) voices.forEach(({ events, notes, scoreTuplets }) => {
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
      tuplets.forEach(({ tuplet }) => tuplet.setContext(context).draw())
      const tupletClearanceByEventId = resolveTupletAttachmentClearances(
        tuplets,
        new Map(notes.map((note, index) => [events[index].id, note]))
      )

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
        svgElement.setAttribute(
          'data-voice-lane',
          String(note.getAttribute('data-voice-lane') ?? 'neutral')
        )
        const stemDirection = note.getAttribute('data-voice-stem-direction')
        if (stemDirection) {
          svgElement.setAttribute('data-voice-stem-direction', String(stemDirection))
        }
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
          ...resolveSlurAnchorMetrics(note),
          ...tupletClearanceByEventId.get(event.id),
          ...resolveSlurAttachmentClearance(event, note, y)
        })
        firstEventX = Math.min(firstEventX ?? eventX, eventX)

        if (event.clefBefore) {
          drawInlineClef(svg, event.clefBefore, eventX - 24, stave, event.id)
        }
        if (isPreviewEventId(event.id)) {
          return
        }

        drawEventAttachments(svg, event, note, eventX, y, interaction, annotationLanesByMeasureId.get(measure.id)?.lowerOffset)

        svgElement.setAttribute('role', 'button')
        svgElement.setAttribute('tabindex', '0')
        svgElement.addEventListener('keydown', keyEvent => {
          if (keyEvent.key !== 'Enter' && keyEvent.key !== ' ') return
          keyEvent.preventDefault()
          keyEvent.stopPropagation()
          if (!keyEvent.repeat) interaction.onSelectEvent(event.id, keyEvent.shiftKey, eventAddress)
        })
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
      firstEventX,
      interaction.onSelectObject
    )
  }
  return { measure, stave, staffIndex: target.globalStaffIndex,
    voices: voices.map(({ vexVoice }) => vexVoice), draw }
}

function formatStaffMeasures(group: PreparedStaffMeasure[], context: ReturnType<Renderer['getContext']>): void {
  if (group.length === 1) {
    const { voices, stave } = group[0]!
    new Formatter().joinVoices(voices).formatToStave(voices, stave)
    return
  }
  const startX = Math.max(...group.map(item => item.stave.getNoteStartX()))
  const endX = Math.min(...group.map(item => item.stave.getNoteEndX()))
  const formatter = new Formatter()
  for (const { stave, voices } of group) {
    stave.setNoteStartX(startX)
    for (const voice of voices) {
      voice.setStave(stave)
      voice.getTickables().forEach(note => note.setStave(stave))
    }
    formatter.joinVoices(voices)
  }
  formatter.format(group.flatMap(item => item.voices), endX - startX - Stave.defaultPadding, { context })
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
  y: number,
  tempo: TempoMarking,
  measureId?: string
): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-tempo-marking', 'notation-tempo-marking--positioned')
  text.setAttribute('data-annotation-lane', 'upper-tempo')
  if (tempo.transparent) {
    text.classList.add('notation-tempo-marking--transparent')
  }
  if (measureId) {
    text.setAttribute('data-measure-id', measureId)
  }
  text.setAttribute('x', String(x))
  text.setAttribute('y', String(y))
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
  const y = 36

  group.classList.add('notation-rhythm-feel-marking')
  if (rhythmFeel.text) {
    appendRhythmFeelText(group, formatRhythmFeelMarkingText(rhythmFeel), x, y)
  } else {
    appendRhythmFeelText(group, rhythmFeel.unit === '16th' ? '♬' : '♫', x, y)
    appendRhythmFeelText(group, '=', x + 31, y)
    appendRhythmFeelTripletNotes(group, x + 50, y, rhythmFeel.unit)
    appendRhythmFeelTriplet(group, x + 50, y - 26, 43)
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
): SVGGElement {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  const bracketY = staffTopY - 22
  const leftX = startX
  const rightX = endX
  const horizontal = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  group.classList.add('notation-volta-mark')
  group.setAttribute('data-volta-number', String(volta.number))
  group.setAttribute('data-volta-start', String(Boolean(volta.start)))
  group.setAttribute('data-volta-end', String(Boolean(volta.end)))
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

  if (volta.end && volta.endStyle !== 'open') {
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
  return group
}

function clearVoltaSlurCollisions(
  voltas: { element: SVGGElement; systemIndex: number }[],
  slurs: { systemIndex: number; bounds: InkBounds }[]
): Map<number, { top: number; bottom: number }> {
  const shifts = new Map<number, number>()
  for (const { element, systemIndex } of voltas) {
    const lines = [...element.querySelectorAll('line')]
    const left = Math.min(...lines.map(line => Number(line.getAttribute('x1'))))
    const right = Math.max(...lines.map(line => Number(line.getAttribute('x2'))))
    const bottom = Math.max(...lines.flatMap(line => [Number(line.getAttribute('y1')), Number(line.getAttribute('y2'))])) + 0.5
    for (const slur of slurs) {
      if (slur.systemIndex !== systemIndex || slur.bounds.right < left || slur.bounds.left > right) continue
      shifts.set(systemIndex, Math.max(shifts.get(systemIndex) ?? 0, bottom + 6 - slur.bounds.top))
    }
  }
  const envelopes = new Map<number, { top: number; bottom: number }>()
  const context = document.createElement('canvas').getContext('2d')
  // Keep all ending brackets on one horizontal lane within each system.
  for (const { element, systemIndex } of voltas) {
    const shift = shifts.get(systemIndex) ?? 0
    if (shift <= 0) continue
    const edges: number[] = []
    for (const line of element.querySelectorAll('line')) for (const attribute of ['y1', 'y2']) {
      const y = Number(line.getAttribute(attribute)) - shift
      line.setAttribute(attribute, String(y))
      edges.push(y - 0.5, y + 0.5)
    }
    for (const label of element.querySelectorAll('text')) {
      const y = Number(label.getAttribute('y')) - shift
      label.setAttribute('y', String(y))
      const style = getComputedStyle(label)
      if (context) context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      const ink = context?.measureText(label.textContent ?? '')
      edges.push(y - (ink?.actualBoundingBoxAscent ?? 12), y + (ink?.actualBoundingBoxDescent ?? 3))
    }
    const previous = envelopes.get(systemIndex)
    envelopes.set(systemIndex, {
      top: Math.min(previous?.top ?? Infinity, ...edges), bottom: Math.max(previous?.bottom ?? -Infinity, ...edges)
    })
  }
  return envelopes
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
  label: string,
  measureId?: string,
  id?: string,
  onSelectObject?: NotationPreviewProps['onSelectObject']
): void {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  const width = Math.max(24, label.length * 10 + 14)

  group.classList.add('notation-rehearsal-mark')
  group.setAttribute('data-annotation-lane', 'upper-rehearsal')
  if (measureId) {
    group.setAttribute('data-measure-id', measureId)
  }
  if (id) {
    group.setAttribute('data-object-id', id)
  }
  if (measureId && id && onSelectObject) {
    bindNotationObjectSelection(group, `연습표 ${label} 객체 선택`, () => onSelectObject('rehearsalMarks', measureId, id))
  }
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
  measureId?: string,
  id?: string,
  onSelectObject?: NotationPreviewProps['onSelectObject']
): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-staff-text')
  text.setAttribute('data-annotation-lane', 'upper-staff-text')
  if (measureId) {
    text.setAttribute('data-measure-id', measureId)
  }
  if (id) {
    text.setAttribute('data-object-id', id)
  }
  if (measureId && id && onSelectObject) {
    bindNotationObjectSelection(text, `보표 글자 ${label} 객체 선택`, () => onSelectObject('staffTexts', measureId, id))
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
  target: RenderedStaffTarget,
  anchor: 'start' | 'end' = 'start'
): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-staff-label')
  text.setAttribute('data-part-id', target.partId)
  text.setAttribute('data-staff-id', target.staffId)
  text.setAttribute('text-anchor', anchor)
  text.setAttribute('x', String(x))
  text.setAttribute('y', String(y))
  text.textContent = label
  svg.append(text)
}

function drawInlineClef(
  svg: SVGSVGElement | null,
  clef: Clef,
  x: number,
  stave: Stave,
  eventId: string
): void {
  if (!svg) {
    return
  }

  const marker = new VexClef(toVexFlowClef(clef), 'small')
  marker.setStave(stave)
  marker.setX(x)
  marker.draw()
  const text = marker.getSVGElement()?.querySelector('text')
  if (!text) return
  text.classList.add('notation-inline-clef')
  text.setAttribute('data-event-id', eventId)
}

function drawSystemPartLabels(
  svg: SVGSVGElement,
  placement: MeasurePlacement,
  targets: RenderedStaffTarget[],
  staffOffsets: number[]
): void {
  const firstPartTargets = targets.filter((target) => target.staffIndex === 0)
  const showsPartLabel = placement.systemIndex === 0

  for (const target of firstPartTargets) {
    const partTargets = targets.filter(
      (candidate) => candidate.partId === target.partId
    )

    if (target.partStaffCount > 1 && partTargets.length > 1) {
      const topY = placement.y + (staffOffsets[target.globalStaffIndex] ?? 0)
      const bottomTarget = partTargets.at(-1)!
      const bottomY =
        placement.y + (staffOffsets[bottomTarget.globalStaffIndex] ?? 0) + 40
      const braceX = placement.x - 32
      const labelX = braceX - 10

      drawGrandStaffBrace(svg, braceX, topY - 3, bottomY + 3, target)
      if (showsPartLabel) {
        drawStaffLabel(
          svg,
          labelX,
          (topY + bottomY) / 2,
          target.partName,
          target,
          'end'
        )
      }
      continue
    }

    if (!showsPartLabel) {
      continue
    }

    drawStaffLabel(
      svg,
      placement.x - 12,
      placement.y + (staffOffsets[target.globalStaffIndex] ?? 0) + 22,
      target.partName,
      target,
      'end'
    )
  }
}

function drawGrandStaffBrace(
  svg: SVGSVGElement,
  x: number,
  topY: number,
  bottomY: number,
  target: RenderedStaffTarget
): void {
  const brace = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  const midY = (topY + bottomY) / 2
  const height = Math.max(64, bottomY - topY)
  const curve = Math.min(34, height * 0.24)

  brace.classList.add('notation-grand-staff-brace')
  brace.setAttribute('data-part-id', target.partId)
  brace.setAttribute('data-staff-id', target.staffId)
  brace.setAttribute(
    'd',
    [
      `M ${x + 13} ${topY}`,
      `C ${x - curve} ${topY + height * 0.14}, ${x - curve} ${midY - 10}, ${x + 6} ${midY}`,
      `C ${x - curve} ${midY + 10}, ${x - curve} ${bottomY - height * 0.14}, ${x + 13} ${bottomY}`
    ].join(' ')
  )
  brace.setAttribute('fill', 'none')
  svg.append(brace)
}

function drawSystemText(
  svg: SVGSVGElement,
  x: number,
  y: number,
  label: string,
  measureId?: string,
  id?: string,
  onSelectObject?: NotationPreviewProps['onSelectObject']
): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-system-text')
  text.setAttribute('data-annotation-lane', 'upper-system-text')
  if (measureId) {
    text.setAttribute('data-measure-id', measureId)
  }
  if (id) {
    text.setAttribute('data-object-id', id)
  }
  if (measureId && id && onSelectObject) {
    bindNotationObjectSelection(text, `시스템 텍스트 ${label} 객체 선택`, () => onSelectObject('systemTexts', measureId, id))
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
  measureId?: string,
  tick?: number,
  id?: string,
  onSelectObject?: NotationPreviewProps['onSelectObject']
): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-expression-text')
  text.setAttribute('data-annotation-lane', 'lower-expression-text')
  if (measureId) {
    text.setAttribute('data-measure-id', measureId)
  }
  if (tick !== undefined) {
    text.setAttribute('data-tick', String(tick))
  }
  if (id) {
    text.setAttribute('data-object-id', id)
  }
  if (measureId && id && onSelectObject) {
    bindNotationObjectSelection(text, `표현 텍스트 ${label} 객체 선택`, () => onSelectObject('expressionTexts', measureId, id))
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
  measureId: string | undefined,
  id?: string,
  onSelectObject?: NotationPreviewProps['onSelectObject']
): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-harmony-mark')
  text.setAttribute('data-annotation-lane', 'upper-chord-symbol')
  if (measureId) {
    text.setAttribute('data-measure-id', measureId)
  }
  if (id) {
    text.setAttribute('data-object-id', id)
  }
  if (id && measureId && onSelectObject) {
    bindNotationObjectSelection(text, `코드 ${label} 객체 선택`, () => onSelectObject('harmonies', measureId, id))
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
  measureId: string,
  id?: string,
  onSelectObject?: NotationPreviewProps['onSelectObject']
): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-dynamic-mark')
  text.setAttribute('data-annotation-lane', 'lower-dynamics')
  text.setAttribute('data-measure-id', measureId)
  if (id) {
    text.setAttribute('data-object-id', id)
  }
  if (id && onSelectObject) {
    bindNotationObjectSelection(text, `셈여림 ${label} 객체 선택`, () => onSelectObject('dynamics', measureId, id))
  }
  text.setAttribute('x', String(x))
  text.setAttribute('y', String(y))
  text.textContent = label
  svg.append(text)
}

function bindNotationObjectSelection(
  element: SVGElement,
  ariaLabel: string,
  onActivate: () => void
): void {
  element.setAttribute('role', 'button')
  element.setAttribute('tabindex', '0')
  element.setAttribute('aria-label', ariaLabel)
  element.addEventListener('click', event => {
    event.stopPropagation()
    onActivate()
  })
  element.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    event.stopPropagation()
    onActivate()
  })
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
  yOffset: number,
  scope: Pick<SpanSegmentAddress, 'partId' | 'staffId'>,
  engraving?: SpanEngraving,
  manualYOffset = yOffset,
  automaticOffsets?: ReadonlyMap<number, number>
): RenderedSpanSegment[] {
  const elements: RenderedSpanSegment[] = []
  for (const segment of resolveHairpinSegments(
    start,
    end,
    startSystem,
    endSystem,
    boundsBySystemIndex
  )) {
    const bounds = boundsBySystemIndex.get(segment.systemIndex)!
    const address = { partId: scope.partId, staffId: scope.staffId,
      startMeasureId: segment.isFirst ? start.measureId! : bounds.startMeasureId,
      endMeasureId: segment.isLast ? end.measureId! : bounds.endMeasureId }
    const geometry = resolveSpanSegmentEngraving(engraving, address)
    elements.push({ address, staffY: bounds.y, systemIndex: segment.systemIndex, element: drawHairpinSegment(
      svg,
      segment.x1 + (geometry?.offsetX ?? 0) * 10,
      segment.x2 + (geometry?.offsetX ?? 0) * 10,
      segment.staffY,
      type,
      segment.isFirst,
      segment.isLast,
      (geometry?.placement === 'above' ? -34 : geometry ? manualYOffset : automaticOffsets?.get(segment.systemIndex) ?? yOffset) + (geometry?.offsetY ?? 0) * 10,
      geometry?.height
    ) })
  }
  return elements
}

function reserveHairpinAutoLane(
  occupied: HairpinAutoLane[],
  globalStaffIndex: number,
  segments: HairpinRenderSegment[],
  baseYOffset: number
): number {
  // Compare actual baselines, since lyric/stem budgets can differ between spans.
  // Two 10px openings, 1.8px of stroke, and at least 4px between ink edges.
  const yOffset = Math.max(baseYOffset, ...occupied.filter(item =>
    item.globalStaffIndex === globalStaffIndex && segments.some(segment => hairpinSegmentsOverlap(item.segment, segment))
  ).map(item => item.yOffset + 26))

  for (const segment of segments) {
    occupied.push({
      globalStaffIndex,
      yOffset,
      segment: {
        systemIndex: segment.systemIndex,
        x1: segment.x1,
        x2: segment.x2
      }
    })
  }

  return yOffset - baseYOffset
}

function hairpinSegmentsOverlap(
  left: Pick<HairpinRenderSegment, 'systemIndex' | 'x1' | 'x2'>,
  right: Pick<HairpinRenderSegment, 'systemIndex' | 'x1' | 'x2'>
): boolean {
  return (
    left.systemIndex === right.systemIndex &&
    left.x1 < right.x2 - 4 &&
    right.x1 < left.x2 - 4
  )
}

function drawHairpinSegment(
  svg: SVGSVGElement,
  x1: number,
  x2: number,
  staffY: number,
  type: string,
  isFirst: boolean,
  isLast: boolean,
  yOffset = HAIRPIN_Y_OFFSET,
  height?: number
): SVGGElement {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  const upper = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  const lower = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  const y = staffY + yOffset
  const openings = resolveHairpinOpenings(type, isFirst, isLast)
  const scale = height === undefined ? 1 : height / 2
  const leftOpening = openings.left * scale
  const rightOpening = openings.right * scale

  group.classList.add('notation-hairpin')
  group.setAttribute('data-annotation-lane', 'lower-hairpin')

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
  return group
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
  automaticSide: 'above' | 'below',
  scope: Pick<SpanSegmentAddress, 'partId' | 'staffId'>,
  engraving?: SpanEngraving,
  interiorPoints: Map<number, CursorPoint[]> = new Map()
): RenderedSpanSegment[] {
  const elements: RenderedSpanSegment[] = []
  const firstSystem = Math.min(startSystem, endSystem)
  const lastSystem = Math.max(startSystem, endSystem)

  for (let systemIndex = firstSystem; systemIndex <= lastSystem; systemIndex += 1) {
    const bounds = boundsBySystemIndex.get(systemIndex)

    if (!bounds) {
      continue
    }

    const isFirst = systemIndex === startSystem
    const isLast = systemIndex === endSystem
    const address = { partId: scope.partId, staffId: scope.staffId,
      startMeasureId: isFirst ? start.measureId! : bounds.startMeasureId,
      endMeasureId: isLast ? end.measureId! : bounds.endMeasureId }
    const geometry = resolveSpanSegmentEngraving(engraving, address)
    const side = geometry?.placement ?? automaticSide
    const x1 = isFirst
      ? resolveSlurEndpointX(start, side, 'start')
      : resolveSlurContinuationStartX(bounds)
    const x2 = isLast
      ? Math.max(x1 + 28, resolveSlurEndpointX(end, side, 'end'))
      : resolveSlurContinuationEndX(bounds, x1)
    const startY = resolveSlurEndpointY(start, side, !geometry)
    const endY = resolveSlurEndpointY(end, side, !geometry)
    const continuationY = resolveSlurContinuationY(bounds, side)
    // Angle automatic hanging ends outward; manual segment geometry stays authoritative.
    const hangingY = (anchorY: number) => geometry ? anchorY
      : side === 'above' ? Math.min(continuationY, anchorY - 8)
      : Math.max(continuationY, anchorY + 8)
    const y1 = isFirst ? startY : isLast ? hangingY(endY) : continuationY
    const y2 = isLast ? endY : isFirst ? hangingY(startY) : continuationY

    if (x2 <= x1 + 8) {
      continue
    }

    elements.push({ address, staffY: bounds.y, systemIndex, element: drawSlurSegment(svg,
      x1 + (geometry?.offsetX ?? 0) * 10, x2 + (geometry?.offsetX ?? 0) * 10,
      y1 + (geometry?.offsetY ?? 0) * 10, y2 + (geometry?.offsetY ?? 0) * 10,
      side, slurIndex, isFirst, isLast, geometry?.height,
      geometry ? [] : interiorPoints.get(systemIndex)) })
  }
  return elements
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
  isLast: boolean,
  height?: number,
  interiorPoints: CursorPoint[] = []
): SVGPathElement {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  const offset = (slurIndex % 3) * 6
  const span = Math.abs(x2 - x1)
  const curveDepth =
    height === undefined
      ? Math.min(28, Math.max(14, span * 0.12)) + offset
      : height * 10
  const controlX = (x1 + x2) / 2
  const startX = isFirst ? x1 : x1 - 8
  const endX = isLast ? x2 : x2 + 8
  const obstacles: Array<[number | undefined, number | undefined]> = []
  // Rest glyphs have ink bounds too, but their synthetic stems must stay excluded.
  for (const point of interiorPoints) {
    const head = point.noteHeadInkBounds
    const headY = side === 'above' ? head?.top : head?.bottom
    obstacles.push(
      [point.isRest ? undefined : point.stemX, side === 'above' ? point.stemTopY : point.stemBottomY],
      [head?.left, headY],
      [head?.right, headY]
    )
    for (const y of point.isRest ? [] : point.staccatoYs ?? []) {
      const edgeY = y + (side === 'above' ? -STACCATO_RADIUS : STACCATO_RADIUS)
      obstacles.push([point.x + 4 - STACCATO_RADIUS, edgeY], [point.x + 4 + STACCATO_RADIUS, edgeY])
    }
    for (const bounds of [...point.tupletInkBounds ?? [], ...point.durationDotInkBounds ?? []]) {
      const edgeY = side === 'above' ? bounds.top : bounds.bottom
      obstacles.push([bounds.left, edgeY], [bounds.right, edgeY])
    }
  }
  const visibleObstacles = obstacles.filter((edge): edge is [number, number] =>
    edge[0] !== undefined && edge[1] !== undefined && edge[0] > startX && edge[0] < endX)
  // Both middle-system ends are free: move them past nearby ink before bending the arc.
  // Manual segments have no automatic obstacles, and attached endpoints stay unchanged.
  if (!isFirst && !isLast) for (const [x, edgeY] of visibleObstacles) {
    const limit = edgeY + (side === 'above' ? -6 : 6)
    if (x - startX < span / 4) y1 = side === 'above' ? Math.min(y1, limit) : Math.max(y1, limit)
    if (endX - x < span / 4) y2 = side === 'above' ? Math.min(y2, limit) : Math.max(y2, limit)
  }
  let controlY = side === 'above' ? Math.min(y1, y2) - curveDepth : Math.max(y1, y2) + curveDepth
  for (const [x, edgeY] of visibleObstacles) {
    const a = startX - 2 * controlX + endX
    const b = 2 * (controlX - startX)
    const t = 2 * (x - startX) / (b + Math.sqrt(b * b + 4 * a * (x - startX)))
    const weight = 2 * t * (1 - t)
    if (weight < 0.000001) continue
    const limit = edgeY + (side === 'above' ? -6 : 6)
    const required = (limit - (1 - t) ** 2 * y1 - t * t * y2) / weight
    controlY = side === 'above' ? Math.min(controlY, required) : Math.max(controlY, required)
  }
  // Mirrored quadratic controls preserve the centerline and taper to shared tips.
  const thickness = Math.min(3.2, Math.max(2.2, span * 0.022))
  const centerline = `M ${startX} ${y1} Q ${controlX} ${controlY} ${endX} ${y2}`
  const extrema = [y1, y2]
  const denominator = y1 - 2 * controlY + y2
  const peak = denominator === 0 ? -1 : (y1 - controlY) / denominator
  if (peak > 0 && peak < 1) extrema.push((1-peak)**2*y1 + 2*peak*(1-peak)*controlY + peak*peak*y2)

  path.classList.add('notation-slur')
  path.setAttribute('data-slur-ink-left', String(Math.min(startX, endX)))
  path.setAttribute('data-slur-ink-right', String(Math.max(startX, endX)))
  path.setAttribute('data-slur-ink-top', String(Math.min(...extrema) - thickness / 2))
  path.setAttribute('data-slur-ink-bottom', String(Math.max(...extrema) + thickness / 2))
  path.setAttribute('data-slur-y1', String(y1))
  path.setAttribute('data-slur-y2', String(y2))
  path.setAttribute('data-slur-control-y', String(controlY))
  path.setAttribute('data-span-hit-path', centerline)
  path.setAttribute(
    'data-annotation-lane',
    side === 'above' ? 'upper-slur' : 'lower-slur'
  )
  path.setAttribute(
    'd',
    `M ${startX} ${y1} Q ${controlX} ${controlY - thickness} ${endX} ${y2} Q ${controlX} ${controlY + thickness} ${startX} ${y1} Z`
  )
  svg.append(path)
  return path
}

function bindSpanSelection(
  element: SVGElement,
  reference: SpanReference,
  selected: NotationPreviewProps['selectedSpan'],
  onSelect: NotationPreviewProps['onSelectSpan']
): void {
  if (reference.segment) element.setAttribute('data-span-segment', spanSegmentKey(reference.segment))
  if (!onSelect) return
  const isSelected = selected?.kind === reference.kind && selected.id === reference.id &&
    (!selected.segment || Boolean(reference.segment && spanSegmentKey(selected.segment) === spanSegmentKey(reference.segment)))
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  group.classList.add('notation-span-target')
  group.classList.toggle('is-selected', isSelected)
  if (reference.segment) group.setAttribute('data-span-segment', spanSegmentKey(reference.segment))
  group.setAttribute('data-span-id', reference.id)
  group.setAttribute('data-span-kind', reference.kind)
  group.setAttribute('role', 'button')
  group.setAttribute('tabindex', '0')
  group.setAttribute('aria-label', `${reference.kind === 'slur' ? '슬러' : '헤어핀'} ${reference.id} 선택`)
  group.setAttribute('aria-pressed', String(isSelected))
  const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  hit.setAttribute('d', element.getAttribute('data-span-hit-path') ?? element.getAttribute('d') ?? [...element.querySelectorAll('line')].map(line =>
    `M ${line.getAttribute('x1')} ${line.getAttribute('y1')} L ${line.getAttribute('x2')} ${line.getAttribute('y2')}`).join(' '))
  hit.classList.add('notation-span-hit')
  element.parentNode?.insertBefore(group, element)
  group.append(element, hit)
  group.addEventListener('click', event => { event.stopPropagation(); onSelect(reference) })
  group.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      event.stopPropagation()
      onSelect(reference)
    }
  })
}

function resolveSlurAnchorMetrics(note: StaveNote): Partial<CursorPoint> {
  try {
    const bounds = note.getNoteHeadBounds()
    const stem = note.hasStem() ? note.getStemExtents() : undefined
    const heads = note.noteHeads.map(head => head.getBoundingBox())

    return {
      voiceLane: note.getAttribute('data-voice-lane') as string | undefined,
      isRest: note.isRest(),
      durationDotInkBounds: Dot.getDots(note).map(dot => {
        const ink = dot.getTextMetrics()
        const x = dot.getX() + dot.getXShift()
        const y = dot.getY() + dot.getYShift()
        return { left: x - ink.actualBoundingBoxLeft, right: x + ink.actualBoundingBoxRight,
          top: y - ink.actualBoundingBoxAscent, bottom: y + ink.actualBoundingBoxDescent }
      }),
      noteHeadTopY: bounds.yTop,
      noteHeadBottomY: bounds.yBottom,
      noteHeadBeginX: note.getNoteHeadBeginX(),
      noteHeadEndX: note.getNoteHeadEndX(),
      noteHeadInkBounds: heads.length ? {
        left: Math.min(...heads.map(head => head.getX())),
        right: Math.max(...heads.map(head => head.getX() + head.getW())),
        top: Math.min(...heads.map(head => head.getY())),
        bottom: Math.max(...heads.map(head => head.getY() + head.getH()))
      } : undefined,
      stemDirection: note.getStemDirection(),
      stemX: stem ? note.getStemX() : undefined,
      stemTopY: stem ? Math.min(stem.topY, stem.baseY) : undefined,
      stemBottomY: stem ? Math.max(stem.topY, stem.baseY) : undefined
    }
  } catch {
    return {}
  }
}

function resolvePolyphonicSlurSide(start: CursorPoint, end: CursorPoint): 'above' | 'below' | undefined {
  if (start.voiceLane !== end.voiceLane) return undefined
  switch (start.voiceLane) {
    case 'upper':
    case 'upper-secondary': return 'above'
    case 'lower':
    case 'lower-secondary': return 'below'
    default: return undefined
  }
}

function resolveSlurSide(
  start: CursorPoint,
  end: CursorPoint
): 'above' | 'below' {
  const preferredSide = (start.stemDirection ?? -1) > 0 ? 'below' : 'above'

  // With matching stem directions, retain the conventional start-stem policy.
  // On a mixed-stem pair, avoid sending the entire curve through the endpoint
  // attachment stack when the opposite side is clear.
  if (
    start.stemDirection === undefined ||
    end.stemDirection === undefined ||
    Math.sign(start.stemDirection) === Math.sign(end.stemDirection)
  ) {
    return preferredSide
  }

  const aboveClearance =
    (start.articulationAboveClearance ?? 0) +
    (end.articulationAboveClearance ?? 0) +
    (start.tupletAboveClearance ?? 0) +
    (end.tupletAboveClearance ?? 0)
  const belowClearance =
    (start.articulationBelowClearance ?? 0) +
    (end.articulationBelowClearance ?? 0) +
    (start.tupletBelowClearance ?? 0) +
    (end.tupletBelowClearance ?? 0)

  if (aboveClearance < belowClearance) {
    return 'above'
  }

  if (belowClearance < aboveClearance) {
    return 'below'
  }

  return preferredSide
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
  side: 'above' | 'below',
  clearAttachments: boolean
): number {
  if (side === 'above') {
    const noteY = point.noteHeadTopY ?? point.y
    const attachmentY = noteY - Math.max(
      10,
      clearAttachments
        ? Math.max(
            point.articulationAboveClearance ?? 0,
            point.tupletAboveClearance ?? 0
          )
        : 0
    )
    return clearAttachments && (point.stemDirection ?? 0) > 0
      ? Math.min(attachmentY, (point.stemTopY ?? noteY) - 10) : attachmentY
  }

  const noteY = point.noteHeadBottomY ?? point.y + 40
  const attachmentY = noteY + Math.max(
    10,
    clearAttachments
      ? Math.max(
          point.articulationBelowClearance ?? 0,
          point.tupletBelowClearance ?? 0
        )
      : 0
  )
  return clearAttachments && (point.stemDirection ?? 0) < 0
    ? Math.max(attachmentY, (point.stemBottomY ?? noteY) + 10) : attachmentY
}

function resolveSlurContinuationY(
  bounds: SystemBounds,
  side: 'above' | 'below'
): number {
  // VexFlow's five staff lines run from origin + 40 through origin + 80.
  return side === 'above' ? bounds.y + 20 : bounds.y + 100
}

function drawArticulations(
  svg: SVGSVGElement,
  eventId: string,
  x: number,
  staffY: number,
  note: StaveNote,
  articulations: string[]
): void {
  articulations.forEach((articulation, index) => {
    const placement = resolveArticulationPlacement(note, staffY, index)

    if (articulation === 'staccato') {
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle')

      dot.classList.add('notation-articulation')
      dot.setAttribute('data-event-id', eventId)
      dot.setAttribute('data-notehead-y', String(placement.noteheadY))
      dot.setAttribute('cx', String(x + 4))
      dot.setAttribute('cy', String(placement.y))
      dot.setAttribute('r', String(STACCATO_RADIUS))
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
      text.setAttribute('data-event-id', eventId)
      text.setAttribute('data-notehead-y', String(placement.noteheadY))
      text.setAttribute('x', String(x))
      text.setAttribute('y', String(placement.y + 4))
      text.textContent = symbol
      svg.append(text)
    }
  })
}

function resolveArticulationPlacement(
  note: StaveNote,
  staffY: number,
  index: number
): { noteheadY: number; y: number } {
  const noteheadYs = resolveNoteheadYs(note, staffY)
  const staffMiddleY = staffY + 60
  const noteheadY =
    Math.min(...noteheadYs) <= staffMiddleY
      ? Math.min(...noteheadYs)
      : Math.max(...noteheadYs)
  const placeAbove = noteheadY <= staffMiddleY
  const offset = 9 + index * 10

  return {
    noteheadY,
    y: placeAbove ? noteheadY - offset : noteheadY + offset
  }
}

function resolveSlurAttachmentClearance(
  event: VoiceEvent | undefined,
  note: StaveNote,
  staffY: number
): Pick<CursorPoint, 'articulationAboveClearance' | 'articulationBelowClearance' | 'staccatoYs'> {
  if (event?.type !== 'note' || !event.articulations?.length) {
    return {}
  }

  let articulationAboveClearance: number | undefined
  let articulationBelowClearance: number | undefined
  const staccatoYs: number[] = []

  event.articulations.forEach((articulation, index) => {
    const placement = resolveArticulationPlacement(note, staffY, index)
    if (articulation === 'staccato') staccatoYs.push(placement.y)
    const clearance = Math.abs(placement.y - placement.noteheadY) + 5

    if (placement.y < placement.noteheadY) {
      articulationAboveClearance = Math.max(
        articulationAboveClearance ?? 0,
        clearance
      )
    } else {
      articulationBelowClearance = Math.max(
        articulationBelowClearance ?? 0,
        clearance
      )
    }
  })

  return { articulationAboveClearance, articulationBelowClearance, staccatoYs }
}

function resolveTupletInkBounds(tuplet: VexTuplet): InkBounds[] {
  const group = tuplet.getSVGElement()
  if (!group) return []
  const bounds: InkBounds[] = []
  const context = document.createElement('canvas').getContext('2d')
  if (context) {
    for (const text of group.querySelectorAll('text')) {
      const style = getComputedStyle(text)
      context.font = `${style.fontSize} ${style.fontFamily}`
      const ink = context.measureText(text.textContent ?? '')
      const x = Number(text.getAttribute('x'))
      const y = Number(text.getAttribute('y'))
      bounds.push({
        left: x - ink.actualBoundingBoxLeft,
        right: x + ink.actualBoundingBoxRight,
        top: y - ink.actualBoundingBoxAscent,
        bottom: y + ink.actualBoundingBoxDescent
      })
    }
  }
  // VexFlow also emits an invisible pointer rectangle, which is not engraving ink.
  for (const rect of group.querySelectorAll('rect')) {
    if (rect.getAttribute('opacity') === '0') continue
    const x = Number(rect.getAttribute('x'))
    const y = Number(rect.getAttribute('y'))
    const endX = x + Number(rect.getAttribute('width'))
    const endY = y + Number(rect.getAttribute('height'))
    bounds.push({ left: Math.min(x, endX), right: Math.max(x, endX),
      top: Math.min(y, endY), bottom: Math.max(y, endY) })
  }
  return bounds
}

function resolveTupletAttachmentClearances(
  tuplets: RenderedTuplet[],
  notesByEventId: Map<string, StaveNote>
): Map<
  string,
  Pick<CursorPoint, 'tupletAboveClearance' | 'tupletBelowClearance' | 'tupletInkBounds'>
> {
  const clearances = new Map<
    string,
    Pick<CursorPoint, 'tupletAboveClearance' | 'tupletBelowClearance' | 'tupletInkBounds'>
  >()

  tuplets.forEach(({ eventIds, tuplet }) => {
    const tupletY = tuplet.getYPosition()
    const inkBounds = resolveTupletInkBounds(tuplet)

    eventIds.forEach((eventId) => {
      const note = notesByEventId.get(eventId)

      if (!note) {
        return
      }

      try {
        const bounds = note.getNoteHeadBounds()
        const previous = clearances.get(eventId) ?? {}
        const existing = { ...previous, tupletInkBounds: [...previous.tupletInkBounds ?? [], ...inkBounds] }
        clearances.set(eventId, existing)

        if (tupletY < bounds.yTop) {
          clearances.set(eventId, {
            ...existing,
            // Clear both the bracket line and the number rendered above it.
            tupletAboveClearance: Math.max(
              existing.tupletAboveClearance ?? 0,
              bounds.yTop - tupletY + 8
            )
          })
        } else if (tupletY > bounds.yBottom) {
          clearances.set(eventId, {
            ...existing,
            tupletBelowClearance: Math.max(
              existing.tupletBelowClearance ?? 0,
              tupletY - bounds.yBottom + 8
            )
          })
        }
      } catch {
        // Some VexFlow notes do not expose head bounds until a later draw pass.
      }
    })
  })

  return clearances
}

function resolveNoteheadYs(note: StaveNote, staffY: number): number[] {
  try {
    const ys = note.getYs()

    if (Array.isArray(ys) && ys.every((y) => Number.isFinite(y))) {
      return ys
    }
  } catch {
    // Fall back to staff middle when VexFlow cannot expose notehead coordinates
    // in the current renderer/test environment.
  }

  return [staffY + 60]
}

function drawFermata(svg: SVGSVGElement, eventId: string, x: number, staffY: number): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-fermata')
  text.setAttribute('data-event-id', eventId)
  text.setAttribute('x', String(x + 4))
  text.setAttribute('y', String(staffY - 22))
  text.textContent = '𝄐'
  svg.append(text)
}

function drawBreathMark(
  svg: SVGSVGElement,
  eventId: string,
  x: number,
  staffY: number,
  breathMark: string,
  hasFermata: boolean
): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-breath-mark')
  text.setAttribute('data-event-id', eventId)
  text.setAttribute('x', String(x + (hasFermata ? 30 : 14)))
  text.setAttribute('y', String(staffY - (hasFermata ? 2 : 16)))
  text.textContent = breathMark === 'caesura' ? '//' : ','
  svg.append(text)
}

function drawTremoloMark(
  svg: SVGSVGElement,
  eventId: string,
  staffY: number,
  note: StaveNote,
  marks: number
): void {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  const stemGeometry = resolveStemGeometry(note, staffY)
  const centerY = (stemGeometry.topY + stemGeometry.baseY) / 2
  const firstY = centerY - ((marks - 1) * 5) / 2

  group.classList.add('notation-tremolo-mark')
  group.setAttribute('data-event-id', eventId)

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
  eventId: string,
  x: number,
  staffY: number,
  ornaments: string[],
  yOffset = 34
): void {
  // MusicXML mordent has a vertical stroke; VexFlow names that variant inverted.
  const glyphs = ornaments.map((ornament) => new Ornament(
    ornament === 'trill' ? 'tr' : ornament === 'mordent' ? 'mordentInverted' : 'turn'
  ))
  if (!glyphs[0]) return
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-ornament')
  text.setAttribute('data-event-id', eventId)
  text.setAttribute('x', String(x + 4))
  const descent = Math.max(...glyphs.map((glyph) => glyph.getTextMetrics().actualBoundingBoxDescent))
  text.setAttribute('y', String(staffY - yOffset - descent))
  text.style.font = glyphs[0].getFont()
  text.textContent = glyphs.map((glyph) => glyph.getText()).join(' ')
  svg.append(text)
}

function drawGraceNotes(
  svg: SVGSVGElement,
  eventId: string,
  x: number,
  staffY: number,
  graceNotes: NonNullable<Extract<VoiceEvent, { type: 'note' }>['graceNotes']>
): void {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  const startX = x - 24 - Math.max(0, graceNotes.length - 1) * 10

  group.classList.add('notation-grace-notes')
  group.setAttribute('data-event-id', eventId)
  group.setAttribute('x', String(startX))
  group.setAttribute('y', String(staffY + 2))
  group.setAttribute('aria-label', '꾸밈음')

  const stemTops: Array<{ x: number; y: number }> = []

  graceNotes.forEach((graceNote, index) => {
    const noteX = startX + index * 12
    const noteY = resolveGraceNoteY(staffY, graceNote.pitch)
    const stemX = noteX + 3.5
    const stemTopY = noteY - 22
    const head = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse')
    const stem = document.createElementNS('http://www.w3.org/2000/svg', 'line')

    head.classList.add('notation-grace-notehead')
    head.setAttribute('data-event-id', eventId)
    head.setAttribute('data-grace-index', String(index))
    head.setAttribute('data-grace-duration', graceNote.duration?.value ?? 'eighth')
    head.setAttribute('cx', String(noteX))
    head.setAttribute('cy', String(noteY))
    head.setAttribute('rx', '4.2')
    head.setAttribute('ry', '3')
    head.setAttribute('transform', `rotate(-20 ${noteX} ${noteY})`)
    group.append(head)

    stem.classList.add('notation-grace-stem')
    stem.setAttribute('data-event-id', eventId)
    stem.setAttribute('data-grace-index', String(index))
    stem.setAttribute('x1', String(stemX))
    stem.setAttribute('x2', String(stemX))
    stem.setAttribute('y1', String(noteY - 1))
    stem.setAttribute('y2', String(stemTopY))
    group.append(stem)
    stemTops.push({ x: stemX, y: stemTopY })

    const flagCount = graceNoteFlagCount(graceNote.duration?.value ?? 'eighth')

    if (flagCount > 0 && graceNotes.length === 1) {
      for (let flagIndex = 0; flagIndex < flagCount; flagIndex += 1) {
        const flag = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        const flagY = stemTopY + flagIndex * 5

        flag.classList.add('notation-grace-flag')
        flag.setAttribute('data-event-id', eventId)
        flag.setAttribute('data-grace-index', String(index))
        flag.setAttribute(
          'd',
          `M ${stemX} ${flagY} C ${stemX + 8} ${flagY + 2}, ${stemX + 9} ${flagY + 8}, ${stemX + 2} ${flagY + 11}`
        )
        group.append(flag)
      }
    }

    for (let dotIndex = 0; dotIndex < (graceNote.duration?.dots ?? 0); dotIndex += 1) {
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle')

      dot.classList.add('notation-grace-dot')
      dot.setAttribute('data-event-id', eventId)
      dot.setAttribute('data-grace-index', String(index))
      dot.setAttribute('cx', String(noteX + 8 + dotIndex * 4))
      dot.setAttribute('cy', String(noteY - 1))
      dot.setAttribute('r', '1.3')
      group.append(dot)
    }

    if (graceNote.slash) {
      const slash = document.createElementNS('http://www.w3.org/2000/svg', 'line')

      slash.classList.add('notation-grace-slash')
      slash.setAttribute('data-event-id', eventId)
      slash.setAttribute('data-grace-index', String(index))
      slash.setAttribute('x1', String(noteX - 3))
      slash.setAttribute('y1', String(noteY - 9))
      slash.setAttribute('x2', String(noteX + 8))
      slash.setAttribute('y2', String(noteY - 19))
      group.append(slash)
    }
  })

  if (stemTops.length > 1) {
    const beamCount = Math.max(
      1,
      ...graceNotes.map((graceNote) =>
        graceNoteFlagCount(graceNote.duration?.value ?? 'eighth')
      )
    )

    for (let beamIndex = 0; beamIndex < beamCount; beamIndex += 1) {
      const beam = document.createElementNS('http://www.w3.org/2000/svg', 'line')

      beam.classList.add('notation-grace-beam')
      beam.setAttribute('data-event-id', eventId)
      beam.setAttribute('x1', String(stemTops[0]!.x))
      beam.setAttribute('x2', String(stemTops.at(-1)!.x))
      beam.setAttribute('y1', String(stemTops[0]!.y + beamIndex * 4))
      beam.setAttribute('y2', String(stemTops.at(-1)!.y + beamIndex * 4))
      group.append(beam)
    }
  }

  svg.append(group)
}

function graceNoteFlagCount(duration: DurationValue): number {
  switch (duration) {
    case '64th':
      return 4
    case '32nd':
      return 3
    case '16th':
      return 2
    case 'eighth':
      return 1
    case 'whole':
    case 'half':
    case 'quarter':
      return 0
  }
}

function resolveGraceNoteY(
  staffY: number,
  pitch: NonNullable<Extract<VoiceEvent, { type: 'note' }>['graceNotes']>[number]['pitch']
): number {
  const stepIndex: Record<string, number> = {
    C: 0,
    D: 1,
    E: 2,
    F: 3,
    G: 4,
    A: 5,
    B: 6
  }
  const diatonicIndex = stepIndex[pitch.step] + (pitch.octave - 4) * 7
  const e4Index = stepIndex.E
  const rawY = staffY + 40 - (diatonicIndex - e4Index) * 5

  return Math.max(staffY - 14, Math.min(staffY + 54, rawY))
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

function stopLyricEditorEvent(event: Event): void {
  event.stopPropagation()
  event.stopImmediatePropagation()
}

function drawTie(
  context: ReturnType<Renderer['getContext']>,
  firstNote: StaveNote | null,
  lastNote: StaveNote | null
): StaveTie {
  const tie = new StaveTie({
    firstNote,
    lastNote,
    firstIndexes: [0],
    lastIndexes: [0]
  })
    .setContext(context)
  tie.draw()
  return tie
}

function isPreviewEventId(eventId: string): boolean {
  return eventId.startsWith('preview-')
}

function createStableBeam(notes: StaveNote[], maintainStemDirections = false): Beam {
  const beam = new Beam(notes, !maintainStemDirections)

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
  // A clef change belongs to the staff timeline, including notes in its other voices.
  const effectiveClef = resolveMeasureClefAtTick(measure, event.position.tick)
  const clef = toVexFlowClef(effectiveClef)
  const isRest = event.type === 'rest'
  const pitch =
    event.type === 'note' ? resolveNotePitch(measure, voice, event) : undefined
  const keys =
    event.type === 'note' && event.pitches?.length
      ? event.pitches.map(toVexFlowKey)
      : isRest
        ? [toVexFlowRestKey(effectiveClef, event.duration.value)]
        : [toVexFlowKey(pitch!)]
  const voicePresentation = resolveSameStaffVoicePresentation(
    voice.id,
    measure.voices.length
  )
  const note = new StaveNote({
    clef,
    keys,
    duration: toVexFlowDuration(event.duration, isRest),
    alignCenter: event.type === 'rest' && Boolean(event.fullMeasure),
    autoStem: !voicePresentation.stemDirection,
    stemDirection: voicePresentation.stemDirection
  })

  note.setAttribute('data-event-id', event.id)
  note.setAttribute('data-voice-lane', voicePresentation.lane)
  if (voicePresentation.stemDirection) {
    note.setAttribute(
      'data-voice-stem-direction',
      voicePresentation.stemDirection > 0 ? 'up' : 'down'
    )
  }

  if (isRest && voicePresentation.restYOffset) {
    note.setYShift(voicePresentation.restYOffset)
  }

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
