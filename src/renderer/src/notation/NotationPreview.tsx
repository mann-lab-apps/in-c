import { taperedSlurPath } from './slur-profile'
import { resolveNotePointerOwner } from './note-pointer-owner'
import { resolveSpanPointerOwner } from './span-pointer-owner'
import { protectedInkBlocksSlurSide, type SlurSideObstacle } from './protected-slur-ink'
import { readOwnedMeasureTextInk } from './measure-text-ink'
import { planSlurNesting, readSlurCurveInk, strictlyContainsSlur } from './slur-nesting'
import { deferNotationEventTone, paintNotationEventTone } from './notation-event-tone'
import { measurePrintPageLayout, type MeasuredPrintLayout } from './measured-print-pages'
import { keySignatureCancellation } from './key-signature-header'
import { resolveTieModifierDepth, resolveTieModifierPlacement } from './tie-modifier-clearance'
import { collectForeignBeamPaths, isForeignStaffVoice } from './tie-voice-ink'
import { hasManualSpanEngraving } from '../../../project/span-engraving'
import { applyExpressionInkOffsets, measureExpressionInkOffsets } from './expression-ink-spacing'
import { resolveFermataInkOffset } from './fermata-ink-spacing'
import { resolveNearNoteArticulationOffset } from './articulation-ink-placement'
import { ornamentGlyphs } from './ornament-glyphs'
import { resolveSlurFermataCurve, resolveSlurStemAttachment, resolveSlurBeamStemBounds, resolveSlurContinuationStartCurve } from './slur-fermata-spacing'
import { resolveHairpinInkMinimums, type AutomaticHairpinInk } from './hairpin-ink-spacing'
import { resolveSystemMusicMinimum, type SystemMusicFrame } from './system-music-envelope'
import { resolveOctaveInkShift, resolveOctaveStaffSpacing } from './octave-ink-spacing'
import { measureDynamicInkSpacing } from './dynamic-ink-spacing'
import { indexMeasureDynamics } from './measure-dynamics'
import { formatNotationVoices } from './format-voices'
import { createNotationTuplet } from './create-tuplet'
import { createSharedRepeatBarlines } from './repeat-barlines'
import { recordTimedAnnotationAnchor, resolveTimedAnnotationX, type TimedAnnotationAnchor, type TimedAnnotationLayout } from './timed-annotation-position'
import { memo, useEffect, useRef, useState } from 'react'
import { usePlaybackInk } from './usePlaybackInk'
import { isSameNotationFocus, restoreNotationFocus } from './focus-viewport'
import { createNotationRangeDrag, type RangeDragAnchor } from './range-drag'
import { createPortal } from 'react-dom'
import { StudioInlineLyricInput, type InlineLyricEditor } from './StudioInlineLyricInput'
import { createStaffAnnotationSpacing } from './staff-annotation-spacing'
import { applyStaffLabelShifts, localStaffLabelShifts } from './staff-label-placement'
import { measureSystemInkSpacing } from './system-ink-spacing'
import { resolvePartLabel } from './part-label-layout'
import { measurePrintHeaderInset } from './print-header-spacing'
import { measureLyricInkSpacing, readStaffMusicInk, readOwnedLyricInk } from './lyric-ink-spacing'
import { applyStaffInkSpacing, measureStaffInkSpacing, resolveStaffInkSpacing, readSvgShapeInk, type StaffInk, readSvgTextInk, type MeasureInkOwner } from './staff-ink-spacing'
import { resolveGlobalAnnotationMeasures } from '../editor/global-measure-reference'
import { applyTempoStaffAnchors } from './tempo-staff-anchor'
import {
  Accidental,
  BarlineType,
  Beam,
  Dot,
  GraceNote,
  GraceNoteGroup,
  Renderer,
  Stave,
  StaveNote,
  StaveTie,
  Voice
} from 'vexflow'

import {
  collectTiePairs,
  scoreRepeatSource,
  durationToTicks,
  measureDurationTicks,
  resolveNotePitch,
  TICKS_PER_QUARTER,
  type RhythmFeelMarking,
  shouldDisplayAccidental,
  sortVoiceEvents,
  type Measure,
  type Score,
  type SpanEngraving,
  type Staff,
  type TempoMarking,
  type Voice as ScoreVoice,
  type VoiceAddress,
  type VoiceEvent
} from '../../../score-core'
import { createBeamGroups } from './beam-groups'
import { resolveSpanViewport } from './span-viewport'
import {
  createSystemLayout, systemVerticalSpace,
  leadingNotationPadding,
  type MeasurePlacement
} from './system-layout'
import {
  toVexFlowAccidental,
  toVexFlowClef,
  toVexFlowDuration,
  toVexFlowKey,
  toVexFlowRestKey,
  toVexFlowKeySignature
} from './vexflow-adapter'
import { hairpinCoveredMeasureIds, reserveInteriorHairpinLanes } from './hairpin-annotation-lanes'
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
  resolveAnnotationVerticalExtension,
  resolveAnnotationSystemTop,
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
import { attachLyricSpacing, lyricDisplayText } from './lyric-spacing'
import { formatSharedRhythm, type SharedStaffLayout } from './shared-rhythm-layout'
import type { HarmonySpacingWidths } from './harmony-spacing'
import { captureLyricEditorState, type LyricEditorRestore } from './lyric-editor-state'
import {
  resolveNotationEventTone,
  resolveSameStaffVoicePresentation,
  sameVoiceLane
} from './visual-state'

export interface NotationPreviewProps {
  /** Stable editor document/view identity; display-score projections may change on selection. */
  interactionOwner?: object
  lyricWidths?: ReadonlyMap<string, number>
  harmonyWidths?: HarmonySpacingWidths
  minimumMeasureWidths?: ReadonlyMap<string, number>
  selectedSpan?: { kind: 'slur' | 'hairpin'; id: string }
  onSelectSpan?: (reference: { kind: 'slur' | 'hairpin'; id: string }) => void
  onSelectRehearsalMark?: (reference:{id:string;measureId:string}) => void
  selectedRehearsalMarkId?:string
  onSelectSystemText?:(reference:{id:string;measureId:string})=>void
  selectedSystemTextId?:string
  onSelectStaffText?:(reference:{id:string;measureId:string})=>void
  selectedStaffTextId?:string
  onSelectDynamic?:(reference:{id:string;measureId:string;edit?:boolean})=>void
  selectedDynamicId?:string
  onSelectHarmony?:(reference:{id:string;measureId:string;tick:number;edit?:boolean})=>void
  selectedHarmonyId?:string
  onSelectExpressionText?:(reference:{id:string;measureId:string;tick:number})=>void
  selectedExpressionTextId?:string
  inputPosition?:{address:VoiceAddress;tick:number}
  shouldRestoreFocusViewport?:()=>boolean
  score: Score
  inlineLyricEditor?: InlineLyricEditor
  inlineEditorTheme?: 'light' | 'dark'
  selectedEventAddress?: VoiceAddress
  selectedEventAddresses?: ReadonlyMap<string, VoiceAddress>
  selectedEventId?: string
  selectedEventIds?: string[]
  selectedMeasureId?: string
  playbackEventId?: string
  playbackRunning?: boolean
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


type MeasureTextInteraction=Pick<NotationPreviewProps,'onSelectRehearsalMark'|'selectedRehearsalMarkId'|'onSelectSystemText'|'selectedSystemTextId'|'onSelectStaffText'|'selectedStaffTextId'|'onSelectExpressionText'|'selectedExpressionTextId'|'onSelectHarmony'|'selectedHarmonyId'|'onSelectDynamic'|'selectedDynamicId'>

const MIN_RENDER_WIDTH = 560
const STABLE_BEAM_MAX_SLOPE = 0.12
const STABLE_BEAM_SLOPE_COST = 220
const SINGLE_STAFF_SYSTEM_HEIGHT = 154
const DEFAULT_SYSTEM_TOP = 72
const STACKED_STAFF_Y_OFFSET = 96
const MEASURE_STAFF_VERTICAL_PADDING = 18

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
  partAbbreviation?: string
  staff: Staff
  staffId: string
  staffIndex: number
}

interface RenderedStaffInteraction extends MeasureTextInteraction {
  onSelectMeasure?:NotationPreviewProps['onSelectMeasure']
  onOpenMeasureContextMenu?:NotationPreviewProps['onOpenMeasureContextMenu']
  onMeasureContextTarget?:(target:MeasureContextTarget)=>void
  selectedMeasureId?:string
  inputPosition?:NotationPreviewProps['inputPosition']
  lyricScale: number
  lyricOffset?: number
  onSelectLyric: NotationPreviewProps['onSelectLyric']
  onInlineAnchor: (anchor: { x: number; staffY: number }) => void
  inlineLyricEventId?: string
  lyricWidths?: ReadonlyMap<string, number>
  harmonyWidths?: ReadonlyMap<number, number>
  deferDraw?: (draw: () => void) => void
  selectedEventAddress?: VoiceAddress
  selectedEventId?: string
  selectedEventIdSet: Set<string>
  selectedEventAddresses?: ReadonlyMap<string, VoiceAddress>
  playbackEventId?: string
  playbackEventAddress?: VoiceAddress
  onSelectEvent: NotationPreviewProps['onSelectEvent']
  onSelectEventRange: NotationPreviewProps['onSelectEventRange']
  continueDrag: (target: DragAnchor) => DragAnchor | undefined
  setDragAnchor: (anchor: DragAnchor | undefined) => void
}

type DragAnchor = RangeDragAnchor

interface RenderedStaffState {
  boundsByStaffSystemKey: Map<string, SystemBounds>
  notesByEventId: Map<string, StaveNote>
  pointsByEventId: Map<string, CursorPoint>
  staffIndexByEventId: Map<string, number>
  voiceKeyByEventId: Map<string, string | undefined>
  systemsByEventId: Map<string, number>
}

const MemoNotationCanvas = memo(NotationCanvas)

export function NotationPreview(props: NotationPreviewProps) {
  const { root, canvasProps } = usePlaybackInk(props)
  return <div ref={root} style={{ display: 'contents' }}><MemoNotationCanvas {...canvasProps} /></div>
}

function NotationCanvas({
  lyricWidths,
  harmonyWidths,
  minimumMeasureWidths,
  selectedSpan,
  onSelectSpan,
  onSelectRehearsalMark,
  selectedRehearsalMarkId,
  onSelectSystemText,
  selectedSystemTextId,
  onSelectStaffText,
  onSelectDynamic,
  selectedDynamicId,
  onSelectHarmony,
  selectedHarmonyId,
  onSelectExpressionText,
  selectedExpressionTextId,
  selectedStaffTextId,
  inputPosition,
  shouldRestoreFocusViewport,
  score,
  interactionOwner = score,
  inlineLyricEditor,
  inlineEditorTheme = 'light',
  selectedEventAddress,
  selectedEventAddresses,
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
  const paintedScore = useRef<Score | undefined>(undefined)
  // A mouse gesture outlives the SVG nodes replaced by selection redraws.
  const [rangeDrag] = useState(createNotationRangeDrag)
  const lastSelectedMarkKey=useRef<string|undefined>(undefined)
  const [inlinePortal, setInlinePortal] = useState<{ host: HTMLElement; foreignObject: SVGForeignObjectElement; x: number; y: number; editor: InlineLyricEditor; restore: LyricEditorRestore }>()
  const [renderWidth, setRenderWidth] = useState(MIN_RENDER_WIDTH)
  const [draftLayoutRevision, setDraftLayoutRevision] = useState(0)
  const [fontLayoutRevision, setFontLayoutRevision] = useState(0)

  useEffect(() => {
    rangeDrag.clear()
    return () => { rangeDrag.clear(interactionOwner) }
  }, [interactionOwner, printLayout, rangeDrag])

  useEffect(() => {
    let active = true
    const refresh = () => { if (active) setFontLayoutRevision(revision => revision + 1) }
    void document.fonts?.ready.then(refresh)
    document.fonts?.addEventListener('loadingdone', refresh)
    return () => { active = false; document.fonts?.removeEventListener('loadingdone', refresh) }
  }, [])

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

    const previousFocus = document.activeElement
    const previousInput = container.querySelector<HTMLInputElement>('.notation-lyric-editor input')
    const inlineRestore=captureLyricEditorState(previousInput,inlineLyricEditor,previousFocus)
    if(inlineRestore.defer && previousInput){
      let frame:number|undefined
      const resume=()=>{frame=requestAnimationFrame(()=>setDraftLayoutRevision(revision=>revision+1))}
      // The local editor stops immediate propagation in its target-phase handler.
      // Schedule the deferred redraw first; the frame runs after its IME cleanup.
      previousInput.addEventListener('compositionend',resume,{once:true,capture:true})
      return()=>{previousInput.removeEventListener('compositionend',resume,true);if(frame!==undefined)cancelAnimationFrame(frame)}
    }
    const scoreChanged = paintedScore.current !== score
    paintedScore.current = score
    const selectedMark=[
      {id:selectedDynamicId,selector:'.notation-dynamic-target',attribute:'data-dynamic-id'},
      {id:selectedHarmonyId,selector:'.notation-harmony-target',attribute:'data-harmony-id'},
      {id:selectedExpressionTextId,selector:'.notation-expression-text-target',attribute:'data-expression-text-id'},
      {id:selectedStaffTextId,selector:'.notation-staff-text-target',attribute:'data-staff-text-id'},
      {id:selectedSystemTextId,selector:'.notation-system-text-target',attribute:'data-system-text-id'},
      {id:selectedRehearsalMarkId,selector:'.notation-rehearsal-mark',attribute:'data-rehearsal-id'}
    ].find(mark=>mark.id!==undefined)
    const nextMarkKey=selectedMark?`${selectedMark.attribute}:${selectedMark.id}`:undefined
    const markSelectionChanged=nextMarkKey!==lastSelectedMarkKey.current
    const leavingMarkSelection=markSelectionChanged&&lastSelectedMarkKey.current!==undefined&&!selectedMark
    lastSelectedMarkKey.current=nextMarkKey
    const focusedEventId = previousFocus!==previousInput && container.contains(previousFocus) ? previousFocus?.getAttribute('data-event-id') : undefined
    const focusedSpanId = container.contains(previousFocus) ? previousFocus?.getAttribute('data-span-id') : undefined
    const focusedRehearsalId=container.contains(previousFocus)?previousFocus?.getAttribute('data-rehearsal-id'):undefined
    const focusedSystemTextId=container.contains(previousFocus)?previousFocus?.getAttribute('data-system-text-id'):undefined
    const focusedDynamicId=container.contains(previousFocus)?previousFocus?.getAttribute('data-dynamic-id'):undefined
    const focusedHarmonyId=container.contains(previousFocus)?previousFocus?.getAttribute('data-harmony-id'):undefined
    const focusedExpressionTextId=container.contains(previousFocus)?previousFocus?.getAttribute('data-expression-text-id'):undefined
    const focusedStaffTextId=container.contains(previousFocus)?previousFocus?.getAttribute('data-staff-text-id'):undefined
    const focusedInkBox = focusedRehearsalId||focusedSystemTextId||focusedStaffTextId||focusedExpressionTextId||focusedHarmonyId||focusedDynamicId
      ?previousFocus?.querySelector('rect')?.getBoundingClientRect()
      :focusedEventId || focusedSpanId ? previousFocus?.getBoundingClientRect() : undefined
    const focusBox = focusedInkBox ?? (markSelectionChanged && selectedMark &&
      previousFocus === container.closest('.score-canvas') ? previousFocus?.getBoundingClientRect() : undefined)
    // A redraw is not a user blur/commit. Old detached IME callbacks also must
    // never apply their draft to a new selection/document.
    if(previousInput)previousInput.dataset.editorReplacing='true'
    // Measure real span/text ink before publishing focus, cursor or an editor.
    // A bounded synchronous repaint changes full system layout, not drawn notes.
    const paint = (additionalSystemSpacing: ReadonlyMap<number, number>, pass: number,
      additionalStaffSpacing: ReadonlyMap<number,number> = new Map(), firstSystemOffset = 0,
      additionalLyricSpacing: ReadonlyMap<number,number> = new Map(),
      additionalDynamicSpacing: ReadonlyMap<number,number> = new Map(),
      additionalHairpinMinimums: ReadonlyMap<string,number> = new Map(),
      additionalExpressionOffsets: ReadonlyMap<string,number> = new Map(),
      additionalSystemMusicMinimum = 0, measuredPrintLayout?: MeasuredPrintLayout, printPagePass = 0): (() => void) => {
    container.replaceChildren()

    const renderedStaffTargets = createRenderedStaffTargets(score)
    const renderedPart = score.parts[0]
    const renderedStaff = renderedPart?.staves[0]
    const measures = renderedStaff?.measures ?? []
    // System endings and count labels follow the aligned playback sequence,even when
    // native marking ownership is on a secondary staff.Keep drawn note owners.
    const systemRepeatMeasures=scoreRepeatSource(score)?.measures??measures
    const repeatBarlines = createSharedRepeatBarlines(score)
    const effectiveRenderWidth = printLayoutPlan?.renderWidth ?? renderWidth
    const printScale = printLayoutPlan?.scale ?? 1
    const lyricScale = Math.max(0.82, printScale)
    const annotationScore = resolveGlobalAnnotationMeasures(score)
    // Hidden tempi remain editable ghosts on screen, but have no printed ink.
    // Exclude them before lane/header planning rather than only applying print opacity.
    const displayedTempo = score.tempo && (!printLayout || !score.tempo.transparent) ? score.tempo : undefined
    const annotationMaps = createMeasureAnnotationMaps(annotationScore, printLayout)
    const baseAnnotationLanesByMeasureId = createMeasureAnnotationLaneMap(
      annotationScore,
      annotationMaps,
      lyricScale, new Map(), new Map(), false
    )
    let annotationLanesByMeasureId = createMeasureAnnotationLaneMap(annotationScore, annotationMaps, lyricScale, additionalLyricSpacing, additionalDynamicSpacing)
    const visibleStaffCount = Math.max(1, renderedStaffTargets.length)
    const renderer = new Renderer(container, Renderer.Backends.SVG)
    const context = renderer.getContext()
    const svg = container.querySelector<SVGSVGElement>('svg')
    let inlineEditorAnchor: { x: number; staffY: number } | undefined
    const measureAnnotationInk = (className: string, text: string) => {
      if (!svg) return undefined
      const probe = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      probe.setAttribute('class', className)
      probe.setAttribute('x', '0')
      probe.setAttribute('y', '0')
      probe.setAttribute('aria-hidden', 'true')
      if (className === 'notation-lyric') probe.setAttribute('font-size', String(13 * lyricScale))
      probe.textContent = text
      svg.append(probe)
      try { const box = probe.getBBox(); return { y: box.y, height: box.height } }
      catch { return undefined }
      finally { probe.remove() }
    }
    annotationLanesByMeasureId = reserveInteriorHairpinLanes(annotationScore, annotationLanesByMeasureId, measureAnnotationInk, additionalHairpinMinimums)
    annotationLanesByMeasureId = applyExpressionInkOffsets(annotationLanesByMeasureId, additionalExpressionOffsets)
    const annotationExtension = resolveAnnotationVerticalExtension(annotationLanesByMeasureId.values())
    const baseStaffSpacing = createStaffAnnotationSpacing(annotationScore, annotationLanesByMeasureId, measureAnnotationInk, lyricScale, additionalLyricSpacing)
    const staffSpacing = applyStaffInkSpacing(baseStaffSpacing, additionalStaffSpacing)
    const systemHeight = Math.max(
      (printLayoutPlan?.systemHeight ?? SINGLE_STAFF_SYSTEM_HEIGHT) +
      (staffSpacing.offsets.at(-1) ?? 0) +
      Math.max(annotationExtension.below, staffSpacing.requiredBelow - 154),
      staffSpacing.measured ? staffSpacing.minimumSystemHeight : 0,
      additionalSystemMusicMinimum
    )
    const layout = createSystemLayout(measures, effectiveRenderWidth, {
      measuredPrintLayout: printLayout ? measuredPrintLayout : undefined,
      firstSystemOffset,
      additionalSystemSpacing,
      minimumMeasureWidths,
      compactSpacing: Boolean(printLayoutPlan?.compactSpacing),
      layout: score.layout,
      lyricScale,
      pageHeight: printLayoutPlan?.pageHeight,
      systemHeight,
      systemTop: Math.max(resolveAnnotationSystemTop(
        printLayoutPlan?.systemTop ?? DEFAULT_SYSTEM_TOP,
        annotationLanesByMeasureId.values(),
        Boolean(displayedTempo || score.rhythmFeel)
      ), (displayedTempo || score.rhythmFeel ? 60 : 12) + staffSpacing.requiredAbove)
    })
      const owners = new Map<string, MeasureInkOwner | undefined>()
      renderedStaffTargets.forEach(target => target.staff.measures.forEach((measure, index) => {
        const system = layout.placements[index]?.systemIndex
        owners.set(measure.id, owners.has(measure.id) || system === undefined ? undefined : {
          partId:target.partId,staffId:target.staffId,staffIndex:target.globalStaffIndex,systemIndex:system
        })
      }))
    renderer.resize(effectiveRenderWidth, layout.height)
    svg?.setAttribute('data-staff-offsets', staffSpacing.offsets.join(','))
    let playbackPoint: CursorPoint | undefined
    const staffRenderState: RenderedStaffState = {
      boundsByStaffSystemKey: new Map(),
      notesByEventId: new Map(),
      pointsByEventId: new Map(),
      staffIndexByEventId: new Map(),
      voiceKeyByEventId: new Map(),
      systemsByEventId: new Map()
    }
    const selectedEventIdSet = new Set(selectedEventIds)
    const measureContextTargets: MeasureContextTarget[] = []
    const continueDrag = (target: DragAnchor) => rangeDrag.continue(interactionOwner, target)
    const setDragAnchor = (anchor: DragAnchor | undefined) => {
      if (anchor) rangeDrag.start(interactionOwner, anchor)
      else rangeDrag.clear(interactionOwner)
    }
    let activeVolta: { number: 1 | 2 } | undefined
    const primaryMeasureIndexById = new Map(
      measures.map((measure, index) => [measure.id, index])
    )

    const clearDragAnchor = () => {
      rangeDrag.clear(interactionOwner)
    }
    const cancelDragAnchor = (event: KeyboardEvent) => {
      if (event.key === 'Escape') clearDragAnchor()
    }
    const leaveDragContext = (event: FocusEvent) => {
      const target = event.target
      // SVG replacement can temporarily fall back to body. That is not a new
      // editing intent; an actual field/menu/dialog outside this canvas is.
      if (target instanceof Element && target !== document.body && target !== document.documentElement &&
        !container.contains(target)) clearDragAnchor()
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
    window.addEventListener('blur', clearDragAnchor)
    window.addEventListener('keydown', cancelDragAnchor)
    window.addEventListener('focusin', leaveDragContext, true)
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

    if (svg && displayedTempo) {
      drawTempoMarking(svg, displayedTempo, printLayout ? firstSystemOffset : 0)
    }

    if (svg && score.rhythmFeel) {
      drawRhythmFeelMarking(svg, score.rhythmFeel, Boolean(displayedTempo), printLayout ? firstSystemOffset : 0)
    }

    // Every multi-staff score needs a common rhythmic timebase, even without
    // lyrics or harmony. Independently justified staves misalign held notes
    // against dense 64th-note runs (for example the BWV 565 opening).
    const sharesStaffRhythm = renderedStaffTargets.length > 1
    const sharedMeasures = sharesStaffRhythm || lyricWidths?.size || harmonyWidths?.size
      ? new Map<number, (SharedStaffLayout & { draw: () => void })[]>() : undefined
    const deferredPrimaryDraws: (() => void)[] = [], deferredPassiveDraws: (() => void)[] = []
    layout.placements.forEach((placement, placementIndex) => {
      const shareMeasure = Boolean(sharesStaffRhythm || lyricWidths?.size || renderedStaffTargets.some(target =>
        harmonyWidths?.has(target.staff.measures[placementIndex]?.id)))
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
      // Meter continues across a line break. Clef/key headers still use the
      // system-start flag below; a new line alone is not a meter change.
      const previousMeasure = previousPlacement?.measure
      const stave = new Stave(
        placement.x,
        placement.y,
        placement.width
      )
      const annotationAnchors = new Map<number, TimedAnnotationAnchor>()
      const clef = toVexFlowClef(measure.clef)
      let selectionTarget: SVGRectElement | undefined

      const barlineRepeat = repeatBarlines ? repeatBarlines.get(measure.id) : measure.repeat
      if (barlineRepeat?.start) {
        stave.setBegBarType(BarlineType.REPEAT_BEGIN)
      }

      if (barlineRepeat?.end) {
        stave.setEndBarType(BarlineType.REPEAT_END)
      }

      if (svg) selectionTarget=createMeasureSelectionTarget(svg,{
        measureId:measure.id,placement,selectedMeasureId,onSelectMeasure,onOpenMeasureContextMenu
      })

      const showsClef =
        placement.isSystemStart ||
        !previousMeasure ||
        !sameClef(previousMeasure, measure)
      const showsKeySignature =
        placement.isSystemStart ||
        !previousMeasure ||
        !sameKeySignature(previousMeasure, measure)
      const showsTimeSignature =
        !previousMeasure ||
        !sameTimeSignature(previousMeasure, measure)

      if (showsClef) {
        stave.addClef(clef)
      }

      if (showsKeySignature) {
        stave.addKeySignature(toVexFlowKeySignature(measure.keySignature),keySignatureCancellation(measure.keySignature,previousMeasure?.keySignature)?.keySpec)
      }

      if (showsTimeSignature) {
        stave.addTimeSignature(
          `${measure.timeSignature.beats}/${measure.timeSignature.beatType}`
        )
      }

      stave.setContext(context).draw()
      stave.getSVGElement()?.setAttribute('data-measure-id', measure.id)
      stave.getModifiers().forEach(modifier=>modifier.getSVGElement()?.setAttribute('data-measure-id',measure.id))

      const staffLabel = primaryStaffTarget ? resolvePartLabel(primaryStaffTarget, placement.systemIndex) : undefined
      if (
        svg &&
        primaryStaffTarget &&
        staffLabel &&
        visibleStaffCount > 1 &&
        placement.isSystemStart
      ) {
        drawStaffLabel(
          svg,
          placement.x + 4,
          placement.y + (staffSpacing.labelBaselines[0] ?? -12),
          staffLabel,
          primaryStaffTarget,
          placement.systemIndex
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
              cancelledKeyAccidentals:keySignatureCancellation(measure.keySignature,previousMeasure?.keySignature)?.count,
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

      const volta=systemRepeatMeasures[placementIndex]?.volta
      if (
        volta?.start &&
        hasLaterVoltaEnd(systemRepeatMeasures, placementIndex, volta.number)
      ) {
        activeVolta = {
          number: volta.number
        }
      }

      const displayVolta =
        volta || activeVolta
          ? {
              number: (volta ?? activeVolta)?.number ?? 1,
              start: volta?.start,
              end: volta?.end
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

      if (volta?.end) {
        activeVolta = undefined
      }

      const repeat = systemRepeatMeasures[placementIndex]?.repeat
      if (svg && repeat?.end && repeat.times && repeat.times > 2) {
        drawRepeatTimes(
          svg,
          placement.x + placement.width - 26,
          stave.getYForLine(0) - 8,
          repeat.times
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
            selectedEventAddress,
            !shareMeasure && (minimumMeasureWidths?.get(placement.measure.id)??0)<=placement.width ? lyricWidths : undefined,
            selectedEventAddresses
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
          staffRenderState.voiceKeyByEventId.set(eventId, renderedPart && renderedStaff
            ? JSON.stringify([renderedPart.id,renderedStaff.id,voice.id]) : undefined)
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

          return createNotationTuplet(groupNotes, {
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

      const draw = () => {
        if (sharedMeasures) {
          selectionTarget?.setAttribute('data-note-start-x', String(stave.getNoteStartX()))
          if (placement.isSystemStart) updateStaffSystemBounds(
            staffRenderState.boundsByStaffSystemKey, placement, primaryStaffIndex, placement.y, stave.getNoteStartX())
        }
        if (!shareMeasure) {
          formatNotationVoices(voices.map(({ vexVoice }) => vexVoice), stave)
        }

        if (!shareMeasure) voices.forEach(({ events, notes, scoreTuplets }) => {
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
        const timedAnchors = new Map<number, TimedAnnotationAnchor>()

        voices.forEach(({ beams, events, notes, tuplets, vexVoice, voiceId }) => {
          notes.forEach(paintNotationEventTone)
          vexVoice.draw(context, stave)
          beams.forEach((beam) => drawOwnedBeam(beam, context, measure.id))
          tuplets.forEach((tuplet) => {
            tuplet.setContext(context).draw()
            tuplet.getSVGElement()?.setAttribute('data-print-measure-id', measure.id)
          })

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
                selectedEventAddress,
                selectedEventAddresses
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
                selectedEventAddress,
                selectedEventAddresses
              ) === 'playback'
            )
            svgElement.setAttribute('data-event-id', eventId)
            if(event?.id===eventId)svgElement.setAttribute('data-event-tick',String(event.position.tick))
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
                if (event.key !== 'Enter' || event.isComposing || event.keyCode === 229 || event.altKey || event.ctrlKey || event.metaKey) return
                event.preventDefault()
                event.stopPropagation()
                onSelectEvent(eventId, event.shiftKey, eventAddress)
              })
              svgElement.addEventListener('click', (event) => {
                event.stopPropagation()
                const target = resolveNotePointerOwner(svgElement, event.clientX, event.clientY) ?? { element: svgElement, eventId, address: eventAddress }
                target.element.focus({ preventScroll: true })
                onSelectEvent(target.eventId, event.shiftKey, target.address)
              })
              svgElement.addEventListener('mousedown', (event) => {
                if (event.button !== 0) {
                  return
                }

                event.preventDefault()
                event.stopPropagation()
                const target = resolveNotePointerOwner(svgElement, event.clientX, event.clientY) ?? { element: svgElement, eventId, address: eventAddress }
                target.element.focus({ preventScroll: true })
                setDragAnchor({ address: target.address, eventId: target.eventId })
                onSelectEvent(target.eventId, event.shiftKey, target.address)
              })
              svgElement.addEventListener('mouseenter', (event) => {
                if (event.buttons !== 1) { clearDragAnchor(); return }
                const target = resolveNotePointerOwner(svgElement, event.clientX, event.clientY) ?? { element: svgElement, eventId, address: eventAddress }
                const dragAnchor = continueDrag({ address: target.address, eventId: target.eventId })
                if (!dragAnchor) {
                  return
                }

                if (
                  !dragAnchorMatchesVoiceAddress(dragAnchor, target.address)
                ) {
                  return
                }

                event.preventDefault()
                onSelectEventRange(dragAnchor.eventId, target.eventId, target.address)
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
            svgElement.setAttribute('data-playback-x', String(eventX))
            svgElement.setAttribute('data-playback-y', String(placement.y))

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
            if (event && !(event.type === 'rest' && event.fullMeasure)) recordTimedAnnotationAnchor(timedAnchors, event.position.tick, note.getNoteHeadBeginX(), note.getNoteHeadEndX())

            if (svg && event?.type === 'note' && event.articulations?.length) {
              drawArticulations(
                svg,
                eventX,
                placement.y,
                event.articulations,
                measure.id,
                event.id,
                note
              )
            }

            if (svg && event?.fermata) {
              drawFermata(svg, eventX, placement.y, note)
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
              drawOrnaments(svg, eventX, placement.y, event.ornaments, note)
            }

            if (svg && event?.type === 'note' && event.lyrics?.length) {
              drawLyrics(
                svg,
                eventId,
                eventX,
                placement.y,
                event.lyrics,
                lyricScale,
                onSelectLyric,
                additionalLyricSpacing.get(primaryStaffIndex) ?? 0,
                measure.id
              )
            }

            if (svg && eventId === inlineLyricEditor?.eventId) {
              inlineEditorAnchor = { x: eventX, staffY: placement.y + (additionalLyricSpacing.get(primaryStaffIndex) ?? 0) }
            }
          })
        })

        const rhythmLayout:TimedAnnotationLayout={ anchors:annotationAnchors.size ? new Map([...annotationAnchors,...timedAnchors]) : timedAnchors, startX:stave.getNoteStartX(), endX:stave.getNoteEndX(), durationTicks:measureDurationTicks(measure) }
        drawMeasureAnnotations(
          svg,
          placement,
          measure,
          placement.y,
          annotationMaps,
          annotationLanesByMeasureId,
          firstEventX,
          rhythmLayout,
          stave.getYForLine(0),
          printLayout?undefined:{onSelectRehearsalMark,selectedRehearsalMarkId,onSelectSystemText,selectedSystemTextId,onSelectStaffText,selectedStaffTextId,onSelectExpressionText,selectedExpressionTextId,onSelectHarmony,selectedHarmonyId,onSelectDynamic,selectedDynamicId}
        )
        if(!printLayout&&renderedPart&&renderedStaff)drawNoteInputCursor(svg,inputPosition,renderedPart.id,renderedStaff.id,measure,stave,rhythmLayout)
      }
      if (shareMeasure) sharedMeasures?.set(placementIndex, [{ stave, measure, voices, draw, timedAnnotationAnchors: annotationAnchors,
        lyricWidths: (minimumMeasureWidths?.get(measure.id)??0)<=placement.width ? lyricWidths : undefined,
        harmonyWidths: (minimumMeasureWidths?.get(measure.id)??0)<=placement.width ? harmonyWidths?.get(measure.id) : undefined }])
      if (sharedMeasures) deferredPrimaryDraws.push(draw)
      else draw()
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
            ...(printLayout?{}:{onSelectStaffText,selectedStaffTextId,onSelectExpressionText,selectedExpressionTextId,onSelectHarmony,selectedHarmonyId,onSelectDynamic,selectedDynamicId,inputPosition,onSelectMeasure,onOpenMeasureContextMenu,selectedMeasureId,onMeasureContextTarget:(target:MeasureContextTarget)=>measureContextTargets.push(target)}),
            lyricScale,
            lyricOffset: additionalLyricSpacing.get(target.globalStaffIndex) ?? 0,
            deferDraw: sharedMeasures ? draw => deferredPassiveDraws.push(draw) : undefined,
            harmonyWidths: (minimumMeasureWidths?.get(placement.measure.id)??0)<=placement.width ? harmonyWidths?.get(measure.id) : undefined,
            onSelectLyric,
            inlineLyricEventId: inlineLyricEditor?.eventId,
            onInlineAnchor: anchor => { inlineEditorAnchor = anchor },
            lyricWidths: (minimumMeasureWidths?.get(placement.measure.id)??0)<=placement.width ? lyricWidths : undefined,
            selectedEventAddress,
            selectedEventId,
            selectedEventIdSet,
            selectedEventAddresses,
            playbackEventId,
            playbackEventAddress,
            onSelectEvent,
            onSelectEventRange,
            continueDrag,
            setDragAnchor
          },
          staffRenderState,
          staffSpacing.offsets[target.globalStaffIndex],
          staffSpacing.labelBaselines[target.globalStaffIndex],
          sharedMeasures?.get(measureIndex),
          repeatBarlines
        )
      }
    }

    if (sharedMeasures) {
      for (const group of sharedMeasures.values()) formatSharedRhythm(group)
      // Preserve existing DOM and keyboard order: primary staff, then others.
      deferredPrimaryDraws.forEach(draw => draw())
      deferredPassiveDraws.forEach(draw => draw())
    }
    drawRangeSelectionBands(svg, selectedEventIdSet, staffRenderState)

    collectTiePairs(score).forEach((pair) => {
      const firstNote = staffRenderState.notesByEventId.get(pair.fromEventId)
      const lastNote = staffRenderState.notesByEventId.get(pair.toEventId)

      if (!firstNote || !lastNote) {
        return
      }

      const firstKeys = firstNote.getKeys()
      const lastKeys = lastNote.getKeys()
      // The existing event-level model ties identical whole chords. Keep the
      // legacy primary-only path for unequal/member-specific shapes; this does
      // not introduce a partial-chord tie model.
      // Storage order is not pitch identity. Match each occurrence once so
      // repeated/unison keys cannot reuse the same destination member.
      const remaining = lastKeys.map((key, index) => ({ key, index }))
      const matchedIndexes = firstKeys.map(key => {
        const match = remaining.findIndex(candidate => candidate.key === key)
        return match < 0 ? -1 : remaining.splice(match, 1)[0].index
      })
      const wholeChord = firstKeys.length === lastKeys.length &&
        matchedIndexes.every(index => index >= 0)
      const firstIndexes = wholeChord ? firstKeys.map((_, index) => index) : [0]
      const lastIndexes = wholeChord ? matchedIndexes : [0]

      if (
        staffRenderState.systemsByEventId.get(pair.fromEventId) ===
        staffRenderState.systemsByEventId.get(pair.toEventId)
      ) {
        drawTie(context, firstNote, lastNote, firstIndexes, lastIndexes, staffRenderState.systemsByEventId.get(pair.fromEventId))
      } else {
        drawTie(context, firstNote, null, firstIndexes, firstIndexes, staffRenderState.systemsByEventId.get(pair.fromEventId))
        drawTie(context, null, lastNote, lastIndexes, lastIndexes, staffRenderState.systemsByEventId.get(pair.toEventId))
      }
    })

    const automaticHairpinInk: AutomaticHairpinInk[] = []
    const paintedHairpinObstacles: StaffInk[] = []
    const paintedSlurObstacles: StaffInk[] = []
    const relocatedAutomaticSlurInk: StaffInk[] = []
    const nestedAdjustedSlurInk: StaffInk[] = []
    const relocatedAutomaticHairpinInk: StaffInk[] = []
    const automaticHairpinEnvelopeInk: StaffInk[] = []
    const paintedOctaveInk: StaffInk[] = []
    const correctedTieInk: StaffInk[] = []
    const decoratedNoteInk: StaffInk[] = []
    const octaveNeighborInk: StaffInk[] = []
    let measuredMusicInk: StaffInk[] = []
    const measuredSlurObstacleInk: (StaffInk & {
      collisionOnly?: boolean; eventId?: string; attachmentStem?: boolean
      attachmentInk?: Pick<StaffInk, 'x' | 'y' | 'width' | 'height'>
    })[] = []
    const slurStartSymbolInk: StaffInk[] = []
    if (svg) {
      const manualBounds: DOMRect[] = []
      if (document.fonts && typeof svg.getCTM === 'function') {
        const inkContext = document.createElement('canvas').getContext('2d')
        if (inkContext) measuredMusicInk = readStaffMusicInk(svg, owners, inkContext)
      }
      for(const group of svg.querySelectorAll<SVGElement>('.vf-stavetie[data-modifier-clearance]')){
        const owner=owners.get(group.dataset.measureId??'')
        if(!owner)continue
        for(const node of group.querySelectorAll<SVGPathElement>('path')){
          const ink=readSvgShapeInk(node);if(ink)correctedTieInk.push({...ink,...owner})
        }
      }
      if ((score.octaveShifts?.length || svg.querySelector('.notation-ornament,.notation-fermata,.notation-articulation') || (score.slurs ?? []).some(slur => !hasManualSpanEngraving(slur.engraving))) && document.fonts && typeof svg.getCTM === 'function') {
        const context = document.createElement('canvas').getContext('2d')
        if (context) for (const node of svg.querySelectorAll<SVGTextContentElement>('.vf-clef[data-measure-id] text,.vf-keysignature[data-measure-id] text,.vf-timesignature[data-measure-id] text')) {
          const owner = owners.get(node.closest<SVGElement>('[data-measure-id]')?.dataset.measureId ?? '')
          const ink = readSvgTextInk(node, context)
          if (owner && ink) slurStartSymbolInk.push({ ...ink, ...owner })
        }
        if (context) for (const node of svg.querySelectorAll<SVGTextContentElement>('.notation-fermata[data-fermata-measure-id],.notation-ornament[data-ornament-measure-id]')) {
          const owner = owners.get(node.dataset.fermataMeasureId ?? node.dataset.ornamentMeasureId ?? ''), ink = readSvgTextInk(node, context)
          if (owner && ink) {
            measuredSlurObstacleInk.push({...ink, ...owner})
            decoratedNoteInk.push({...ink, ...owner})
          }
        }
        // Circles are painted shapes, not font boxes or selection targets.
        // Reuse the existing stroke-aware bounds and the same curve clearance.
        for (const node of svg.querySelectorAll<SVGCircleElement>('circle.notation-articulation[data-articulation-measure-id]')) {
          const owner = owners.get(node.dataset.articulationMeasureId ?? ''), ink = readSvgShapeInk(node)
          if (owner && ink) {
            measuredSlurObstacleInk.push({...ink, ...owner})
            decoratedNoteInk.push({...ink, ...owner})
          }
        }
        if (context) for (const node of svg.querySelectorAll<SVGTextContentElement>('text.notation-articulation[data-articulation-measure-id]')) {
          const owner = owners.get(node.dataset.articulationMeasureId ?? ''), ink = readSvgTextInk(node, context)
          if (owner && ink) {
            measuredSlurObstacleInk.push({...ink, ...owner})
            decoratedNoteInk.push({...ink, ...owner})
          }
        }
        if (context) for (const node of svg.querySelectorAll<SVGTextContentElement>('.notation-event .vf-notehead text')) {
          const event = node.closest<SVGElement>('.notation-event')
          const owner = owners.get(event?.dataset.measureId ?? '')
          if (!owner || owner.partId !== event?.dataset.partId || owner.staffId !== event.dataset.staffId) continue
          const ink = readSvgTextInk(node, context)
          if (ink) measuredSlurObstacleInk.push({...ink, ...owner, collisionOnly: true})
        }
        for (const node of svg.querySelectorAll<SVGPathElement>('.notation-event .vf-stem path')) {
          const event = node.closest<SVGElement>('.notation-event')
          const owner = owners.get(event?.dataset.measureId ?? '')
          if (!owner || owner.partId !== event?.dataset.partId || owner.staffId !== event.dataset.staffId) continue
          // Only a drawn stem path is an obstacle. Whole notes and rests can
          // expose virtual stem metrics without painting a stem.
          const ink = readSvgShapeInk(node)
          const eventId = event.dataset.eventId
          const principalStem = eventId ? staffRenderState.notesByEventId.get(eventId)?.getStem()?.getSVGElement() : undefined
          const attachmentStem = Boolean(principalStem?.contains(node))
          // Grace stems remain real obstacles, but are never the host's
          // principal attachment (including beamed or stemless main notes).
          if (ink) measuredSlurObstacleInk.push({...ink, ...owner, collisionOnly: true,
            eventId: attachmentStem ? eventId : undefined, attachmentStem})
        }
        // VexFlow paints beamed stems outside the note group. Keep the same
        // owner and endpoint policy while measuring only their painted paths.
        for (const node of svg.querySelectorAll<SVGPathElement>('.vf-beam[data-measure-id] path')) {
          const group = node.closest<SVGElement>('.vf-beam')
          const owner = owners.get(group?.dataset.measureId ?? '')
          if (!owner) continue
          const ink = readSvgShapeInk(node)
          const eventId = node.closest<SVGElement>('.vf-stem')?.dataset.slurStemEventId
          if (ink) {
            const beams = eventId ? [...group!.querySelectorAll<SVGPathElement>(':scope > path')]
              .flatMap(path => { const bounds = readSvgShapeInk(path); return bounds ? [bounds] : [] }) : []
            measuredSlurObstacleInk.push({...ink, ...owner, collisionOnly: true, eventId,
              attachmentStem: Boolean(eventId),
              attachmentInk: eventId ? resolveSlurBeamStemBounds(ink, beams) : undefined})
          }
        }
      }

      const endpointStem = (eventId: string) => {
        const ink = measuredSlurObstacleInk.find(candidate => candidate.attachmentStem && candidate.eventId === eventId)
        return ink ? { ...ink, ...ink.attachmentInk } : undefined
      }
      const spanDrawContext = (span: { startEventId: string; endEventId: string }) => {
        const start = staffRenderState.pointsByEventId.get(span.startEventId)
        const end = staffRenderState.pointsByEventId.get(span.endEventId)
        const startSystem = staffRenderState.systemsByEventId.get(span.startEventId)
        const endSystem = staffRenderState.systemsByEventId.get(span.endEventId)
        const staffBounds = resolveEventStaffSystemBounds(staffRenderState, span.startEventId)
        return start && end && startSystem !== undefined && endSystem !== undefined && staffBounds
          ? { start, end, startSystem, endSystem, staffBounds } : undefined
      }
      type SpanDrawContext = NonNullable<ReturnType<typeof spanDrawContext>>
      const renderedHairpinOffset = (hairpin: NonNullable<Score['hairpins']>[number],
        { start, end, startSystem, endSystem }: SpanDrawContext) => resolveHairpinStemClearance(resolveHairpinSpanYOffset(
            (hasManualSpanEngraving(hairpin.engraving) ? [start.measureId, end.measureId] : hairpinCoveredMeasureIds(score, hairpin))
              .map(id => id ? (hairpin.engraving?.offsetY !== undefined ? baseAnnotationLanesByMeasureId : annotationLanesByMeasureId).get(id) : undefined)
          ) ?? HAIRPIN_Y_OFFSET, Array.from(staffRenderState.notesByEventId).flatMap(([eventId, note]) => {
            const point = staffRenderState.pointsByEventId.get(eventId)
            const system = staffRenderState.systemsByEventId.get(eventId)
            if (!point || system === undefined || system < startSystem || system > endSystem ||
              staffRenderState.staffIndexByEventId.get(eventId) !== staffRenderState.staffIndexByEventId.get(hairpin.startEventId) ||
              (system === startSystem && point.x < start.x) ||
              (system === endSystem && point.x > end.x) || !note.hasStem()) return []
            const stem = resolveStemGeometry(note, point.y)
            return [Math.max(stem.topY, stem.baseY) - point.y]
          }))

      // Measure authored paths only if an automatic bow can actually switch
      // sides. Reuse that measurement within this render; bind in model order.
      let manualSpanInk: SlurSideObstacle[] | undefined
      const readManualSpanInk = () => {
        if (manualSpanInk) return manualSpanInk
        const measured: SlurSideObstacle[] = []
        const rememberManualInk = (span: { startEventId: string; endEventId: string }, segments: (SVGPathElement | SVGGElement)[], sourceSlurIndex?:number) => {
          measured.push({
            manualSpan:true,
            sourceSlurIndex,
            startStaff: staffRenderState.staffIndexByEventId.get(span.startEventId),
            endStaff: staffRenderState.staffIndexByEventId.get(span.endEventId),
            startSystem: staffRenderState.systemsByEventId.get(span.startEventId),
            endSystem: staffRenderState.systemsByEventId.get(span.endEventId),
            bounds: segments.map(segment => segment.tagName.toLowerCase() === 'path'
              ? readSvgShapeInk(segment) : readHairpinLineInk(segment as SVGGElement))
          })
          segments.forEach(segment => segment.remove())
        }
        ;(score.slurs ?? []).forEach((slur, index) => {
          if (!hasManualSpanEngraving(slur.engraving)) return
          const context = spanDrawContext(slur)
          if (!context) { rememberManualInk(slur, [], index); return }
          const { start, end, startSystem, endSystem, staffBounds } = context
          const side = slur.engraving?.placement ?? resolveSlurSideForAnnotationLanes(resolveSlurSide(start), [
            start.measureId ? annotationLanesByMeasureId.get(start.measureId) : undefined,
            end.measureId ? annotationLanesByMeasureId.get(end.measureId) : undefined
          ])
          rememberManualInk(slur, drawSlurSegments(svg, start, end, startSystem, endSystem, staffBounds,
            index, side, slur.engraving).elements, index)
        })
        for (const hairpin of score.hairpins ?? []) {
          if (!hasManualSpanEngraving(hairpin.engraving)) continue
          const context = spanDrawContext(hairpin)
          if (!context) { rememberManualInk(hairpin, []); continue }
          const { start, end, startSystem, endSystem, staffBounds } = context
          rememberManualInk(hairpin, drawHairpinSegments(svg, start, end, hairpin.type, startSystem, endSystem,
            staffBounds, renderedHairpinOffset(hairpin, context), hairpin.engraving))
        }
        return manualSpanInk = measured
      }
      let lowerTextProtection: { obstacles: SlurSideObstacle[]; unresolved: boolean } | undefined
      const readLowerTextProtection = () => {
        if (lowerTextProtection) return lowerTextProtection
        if (!svg.querySelector('.notation-lyric,.notation-dynamic-mark,.notation-expression-text')) {
          return lowerTextProtection = { obstacles: [], unresolved: false }
        }
        if (document.fonts && typeof svg.getCTM === 'function') {
          const context = document.createElement('canvas').getContext('2d')
          if (context) {
            const lyrics = readOwnedLyricInk(svg, owners, context)
            const text = readOwnedMeasureTextInk(svg, owners, context, '.notation-dynamic-mark,.notation-expression-text')
            const obstacle = (bounds: StaffInk, horizontalTextLane?: true): SlurSideObstacle => ({
              startStaff: bounds.staffIndex, endStaff: bounds.staffIndex,
              startSystem: bounds.systemIndex, endSystem: bounds.systemIndex,
              horizontalTextLane, bounds: [bounds]
            })
            return lowerTextProtection = { unresolved: lyrics.unresolved || text.unresolved,
              obstacles: [...lyrics.ink.map(bounds => obstacle(bounds)), ...text.ink.map(bounds => obstacle(bounds, true))] }
          }
        }
        return lowerTextProtection = { obstacles: [], unresolved: true }
      }
      const slurs = score.slurs ?? [], slurContexts = slurs.map(spanDrawContext)
      const nestingEntries = slurs.map((slur,index) => {
        const context = slurContexts[index], startStaff = staffRenderState.staffIndexByEventId.get(slur.startEventId)
        const voice = staffRenderState.voiceKeyByEventId.get(slur.startEventId)
        return { index,automatic:!hasManualSpanEngraving(slur.engraving),
          voiceKey:voice === staffRenderState.voiceKeyByEventId.get(slur.endEventId) ? voice : undefined,
          staffIndex:startStaff === staffRenderState.staffIndexByEventId.get(slur.endEventId) ? startStaff : undefined,
          systemIndex:context?.startSystem === context?.endSystem ? context?.startSystem : undefined,
          startX:context?.start.x,endX:context?.end.x }
      })
      const nesting = planSlurNesting(nestingEntries)
      const neededInnerInk = new Set([...nesting.innerByIndex.values()].flat())
      const innerInk = new Map<number,{side:'above'|'below';ink:StaffInk[]}>()
      const drawnSlurs = new Map<number,SVGElement[]>()
      for (const slurIndex of nesting.order) {
        const slur = slurs[slurIndex], context = slurContexts[slurIndex]
        if (!context) continue
        const { start, end, startSystem, endSystem, staffBounds } = context

        const slurSide = resolveSlurSideForAnnotationLanes(resolveSlurSide(start), [
          start.measureId
            ? annotationLanesByMeasureId.get(start.measureId)
            : undefined,
          end.measureId ? annotationLanesByMeasureId.get(end.measureId) : undefined
        ])

        const draw = (side: 'above' | 'below', nestedInk: readonly StaffInk[] = []) => drawSlurSegments(
          svg,
          start,
          end,
          startSystem,
          endSystem,
          staffBounds,
          slurIndex,
          side,
          slur.engraving,
          [...measuredSlurObstacleInk.filter(ink =>
            ink.staffIndex === owners.get(start.measureId ?? '')?.staffIndex &&
            // This solver protects interior ink; endpoint stem attachment is
            // separate from bow clearance and must retain its existing policy.
            ink.eventId !== slur.startEventId && ink.eventId !== slur.endEventId), ...nestedInk],
          {
            start: endpointStem(slur.startEventId),
            end: endpointStem(slur.endEventId)
          },
          slurStartSymbolInk.filter(ink => ink.staffIndex === owners.get(start.measureId ?? '')?.staffIndex)
        )
        const preferredSide = slur.engraving?.placement ?? slurSide
        let chosenSide = preferredSide
        let chosen = draw(preferredSide)
        // Preserve clear bows, authored geometry and existing lower-text lanes.
        // A single-system automatic bow may choose the other side only after
        // measured ink required extra curvature. This is not a height cap.
        const canCompareSides = startSystem === endSystem &&
          !hasManualSpanEngraving(slur.engraving) && chosen.clearance > 0
        let relocated = false
        if (canCompareSides) {
          const lowerText = readLowerTextProtection()
          const opposite = draw(preferredSide === 'above' ? 'below' : 'above')
          if (opposite.clearance < chosen.clearance && !lowerText.unresolved && !protectedInkBlocksSlurSide(
            staffRenderState.staffIndexByEventId.get(slur.startEventId),
            opposite.elements.map(readSvgShapeInk), [...readManualSpanInk().map(ink=>({...ink,
              scopedManualSlur:ink.sourceSlurIndex!==undefined&&(
                strictlyContainsSlur(nestingEntries[slurIndex],nestingEntries[ink.sourceSlurIndex])||
                strictlyContainsSlur(nestingEntries[ink.sourceSlurIndex],nestingEntries[slurIndex])||
                (slur.startEventId!==slur.endEventId&&
                  slur.startEventId===slurs[ink.sourceSlurIndex].startEventId&&
                  slur.endEventId===slurs[ink.sourceSlurIndex].endEventId))})), ...lowerText.obstacles], startSystem)) {
            chosen.elements.forEach(element => element.remove())
            chosen = opposite
            chosenSide = preferredSide === 'above' ? 'below' : 'above'
            relocated = true
          } else opposite.elements.forEach(element => element.remove())
        }
        // Keep the existing side decision. Only then clear painted inner bows
        // on that side; a whole empty bow bbox would inflate clear controls.
        const nestedInk = (nesting.innerByIndex.get(slurIndex) ?? []).flatMap(index => {
          const inner = innerInk.get(index)
          return inner?.side === chosenSide ? inner.ink : []
        })
        let nestedAdjusted = false
        if (nestedInk.length) {
          const spaced = draw(chosenSide,nestedInk)
          nestedAdjusted = spaced.elements.some((element,index) =>
            element.getAttribute('d') !== chosen.elements[index]?.getAttribute('d'))
          chosen.elements.forEach(element => element.remove())
          chosen = spaced
        }
        const segments = chosen.elements, innerPaint: StaffInk[] = [], targets: SVGElement[] = []
        for (const segment of segments) {
          if (hasManualSpanEngraving(slur.engraving)) manualBounds.push(segment.getBBox())
          bindSpanSelection(segment, { kind: 'slur', id: slur.id }, selectedSpan, onSelectSpan)
          targets.push(segment.closest<SVGElement>('.notation-span-target') ?? segment)
          const owner = start.measureId ? owners.get(start.measureId) : undefined
          const systemIndex = Number(segment.dataset.systemIndex), ink = readSvgShapeInk(segment)
          if (owner && Number.isInteger(systemIndex) && ink) {
            const painted = { ...owner, ...ink, systemIndex }
            paintedSlurObstacles.push(painted)
            if ((relocated || nestedAdjusted) && segment.dataset.annotationLane === 'lower-slur') relocatedAutomaticSlurInk.push(painted)
            if (nestedAdjusted) nestedAdjustedSlurInk.push(painted)
            if (neededInnerInk.has(slurIndex)) innerPaint.push(...readSlurCurveInk(segment).map(bounds => ({...owner,...bounds,systemIndex})))
          }
        }
        drawnSlurs.set(slurIndex,targets)
        if (neededInnerInk.has(slurIndex)) innerInk.set(slurIndex,{side:chosenSide,ink:innerPaint})
      }
      // Geometry dependencies must not reorder model, painting or keyboard targets.
      slurs.forEach((_,index) => drawnSlurs.get(index)?.forEach(target => svg.append(target)))

      for (const hairpin of score.hairpins ?? []) {
        const context = spanDrawContext(hairpin)
        if (!context) continue
        const { start, end, startSystem, endSystem, staffBounds } = context
        let hairpinYOffset = renderedHairpinOffset(hairpin, context)
        let relocatedHairpin = false
        let segments = drawHairpinSegments(
          svg,
          start,
          end,
          hairpin.type,
          startSystem,
          endSystem,
          staffBounds,
          hairpinYOffset,
          hairpin.engraving
        )
        if (relocatedAutomaticSlurInk.length && !hasManualSpanEngraving(hairpin.engraving)) {
          const staffIndex = owners.get(start.measureId ?? '')?.staffIndex
          let deficit = 0
          for (const segment of segments) {
            const ink = readHairpinLineInk(segment)
            if (!ink) continue
            for (const slurInk of relocatedAutomaticSlurInk) {
              if (slurInk.staffIndex !== staffIndex || slurInk.systemIndex !== Number(segment.dataset.systemIndex) ||
                Math.min(ink.x + ink.width, slurInk.x + slurInk.width) <= Math.max(ink.x, slurInk.x)) continue
              deficit = Math.max(deficit, slurInk.y + slurInk.height + 8 - ink.y)
            }
          }
          if (deficit > 0.05) {
            segments.forEach(segment => segment.remove())
            hairpinYOffset += Math.ceil(deficit * 100) / 100 + 0.01
            relocatedHairpin = true
            segments = drawHairpinSegments(svg, start, end, hairpin.type, startSystem, endSystem, staffBounds, hairpinYOffset, hairpin.engraving)
          }
        }
        {
          const owner = start.measureId ? owners.get(start.measureId) : undefined
          const plannedOffsetY = resolveHairpinSpanYOffset(hairpinCoveredMeasureIds(score, hairpin).map(id => annotationLanesByMeasureId.get(id))) ?? HAIRPIN_Y_OFFSET
          if (owner) for (const segment of segments) {
            const ink = readHairpinLineInk(segment)
            if (!ink) continue
            const { x, y, width, height } = ink
            const finalOffset = (hairpin.engraving?.placement === 'above' ? -34 : hairpinYOffset) + (hairpin.engraving?.offsetY ?? 0) * 10
            const system = [...staffBounds].find(([,bounds]) => Math.abs(bounds.y + finalOffset - (y + height / 2)) < 0.05)?.[0]
            if (system !== undefined) {
              const painted = { ...owner, systemIndex: system, x, y, width, height }
              paintedHairpinObstacles.push(painted)
              if (!hasManualSpanEngraving(hairpin.engraving)) automaticHairpinEnvelopeInk.push(painted)
              if (relocatedHairpin) relocatedAutomaticHairpinInk.push(painted)
              if (!hasManualSpanEngraving(hairpin.engraving) && hairpinCoveredMeasureIds(score, hairpin).length > 1) automaticHairpinInk.push({ ...painted, id: hairpin.id, offsetY: hairpinYOffset, plannedOffsetY })
            }
          }
        }
        for (const segment of segments) {
          if (hasManualSpanEngraving(hairpin.engraving)) manualBounds.push(segment.getBBox())
          bindSpanSelection(segment, { kind: 'hairpin', id: hairpin.id }, selectedSpan, onSelectSpan)
        }
      }

      if (manualBounds.length) {
        const viewport = resolveSpanViewport(effectiveRenderWidth, layout.height, manualBounds)
        renderer.resize(viewport.width, viewport.height)
        svg.setAttribute('viewBox', `${viewport.x} ${viewport.y} ${viewport.width} ${viewport.height}`)
      }

      const octaveContext = score.octaveShifts?.length ? document.createElement('canvas').getContext('2d') : null
      const octaveObstacles = [...measuredMusicInk, ...measuredSlurObstacleInk, ...slurStartSymbolInk, ...paintedSlurObstacles, ...paintedHairpinObstacles]
      if (octaveContext) for (const node of svg.querySelectorAll<SVGTextContentElement>(
        '.notation-harmony-mark,.notation-staff-text,.notation-system-text,.notation-expression-text,.notation-dynamic-mark,.notation-tempo-marking--positioned,.notation-lyric')) {
        const event = node.dataset.eventId ? staffRenderState.pointsByEventId.get(node.dataset.eventId) : undefined
        const owner = owners.get(node.dataset.measureId ?? event?.measureId ?? ''), ink = readSvgTextInk(node, octaveContext)
        if (owner && ink) octaveObstacles.push({ ...owner, ...ink })
      }
      if (octaveContext && score.octaveShifts?.length) {
        octaveNeighborInk.push(...octaveObstacles)
        for (const node of svg.querySelectorAll<SVGGraphicsElement>('.vf-stave[data-measure-id] path,.vf-stave[data-measure-id] line,.vf-stave[data-measure-id] text,.notation-staff-label')) {
          const measure = node.closest<SVGElement>('.vf-stave')?.dataset.measureId
          const owner = measure ? owners.get(measure) : [...owners.values()].find(owner => owner && owner.partId === node.dataset.partId && owner.staffId === node.dataset.staffId && owner.systemIndex === Number(node.dataset.systemIndex))
          const ink = node.tagName.toLowerCase() === 'text' ? readSvgTextInk(node as SVGTextContentElement, octaveContext) : readSvgShapeInk(node)
          if (owner && ink) octaveNeighborInk.push({ ...owner, ...ink })
        }
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

        const octaveSegments = drawOctaveShiftSegments(
          svg,
          start,
          end,
          octaveShift.type,
          startSystem,
          endSystem,
          staffBounds,
          { context: octaveContext, staffIndex: staffRenderState.staffIndexByEventId.get(octaveShift.startEventId), obstacles: octaveObstacles }
        )
        if (octaveContext) for (const group of octaveSegments) for (const node of group.children) {
          const ink = node.tagName.toLowerCase() === 'text' ? readSvgTextInk(node as SVGTextContentElement, octaveContext) : readSvgShapeInk(node as SVGGraphicsElement)
          if (ink) paintedOctaveInk.push({ ...ink, staffIndex: Number(group.dataset.staffIndex), systemIndex: Number(group.dataset.systemIndex) })
        }
      }
    }

    const cleanup = () => {
      window.removeEventListener('mouseup', clearDragAnchor)
      window.removeEventListener('blur', clearDragAnchor)
      window.removeEventListener('keydown', cancelDragAnchor)
      window.removeEventListener('focusin', leaveDragContext, true)
      container.removeEventListener('contextmenu', openMeasureContextMenuAtPointer, true)
      container.removeEventListener('mouseup', openMeasureContextMenuFromSecondaryMouse, true)
    }
    if (svg) {
      applyTempoStaffAnchors(svg, owners)
      // A later system's upper text must not detach the current part name from
      // its staff. Keep the global reservation unless final painted ink permits
      // the current-system candidate; authored music/spans never move here.
      if (renderedStaffTargets.length > 1 && staffSpacing.measured) {
        const indicesBySystem = new Map<number, number[]>()
        layout.placements.forEach((placement, index) => {
          const indices = indicesBySystem.get(placement.systemIndex) ?? []
          indices.push(index); indicesBySystem.set(placement.systemIndex, indices)
        })
        const shiftsBySystem = new Map<number, readonly number[]>(), proposed = new Map<SVGTextElement, number>()
        for (const label of svg.querySelectorAll<SVGTextElement>('.notation-staff-label')) {
          const system = Number(label.dataset.systemIndex), indices = indicesBySystem.get(system)
          const target = renderedStaffTargets.find(target => target.partId === label.dataset.partId && target.staffId === label.dataset.staffId)
          if (!target || !indices || !Number.isInteger(system)) continue
          let shifts = shiftsBySystem.get(system)
          if (!shifts) {
            shifts = localStaffLabelShifts(annotationScore, indices, annotationLanesByMeasureId, measureAnnotationInk,
              staffSpacing, lyricScale, additionalLyricSpacing)
            shiftsBySystem.set(system, shifts)
          }
          proposed.set(label, shifts[target.globalStaffIndex] ?? 0)
        }
        applyStaffLabelShifts(svg, proposed)
      }
      const nextHairpins = resolveHairpinInkMinimums(measuredMusicInk, automaticHairpinInk, additionalHairpinMinimums)
      let baseNextStaff = renderedStaffTargets.length > 1 ? measureStaffInkSpacing(svg,owners,additionalStaffSpacing,[...paintedSlurObstacles,...decoratedNoteInk,...relocatedAutomaticHairpinInk]) : additionalStaffSpacing
      const correctedSpanInk = [...correctedTieInk,...nestedAdjustedSlurInk]
      if(correctedSpanInk.length&&renderedStaffTargets.length>1){
        const neighborInk=[...measuredMusicInk]
        for(const node of svg.querySelectorAll<SVGGraphicsElement>('.vf-stave[data-measure-id] path,.vf-stave[data-measure-id] line')){
          const owner=owners.get(node.closest<SVGElement>('[data-measure-id]')?.dataset.measureId??''),ink=readSvgShapeInk(node)
          if(owner&&ink)neighborInk.push({...ink,...owner})
        }
        const corrections=[resolveStaffInkSpacing(neighborInk,correctedSpanInk,additionalStaffSpacing),
          resolveStaffInkSpacing(correctedSpanInk,neighborInk,additionalStaffSpacing)]
        const combined=new Map(baseNextStaff)
        for(const gaps of corrections)for(const [key,value]of gaps)combined.set(key,Math.max(combined.get(key)??0,value))
        if([...combined].some(([key,value])=>value!==(baseNextStaff.get(key)??0)))baseNextStaff=combined
      }
      const octaveNextStaff = resolveOctaveStaffSpacing(paintedOctaveInk, octaveNeighborInk, additionalStaffSpacing)
      let nextStaff = baseNextStaff
      if (octaveNextStaff !== additionalStaffSpacing) {
        const combined = new Map(baseNextStaff)
        for (const [key,value] of octaveNextStaff) combined.set(key,Math.max(combined.get(key) ?? 0,value))
        nextStaff = combined
      }
      const nextLyrics = measureLyricInkSpacing(svg, owners, additionalLyricSpacing)
      // Anticipate the same pending lyric correction before adding a dynamic
      // offset,so simultaneous low-note deficits do not reserve the gap twice.
      const anticipatedLanes=nextLyrics===additionalLyricSpacing?annotationLanesByMeasureId
        :createMeasureAnnotationLaneMap(annotationScore,annotationMaps,lyricScale,nextLyrics,additionalDynamicSpacing)
      const anticipatedDynamicShift=new Map([...annotationMaps.dynamicsByMeasureId.keys()].map(id=>[id,
        Math.max(0,(anticipatedLanes.get(id)?.dynamicMarkYOffset??0)-(annotationLanesByMeasureId.get(id)?.dynamicMarkYOffset??0))]))
      const nextDynamics=measureDynamicInkSpacing(svg,owners,additionalDynamicSpacing,anticipatedDynamicShift)
      // Wait for pending lyric/dynamic/hairpin plans before measuring expression
      // corrections; otherwise their next baseline shift would be reserved twice.
      const expressionPlanPending = nextLyrics !== additionalLyricSpacing || nextDynamics !== additionalDynamicSpacing || nextHairpins !== additionalHairpinMinimums
      const nextExpressions = !expressionPlanPending
        ? measureExpressionInkOffsets(svg, owners, [...measuredMusicInk, ...paintedHairpinObstacles], additionalExpressionOffsets)
        : additionalExpressionOffsets
      const measureSystems = new Map([...owners].map(([id,owner])=>[id,owner?.systemIndex]))
      const next = layout.systemCount > 1 && score.harmonies?.length
        ? measureSystemInkSpacing(svg, measureSystems, additionalSystemSpacing) : additionalSystemSpacing
      const nextHeader = printLayout
        ? measurePrintHeaderInset(svg, container.closest('.studio-pdf-snapshot,.studio-image-snapshot')?.querySelector<HTMLElement>('.score-title') ?? null, firstSystemOffset)
        : firstSystemOffset
      const musicFrames = new Map<number,SystemMusicFrame>()
      const systemMeasures = new Map<number,Measure[]>()
      for (const placement of layout.placements) {
        const group=systemMeasures.get(placement.systemIndex) ?? []
        group.push(placement.measure);systemMeasures.set(placement.systemIndex,group)
      }
      for (const placement of layout.placements) if (!musicFrames.has(placement.systemIndex)) {
        const space=systemVerticalSpace(systemMeasures.get(placement.systemIndex)!,lyricScale,{systemHeight})
        musicFrames.set(placement.systemIndex,{y:placement.y,reservedHeight:systemHeight+space.below,pitchBelow:space.noteBelow})
      }
      const nextMusicMinimum=resolveSystemMusicMinimum([...measuredMusicInk,...paintedOctaveInk,...correctedTieInk,...relocatedAutomaticSlurInk,...nestedAdjustedSlurInk,...automaticHairpinEnvelopeInk],musicFrames,additionalSystemMusicMinimum)
      const repeatLayout = pass < 2 && (next !== additionalSystemSpacing || nextStaff !== additionalStaffSpacing || nextHeader !== firstSystemOffset || nextLyrics !== additionalLyricSpacing || nextDynamics !== additionalDynamicSpacing || nextHairpins !== additionalHairpinMinimums || nextMusicMinimum !== additionalSystemMusicMinimum)
      const repeatExpressions = pass < 3 && nextExpressions !== additionalExpressionOffsets
      const repeatMusic=pass<4 && nextMusicMinimum!==additionalSystemMusicMinimum
      if (repeatLayout || repeatExpressions || repeatMusic) {
        cleanup()
        // An optional final text pass must not advance already-bounded header
        // or other layout corrections merely because expression work was added.
        return pass < 2
          ? paint(next, pass + 1, nextStaff, nextHeader, nextLyrics,nextDynamics,nextHairpins,nextExpressions,nextMusicMinimum,measuredPrintLayout,printPagePass)
          : paint(additionalSystemSpacing, pass + 1, additionalStaffSpacing, firstSystemOffset, additionalLyricSpacing,additionalDynamicSpacing,additionalHairpinMinimums,pass<3?nextExpressions:additionalExpressionOffsets,nextMusicMinimum,measuredPrintLayout,printPagePass)
      }
      if (printLayout && printLayoutPlan) {
        const snapshot=container.closest('.studio-pdf-snapshot,.studio-image-snapshot')
        const host=snapshot?.querySelector<HTMLElement>('.score-page')
        if (host) {
          const pageBreakIds=new Set(score.layout?.pageBreakBeforeMeasureIds??[])
          const breaks=new Set(layout.placements.filter(p=>p.isSystemStart&&pageBreakIds.has(p.measure.id)).map(p=>p.systemIndex))
          const result=measurePrintPageLayout(svg,host,snapshot?.querySelector<HTMLElement>('.score-title')??null,
            new Map([...musicFrames].map(([i,f])=>[i,f.y])),measureSystems,breaks,printLayoutPlan.pageSetup,measuredPrintLayout)
          if (printPagePass<2 && result.layout!==measuredPrintLayout) {
            cleanup()
            return paint(additionalSystemSpacing,pass,additionalStaffSpacing,firstSystemOffset,additionalLyricSpacing,
              additionalDynamicSpacing,additionalHairpinMinimums,additionalExpressionOffsets,additionalSystemMusicMinimum,result.layout,printPagePass+1)
          }
          svg.setAttribute('data-print-page-passes',String(printPagePass))
          svg.setAttribute('data-print-page-unknown',String(result.unknown))
          svg.setAttribute('data-print-page-unresolved',String(result.layout!==measuredPrintLayout))
          svg.setAttribute('data-print-system-origins',JSON.stringify([...musicFrames].map(([i,f])=>[i,f.y])))
          svg.setAttribute('data-print-measure-systems',JSON.stringify([...measureSystems]))
        }
      }
      svg.setAttribute('data-system-music-minimum',String(additionalSystemMusicMinimum))
      svg.setAttribute('data-system-music-unresolved',String(nextMusicMinimum!==additionalSystemMusicMinimum))
      svg.setAttribute('data-system-ink-passes', String(pass + 1))
      svg.setAttribute('data-system-ink-unresolved', String(next !== additionalSystemSpacing))
      svg.setAttribute('data-staff-ink-unresolved', String(nextStaff !== additionalStaffSpacing))
      svg.setAttribute('data-print-header-offset', String(firstSystemOffset))
      svg.setAttribute('data-print-header-unresolved', String(nextHeader !== firstSystemOffset))
      svg.setAttribute('data-lyric-ink-unresolved', String(nextLyrics !== additionalLyricSpacing))
      svg.setAttribute('data-lyric-offsets', JSON.stringify([...additionalLyricSpacing]))
      svg.setAttribute('data-dynamic-ink-unresolved', String(nextDynamics !== additionalDynamicSpacing))
      svg.setAttribute('data-dynamic-offsets', JSON.stringify([...additionalDynamicSpacing]))
      svg.setAttribute('data-hairpin-ink-unresolved', String(nextHairpins !== additionalHairpinMinimums))
      svg.setAttribute('data-hairpin-minimum-offsets', JSON.stringify([...additionalHairpinMinimums]))
      svg.setAttribute('data-expression-ink-unresolved', String(expressionPlanPending || nextExpressions !== additionalExpressionOffsets))
      svg.setAttribute('data-expression-offsets', JSON.stringify([...additionalExpressionOffsets]))
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

    // Editing UI paints above notation. Defer its creation rather than moving a
    // focused input, which could cause a blur/commit while restoring an IME draft.
    if (svg && inlineLyricEditor && inlineEditorAnchor) {
      const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject')
      foreignObject.classList.add('notation-lyric-editor')
      const host = document.createElement('div')
      foreignObject.append(host)
      svg.append(foreignObject)
      setInlinePortal({ host, foreignObject, x: inlineEditorAnchor.x + 4,
        y: inlineEditorAnchor.staffY + 116 + (inlineLyricEditor.number - 1) * 16,
        editor: inlineLyricEditor, restore: inlineRestore })
    } else setInlinePortal(undefined)

    // SVG redraw must not drop a keyboard user's logical target or scroll anchor.
    if (!printLayout && focusBox) {
      const focusAddress = selectedEventAddresses?.get(selectedEventId ?? '') ?? selectedEventAddress
      // History can restore a marking after the old SVG target was deleted.
      // Follow changed logical selection only;unchanged selection must not steal
      // a Tab user's separately focused note or an Inspector/IME field.
      const changedMark=markSelectionChanged&&selectedMark
        ?[...container.querySelectorAll<SVGElement>(selectedMark.selector)].find(node=>node.getAttribute(selectedMark.attribute)===selectedMark.id):undefined
      const selectedEvent=leavingMarkSelection&&selectedEventId
        ?[...container.querySelectorAll<SVGElement>('.notation-event')].find(node=>node.dataset.eventId===selectedEventId&&(!focusAddress||
          node.dataset.partId===focusAddress.partId&&node.dataset.staffId===focusAddress.staffId&&node.dataset.measureId===focusAddress.measureId&&node.dataset.voiceId===focusAddress.voiceId)):undefined
      const changedSelection=leavingMarkSelection?(selectedSpan
        ?[...container.querySelectorAll<SVGElement>('.notation-span-target')].find(node=>node.dataset.spanId===selectedSpan.id&&node.dataset.spanKind===selectedSpan.kind)
        :selectedEvent??[...container.querySelectorAll<SVGElement>('.notation-measure')].find(node=>node.dataset.measureId===selectedMeasureId)):undefined
      const target = changedMark??changedSelection??(focusedDynamicId
        ?[...container.querySelectorAll<SVGElement>('.notation-dynamic-target')].find(node=>node.dataset.dynamicId===focusedDynamicId)
        :focusedHarmonyId
        ?[...container.querySelectorAll<SVGElement>('.notation-harmony-target')].find(node=>node.dataset.harmonyId===focusedHarmonyId)
        :focusedExpressionTextId
        ?[...container.querySelectorAll<SVGElement>('.notation-expression-text-target')].find(node=>node.dataset.expressionTextId===focusedExpressionTextId)
        :focusedStaffTextId
        ?[...container.querySelectorAll<SVGElement>('.notation-staff-text-target')].find(node=>node.dataset.staffTextId===focusedStaffTextId)
        :focusedSystemTextId
        ?[...container.querySelectorAll<SVGElement>('.notation-system-text-target')].find(node=>node.dataset.systemTextId===focusedSystemTextId)
        :focusedRehearsalId
        ?[...container.querySelectorAll<SVGElement>('.notation-rehearsal-mark')].find(node=>node.dataset.rehearsalId===focusedRehearsalId)
        :selectedSpan
        ? [...container.querySelectorAll<SVGElement>('.notation-span-target')].find(node =>
          node.dataset.spanId === selectedSpan.id && node.dataset.spanKind === selectedSpan.kind)
        : [...container.querySelectorAll<SVGElement>('.notation-event')].find(node =>
          node.dataset.eventId === (selectedEventId ?? focusedEventId) && (!focusAddress ||
            node.dataset.partId === focusAddress.partId && node.dataset.staffId === focusAddress.staffId &&
            node.dataset.measureId === focusAddress.measureId && node.dataset.voiceId === focusAddress.voiceId)))
      const canvas = container.closest<HTMLElement>('.score-canvas')
      // Starting a tuplet replaces the focused source rest with readonly preview
      // glyphs. Keep native input on the real canvas instead of dropping to body.
      const preview = !target && focusedEventId
        ? [...container.querySelectorAll<SVGElement>('.notation-event.is-preview')].find(node =>
          ['part-id','staff-id','measure-id','voice-id'].every(key =>
            node.getAttribute(`data-${key}`) === previousFocus?.getAttribute(`data-${key}`)))
        : undefined
      // Measure hit rectangles are pointer-only. Keep keyboard commands on the
      // real score region when returning from a marking to an empty measure.
      const focusTarget = target?.matches('.notation-measure') ? canvas : target ?? (preview ? canvas : undefined)
      const anchor = target ?? preview
      if (focusTarget && anchor) {
        const automatic = !scoreChanged && isSameNotationFocus(previousFocus, focusTarget)
        restoreNotationFocus(focusTarget, anchor, focusBox, canvas,
          !automatic || (shouldRestoreFocusViewport?.() ?? true), automatic)
      }
    }

    return cleanup
    }
    return paint(new Map(), 0)
  }, [
    draftLayoutRevision,
    fontLayoutRevision,
    lyricWidths,
    harmonyWidths,
    minimumMeasureWidths,
    onSelectSpan,
    onSelectRehearsalMark,
    selectedRehearsalMarkId,
    onSelectSystemText,
    selectedSystemTextId,
    onSelectStaffText,
    selectedStaffTextId,
    onSelectDynamic,
    selectedDynamicId,
    onSelectHarmony,
    selectedHarmonyId,
    onSelectExpressionText,
    selectedExpressionTextId,
    inputPosition,
    shouldRestoreFocusViewport,
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
    selectedEventAddresses,
    selectedEventId,
    selectedEventIds,
    selectedMeasureId,
    interactionOwner,
    rangeDrag
  ])

  return <><div className="notation-preview" ref={containerRef} />{inlinePortal ? createPortal(
    <StudioInlineLyricInput editor={inlinePortal.editor} restore={inlinePortal.restore}
      foreignObject={inlinePortal.foreignObject} x={inlinePortal.x} y={inlinePortal.y} theme={inlineEditorTheme} />,
    inlinePortal.host
  ) : null}</>
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
      partAbbreviation: part.abbreviation,
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

function createMeasureAnnotationMaps(score: Score, printLayout = false): MeasureAnnotationMaps {
  const annotationMaps: MeasureAnnotationMaps = {
    dynamicsByMeasureId: indexMeasureDynamics(score.dynamics),
    expressionTextsByMeasureId: new Map(),
    harmoniesByMeasureId: new Map(),
    rehearsalMarksByMeasureId: new Map(),
    staffTextsByMeasureId: new Map(),
    systemTextsByMeasureId: new Map(),
    tempoEventsByMeasureId: new Map()
  }

  for (const mark of score.rehearsalMarks ?? []) {
    annotationMaps.rehearsalMarksByMeasureId.set(mark.measureId, [
      ...(annotationMaps.rehearsalMarksByMeasureId.get(mark.measureId) ?? []),
      mark
    ])
  }

  for (const harmony of score.harmonies ?? []) {
    annotationMaps.harmoniesByMeasureId.set(harmony.measureId, [
      ...(annotationMaps.harmoniesByMeasureId.get(harmony.measureId) ?? []),
      harmony
    ])
  }

  for (const text of score.staffTexts ?? []) {
    annotationMaps.staffTextsByMeasureId.set(text.measureId,[
      ...(annotationMaps.staffTextsByMeasureId.get(text.measureId)??[]),text
    ])
  }

  for (const tempoEvent of score.tempoEvents ?? []) {
    if (printLayout && tempoEvent.transparent) continue
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
  lyricScale: number,
  lyricOffsets: ReadonlyMap<number, number> = new Map(),
  dynamicOffsets: ReadonlyMap<number,number> = new Map(),
  includeAutomaticInteriors = true
): Map<string, MeasureAnnotationLanes> {
  const hairpinMeasureIds = collectHairpinMeasureIds(score, includeAutomaticInteriors)
  const lanesByMeasureId = new Map<string, MeasureAnnotationLanes>()
  let staffIndex = 0

  for (const part of score.parts) {
    for (const staff of part.staves) {
      const dynamicExtraSpacing=dynamicOffsets.get(staffIndex)??0
      const lyricExtraSpacing = lyricOffsets.get(staffIndex++) ?? 0
      for (const measure of staff.measures) {
        lanesByMeasureId.set(
          measure.id,
          resolveMeasureAnnotationLanes({
            expressionTextCount:
              annotationMaps.expressionTextsByMeasureId.get(measure.id)?.length,
            harmonyCount:
              annotationMaps.harmoniesByMeasureId.get(measure.id)?.length,
            harmonyTicks:
              annotationMaps.harmoniesByMeasureId.get(measure.id)?.map(harmony => harmony.tick),
            hasDynamic: annotationMaps.dynamicsByMeasureId.has(measure.id),
            dynamicExtraSpacing,
            hasHairpin: hairpinMeasureIds.has(measure.id),
            rehearsalMarkCount:
              annotationMaps.rehearsalMarksByMeasureId.get(measure.id)?.length,
            staffTextCount: annotationMaps.staffTextsByMeasureId.get(measure.id)?.length,
            lyricLineCount: countMeasureLyricLines(measure),
            lyricScale,
            lyricExtraSpacing,
            systemTextCount:
              annotationMaps.systemTextsByMeasureId.get(measure.id)?.length,
            tempoCount: annotationMaps.tempoEventsByMeasureId.get(measure.id)?.length
          })
        )
      }
    }
  }

  return lanesByMeasureId
}

function collectHairpinMeasureIds(score: Score, includeAutomaticInteriors: boolean): Set<string> {
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
    (score.hairpins ?? []).flatMap((hairpin) => includeAutomaticInteriors && !hasManualSpanEngraving(hairpin.engraving)
      ? hairpinCoveredMeasureIds(score, hairpin)
      : [hairpin.startEventId, hairpin.endEventId]
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

/** Screen UI only: the exact next-input address is independent of selection. */
function drawNoteInputCursor(
  svg:SVGSVGElement|null,position:NotationPreviewProps['inputPosition'],
  partId:string,staffId:string,measure:Measure,stave:Stave,layout:TimedAnnotationLayout
):void {
  if(!svg||!position)return
  const {address,tick}=position
  if(address.partId!==partId||address.staffId!==staffId||address.measureId!==measure.id||
    !measure.voices.some(voice=>voice.id===address.voiceId)||!Number.isFinite(tick)||tick<0||tick>layout.durationTicks)return
  const x=resolveTimedAnnotationX(tick,layout)-6,top=stave.getYForLine(0)-5,bottom=stave.getYForLine(4)+5
  const group=document.createElementNS('http://www.w3.org/2000/svg','g')
  group.classList.add('notation-note-input-cursor');group.setAttribute('aria-hidden','true')
  for(const [key,value]of Object.entries({...address,tick}))group.setAttribute('data-'+key.replace(/[A-Z]/g,letter=>'-'+letter.toLowerCase()),String(value))
  const line=document.createElementNS('http://www.w3.org/2000/svg','line')
  line.setAttribute('x1',String(x));line.setAttribute('x2',String(x));line.setAttribute('y1',String(top));line.setAttribute('y2',String(bottom))
  const tip=document.createElementNS('http://www.w3.org/2000/svg','path')
  tip.setAttribute('d',`M ${x-4} ${top-6} L ${x+4} ${top-6} L ${x} ${top} Z`)
  group.append(line,tip);svg.append(group)
}

function drawMeasureAnnotations(
  svg: SVGSVGElement | null,
  placement: MeasurePlacement,
  measure: Measure,
  staffY: number,
  annotationMaps: MeasureAnnotationMaps,
  annotationLanesByMeasureId: Map<string, MeasureAnnotationLanes>,
  firstEventX: number | undefined,
  rhythmLayout: TimedAnnotationLayout,
  staffTopY: number,
  interaction:MeasureTextInteraction={}
): void {
  if (!svg) {
    return
  }

  const {onSelectRehearsalMark,selectedRehearsalMarkId,onSelectSystemText,selectedSystemTextId,onSelectStaffText,selectedStaffTextId,onSelectExpressionText,selectedExpressionTextId,onSelectHarmony,selectedHarmonyId,onSelectDynamic,selectedDynamicId}=interaction

  const lanes =
    annotationLanesByMeasureId.get(measure.id) ??
    resolveMeasureAnnotationLanes({
      lyricLineCount: countMeasureLyricLines(measure)
    })
  for (const [index,rehearsalMark] of (annotationMaps.rehearsalMarksByMeasureId.get(measure.id) ?? []).entries()) {
    drawRehearsalMark(
      svg,
      placement.x + 14,
      staffY + (lanes.rehearsalMarkYOffsets?.[index] ?? lanes.rehearsalMarkYOffset ?? REHEARSAL_MARK_Y_OFFSET),
      rehearsalMark.text,
      onSelectRehearsalMark?()=>onSelectRehearsalMark({id:rehearsalMark.id,measureId:measure.id}):undefined,
      {id:rehearsalMark.id,selected:rehearsalMark.id===selectedRehearsalMarkId,measureId:measure.id}
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
      onSelectSystemText?()=>onSelectSystemText({id:systemText.id,measureId:measure.id}):undefined,
      {id:systemText.id,selected:systemText.id===selectedSystemTextId}
    )
  }

  for (const [index,staffText] of (annotationMaps.staffTextsByMeasureId.get(measure.id)??[]).entries()) {
    drawStaffText(
      svg,
      placement.x + 14,
      staffY + (lanes.staffTextYOffsets?.[index] ?? lanes.staffTextYOffset ?? STAFF_TEXT_Y_OFFSET),
      staffText.text,
      measure.id,
      onSelectStaffText?()=>onSelectStaffText({id:staffText.id,measureId:measure.id}):undefined,
      {id:staffText.id,selected:staffText.id===selectedStaffTextId}
    )
  }

  const dynamic = annotationMaps.dynamicsByMeasureId.get(measure.id)

  if (dynamic) {
    drawDynamicMark(
      svg,
      (firstEventX ?? placement.x + 88) - 2,
      staffY + (lanes.dynamicMarkYOffset ?? DYNAMIC_MARK_Y_OFFSET),
      dynamic.value,
      measure.id,
      onSelectDynamic?()=>onSelectDynamic({id:dynamic.id,measureId:measure.id,edit:false}):undefined,
      {id:dynamic.id,selected:dynamic.id===selectedDynamicId},
      onSelectDynamic?()=>onSelectDynamic({id:dynamic.id,measureId:measure.id,edit:true}):undefined
    )
  }

  for (const [index, tempoEvent] of (annotationMaps.tempoEventsByMeasureId.get(measure.id) ?? []).entries()) {
    drawPositionedTempoMarking(
      svg,
      resolveTimedAnnotationX(tempoEvent.tick, rhythmLayout),
      staffY + (lanes.tempoYOffsets[index] ?? -42),
      tempoEvent,
      measure.id,
      staffTopY - staffY
    )
  }

  for (const [index, harmony] of (
    annotationMaps.harmoniesByMeasureId.get(measure.id) ?? []
  ).entries()) {
    drawHarmonyMark(
      svg,
      resolveTimedAnnotationX(harmony.tick, rhythmLayout, 'center'),
      staffY + (lanes.harmonyMarkYOffsets[index] ?? HARMONY_MARK_Y_OFFSET),
      harmony.text,
      measure.id,
      placement.systemIndex,
      onSelectHarmony?()=>onSelectHarmony({id:harmony.id,measureId:measure.id,tick:harmony.tick,edit:false}):undefined,
      {id:harmony.id,selected:harmony.id===selectedHarmonyId},
      onSelectHarmony?()=>onSelectHarmony({id:harmony.id,measureId:measure.id,tick:harmony.tick,edit:true}):undefined
    )
  }

  for (const [index, expressionText] of (
    annotationMaps.expressionTextsByMeasureId.get(measure.id) ?? []
  ).entries()) {
    drawExpressionText(
      svg,
      resolveTimedAnnotationX(expressionText.tick, rhythmLayout),
      staffY + (lanes.expressionTextYOffsets[index] ?? EXPRESSION_TEXT_Y_OFFSET),
      expressionText.text,
      measure.id,
      onSelectExpressionText?()=>onSelectExpressionText({id:expressionText.id,measureId:measure.id,tick:expressionText.tick}):undefined,
      {id:expressionText.id,selected:expressionText.id===selectedExpressionTextId}
    )
  }
}

export function createMeasureSelectionTarget(svg:SVGSVGElement,{
  measureId,placement,selectedMeasureId,onSelectMeasure,onOpenMeasureContextMenu
}:{measureId:string;placement:Pick<MeasurePlacement,'x'|'width'|'systemIndex'>;selectedMeasureId?:string;
  onSelectMeasure:NotationPreviewProps['onSelectMeasure'];onOpenMeasureContextMenu:NotationPreviewProps['onOpenMeasureContextMenu']}):SVGRectElement {
  const target=document.createElementNS('http://www.w3.org/2000/svg','rect')
  target.classList.add('notation-measure')
  target.classList.toggle('is-selected',measureId===selectedMeasureId)
  target.setAttribute('data-measure-id',measureId)
  target.setAttribute('data-system-index',String(placement.systemIndex))
  target.setAttribute('x',String(placement.x));target.setAttribute('width',String(placement.width));target.setAttribute('rx','4')
  target.addEventListener('click',()=>onSelectMeasure(measureId))
  target.addEventListener('contextmenu',event=>{event.preventDefault();event.stopPropagation();onOpenMeasureContextMenu(measureId,{x:event.clientX,y:event.clientY})})
  // These pointer-only backgrounds must stay behind every staff's notes,
  // including primary notes drawn before a later passive staff is created.
  let layer=svg.querySelector<SVGGElement>(':scope > .notation-measure-layer')
  if(!layer){
    layer=document.createElementNS('http://www.w3.org/2000/svg','g')
    layer.classList.add('notation-measure-layer')
    svg.insertBefore(layer,svg.firstChild)
  }
  layer.append(target);return target
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
  renderState: RenderedStaffState,
  staffOffset = target.globalStaffIndex * STACKED_STAFF_Y_OFFSET,
  staffLabelBaseline = -12,
  sharedGroup?: (SharedStaffLayout & { draw: () => void })[],
  repeatBarlines?: ReadonlyMap<string, Measure['repeat']>
): void {
  const y = placement.y + staffOffset
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
    !previousMeasure ||
    !sameTimeSignature(previousMeasure, measure)

  const repeat = repeatBarlines ? repeatBarlines.get(measure.id) : measure.repeat
  if (repeat?.start) {
    stave.setBegBarType(BarlineType.REPEAT_BEGIN)
  }

  if (repeat?.end) {
    stave.setEndBarType(BarlineType.REPEAT_END)
  }

  if (showsClef) {
    stave.addClef(toVexFlowClef(measure.clef))
  }

  if (showsKeySignature) {
    stave.addKeySignature(toVexFlowKeySignature(measure.keySignature),keySignatureCancellation(measure.keySignature,previousMeasure?.keySignature)?.keySpec)
  }

  if (showsTimeSignature) {
    stave.addTimeSignature(
      `${measure.timeSignature.beats}/${measure.timeSignature.beatType}`
    )
  }

  const selectionTarget=svg&&interaction.onSelectMeasure&&interaction.onOpenMeasureContextMenu
    ?createMeasureSelectionTarget(svg,{measureId:measure.id,placement,selectedMeasureId:interaction.selectedMeasureId,
      onSelectMeasure:interaction.onSelectMeasure,onOpenMeasureContextMenu:interaction.onOpenMeasureContextMenu})
    :undefined
  stave.setContext(context).draw()
      stave.getSVGElement()?.setAttribute('data-measure-id', measure.id)
  const measureTarget=resolveMeasureStaffTarget(measure.id,placement.x,placement.width,stave)
  selectionTarget?.setAttribute('y',String(measureTarget.y1))
  selectionTarget?.setAttribute('height',String(measureTarget.y2-measureTarget.y1))
  interaction.onMeasureContextTarget?.(measureTarget)
  stave.getModifiers().forEach(modifier=>modifier.getSVGElement()?.setAttribute('data-measure-id',measure.id))
  updateStaffSystemBounds(
    renderState.boundsByStaffSystemKey,
    placement,
    target.globalStaffIndex,
    y
  )

  const staffLabel = resolvePartLabel(target, placement.systemIndex)
  if (svg && placement.isSystemStart && staffLabel) {
    drawStaffLabel(
      svg,
      placement.x + 4,
      y + staffLabelBaseline,
      staffLabel,
      target,
      placement.systemIndex
    )
  }

  const defaultNoteStartX = stave.getNoteStartX()

  if (showsClef || showsKeySignature || showsTimeSignature) {
    stave.setNoteStartX(
      defaultNoteStartX +
        leadingNotationPadding(measure, {
          showsClef,
          showsKeySignature,
          cancelledKeyAccidentals:keySignatureCancellation(measure.keySignature,previousMeasure?.keySignature)?.count,
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

  const annotationAnchors = new Map<number, TimedAnnotationAnchor>()
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
        interaction.selectedEventAddress,
        sharedGroup ? undefined : interaction.lyricWidths,
        interaction.selectedEventAddresses
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

      return createNotationTuplet(groupNotes, {
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

  const draw = () => {
    if (sharedGroup && placement.isSystemStart) updateStaffSystemBounds(
      renderState.boundsByStaffSystemKey, placement, target.globalStaffIndex, y, stave.getNoteStartX())
    if (!sharedGroup) {
      formatNotationVoices(voices.map(({ vexVoice }) => vexVoice), stave)
    }
    if (!sharedGroup) voices.forEach(({ events, notes, scoreTuplets }) => {
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
    const timedAnchors = new Map<number, TimedAnnotationAnchor>()

    voices.forEach(({ beams, events, notes, tuplets, vexVoice, voiceId }) => {
      notes.forEach(paintNotationEventTone)
      vexVoice.draw(context, stave)
      beams.forEach((beam) => drawOwnedBeam(beam, context, measure.id))
      tuplets.forEach((tuplet) => {
            tuplet.setContext(context).draw()
            tuplet.getSVGElement()?.setAttribute('data-print-measure-id', measure.id)
          })

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
            interaction.selectedEventAddress,
            interaction.selectedEventAddresses
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
            interaction.selectedEventAddress,
            interaction.selectedEventAddresses
          ) === 'playback'
        )
        svgElement.setAttribute('data-event-id', event.id)
        svgElement.setAttribute('data-event-tick', String(event.position.tick))
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
        renderState.voiceKeyByEventId.set(event.id,JSON.stringify([target.partId,target.staffId,voiceId]))

        const centeredRestShift =
          event.type === 'rest' && event.fullMeasure
            ? centerFullMeasureRest(svgElement, {
                x: defaultNoteStartX,
                width: stave.getNoteEndX() - defaultNoteStartX
              })
            : 0
        const eventX = getVisibleNoteX(note) + centeredRestShift
        svgElement.setAttribute('data-playback-x', String(eventX))
        svgElement.setAttribute('data-playback-y', String(y))

        renderState.pointsByEventId.set(event.id, {
          measureId: measure.id,
          x: eventX,
          y,
          ...resolveSlurAnchorMetrics(note)
        })
        firstEventX = Math.min(firstEventX ?? eventX, eventX)
        if (event && !(event.type === 'rest' && event.fullMeasure)) recordTimedAnnotationAnchor(timedAnchors, event.position.tick, note.getNoteHeadBeginX(), note.getNoteHeadEndX())
        if (svg && event.type === 'note' && event.articulations?.length) {
          drawArticulations(svg, eventX, y, event.articulations, measure.id, event.id, note)
        }
        if (svg && event.fermata) drawFermata(svg, eventX, y, note)
        if (svg && event.type === 'note' && event.ornaments?.length) drawOrnaments(svg, eventX, y, event.ornaments, note)
        if (svg && event.type === 'note' && event.lyrics?.length) {
          drawLyrics(svg, event.id, eventX, y, event.lyrics, interaction.lyricScale, interaction.onSelectLyric, interaction.lyricOffset ?? 0, measure.id)
        }
        if (event.id === interaction.inlineLyricEventId) interaction.onInlineAnchor({ x: eventX, staffY: y + (interaction.lyricOffset ?? 0) })

        if (isPreviewEventId(event.id)) {
          return
        }

        svgElement.setAttribute('role', 'button')
        svgElement.setAttribute('tabindex', '0')
        svgElement.addEventListener('keydown', keyEvent => {
          if (keyEvent.key !== 'Enter' || keyEvent.isComposing || keyEvent.keyCode === 229 || keyEvent.altKey || keyEvent.ctrlKey || keyEvent.metaKey) return
          keyEvent.preventDefault()
          keyEvent.stopPropagation()
          interaction.onSelectEvent(event.id, keyEvent.shiftKey, eventAddress)
        })
        svgElement.addEventListener('click', (mouseEvent) => {
          mouseEvent.stopPropagation()
          const target = resolveNotePointerOwner(svgElement, mouseEvent.clientX, mouseEvent.clientY) ?? { element: svgElement, eventId: event.id, address: eventAddress }
          target.element.focus({ preventScroll: true })
          interaction.onSelectEvent(target.eventId, mouseEvent.shiftKey, target.address)
        })
        svgElement.addEventListener('mousedown', (mouseEvent) => {
          if (mouseEvent.button !== 0) {
            return
          }

          mouseEvent.preventDefault()
          mouseEvent.stopPropagation()
          const target = resolveNotePointerOwner(svgElement, mouseEvent.clientX, mouseEvent.clientY) ?? { element: svgElement, eventId: event.id, address: eventAddress }
          target.element.focus({ preventScroll: true })
          interaction.setDragAnchor({ address: target.address, eventId: target.eventId })
          interaction.onSelectEvent(target.eventId, mouseEvent.shiftKey, target.address)
        })
        svgElement.addEventListener('mouseenter', (mouseEvent) => {
          if (mouseEvent.buttons !== 1) { interaction.setDragAnchor(undefined); return }
          const target = resolveNotePointerOwner(svgElement, mouseEvent.clientX, mouseEvent.clientY) ?? { element: svgElement, eventId: event.id, address: eventAddress }
          const dragAnchor = interaction.continueDrag({ address: target.address, eventId: target.eventId })

          if (!dragAnchor) {
            return
          }

          if (!dragAnchorMatchesVoiceAddress(dragAnchor, target.address)) {
            return
          }

          mouseEvent.preventDefault()
          interaction.onSelectEventRange(
            dragAnchor.eventId,
            target.eventId,
            target.address
          )
        })
      })
    })

    const rhythmLayout:TimedAnnotationLayout={ anchors:annotationAnchors.size ? new Map([...annotationAnchors,...timedAnchors]) : timedAnchors, startX:stave.getNoteStartX(), endX:stave.getNoteEndX(), durationTicks:measureDurationTicks(measure) }
    drawMeasureAnnotations(
      svg,
      placement,
      measure,
      y,
      annotationMaps,
      annotationLanesByMeasureId,
      firstEventX,
      rhythmLayout,
      stave.getYForLine(0),
      interaction
    )
    drawNoteInputCursor(svg,interaction.inputPosition,target.partId,target.staffId,measure,stave,rhythmLayout)
  }
  if (sharedGroup) sharedGroup.push({ stave, measure, voices, draw, timedAnnotationAnchors: annotationAnchors, lyricWidths: interaction.lyricWidths, harmonyWidths: interaction.harmonyWidths })
  if (interaction.deferDraw) interaction.deferDraw(draw)
  else draw()
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
  // Direct text editing owns its context even when its UI overlaps a staff hit area.
  return target instanceof Element && Boolean(target.closest('.notation-event, .notation-lyric-editor'))
}

function drawTempoMarking(svg: SVGSVGElement, tempo: TempoMarking, headerOffset = 0): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-tempo-marking')
  text.setAttribute('data-print-global', 'true')
  if (tempo.transparent) {
    text.classList.add('notation-tempo-marking--transparent')
  }
  text.setAttribute('x', '32')
  text.setAttribute('y', String(36 + headerOffset))
  text.textContent = formatTempoMarking(tempo)
  svg.append(text)
}

function drawPositionedTempoMarking(
  svg: SVGSVGElement,
  x: number,
  y: number,
  tempo: TempoMarking,
  measureId?: string,
  staffDelta?: number
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
  if (staffDelta !== undefined) text.dataset.tempoStaffDelta = String(staffDelta)
  text.setAttribute('x', String(x))
  text.setAttribute('y', String(y))
  text.textContent = formatTempoMarking(tempo)
  svg.append(text)
}

function drawRhythmFeelMarking(
  svg: SVGSVGElement,
  rhythmFeel: RhythmFeelMarking,
  hasTempo: boolean,
  headerOffset = 0
): void {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  const x = hasTempo ? 126 : 32

  group.classList.add('notation-rhythm-feel-marking')
  group.setAttribute('data-print-global', 'true')
  group.setAttribute('transform', `translate(${x} ${36 + headerOffset})`)
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
  label: string,
  onSelect?:()=>void,
  reference?:{id:string;selected:boolean;measureId?:string}
): void {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  if (reference?.measureId) group.setAttribute('data-print-measure-id', reference.measureId)
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  const width = Math.max(24, label.length * 10 + 14)

  group.classList.add('notation-rehearsal-mark')
  group.setAttribute('data-annotation-lane', 'upper-rehearsal')
  rect.setAttribute('x', String(x))
  rect.setAttribute('y', String(y))
  rect.setAttribute('width', String(width))
  rect.setAttribute('height', '24')
  rect.setAttribute('rx', '3')
  text.setAttribute('x', String(x + width / 2))
  text.setAttribute('y', String(y + 17))
  text.textContent = label
  group.append(rect, text)
  if(onSelect){
    group.setAttribute('role','button');group.setAttribute('tabindex','0')
    if(reference)group.setAttribute('data-rehearsal-id',reference.id)
    group.classList.toggle('is-selected',Boolean(reference?.selected))
    group.setAttribute('aria-pressed',String(Boolean(reference?.selected)))
    group.setAttribute('aria-label',`연습표 ${label} 속성 열기`)
    group.addEventListener('click',event=>{event.stopPropagation();onSelect()})
    group.addEventListener('keydown',event=>{
      if(event.isComposing||event.keyCode===229||event.key==='Process'){event.stopPropagation();return}
      if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();onSelect()}
    })
  }
  svg.append(group)
}

function drawStaffText(
  svg: SVGSVGElement,
  x: number,
  y: number,
  label: string,
  measureId?: string,
  onSelect?:()=>void,
  reference?:{id:string;selected:boolean}
): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-staff-text')
  text.setAttribute('data-annotation-lane', 'upper-staff-text')
  if (measureId) {
    text.setAttribute('data-measure-id', measureId)
  }
  text.setAttribute('x', String(x))
  text.setAttribute('y', String(y))
  text.textContent = label
  drawInteractiveMeasureText(svg,text,'staff-text','보표 글자',onSelect,reference)
}

function drawStaffLabel(
  svg: SVGSVGElement,
  x: number,
  y: number,
  label: string,
  target: RenderedStaffTarget,
  systemIndex: number
): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-staff-label')
  text.setAttribute('data-part-id', target.partId)
  text.setAttribute('data-staff-id', target.staffId)
  text.setAttribute('data-system-index', String(systemIndex))
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
  measureId?: string,
  onSelect?:()=>void,
  reference?:{id:string;selected:boolean}
): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-system-text')
  text.setAttribute('data-annotation-lane', 'upper-system-text')
  if (measureId) {
    text.setAttribute('data-measure-id', measureId)
  }
  text.setAttribute('x', String(x))
  text.setAttribute('y', String(y))
  text.textContent = label
  drawInteractiveMeasureText(svg,text,'system-text','시스템 텍스트',onSelect,reference)
}

// Screen-only interaction follows measured ink. Print keeps the original text.
function drawInteractiveMeasureText(
  svg:SVGSVGElement,text:SVGTextElement,kind:'system-text'|'staff-text'|'expression-text'|'harmony'|'dynamic',label:string,
  onSelect?:()=>void,reference?:{id:string;selected:boolean},onEdit?:()=>void
):void {
  if(!onSelect){svg.append(text);return}
  const target=document.createElementNS('http://www.w3.org/2000/svg','g')
  target.classList.add(`notation-${kind}-target`)
  target.classList.toggle('is-selected',Boolean(reference?.selected))
  target.setAttribute('role','button');target.setAttribute('tabindex','0')
  target.setAttribute('aria-label',`${label} ${text.textContent} 속성 열기`)
  target.setAttribute('aria-pressed',String(Boolean(reference?.selected)))
  if(reference)target.setAttribute(`data-${kind}-id`,reference.id)
  target.append(text);svg.append(target)
  const context=document.createElement('canvas').getContext('2d')
  const ink=context?readSvgTextInk(text,context):undefined
  if(ink){
    const hit=document.createElementNS('http://www.w3.org/2000/svg','rect')
    hit.classList.add(`notation-${kind}-hit`);hit.setAttribute('aria-hidden','true')
    hit.setAttribute('x',String(ink.x));hit.setAttribute('y',String(ink.y))
    hit.setAttribute('width',String(ink.width));hit.setAttribute('height',String(ink.height))
    hit.setAttribute('fill','transparent');hit.setAttribute('stroke','none');hit.setAttribute('stroke-width','0')
    target.append(hit)
  }
  target.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();if(onEdit)target.focus({preventScroll:true});onSelect()})
  if(onEdit)target.addEventListener('dblclick',event=>{event.preventDefault();event.stopPropagation();onEdit()})
  target.addEventListener('keydown',event=>{
    if(event.isComposing||event.keyCode===229||event.key==='Process'){event.stopPropagation();return}
    if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();(event.key==='Enter'&&onEdit?onEdit:onSelect)()}
  })
}

function drawExpressionText(
  svg: SVGSVGElement,
  x: number,
  y: number,
  label: string,
  measureId?: string,
  onSelect?:()=>void,
  reference?:{id:string;selected:boolean}
): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-expression-text')
  text.setAttribute('data-annotation-lane', 'lower-expression-text')
  if (measureId) {
    text.setAttribute('data-measure-id', measureId)
  }
  text.setAttribute('x', String(x))
  text.setAttribute('y', String(y))
  text.textContent = label
  drawInteractiveMeasureText(svg,text,'expression-text','표현 텍스트',onSelect,reference)
}

function drawHarmonyMark(
  svg: SVGSVGElement,
  x: number,
  y: number,
  label: string,
  measureId?: string,
  systemIndex?: number,
  onSelect?:()=>void,reference?:{id:string;selected:boolean},onEdit?:()=>void
): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-harmony-mark')
  if (systemIndex !== undefined) text.dataset.systemIndex = String(systemIndex)
  text.setAttribute('data-annotation-lane', 'upper-chord-symbol')
  if (measureId) {
    text.setAttribute('data-measure-id', measureId)
  }
  text.setAttribute('x', String(x))
  text.setAttribute('y', String(y))
  text.textContent = label
  svg.append(text)
  // Chords are centered on their tick; the first/last tick may otherwise put
  // real glyph ink outside the SVG (and silently clip the PDF). Move only this
  // automatic label, keeping notes, font metrics and the source harmony intact.
  const ink = text.getBBox()
  const width = Number(svg.getAttribute('width'))
  if (width > 0 && ink.width > 0) {
    const shift = ink.x < 4 ? 4 - ink.x : Math.min(0, width - 4 - ink.x - ink.width)
    if (shift !== 0) text.setAttribute('x', String(x + shift))
  }
  // Measure the interaction surface after the existing automatic ink clamp.
  if(onSelect)drawInteractiveMeasureText(svg,text,'harmony','코드 심벌',onSelect,reference,onEdit)
}

function drawDynamicMark(
  svg: SVGSVGElement,
  x: number,
  y: number,
  label: string,
  measureId: string,
  onSelect?:()=>void,reference?:{id:string;selected:boolean},onEdit?:()=>void
): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-dynamic-mark')
  text.setAttribute('data-annotation-lane', 'lower-dynamics')
  text.setAttribute('data-measure-id', measureId)
  text.setAttribute('x', String(x))
  text.setAttribute('y', String(y))
  text.textContent = label
  drawInteractiveMeasureText(svg,text,'dynamic','셈여림',onSelect,reference,onEdit)
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

/** Read the painted lines, excluding the later transparent selection target. */
function readHairpinLineInk(segment: SVGGElement): { x: number; y: number; width: number; height: number } | undefined {
  const pieces = [...segment.querySelectorAll<SVGGraphicsElement>('line')]
    .map(readSvgShapeInk).filter((ink): ink is NonNullable<typeof ink> => Boolean(ink))
  if (!pieces.length) return undefined
  const x = Math.min(...pieces.map(ink => ink.x)), y = Math.min(...pieces.map(ink => ink.y))
  return { x, y, width: Math.max(...pieces.map(ink => ink.x + ink.width)) - x,
    height: Math.max(...pieces.map(ink => ink.y + ink.height)) - y }
}

function drawHairpinSegments(
  svg: SVGSVGElement,
  start: CursorPoint,
  end: CursorPoint,
  type: string,
  startSystem: number,
  endSystem: number,
  boundsBySystemIndex: Map<number, SystemBounds>,
  yOffset = HAIRPIN_Y_OFFSET,
  engraving?: SpanEngraving
): SVGGElement[] {
  const elements: SVGGElement[] = []
  for (const segment of resolveHairpinSegments(
    start,
    end,
    startSystem,
    endSystem,
    boundsBySystemIndex
  )) {
    const element = drawHairpinSegment(
      svg,
      segment.x1 + (engraving?.offsetX ?? 0) * 10,
      segment.x2 + (engraving?.offsetX ?? 0) * 10,
      segment.staffY,
      type,
      segment.isFirst,
      segment.isLast,
      (engraving?.placement === 'above' ? -34 : yOffset) + (engraving?.offsetY ?? 0) * 10,
      engraving?.height
    )
    element.setAttribute('data-system-index', String(segment.systemIndex))
    elements.push(element)
  }
  return elements
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
  boundsBySystemIndex: Map<number, SystemBounds>,
  placement: { context: CanvasRenderingContext2D | null; staffIndex: number | undefined; obstacles: readonly StaffInk[] }
): SVGGElement[] {
  const groups: SVGGElement[] = []
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
    const y = bounds.y + (type.endsWith('b') ? 92 : -30)

    const group = drawOctaveShiftSegment(svg, x1, x2, y, type, isFirst, isLast)
    groups.push(group)
    group.dataset.systemIndex = String(systemIndex)
    if (placement.staffIndex !== undefined) group.dataset.staffIndex = String(placement.staffIndex)
    if (placement.context && placement.staffIndex !== undefined) {
      const pieces = [...group.children].flatMap(node => {
        const ink = node.tagName.toLowerCase() === 'text'
          ? readSvgTextInk(node as SVGTextContentElement, placement.context!) : readSvgShapeInk(node as SVGGraphicsElement)
        return ink ? [{ ...ink, staffIndex: placement.staffIndex!, systemIndex }] : []
      })
      const shift = resolveOctaveInkShift(pieces, placement.obstacles, type.endsWith('b'))
      if (shift) group.setAttribute('transform', `translate(0 ${shift})`)
      group.dataset.octaveInkShift = String(shift)
    }
  }
  return groups
}

function drawOctaveShiftSegment(
  svg: SVGSVGElement,
  x1: number,
  x2: number,
  y: number,
  label: string,
  isFirst: boolean,
  isLast: boolean
): SVGGElement {
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
    end.setAttribute('y2', String(y + (label.endsWith('b') ? -10 : 10)))
    group.append(end)
  }

  svg.append(group)
  return group
}

function drawSlurSegments(
  svg: SVGSVGElement,
  start: CursorPoint,
  end: CursorPoint,
  startSystem: number,
  endSystem: number,
  boundsBySystemIndex: Map<number, SystemBounds>,
  slurIndex: number,
  side: 'above' | 'below',
  engraving?: SpanEngraving,
  fermataInk: readonly (StaffInk & { collisionOnly?: boolean })[] = [],
  endpointStems: { start?: StaffInk; end?: StaffInk } = {},
  startingSymbols: readonly StaffInk[] = []
): { elements: SVGPathElement[]; clearance: number } {
  const elements: SVGPathElement[] = []
  let clearance = 0
  const firstSystem = Math.min(startSystem, endSystem)
  const lastSystem = Math.max(startSystem, endSystem)
  const attachment = resolveSlurStemAttachment({
    startY: resolveSlurEndpointY(start, side), endY: resolveSlurEndpointY(end, side), side,
    startStem: endpointStems.start, endStem: endpointStems.end,
    startStemDirection: start.stemDirection, endStemDirection: end.stemDirection,
    manual: hasManualSpanEngraving(engraving)
  })
  const changedStemAttachment = attachment.startY !== resolveSlurEndpointY(start, side) ||
    attachment.endY !== resolveSlurEndpointY(end, side)

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
    const startY = attachment.startY
    const endY = attachment.endY
    const continuationY = resolveSlurContinuationY(bounds, side)
    const y1 = isFirst ? startY : isLast ? endY : continuationY
    const y2 = isLast ? endY : isFirst ? startY : continuationY

    if (x2 <= x1 + 8) {
      continue
    }

    const segment = drawSlurSegment(svg,
      x1 + (engraving?.offsetX ?? 0) * 10, x2 + (engraving?.offsetX ?? 0) * 10,
      y1 + (engraving?.offsetY ?? 0) * 10, y2 + (engraving?.offsetY ?? 0) * 10,
      side, slurIndex, isFirst, isLast, engraving?.height,
      hasManualSpanEngraving(engraving) ? [] : fermataInk.filter(ink => ink.systemIndex === systemIndex),
      hasManualSpanEngraving(engraving)
        ? [] : startingSymbols.filter(ink => ink.systemIndex === systemIndex),
      !changedStemAttachment)
    segment.path.dataset.systemIndex = String(systemIndex)
    elements.push(segment.path)
    clearance = Math.max(clearance, segment.clearance)
  }
  return { elements, clearance }
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
  fermataInk: readonly (StaffInk & { collisionOnly?: boolean })[] = [],
  startingSymbols: readonly StaffInk[] = [],
  preferHorizontalStart = false
): { path: SVGPathElement; clearance: number } {
  let clearance = 0
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  const offset = (slurIndex % 3) * 6
  const span = Math.abs(x2 - x1)
  const curveDepth = height === undefined ? Math.min(22, Math.max(10, span * 0.09)) + offset : height * 10
  const controlX = (x1 + x2) / 2
  const controlY =
    side === 'above'
      ? Math.min(y1, y2) - curveDepth
      : Math.max(y1, y2) + curveDepth
  const startX = isFirst ? x1 : x1 - 8
  const endX = isLast ? x2 : x2 + 8

  path.classList.add('notation-slur')
  path.setAttribute(
    'data-annotation-lane',
    side === 'above' ? 'upper-slur' : 'lower-slur'
  )
  path.setAttribute(
    'd',
    `M ${startX} ${y1} Q ${controlX} ${controlY} ${endX} ${y2}`
  )
  svg.append(path)
  if (fermataInk.length || (!isFirst && startingSymbols.length)) {
    const base = {x1:startX,x2:endX,controlX,y1,y2,controlY,side,strokeWidth:parseFloat(getComputedStyle(path).strokeWidth)||0}
    const startAdjusted = !isFirst ? resolveSlurContinuationStartCurve(base, startingSymbols, preferHorizontalStart) : base
    const adjusted = resolveSlurFermataCurve(startAdjusted, fermataInk, !isFirst, !isLast)
    clearance = Math.max(Math.abs(adjusted.controlY - controlY), Math.abs(adjusted.y1 - y1), Math.abs(adjusted.y2 - y2))
    if (adjusted.x1 !== startX || adjusted.controlX !== controlX || adjusted.controlY !== controlY || adjusted.y1 !== y1 || adjusted.y2 !== y2) path.setAttribute('d', `M ${adjusted.x1} ${adjusted.y1} Q ${adjusted.controlX} ${adjusted.controlY} ${endX} ${adjusted.y2}`)
  }
  const centerline = path.getAttribute('d') ?? ''
  const thickness = parseFloat(getComputedStyle(path).strokeWidth) || 1.6
  const outline = taperedSlurPath(centerline, thickness, {taperStart:isFirst,taperEnd:isLast})
  if (outline) {
    path.dataset.slurCenterline = centerline
    path.dataset.slurThickness = String(thickness)
    path.setAttribute('d', outline)
  }
  return { path, clearance }
}

function bindSpanSelection(
  element: SVGElement,
  reference: { kind: 'slur' | 'hairpin'; id: string },
  selected: NotationPreviewProps['selectedSpan'],
  onSelect: NotationPreviewProps['onSelectSpan']
): void {
  if (!onSelect) return
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  group.classList.add('notation-span-target')
  group.classList.toggle('is-selected', selected?.kind === reference.kind && selected.id === reference.id)
  group.setAttribute('data-span-id', reference.id)
  group.setAttribute('data-span-kind', reference.kind)
  group.setAttribute('role', 'button')
  group.setAttribute('tabindex', '0')
  group.setAttribute('aria-label', `${reference.kind === 'slur' ? '슬러' : '헤어핀'} ${reference.id} 선택`)
  group.setAttribute('aria-pressed', String(selected?.kind === reference.kind && selected.id === reference.id))
  const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  hit.setAttribute('d', element.getAttribute('data-slur-centerline') ?? element.getAttribute('d') ?? [...element.querySelectorAll('line')].map(line =>
    `M ${line.getAttribute('x1')} ${line.getAttribute('y1')} L ${line.getAttribute('x2')} ${line.getAttribute('y2')}`).join(' '))
  hit.classList.add('notation-span-hit')
  element.parentNode?.insertBefore(group, element)
  group.append(element, hit)
  group.addEventListener('click', event => {
    event.stopPropagation()
    const painted = event.detail > 0
      ? resolveSpanPointerOwner(group, event.clientX, event.clientY) : undefined
    onSelect(painted ?? reference)
  })
  group.addEventListener('keydown', event => {
    if(event.isComposing||event.keyCode===229||event.key==='Process'){event.stopPropagation();return}
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
  articulations: string[],
  measureId: string,
  eventId: string,
  note: StaveNote
): void {
  const glyphs: {kind:string;node:SVGGraphicsElement}[] = []
  articulations.forEach((articulation, index) => {
    const y = staffY - 12 - index * 12

    if (articulation === 'staccato') {
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle')

      dot.classList.add('notation-articulation')
      dot.dataset.articulationMeasureId = measureId
      dot.dataset.articulationEventId = eventId
      dot.setAttribute('cx', String(x + 4))
      dot.setAttribute('cy', String(y))
      dot.setAttribute('r', '2.6')
      svg.append(dot)
      glyphs.push({kind:articulation,node:dot})
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
      text.dataset.articulationMeasureId = measureId
      text.dataset.articulationEventId = eventId
      text.setAttribute('x', String(x))
      text.setAttribute('y', String(y + 4))
      text.textContent = symbol
      svg.append(text)
      glyphs.push({kind:articulation,node:text})
    }
  })
  // Compute close marks before staff-anchored marks without reordering DOM/model data.
  const ordered = [...glyphs.filter(g=>g.kind==='staccato'||g.kind==='tenuto'),...glyphs.filter(g=>g.kind==='accent'||g.kind==='marcato')]
  if (!ordered.length || !document.fonts || typeof svg.getCTM !== 'function') return
  const context=document.createElement('canvas').getContext('2d'),group=note.getSVGElement()
  const lane=note.getAttribute('data-voice-lane')
  if(!context||!group||(lane!=='neutral'&&lane!=='upper'&&lane!=='lower'))return
  const read=(node:SVGGraphicsElement)=>node.tagName.toLowerCase()==='text'
    ?readSvgTextInk(node as SVGTextContentElement,context):readSvgShapeInk(node)
  // Modifiers (including grace notes, flags and accidentals) can be nested
  // inside a principal notehead group. They are obstacles, not anchor heads.
  const headNodes=note.noteHeads.flatMap(head=>{
    const glyph=head.getSVGElement()?.querySelector<SVGTextContentElement>(':scope > text')
    return glyph?[glyph]:[]
  })
  const headSet=new Set(headNodes)
  const heads=headNodes.flatMap(n=>{const b=readSvgTextInk(n,context);return b?[b]:[]})
  const principalStem=note.getStem()?.getSVGElement()
  const stems=[
    ...(principalStem?.querySelectorAll<SVGGraphicsElement>('path,line')??[]),
    ...group.querySelectorAll<SVGGraphicsElement>(':scope > .vf-flag path,:scope > .vf-flag text')
  ].flatMap(n=>{const b=read(n);return b?[b]:[]})
  for(const beam of svg.querySelectorAll<SVGElement>('.vf-beam[data-measure-id]')){
    if(beam.dataset.measureId!==measureId || ![...beam.querySelectorAll<SVGElement>('.vf-stem')].some(n=>n.dataset.slurStemEventId===eventId))continue
    for(const n of beam.querySelectorAll<SVGGraphicsElement>(':scope > path,.vf-stem[data-slur-stem-event-id] path')){
      const owner=n.closest<SVGElement>('.vf-stem')?.dataset.slurStemEventId
      if(owner&&owner!==eventId)continue
      const b=readSvgShapeInk(n);if(b)stems.push(b)
    }
  }
  const staffLines=[...(note.getStave()?.getSVGElement()?.querySelectorAll<SVGGraphicsElement>('path,line')??[])]
    .flatMap(n=>{const b=readSvgShapeInk(n);return b&&b.width>b.height&&b.height<=2?[b]:[]})
  const obstacles=[...group.querySelectorAll<SVGGraphicsElement>('path,line,circle,ellipse,polygon,polyline')]
    .flatMap(n=>{const b=readSvgShapeInk(n);return b?[b]:[]})
  for(const n of group.querySelectorAll<SVGTextContentElement>('text')){
    if(headSet.has(n))continue
    const b=readSvgTextInk(n,context);if(b)obstacles.push(b)
  }
  for(const {kind,node} of ordered){
    const mark=read(node);if(!mark)continue
    const offset=resolveNearNoteArticulationOffset({mark,heads,stems,staffLines,obstacles,stemDirection:note.getStemDirection(),lane,anchor:kind==='accent'||kind==='marcato'?'staff':'note',fixedAbove:kind==='marcato'})
    if(!offset)continue
    const x=node.tagName.toLowerCase()==='circle'?'cx':'x',y=node.tagName.toLowerCase()==='circle'?'cy':'y'
    node.setAttribute(x,String(Number(node.getAttribute(x))+offset.x))
    node.setAttribute(y,String(Number(node.getAttribute(y))+offset.y))
    obstacles.push({...mark,x:mark.x+offset.x,y:mark.y+offset.y})
  }
}

function drawFermata(svg: SVGSVGElement, x: number, staffY: number, note: StaveNote): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-fermata')
  const measureId = note.getSVGElement()?.dataset.measureId
  if (measureId) text.dataset.fermataMeasureId = measureId
  text.dataset.fermataEventId = note.getSVGElement()?.dataset.eventId ?? ''
  text.setAttribute('x', String(x + 4))
  text.setAttribute('y', String(staffY - 22))
  text.textContent = '𝄐'
  svg.append(text)
  if (!document.fonts || typeof svg.getCTM !== 'function') return
  const context = document.createElement('canvas').getContext('2d')
  if (!context) return
  const ink = readSvgTextInk(text, context)
  if (!ink) return
  const group = note.getSVGElement()
  const ownedInk = [...(group?.querySelectorAll<SVGTextContentElement>('text') ?? [])]
    .flatMap(node => { const bounds = readSvgTextInk(node, context); return bounds ? [bounds] : [] })
  for (const node of group?.querySelectorAll<SVGGraphicsElement>('path,line,circle,ellipse,polygon,polyline') ?? []) {
    const bounds = readSvgShapeInk(node)
    if (bounds) ownedInk.push(bounds)
  }
  for (const node of svg.querySelectorAll<SVGGraphicsElement>('.notation-articulation[data-articulation-event-id]')) {
    if (node.dataset.articulationEventId !== group?.dataset.eventId || node.dataset.articulationMeasureId !== measureId) continue
    const bounds = node.tagName.toLowerCase() === 'text'
      ? readSvgTextInk(node as SVGTextContentElement, context) : readSvgShapeInk(node)
    if (bounds) ownedInk.push(bounds)
  }
  // Beams/tuplet brackets live outside the note group. Include only this
  // measure's real painted shapes; horizontal clearance excludes other beats.
  for (const attachment of svg.querySelectorAll<SVGElement>('.vf-beam[data-measure-id],.vf-tuplet[data-print-measure-id]')) {
    if ((attachment.dataset.measureId ?? attachment.dataset.printMeasureId) !== measureId) continue
    for (const node of attachment.querySelectorAll<SVGTextContentElement>('text')) {
      const bounds = readSvgTextInk(node, context)
      if (bounds) ownedInk.push(bounds)
    }
    for (const node of attachment.querySelectorAll<SVGGraphicsElement>('path,line')) {
      const bounds = readSvgShapeInk(node)
      if (bounds) ownedInk.push(bounds)
    }
  }
  const offset = resolveFermataInkOffset(ink, ownedInk, note.getStave()?.getYForLine(0))
  if (offset) text.setAttribute('y', String(staffY - 22 + offset))
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
  ornaments: NonNullable<Extract<VoiceEvent, { type: 'note' }>['ornaments']>,
  note: StaveNote
): void {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

  text.classList.add('notation-ornament')
  const eventElement = note.getSVGElement()
  text.dataset.ornamentMeasureId = eventElement?.dataset.measureId ?? ''
  text.dataset.ornamentEventId = eventElement?.dataset.eventId ?? ''
  text.setAttribute('x', String(x + 4))
  text.setAttribute('y', String(staffY - 34))
  text.textContent = ornaments.map(ornament => ornamentGlyphs[ornament]).join(' ')
  svg.append(text)
  if (!document.fonts || typeof svg.getCTM !== 'function') return
  const context = document.createElement('canvas').getContext('2d')
  if (!context) return
  let ink = readSvgTextInk(text, context)
  if (!ink) return
  const noteheads = [...(eventElement?.querySelectorAll<SVGTextContentElement>('.vf-notehead text') ?? [])]
    .flatMap(node => { const bounds = readSvgTextInk(node, context); return bounds ? [bounds] : [] })
  const stem = note.hasStem() ? note.getStemExtents() : undefined
  const top = Math.min(staffY - 6, ...noteheads.map(b => b.y), ...(stem ? [stem.topY, stem.baseY] : []))
  const shift = Math.min(0, top - 6 - (ink.y + ink.height))
  if (shift) text.setAttribute('y', String(Number(text.getAttribute('y')) + shift))
  ink = readSvgTextInk(text, context)
  if (!ink) return
  // A fermata and pralltriller share the same note. Stack the fermata above
  // the actual ornament ink instead of placing both on the same baseline.
  for (const fermata of svg.querySelectorAll<SVGTextContentElement>('.notation-fermata')) {
    if (fermata.dataset.fermataEventId !== text.dataset.ornamentEventId) continue
    const bounds = readSvgTextInk(fermata, context)
    if (!bounds) continue
    const offset = Math.min(0, ink.y - 6 - (bounds.y + bounds.height))
    if (offset) fermata.setAttribute('y', String(Number(fermata.getAttribute('y')) + offset))
  }
}

function drawLyrics(
  svg: SVGSVGElement,
  eventId: string,
  x: number,
  staffY: number,
  lyrics: NonNullable<Extract<VoiceEvent, { type: 'note' }>['lyrics']>,
  lyricScale: number,
  onSelectLyric: (eventId: string, verse: number) => void,
  lyricOffset = 0,
  measureId?: string
): void {
  const hitContext = document.fonts && typeof svg.getCTM === 'function' ? document.createElement('canvas').getContext('2d') : null
  sortLyricsForDisplay(lyrics).forEach((lyric, index) => {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    const lineIndex = Math.max(0, (lyric.number ?? index + 1) - 1)
    const verse = lyric.number ?? index + 1

    text.classList.add('notation-lyric')
    if (measureId) text.setAttribute('data-print-measure-id', measureId)
    text.setAttribute('data-event-id', eventId)
    text.setAttribute('data-lyric-number', String(verse))
    text.setAttribute('role', 'button')
    text.setAttribute('tabindex', '0')
    text.setAttribute('x', String(x + 4))
    text.setAttribute(
      'y',
      String(staffY + 116 * lyricScale + lineIndex * 16 * lyricScale + lyricOffset)
    )
    text.setAttribute('font-size', String(13 * lyricScale))
    text.textContent = lyricDisplayText(lyric)
    const select = (event: Event) => {
      event.preventDefault()
      event.stopPropagation()
      onSelectLyric(eventId, verse)
    }
    text.addEventListener('click', select)
    text.addEventListener('keydown', (event) => {
      if(event.isComposing||event.keyCode===229||event.key==='Process'){event.stopPropagation();return}
      if (event.key !== 'Enter' && event.key !== ' ') {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      onSelectLyric(eventId, verse)
    })
    svg.append(text)
    const ink = hitContext ? readSvgTextInk(text, hitContext) : undefined
    if (ink && [ink.x, ink.y, ink.width, ink.height].every(Number.isFinite) && ink.width > 0 && ink.height > 0) {
      // SVG text hit cells can be much taller than the painted Korean glyphs.
      // Keep the text's keyboard target and use only real ink for pointer input.
      const hit = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      hit.classList.add('notation-lyric-hit')
      hit.setAttribute('data-event-id', eventId)
      hit.setAttribute('data-lyric-number', String(verse))
      hit.setAttribute('x', String(ink.x)); hit.setAttribute('y', String(ink.y))
      hit.setAttribute('width', String(ink.width)); hit.setAttribute('height', String(ink.height))
      hit.setAttribute('fill', 'transparent'); hit.setAttribute('stroke', 'none')
      hit.setAttribute('pointer-events', 'all'); hit.setAttribute('aria-hidden', 'true')
      hit.addEventListener('click', select)
      svg.append(hit)
      text.style.pointerEvents = 'none'
    }
  })
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


function drawTie(
  context: ReturnType<Renderer['getContext']>,
  firstNote: StaveNote | null,
  lastNote: StaveNote | null,
  firstIndexes: number[],
  lastIndexes: number[],
  systemIndex: number | undefined
): void {
  const tie = new StaveTie({
    firstNote,
    lastNote,
    firstIndexes,
    lastIndexes
  })
    .setContext(context)
  // Complete ties and outgoing pieces can cross real symbols and another
  // voice's ink. Incoming pieces use the same measured path when needed.
  // Reuse actual ink and
  // the existing curve clearance solver;do not alter written pitches or anchors.
  const ownerNote=firstNote??lastNote
  const svg=ownerNote?.getSVGElement()?.ownerSVGElement
  const inkContext=svg?document.createElement('canvas').getContext('2d'):null
  if(ownerNote&&svg&&inkContext){
    const firstElement=ownerNote.getSVGElement()
    const isOtherVoice=(node:SVGElement)=>isForeignStaffVoice(firstElement,node)
    const otherVoiceInk=[...svg.querySelectorAll<SVGTextContentElement>('.notation-event .vf-notehead text')].filter(isOtherVoice)
    const symbols=[...svg.querySelectorAll<SVGTextContentElement>('.vf-clef text,.vf-keysignature text,.vf-timesignature text'),...otherVoiceInk]
      .flatMap(node=>{const ink=readSvgTextInk(node,inkContext);return ink?[ink]:[]})
    // Only painted paths count: rest/whole-note virtual stems and selection hit
    // areas must not move a bow. Beamed stems outside note groups are separate.
    symbols.push(...[...svg.querySelectorAll<SVGPathElement>('.notation-event .vf-stem path')]
      .filter(isOtherVoice).flatMap(node=>{const ink=readSvgShapeInk(node);return ink?[ink]:[]}))
    // Beamed stems are painted outside their note group. Resolve their real
    // event identity; a measure can contain beams from several voices/staves.
    symbols.push(...collectForeignBeamPaths(svg,firstElement)
      .flatMap(node=>{const ink=readSvgShapeInk(node);return ink?[ink]:[]}))
    const short=Math.abs(tie.getLastX()-tie.getFirstX())<tie.renderOptions.shortTieCutoff
    const curve={firstX:tie.getFirstX(),lastX:tie.getLastX(),
      firstYs:firstIndexes.map(index=>tie.getFirstYs()[index]),lastYs:lastIndexes.map(index=>tie.getLastYs()[index]),
      direction:tie.getDirection(),yShift:tie.renderOptions.yShift,
      cp1:short?tie.renderOptions.cp1Short:tie.renderOptions.cp1,cp2:short?tie.renderOptions.cp2Short:tie.renderOptions.cp2}
    // A split tie keeps its existing side and both endpoints. Do not flip just
    // one half while leaving the continuation on the opposite side.
    const placement=firstNote&&lastNote?resolveTieModifierPlacement(curve,symbols)
      :{direction:curve.direction,depth:resolveTieModifierDepth(curve,symbols)}
    if(short){tie.renderOptions.cp1Short+=placement.depth;tie.renderOptions.cp2Short+=placement.depth}
    else{tie.renderOptions.cp1+=placement.depth;tie.renderOptions.cp2+=placement.depth}
    if(placement.depth||placement.direction!==tie.getDirection()){
      tie.setDirection(placement.direction)
      tie.setAttribute('data-modifier-clearance','true')
    }
  }
  tie.draw()
  if(tie.getAttribute('data-modifier-clearance')){
    const group=tie.getSVGElement()
    group?.setAttribute('data-modifier-clearance','true')
    const measureId=ownerNote?.getSVGElement()?.dataset.measureId
    if(measureId)group?.setAttribute('data-measure-id',measureId)
  }
  if (systemIndex !== undefined) tie.getSVGElement()?.setAttribute('data-system-index', String(systemIndex))
}

function isPreviewEventId(eventId: string): boolean {
  return eventId.startsWith('preview-')
}

function drawOwnedBeam(beam: Beam, context: ReturnType<Renderer['getContext']>, measureId: string): void {
  beam.setContext(context).draw()
  beam.getSVGElement()?.setAttribute('data-measure-id', measureId)
  for (const note of beam.getNotes()) {
    const eventId = note.getAttribute('data-event-id')
    if (typeof eventId === 'string') {
      note.getStem()?.getSVGElement()?.setAttribute('data-slur-stem-event-id', eventId)
    }
  }
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

export function createStaveNote(
  event: VoiceEvent,
  measure: Measure,
  voice: ScoreVoice,
  selectedEventIds: Set<string>,
  selectedEventId?: string,
  isPlaybackEvent = false,
  eventAddress?: VoiceAddress,
  selectedEventAddress?: VoiceAddress,
  lyricWidths?: ReadonlyMap<string, number>,
  selectedEventAddresses?: ReadonlyMap<string, VoiceAddress>
): StaveNote {
  const clef = toVexFlowClef(measure.clef)
  const isRest = event.type === 'rest'
  const pitch =
    event.type === 'note' ? resolveNotePitch(measure, voice, event) : undefined
  const keys =
    event.type === 'note' && event.pitches?.length
      ? event.pitches.map(member => toVexFlowKey(resolveNotePitch(measure, voice, { ...event, pitch: member })))
      : isRest
        ? [toVexFlowRestKey(measure.clef, event.duration.value)]
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

  deferNotationEventTone(note,
    resolveNotationEventTone(
      event.id,
      selectedEventIds,
      selectedEventId,
      isPlaybackEvent,
      eventAddress,
      selectedEventAddress,
      selectedEventAddresses
    )
  )

  if (event.type === 'note' && !event.ties?.stop) {
    const members = event.pitches?.length ? event.pitches : [pitch!]
    members.forEach((member, index) => {
      const resolved = resolveNotePitch(measure, voice, { ...event, pitch: member })
      if (!shouldDisplayAccidental(measure, voice, { ...event, pitch: member })) return
      const accidental = toVexFlowAccidental(resolved)
      if (accidental) note.addModifier(new Accidental(accidental), index)
    })
  }

  for (let dotIndex = 0; dotIndex < event.duration.dots; dotIndex += 1) {
    Dot.buildAndAttach([note], { all: true })
  }

  // Existing grace data has pitch/slash and the XML adapter's eighth-note
  // presentation, but no rhythmic duration. A modifier group renders it on
  // every staff and reserves space without adding ticks to the host voice.
  if (event.type === 'note' && event.graceNotes?.length) {
    const graceNotes = event.graceNotes.map(grace => {
      const graceEvent = { ...event, pitch: grace.pitch }
      const resolved = resolveNotePitch(measure, voice, graceEvent)
      const glyph = new GraceNote({clef, keys:[toVexFlowKey(resolved)], duration:'8', slash:grace.slash})
      const accidental = toVexFlowAccidental(resolved)
      if (accidental && shouldDisplayAccidental(measure, voice, graceEvent)) glyph.addModifier(new Accidental(accidental), 0)
      return glyph
    })
    const group = new GraceNoteGroup(graceNotes)
    if (graceNotes.length > 1) group.beamNotes()
    note.addModifier(group, 0)
  }

  attachLyricSpacing(note, event, lyricWidths)
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
