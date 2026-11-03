import { readMusicXmlVoiceNumber, sortScoreVoices } from '../../musicxml/voice-order'
import { resolveSameStaffVoicePresentation } from './notation/visual-state'
import { expandScoreRepeatsForMusicXml } from '../../musicxml/expand-repeats'
import { buildMusicXmlPageDefaults } from '../../musicxml/page-layout'
import { musicXmlPrintBreaksKey } from '../../musicxml/serialize'
import { collectPartRepeatProjectionWarnings, createMusicXmlRepeatConflictError, MusicXmlRepeatConflictError, type StudioPartRepeatProjectionWarning } from './editor/musicxml-repeat-conflicts'
import { describeEmptyMusicXmlMeasure } from './editor/musicxml-empty-measure'
import { createMusicXmlMetadataConflictError,MusicXmlMetadataConflictError } from './editor/musicxml-metadata-conflicts'
import { createMusicXmlSignatureConflictError,MusicXmlSignatureConflictError } from './editor/musicxml-signature-conflicts'
import { resolveRepeatEditScope } from './editor/repeat-scope'
import { hasAmbiguousLyricVerses, ambiguousLyricMessage } from './editor/lyric-editing'
import { parseHarmonyText, inferHarmonyStructure } from '../../musicxml/harmony-text'
import { createGlobalMeasureResolver, resolveGlobalAnnotationMeasures } from './editor/global-measure-reference'
import { orderMeasureMarkingSignatures } from './editor/marking-save-order'
import { buildSingleMeasureTextClipboard, buildMeasureObjectDeleteCommand, buildMeasureMarkingClipboard, buildMeasureMarkingPasteCommand, type MeasureMarkingClipboard, type SelectionObjectTypeFilter } from './editor/measure-markings'
import { createPartOptionLabels } from './editor/part-option-labels'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent
} from 'react'
import { createRoot } from 'react-dom/client'
import { NativeBackupsDialog } from './NativeBackupsDialog'
import { SpanProperties } from './SpanProperties'
import { StudioNoteToolbar } from './StudioNoteToolbar'
import { StudioTempoEventInput } from './StudioTempoEventInput'
import { StudioPartLabels } from './StudioPartLabels'
import { createDocumentDraftRegistry, DocumentDraftContext, type PendingDocumentDraft } from './editor/document-drafts'
import { draftSaveGuidance, isDocumentSaveShortcut } from './editor/draft-save'
import { StudioStructureActions } from './StudioStructureActions'
import { StudioScoreView } from './StudioScoreView'
import { StudioWarningReport, StudioWarningTechnicalDetails as WarningTechnicalDetails, StudioOperationDetails, type StudioOperationDiagnostic } from './StudioWarningReport'
import { StudioLyricTools } from './StudioLyricTools'
import { StudioMeasureNotation } from './StudioMeasureNotation'
import { StudioRepeatTools } from './StudioRepeatTools'
import { StudioRangeTools } from './StudioRangeTools'
import { StudioPartSetup } from './StudioPartSetup'
import { StudioTempoTools } from './StudioTempoTools'
import { StudioMeasureTools } from './StudioMeasureTools'
import { StudioInputTarget } from './StudioInputTarget'
import { StudioStatusBar } from './StudioStatusBar'
import { describeInputPosition } from './editor/input-position'
import { usePlaybackViewport } from './playback/usePlaybackViewport'
import { createViewportScrollTracker, observeDocumentScrollbarIntent } from './editor/viewport-scroll'
import { isRestoringNotationFocus, isSameNotationFocus } from './notation/focus-viewport'
import { readInputViewportInk } from './notation/input-viewport-ink'
import { StudioMetadataInput } from './StudioMetadataInput'
import { StudioMetadataActions } from './StudioMetadataActions'
import { StudioDockHeader } from './StudioDockHeader'
import { StudioDockResizeHandle } from './StudioDockResizeHandle'
import { StudioFileTools } from './StudioFileTools'
import { StudioExportTools } from './StudioExportTools'
import { StudioPageSetup } from './StudioPageSetup'
import { StudioMeasureContextMenu } from './StudioMeasureContextMenu'
import { StudioApplicationMenu, type StudioMenuDefinition } from './StudioApplicationMenu'
import { StudioCommandSearch } from './StudioCommandSearch'
import { StudioNotationPalette, StudioPaletteSettings, useStudioPaletteWorkspace } from './StudioNotationPalette'
import { StudioPlayback, StudioPartMixer } from './StudioPlayback'
import { StudioPiano } from './StudioPiano'
import { createPianoStressScore } from '../../testing/piano-stress-fixture'
import { usePianoExpression } from './playback/usePianoExpression'
import {comparableMusicXmlBarlines} from '../../musicxml/barline-scope'
import { StudioSelectedProperties } from './StudioSelectedProperties'
import { StudioEventMarks } from './StudioEventMarks'
import { StudioNoteDecorations } from './StudioNoteDecorations'
import { StudioChordProperties } from './StudioChordProperties'
import { PerformanceLab } from './playback/PerformanceLab'
import type { AnyExpressionProfile as ExpressionProfile } from './playback/voicing-profile'
import { Bach, Banner, Button, SegmentedControl, Dialog, IconButton, Input, Item, ProductSignature, Select, Text, Tooltip, ddiroriTokens } from '@ddirori/ui'
import { buildSpanDeleteCommand, buildSpanEndpointCommand, buildSpanEngravingCommand, findSpan, type SpanReference } from './editor/span-editing'
import { applyPortablePartLayout, remapRemovedStaffLayoutAnchors, unresolvedRemovedStaffLayoutAnchors } from '../../project/part-layout'
import { createNativeProject, decodeNativeProject, encodeNativeProject, validateNativeProject, type NativeProject } from '../../project/schema'
import {
  ChevronsDown,
  ChevronsUp,
  ClipboardPaste,
  Clock3,
  Copy,
  Eraser,
  FileDown,
  FileMusic,
  FilePlus2,
  FileUp,
  FileVolume,
  Keyboard,
  Minus,
  PanelLeft,
  PanelRight,
  Plus,
  RotateCcw,
  RotateCw,
  X
} from 'lucide-react'

import {
  applyScoreCommand,
  buildTieCommand,
  collectUnsupportedChordTieWarnings,
  createFullMeasureRest,
  createMeasure,
  createPart,
  createStaff,
  createVoice,
  durationToTicks,
  MAX_AUGMENTATION_DOTS,
  measureDurationTicks,
  resolveNotePitch,
  scoreRepeatSource,
  sortVoiceEvents,
  voiceEventDurationTicks,
  type Duration,
  type DurationValue,
  type DynamicValue,
  type BreathMark,
  type Clef,
  type HairpinType,
  type HarmonyMark,
  type LyricSyllable,
  type Measure,
  type Note,
  type OctaveShiftType,
  type Ornament,
  type Part,
  type Pitch,
  type PitchStep,
  type RhythmFeelMarking,
  type Score,
  type SpanEngraving,
  type ScoreCommand,
  type ScorePageSetup,
  type Staff,
  type Articulation,
  type TempoEvent,
  type TempoMarking,
  type TimeSignature,
  type VoiceAddress,
  TICKS_PER_QUARTER
} from '../../score-core'
import {
  parseMusicXml,
  parseMusicXmlWithReport,
  serializeMusicXml,
  serializeMusicXmlWithReport,
  type MusicXmlExportReport,
  type MusicXmlImportReport
} from '../../musicxml'
import {
  serializeMidiWithReport,
  type MidiExportWarning
} from './midi/serialize-midi'
import {
  createReleaseTestScore,
  createSingleVoiceMvpScore
} from '../../testing/single-voice-mvp-fixture'
import './styles.css'
import './studio-r1.css'
import './studio-r2.css'
import './studio-r3.css'
import './studio-pdf.css'
import './studio-workspace-tools.css'
import './studio-metadata-editor.css'
import { PdfSnapshot, pdfLayoutExceedsTarget, samePdfSource, type PdfRenderSnapshot } from './PdfSnapshot'
import { assertPrintPageInk, PrintPageInkError } from './notation/print-page-ink'
import { rasterizePngPages } from './image-export/raster'
import { PngPageRangeError, type PngDpi } from './image-export/pages'
import {
  buildDeleteCommand,
  buildDotCommand,
  buildDurationCommand,
  buildFilteredDeleteCommand,
  buildFilteredDeleteResult,
  buildFilteredRangeClipboard,
  buildFilteredRangePasteCommand,
  buildFilteredRangePasteResult,
  buildRangeRestResult,
  buildRestEntryCommand,
  buildTupletGroupCommandResult,
  createEventSelection,
  createMeasureSelection,
  createRangeSelection,
  createDuration,
  durationLabels,
  getAdjacentEventId,
  getFilteredSelectedEventIds,
  getSelectedEventIds,
  getSelectionFocusEventId,
  locateEvent,
  locateMeasure,
  type EditorMode,
  type EditorSelection,
  type RangeClipboard,
  type SelectionEventTypeFilter
} from './editor/editor-state'
import {
  buildInsertMeasureAfter,
  buildInsertMeasureBefore,
  buildRemoveMeasure,
  resolveActiveMeasureId
} from './editor/measure-management'
import {
  markBeforeUnloadWhenUnsaved,
  shouldReplaceCurrentScore,
  toFileName,
  type OpenScoreOptions
} from './editor/file-lifecycle'
import { buildKeySignatureCommand } from './editor/key-signature'
import {
  createNewScore,
  formatTempoMarkingText,
  keySignaturePresets,
  partPresets,
  resolveDefaultTempoBeatForTimeSignature,
  resolveKeySignaturePreset,
  resolveKeySignaturePresetId,
  resolvePartPreset,
  scoreStructurePresets,
  resolveTimeSignaturePreset,
  resolveTimeSignaturePresetId,
  timeSignaturePresets
} from './editor/new-score'
import { buildTimeSignatureCommand } from './editor/time-signature'
import {
  buildPartTranspositionCommand,
  instrumentTranspositionPresets,
  resolveInstrumentTranspositionId
} from './editor/instrument-transposition'
import {
  koreanMusicTerms
} from './editor/korean-music-terms'
import {
  buildAccidentalCommand,
  buildEnharmonicRespellCommand,
  buildPitchMovementCommand,
  buildPitchStepCommand,
  type PitchMovement
} from './editor/pitch-editing'
import { describeTupletToggleFailure } from './editor/tuplet-feedback'
import {
  isRedoShortcut,
  isNoteInputToggleShortcut,
  isRestShortcut,
  isSlurShortcut,
  isTextEditingTarget,
  isTieShortcut,
  isTupletShortcut,
  isUndoShortcut,
  resolveDotShortcut,
  resolveDurationShortcut,
  resolvePitchKeyboardAction,
  resolvePitchShortcut
} from './editor/keyboard-input'
import {
  beginTupletInput,
  buildSequentialInput,
  cancelTupletInput,
  createNoteInputState,
  createTupletInputPreviewScore,
  type NoteInputState
} from './editor/note-input-state'
import { demoScore } from './notation/demo-score'
import { NotationPreview } from './notation/NotationPreview'
import { hasClippedLyricInk, hasClippedNotationText, hasOverlappingLyricInk, readHarmonyInk, readLyricInk } from './notation/lyric-overlap'
import { harmonySpacingByMeasure } from './notation/harmony-spacing'
import { useMinimumTextScoreWidths, supportsAutomaticLyricSpacing, useLyricWidths, useHarmonyWidths } from './notation/use-lyric-layout'
import { refreshPrintSnapshotWidths } from './prepare-print-snapshot'
import {
  normalizePrintPageSetup,
  resolvePrintLayoutPlan
} from './notation/print-layout'
import {
  useScorePlayback,
  type PlaybackPartMixer,
  type PlaybackPartMixerMap
} from './playback/useScorePlayback'

const durations: DurationValue[] = [
  '64th',
  '32nd',
  '16th',
  'eighth',
  'quarter',
  'half',
  'whole'
]
const durationShortcuts: Partial<Record<DurationValue, string>> = {
  '64th': '1',
  '32nd': '2',
  '16th': '3',
  eighth: '4',
  quarter: '5',
  half: '6',
  whole: '7'
}
const tripletPreset = {
  actualNotes: 3,
  durationValue: 'eighth',
  label: '셋잇단음표',
  normalNotes: 2,
  shortcut: '⌘/Ctrl+3'
} satisfies {
  actualNotes: number
  durationValue: DurationValue
  label: string
  normalNotes: number
  shortcut: string
}

const eventTypeLabels = {
  note: '음표',
  rest: '쉼표'
} as const
const playbackStatusLabels = {
  paused: '일시정지',
  playing: '재생 중',
  stopped: '정지'
} as const

type EditorCommand = (ScoreCommand & { partLayoutState?: NativeProject['partLayouts'] }) | {
  type: 'part-layout.replace'
  partId: string
  value?: NativeProject['partLayouts'][number]
  pageSetupChange?: { value?: Required<ScorePageSetup> }
}

type MeasureTextFamily='rehearsalMarks'|'systemTexts'|'staffTexts'|'expressionTexts'|'harmonies'|'dynamics'
const measureTextLabels={rehearsalMarks:'연습표',systemTexts:'시스템 텍스트',staffTexts:'보표 글자',expressionTexts:'표현 텍스트',harmonies:'코드 심벌',dynamics:'셈여림'} as const

interface MeasureTextPropertySelection {
  focus?:boolean
  family:MeasureTextFamily
  id:string
  sequence:number
  baseSelection:EditorSelection
  returnSelection:EditorSelection
  generation:number
  viewKey:string
}

interface EditorHistoryEntry {
  command: EditorCommand
  inputState?: NoteInputState
  selection: EditorSelection
  measureTextSelection?:MeasureTextPropertySelection
}

type MetadataField = 'title' | 'composer' | 'partTitle'

interface MetadataEdit {
  field: MetadataField
  value: string
  partId?: string
  documentKey: number
  session: number
}


const toolbarCategories = [
  { id: 'file', label: '파일' },
  { id: 'measure', label: '악보' },
  { id: 'view', label: '보기' },
  { id: 'note', label: '음표' },
  { id: 'notation', label: '표기 객체' },
  { id: 'palette', label: '표기 팔레트' },
  { id: 'span-properties', label: '선택 속성' },
  { id: 'lyrics', label: '가사' },
  { id: 'export', label: '내보내기' },
  { id: 'playback', label: '재생' }
] as const

type ToolbarCategory = (typeof toolbarCategories)[number]['id']
type TempoBeatDots = 0 | 1 | 2
type TempoBeatSelectorValue = `${DurationValue}:${TempoBeatDots}`
type PdfTargetPagesValue = string
type MusicXmlReportWarning =
  | MusicXmlImportReport['warnings'][number]
  | MusicXmlExportReport['warnings'][number]
  | StudioPartRepeatProjectionWarning

interface MusicXmlReportPanelState {
  snapshotId: number
  fileName: string
  kind: 'import' | 'export'
  warnings: MusicXmlReportWarning[]
}

interface MidiReportPanelState {
  generation: number
  fileName: string
  warnings: MidiExportWarning[]
}

const midiExportFailureMessage = 'MIDI 내보내기를 완료하지 못했습니다. 다시 시도하거나 기술 정보를 확인해 주세요.'
const pendingTupletCopyHint = '확정된 악보만 포함합니다. 입력을 마친 뒤 다시 출력하세요.'

function describeMusicXmlImportFailure(error: unknown) {
  const message = getErrorMessage(error)
  return {
    tone: 'error' as const,
    message: message.startsWith('한 음표에만 연결된 타이 표기는 현재 가져오기에서 지원하지 않습니다.')
      ? '한 음표에만 연결된 타이 표기는 현재 가져오기에서 지원하지 않습니다. 현재 악보는 유지됩니다. 원본 MusicXML을 보관하고 다른 표기 방식의 사본을 사용해 주세요.'
      : message.includes('최근 파일을 찾을 수 없습니다')
        ? '최근 MusicXML 파일을 찾지 못했습니다. 원래 위치를 확인하거나 목록에서 지워 주세요.'
        : 'MusicXML을 가져오지 못했습니다. 현재 악보는 유지됩니다. 파일을 확인한 뒤 다시 시도하거나 기술 정보를 확인해 주세요.',
    details: { operation: 'MusicXML 가져오기' as const, message }
  }
}

function describeMusicXmlRecentUpdateFailure(error: unknown) {
  return {
    tone: 'error' as const,
    message: '악보는 열었지만 최근 악보 목록을 갱신하지 못했습니다. 열린 악보는 사용할 수 있습니다. 기술 정보를 확인해 주세요.',
    details: { operation: '최근 악보 목록' as const, message: getErrorMessage(error) }
  }
}

type ScoreViewMode = 'score' | 'part'

interface StoredMusicXmlViewState {
  mode: ScoreViewMode
  partId?: string
}

type PartPageSetupPreferences = Record<string, Required<ScorePageSetup>>

interface AppOpenScoreOptions extends OpenScoreOptions {
  viewState?: StoredMusicXmlViewState
  partPageSetupPreferences?: PartPageSetupPreferences
}

interface NewScoreDraft {
  title: string
  composer: string
  templateId: (typeof scoreStructurePresets)[number]['id']
  keySignatureId: string
  timeSignatureId: string
  measureCount: number
  tempo: number
}

interface AutosaveRecoverySnapshot {
  score: Score
  project?: NativeProject
  metadata: {
    title: string
    updatedAt: string
    version: string
  }
}

interface RecentMusicXmlFile {
  filePath: string
  fileName: string
  openedAt: string
  format?: 'native'
}

type MeasureContextAction =
  | 'insert-before'
  | 'insert-after'
  | 'remove'
  | 'toggle-repeat-start'
  | 'toggle-repeat-end'
  | 'toggle-volta-1'
  | 'toggle-volta-2'

interface MeasureContextMenuState {
  measureId: string
  x: number
  y: number
}

interface StaffTargetOption {
  value: string
  label: string
  partId: string
  staffId: string
}

const metadataMaxLength: Record<MetadataField, number> = {
  title: 120,
  composer: 80,
  partTitle: 120
}

const DEFAULT_TEMPO_BPM = 120
const MIN_TEMPO_BPM = 40
const MAX_TEMPO_BPM = 240
const dynamicValues = [
  'ppp',
  'pp',
  'p',
  'mp',
  'mf',
  'f',
  'ff',
  'fff',
  'sfz'
] as const satisfies readonly DynamicValue[]
const voiceNumbers = [1, 2, 3, 4] as const
const pageSizeOptions = [
  { label: 'A4', value: 'a4' },
  { label: 'Letter', value: 'letter' }
] as const
const pageOrientationOptions = [
  { label: '세로', value: 'portrait' },
  { label: '가로', value: 'landscape' }
] as const
const pageSetupPresets = [
  {
    id: 'default-a4',
    label: '기본 A4',
    value: {
      pageSize: 'a4',
      orientation: 'portrait',
      pageMarginMm: 8,
      staffSizePercent: 100,
      systemSpacingPercent: 100
    }
  },
  {
    id: 'rehearsal-letter',
    label: '리허설 Letter',
    value: {
      pageSize: 'letter',
      orientation: 'portrait',
      pageMarginMm: 10,
      staffSizePercent: 105,
      systemSpacingPercent: 115
    }
  },
  {
    id: 'publication-a4',
    label: '출판 A4',
    value: {
      pageSize: 'a4',
      orientation: 'portrait',
      pageMarginMm: 12,
      staffSizePercent: 95,
      systemSpacingPercent: 125
    }
  },
  {
    id: 'compact-parts',
    label: '컴팩트 파트보',
    value: {
      pageSize: 'a4',
      orientation: 'portrait',
      pageMarginMm: 6,
      staffSizePercent: 90,
      systemSpacingPercent: 90
    }
  }
] as const satisfies ReadonlyArray<{
  id: string
  label: string
  value: Required<ScorePageSetup>
}>
const clefPresets = [
  { id: 'treble', label: '높은음자리표', value: { sign: 'G', line: 2 } },
  { id: 'bass', label: '낮은음자리표', value: { sign: 'F', line: 4 } },
  { id: 'alto', label: '가온음자리표', value: { sign: 'C', line: 3 } },
  { id: 'tenor', label: '테너음자리표', value: { sign: 'C', line: 4 } }
] as const satisfies ReadonlyArray<{ id: string; label: string; value: Clef }>
const tempoBeatUnitOptions = [
  'whole',
  'half',
  'quarter',
  'eighth',
  '16th'
].flatMap((beatUnit) =>
  ([0, 1, 2] as const).map((dots) => ({
    beatUnit: beatUnit as DurationValue,
    dots,
    label: formatTempoBeatOptionLabel(beatUnit as DurationValue, dots),
    value: tempoBeatSelectorValue(beatUnit as DurationValue, dots)
  }))
)
const rhythmFeelOptions = [
  { label: '없음', value: 'none' },
  { label: '8분 셋잇단 느낌', value: 'eighth' },
  { label: '16분 셋잇단 느낌', value: '16th' }
] as const satisfies ReadonlyArray<{
  label: string
  value: 'none' | RhythmFeelMarking['unit']
}>
const lyricVerseOptions = [1, 2, 3, 4] as const
const selectionFilterOptions = [
  ['notes-and-rests', '전체'],
  ['notes', '음표만'],
  ['rests', '쉼표만']
] as const satisfies ReadonlyArray<readonly [SelectionEventTypeFilter, string]>
const selectionObjectFilterOptions = [
  ['none', '없음'],
  ['dynamics', '셈여림'],
  ['harmonies', '코드'],
  ['staff-texts', '보표 글자'],
  ['system-texts', '시스템 텍스트'],
  ['rehearsal-marks', '연습표'],
  ['expression-texts', '표현 텍스트']
] as const satisfies ReadonlyArray<
  readonly [SelectionObjectTypeFilter, string]
>
const shortcutReferenceSections = [
  {
    title: '음표 입력',
    rows: [
      ['음가 선택', '1-7'],
      ['셋잇단음표', tripletPreset.shortcut],
      ['타이', 'T'],
      ['슬러', 'S'],
      ['이명동음 바꾸기', 'J']
    ]
  },
  {
    title: '성부와 선택',
    rows: [
      ['성부 순환', 'V'],
      ['성부 직접 선택', 'Cmd/Ctrl+Alt+1-4'],
      ['인접 보표 이동', 'Up/Down'],
      ['선택 범위 확장', 'Shift+Click']
    ]
  },
  {
    title: '파일과 편집',
    rows: [
      ['악보 저장', 'Cmd/Ctrl+S'],
      ['프로젝트 다른 이름 저장', 'Cmd/Ctrl+Shift+S'],
      ['실행 취소', 'Cmd/Ctrl+Z'],
      ['다시 실행', 'Cmd/Ctrl+Shift+Z'],
      ['복사/붙여넣기', 'Cmd/Ctrl+C / Cmd/Ctrl+V'],
      ['삭제', 'Delete/Backspace']
    ]
  }
] as const
const musicXmlViewStateStorageKey = 'chromatics.musicxml-view-state.v1'
const partPageSetupStorageKey = 'chromatics.part-page-setup.v1'
const partMixerStorageKey = 'chromatics.part-mixer.v1'
const dockVisibilityStorageKey = 'chromatics.dock-visibility.v1'
const dockWidthsStorageKey = 'chromatics.dock-widths.v1'
const dockActiveStorageKey = 'chromatics.dock-active.v1'
type DockKind = 'palette' | 'properties'
const notationViewStorageKey = 'chromatics.notation-view.v1'
const notationZoomOptions = ['75', '100', '125', '150', '200'].map(value => ({value, label:`${value}%`}))

function readNotationView(): {mode:'fit-width' | 'fixed'; zoom:number} {
  try {
    const stored=JSON.parse(localStorage.getItem(notationViewStorageKey) ?? '{}')
    return {mode:stored?.mode === 'fixed' ? 'fixed' : 'fit-width',
      zoom:notationZoomOptions.some(option=>Number(option.value) === stored?.zoom) ? stored.zoom : 100}
  } catch { return {mode:'fit-width', zoom:100} }
}

function readDockWidths() {
  try {
    const stored = JSON.parse(localStorage.getItem(dockWidthsStorageKey) ?? '{}')
    const width = (value: unknown) => typeof value === 'number' && Number.isFinite(value)
      ? Math.min(360, Math.max(200, value)) : 280
    return { palette: width(stored?.palette), properties: width(stored?.properties) }
  } catch { return { palette: 280, properties: 280 } }
}

function revealWorkspaceTarget(target: Element) {
  if(document.activeElement!==target)return
  scrollWorkspaceTargetIntoView(target)
}

function scrollWorkspaceTargetIntoView(target: Element) {
  if(!target.isConnected || target.closest('[hidden]') || target.checkVisibility?.()===false)return
  const popup=target.closest<HTMLElement>('[popover]')
  const popupBoundary=popup?.matches(':popover-open')?popup:undefined
  const readBounds=()=>{
    if(target instanceof SVGElement&&target.matches('.notation-note-input-cursor'))return readInputViewportInk(target)
    const field=(target.matches('.notation-rehearsal-mark[role="button"],.notation-system-text-target[role="button"],.notation-staff-text-target[role="button"],.notation-expression-text-target[role="button"],.notation-dynamic-target[role="button"],.notation-harmony-target[role="button"]')?target.querySelector('rect'):target)?.getBoundingClientRect()??target.getBoundingClientRect()
    if(!(target instanceof HTMLInputElement) && !(target instanceof HTMLButtonElement &&
      target.closest('.studio-export-tools,.studio-input-target') && target.getAttribute('role')==='combobox'))return field
    // A Checkbox label is its full touch target. A Slider label sits above
    // the range. Selected-object text fields also need their name in view.
    // Reveal both without moving keyboard focus off the input or
    // depending on the common component's private DOM/CSS classes.
    const invalid=target.getAttribute('aria-invalid')==='true'
    const labels=invalid||target.closest('.studio-part-mixer,.studio-selected-properties,.studio-span-properties,.studio-export-tools,.studio-page-setup,.studio-tempo-event,.studio-part-labels,.studio-repeat-tools,.studio-input-target')?[...(target.labels??[])]:[]
    // Use the public input association, not the shared component's private
    // markup. New validation text can extend below the already-visible field.
    const descriptions=invalid||target.closest('.studio-page-setup,.studio-span-properties,.studio-tempo-event,.studio-part-labels,.studio-selected-properties,.studio-repeat-tools')?(target.getAttribute('aria-describedby')??'').split(/\s+/)
      .flatMap(id=>{const node=document.getElementById(id);return node?[node]:[]}):[]
    const associated=[...labels,...descriptions].filter(node=>node.isConnected&&node.checkVisibility?.()!==false)
      .map(node=>node.getBoundingClientRect()).filter(rect=>rect.width>0&&rect.height>0)
    if(!associated.length)return field
    const boxes=[field,...associated]
    const left=Math.min(...boxes.map(rect=>rect.left)),top=Math.min(...boxes.map(rect=>rect.top))
    return new DOMRect(left,top,Math.max(...boxes.map(rect=>rect.right))-left,Math.max(...boxes.map(rect=>rect.bottom))-top)
  }
  let box=readBounds()
  if((box.width===0 && !(target instanceof SVGElement)) || box.height===0)return
  target.scrollIntoView({block:'nearest',inline:'nearest'})
  const style=window.getComputedStyle(target)
  const ring=Math.max(0,(parseFloat(style.outlineWidth)||0)+(parseFloat(style.outlineOffset)||0))
  const margin=ddiroriTokens.spacing.sm+ring
  if(target instanceof SVGElement&&target.matches('.notation-note-input-cursor')) {
    const canvas=target.closest<HTMLElement>('.score-canvas')
    if(canvas&&canvas.clientWidth>0&&canvas.scrollWidth>canvas.clientWidth&&
      /(auto|scroll)/.test(window.getComputedStyle(canvas).overflowX)) {
      const port=canvas.getBoundingClientRect(),left=Math.max(0,port.left+canvas.clientLeft)
      const right=Math.min(window.innerWidth,port.left+canvas.clientLeft+canvas.clientWidth)
      box=readBounds()
      // Native nearest scrolling uses the cue's box, not the current note ink.
      // Keep both inside the actual canvas clip at fixed zoom. Round outward
      // because native scrolling may otherwise leave a fractional tip clipped.
      if(right>left) {
        if(box.right>right-margin)canvas.scrollLeft+=Math.ceil(box.right-right+margin)
        else if(box.left<left+margin)canvas.scrollLeft+=Math.floor(box.left-left-margin)
      }
    }
  }
  // Sticky docks have their own scrollport. Native nearest scrolling can leave
  // a field below that port after the document/sticky position changes.
  for(let parent=target.parentElement;parent && parent!==document.body;parent=parent.parentElement) {
    // An open native popover lives in the top layer, outside the clipping of
    // its DOM ancestors. Its background dock/footer must not own this reveal.
    if(popupBoundary && !popupBoundary.contains(parent))break
    if(parent.clientHeight<=0 || parent.scrollHeight<=parent.clientHeight ||
      !/(auto|scroll)/.test(window.getComputedStyle(parent).overflowY))continue
    const port=parent.getBoundingClientRect()
    if(parent.matches('.studio-properties-dock')&&box.height+2*margin>parent.clientHeight&&port.top>margin) {
      // Enlarged validation can exceed the current sticky pane. First free
      // document space so its existing height observer can grow the scrollport;
      // correct the inner scroll only after that geometry has settled.
      const before=window.scrollY
      window.scrollBy(0,Math.min(box.height+2*margin-parent.clientHeight,port.top-margin))
      if(window.scrollY>before)return true
    }
    const top=port.top+parent.clientTop
    const bottom=top+parent.clientHeight
    box=readBounds()
    if(box.bottom>bottom-margin)parent.scrollTop+=box.bottom-bottom+margin
    else if(box.top<top+margin)parent.scrollTop+=box.top-top-margin
  }
  if(popupBoundary)return
  box=readBounds()
  const footer=target.closest('main')?.querySelector('.studio-status')?.getBoundingClientRect()
  const limit=Math.min(window.innerHeight,footer?.top ?? window.innerHeight)
  // Native focus scrolling does not account for the sticky status surface.
  // Native scroll positions can round a subpixel correction back to zero.
  // Round outward so the requested focus gutter survives that quantization.
  if(box.bottom>limit-margin)window.scrollBy(0,Math.ceil(box.bottom-limit+margin))
  else if(box.top<margin)window.scrollBy(0,Math.floor(box.top-margin))
}

export const App = () => {
  const [documentDrafts] = useState(createDocumentDraftRegistry)
  const revealPendingDraft = useRef<(pending: PendingDocumentDraft) => void>(() => {})
  const allowDocumentSave = useCallback(() => {
    const pending = documentDrafts.findPending()
    if (!pending) return true
    // An explicit save may reveal its pending field; ending an IME session
    // by moving focus is not a substitute for the user's confirmation.
    if (!pending.isComposing()) {
      pending.onBlocked()
      revealPendingDraft.current(pending)
    }
    return false
  }, [documentDrafts])
  const describeDocumentSaveCompletion = useCallback((message: string) =>
    documentDrafts.findPending()
      ? `${message} 입력 중인 미확정 값은 포함되지 않았습니다. ${draftSaveGuidance}`
      : message, [documentDrafts])
  const [studioTheme, setStudioTheme] = useState<'light' | 'dark'>(() =>
    window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    const update = () => setStudioTheme(media?.matches ? 'dark' : 'light')
    media?.addEventListener('change', update)
    return () => media?.removeEventListener('change', update)
  }, [])
  const [dockWidths, setDockWidths] = useState(readDockWidths)
  const dockWorkspace = useRef<HTMLDivElement>(null)
  const [activeDock, setActiveDock] = useState<DockKind>(() => {
    try { return JSON.parse(localStorage.getItem(dockActiveStorageKey) ?? 'null') === 'properties' ? 'properties' : 'palette' }
    catch { return 'palette' }
  })
  const [sharedDocks, setSharedDocks] = useState(() =>
    window.matchMedia?.('(min-width: 761px)').matches ?? false)
  useEffect(() => {
    const media=window.matchMedia?.('(min-width: 761px)')
    const update=()=>setSharedDocks(media?.matches ?? false)
    media?.addEventListener('change',update)
    return ()=>media?.removeEventListener('change',update)
  },[])
  useEffect(() => {
    try {localStorage.setItem(dockActiveStorageKey,JSON.stringify(activeDock))} catch { /* Keep the session choice. */ }
  },[activeDock])
  const [notationView, setNotationView] = useState(readNotationView)
  useEffect(() => {
    try { localStorage.setItem(notationViewStorageKey,JSON.stringify(notationView)) } catch { /* Keep the session preference. */ }
  },[notationView])
  const paletteToggle = useRef<HTMLButtonElement>(null)
  const propertiesToggle = useRef<HTMLButtonElement>(null)
  const scoreCanvas = useRef<HTMLDivElement>(null)
  const scoreViewportFollowing = useRef(true)
  const workspaceViewportIntent = useRef(0)
  const focusScore = () => {
    const canvas = scoreCanvas.current
    if (!canvas) return
    const inputCursor = findNoteInputCursor(canvas, inputPosition)
    if (inputCursor) {
      scoreViewportFollowing.current = true
      // Keyboard input belongs to the stable canvas; the selected event still
      // owns edit/copy commands when insertion has advanced to another system.
      canvas.focus({ preventScroll: true })
      scrollWorkspaceTargetIntoView(inputCursor)
      return
    }
    if (noteInputState?.tupletInput) {
      const anchor = findTupletInputPreview(canvas, noteInputState)
      if (anchor) {
        scoreViewportFollowing.current = true
        // Preview notes are readonly: keep keyboard input on the existing canvas.
        canvas.focus({ preventScroll: true })
        anchor.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' })
        return
      }
    }
    const events = [...canvas.querySelectorAll<SVGElement>('.notation-event[tabindex="0"]')]
    const focusEventId = getSelectionFocusEventId(selection)
    // A range's DOM selection includes its anchor as well as its active end.
    // Return to the logical end (or selected measure), without changing selection.
    const selectedTarget = selection.type === 'measure'
      ? events.find(node => node.dataset.measureId === selection.measureId &&
          (!selection.address || (node.dataset.partId === selection.address.partId &&
            node.dataset.staffId === selection.address.staffId && node.dataset.voiceId === selection.address.voiceId)))
      : events.find(node => node.dataset.eventId === focusEventId &&
          (!selection.address || (node.dataset.partId === selection.address.partId &&
            node.dataset.staffId === selection.address.staffId && node.dataset.voiceId === selection.address.voiceId)))
    const measureTextTarget=activeMeasureTextRequest?[...canvas.querySelectorAll<SVGElement>('.notation-rehearsal-mark,.notation-system-text-target,.notation-staff-text-target,.notation-expression-text-target,.notation-harmony-target,.notation-dynamic-target')].find(node=>(activeMeasureTextRequest.family==='rehearsalMarks'?node.dataset.rehearsalId:activeMeasureTextRequest.family==='staffTexts'?node.dataset.staffTextId:activeMeasureTextRequest.family==='expressionTexts'?node.dataset.expressionTextId:activeMeasureTextRequest.family==='harmonies'?node.dataset.harmonyId:activeMeasureTextRequest.family==='dynamics'?node.dataset.dynamicId:node.dataset.systemTextId)===activeMeasureTextRequest.id):undefined
    const target = measureTextTarget??canvas.querySelector<SVGElement>('.notation-span-target.is-selected')
      ?? selectedTarget
      ?? canvas.querySelector<SVGElement>('.notation-event.is-selected')
      ?? events[0]
      ?? canvas
    target.focus({ preventScroll: true })
    const scrollTarget=measureTextTarget?.querySelector('rect')??target
    scrollTarget.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' })
  }
  const focusScoreLatest = useRef(focusScore)
  focusScoreLatest.current = focusScore
  const isWorkspaceNavigationKey = (event: ReactKeyboardEvent) => event.key === 'F6' &&
    !event.ctrlKey && !event.metaKey && !event.altKey && !event.nativeEvent.isComposing && event.keyCode !== 229
  const isWorkspaceNavigation = (event: ReactKeyboardEvent, allowClosedSelect = false) => isWorkspaceNavigationKey(event) &&
    (!isTextEditingTarget(event.target) || (allowClosedSelect && event.target instanceof HTMLElement &&
      !!event.target.closest('button[role="combobox"][aria-expanded="false"]:not(:disabled)')))
  useEffect(() => {
    try { localStorage.setItem(dockWidthsStorageKey, JSON.stringify(dockWidths)) } catch { /* Session state remains usable. */ }
  }, [dockWidths])
  const [score, setScore] = useState(createInitialScore)
  const unsupportedChordTies = useMemo(() => collectUnsupportedChordTieWarnings(score), [score])
  const [selection, setSelection] = useState<EditorSelection>(() =>
    createInitialSelection(score)
  )
  const [mode, setMode] = useState<EditorMode>('select')
  const [noteInputState, setNoteInputState] = useState<NoteInputState>()
  const shouldRestoreFocusViewport=useCallback(()=>scoreViewportFollowing.current,[])
  // Stable UI address, not a new playback-clock object. Pending tuplets expose
  // their group anchor in the existing readout, not a fabricated next slot.
  const inputPosition=useMemo(()=>noteInputState&&!noteInputState.tupletInput
    ?{address:noteInputState.target,tick:noteInputState.tick}:undefined,
    [noteInputState?.target.partId,noteInputState?.target.staffId,noteInputState?.target.measureId,
      noteInputState?.target.voiceId,noteInputState?.tick,Boolean(noteInputState?.tupletInput)])
  const pendingInputPosition = noteInputState?.tupletInput ? noteInputState : undefined

  const [durationValue, setDurationValue] = useState<DurationValue>('quarter')
  const [activeLyricVerse, setActiveLyricVerse] = useState(1)
  const [lyricFocusRequest,setLyricFocusRequest]=useState(0)
  const [selectionEventTypeFilter, setSelectionEventTypeFilter] =
    useState<SelectionEventTypeFilter>('notes-and-rests')
  const [selectionObjectTypeFilter, setSelectionObjectTypeFilter] =
    useState<SelectionObjectTypeFilter>('none')
  const [rangeClipboard, setRangeClipboard] = useState<RangeClipboard>()
  const [measureMarkingClipboard, setMeasureMarkingClipboard] =
    useState<MeasureMarkingClipboard>()
  const [pendingSlurAnchorEventId, setPendingSlurAnchorEventId] =
    useState<string>()
  const [measureContextMenu, setMeasureContextMenu] =
    useState<MeasureContextMenuState>()
  const [undoStack, setUndoStack] = useState<EditorHistoryEntry[]>([])
  const [redoStack, setRedoStack] = useState<EditorHistoryEntry[]>([])
  const [metadataEdit, setMetadataEdit] = useState<MetadataEdit>()
  const [metadataActionsOpen, setMetadataActionsOpen] = useState(false)
  const metadataEditOrigin = useRef<HTMLButtonElement | undefined>(undefined)
  const metadataSession = useRef(0)
  const workspaceFocusRequest = useRef(0)
  const menuScoreFocusOrigin = useRef<Element | null>(null)
  const metadataFocusReturn = useRef<(Pick<MetadataEdit, 'field' | 'documentKey' | 'session' | 'partId'> & { input: HTMLInputElement; returnTarget?: HTMLButtonElement }) | undefined>(undefined)
  useEffect(() => { setMetadataActionsOpen(false) }, [score])
  const [newScoreDraft, setNewScoreDraft] = useState<NewScoreDraft>()
  const [selectedPartPresetId, setSelectedPartPresetId] = useState('violin')
  const [scoreViewMode, setScoreViewMode] = useState<ScoreViewMode>('score')
  const [selectedScoreViewPartId, setSelectedScoreViewPartId] =
    useState<string>()
  const [partPageSetupPreferences, setPartPageSetupPreferences] =
    useState<PartPageSetupPreferences>({})
  const [toolbarCategory, setToolbarCategory] =
    useState<ToolbarCategory>('note')
  const [mixerOpen,setMixerOpen]=useState(()=>{try{return JSON.parse(localStorage.getItem('studio.mixer-open.v1')??'false')===true}catch{return false}})
  useEffect(()=>{try{localStorage.setItem('studio.mixer-open.v1',JSON.stringify(mixerOpen))}catch{/* Local workspace failures do not affect playback. */}},[mixerOpen])
  const [pdfExporting, setPdfExporting] = useState(false)
  const [pdfTargetPages, setPdfTargetPages] =
    useState<PdfTargetPagesValue>('2')
  const [showPageMarginGuides, setShowPageMarginGuides] = useState(false)
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false)
  const [commandSearchOpen, setCommandSearchOpen] = useState(false)
  const commandSearchActive = useRef(false)
  const commandSearchOwner = useRef<{ generation: number; workspace: number; origin?: HTMLElement }>(undefined)
  const commandSearchRequest = useRef(0)
  const applicationMenusRef = useRef<readonly StudioMenuDefinition[]>([])
  const [nativeBackupsOpen, setNativeBackupsOpen] = useState(false)
  const backupRequest = useRef(0)
  const [partMixer, setPartMixer] =
    useState<PlaybackPartMixerMap>(readStoredPartMixer)
  const paletteWorkspace=useStudioPaletteWorkspace()
  const [dockVisibility, setDockVisibility] = useState(() => {
    try {
      const value = JSON.parse(window.localStorage.getItem(dockVisibilityStorageKey) ?? '{}')
      return { palette: value?.palette !== false, properties: value?.properties !== false }
    } catch {
      return { palette: true, properties: true }
    }
  })
  useEffect(() => {
    try {
      window.localStorage.setItem(dockVisibilityStorageKey, JSON.stringify(dockVisibility))
    } catch {
      // Workspace controls remain usable when browser storage is unavailable.
    }
  }, [dockVisibility])
  const shownDock: DockKind = dockVisibility[activeDock] ? activeDock : dockVisibility.palette ? 'palette' : 'properties'
  const dockShown = (name: DockKind) => dockVisibility[name] && (!sharedDocks || shownDock === name)
  const toggleDock = (name: DockKind) => {
    setActiveDock(name)
    setDockVisibility(previous => sharedDocks && previous[name] && shownDock !== name
      ? previous : {...previous,[name]:!previous[name]})
  }
  const focusDock = (name: DockKind, event: ReactFocusEvent<HTMLElement>) => {
    setActiveDock(name)
    if(!sharedDocks)return
    const target=event.target
    const intent=workspaceViewportIntent.current
    window.requestAnimationFrame(()=>{if(intent===workspaceViewportIntent.current)revealWorkspaceTarget(target)})
  }
  const revealWorkspaceValidation = (event: ReactFocusEvent<HTMLElement>) => {
    const target=event.target
    if(!(target instanceof HTMLInputElement)||!target.closest('.studio-span-properties,.studio-page-setup')||event.relatedTarget)return
    const generation=documentGeneration.current
    const request=workspaceFocusRequest.current
    const intent=workspaceViewportIntent.current
    // Let the adapter render its error first. Never move focus or override a
    // subsequent selection, document replacement, or explicit focus destination.
    window.requestAnimationFrame(()=>{
      if(generation!==documentGeneration.current||request!==workspaceFocusRequest.current||intent!==workspaceViewportIntent.current||!target.isConnected||!document.hasFocus()||
        (document.activeElement!==document.body&&document.activeElement!==target)||
        target.getAttribute('aria-invalid')!=='true')return
      scrollWorkspaceTargetIntoView(target)
      validationReveal.current={target,generation,request}
    })
  }
  const [startScreenVisible, setStartScreenVisible] = useState(
    () => !isFixtureMode()
  )
  useEffect(()=>{
    let frame=0
    let following=true
    const update=()=>{
      window.cancelAnimationFrame(frame)
      frame=window.requestAnimationFrame(()=>{
        if(!following)return
        const validation=validationReveal.current
        if(validation){
          const {target,generation,request}=validation
          if(generation===documentGeneration.current&&request===workspaceFocusRequest.current&&document.hasFocus()&&target.isConnected&&
            target.getAttribute('aria-invalid')==='true'&&
            (document.activeElement===document.body||document.activeElement===target)) {
            scrollWorkspaceTargetIntoView(target)
          }else validationReveal.current=undefined
        }
        const target=document.activeElement
        if(target instanceof Element && (
          (dockWorkspace.current?.contains(target) && (target.closest('aside') || target.matches('.notation-event,.notation-span-target,.notation-rehearsal-mark[role="button"],.notation-system-text-target[role="button"],.notation-staff-text-target[role="button"],.notation-expression-text-target[role="button"],.notation-dynamic-target[role="button"],.notation-harmony-target[role="button"]'))) ||
          target.closest('.studio-part-mixer,.studio-warning-report,.studio-export-tools,.studio-page-setup,.studio-tempo-event,.studio-part-labels,.studio-repeat-tools,.studio-metadata-editor,.studio-input-target,.studio-score-view')))
          revealWorkspaceTarget(target)
      })
    }
    const observer=typeof ResizeObserver==='undefined'?undefined:new ResizeObserver(update)
    const shell=dockWorkspace.current?.closest('main')
    const footer=shell?.querySelector('.studio-status')
    if(footer)observer?.observe(footer)
    // Reports and export fields can move after native focus scrolling finishes.
    // Observe only the surface that still owns focus.
    let focusedSurface:Element|null=null
    const trackSurfaceFocus=()=>{
      if(isRestoringNotationFocus(document.activeElement))return
      following=true
      scoreViewportFollowing.current=true
      const target=document.activeElement
      if(validationReveal.current && validationReveal.current.target!==target)validationReveal.current=undefined
      const next=target instanceof Element?target.closest('.studio-warning-report,.studio-export-tools,.studio-page-setup,.studio-span-properties,.studio-tempo-event,.studio-part-labels,.studio-selected-properties,.studio-repeat-tools,.studio-metadata-editor,.studio-input-target,.studio-score-view'):null
      if(next===focusedSurface)return
      if(focusedSurface)observer?.unobserve(focusedSurface)
      focusedSurface=next
      if(focusedSurface)observer?.observe(focusedSurface)
    }
    shell?.addEventListener('focusin',trackSurfaceFocus)
    trackSurfaceFocus()
    const mixer=shell?.querySelector('.studio-part-mixer')
    if(mixer)observer?.observe(mixer)
    // A validation message or sticky-height update can shrink the scrollport
    // after focus scrolling. Recheck the still-owned target at its final size.
    dockWorkspace.current?.querySelectorAll('aside').forEach(pane=>observer?.observe(pane))
    // A manual inspection owns the viewport until the next explicit focus
    // destination. Sticky-pane resizing is not a request to scroll back to
    // the old focused field/note. Keep input/playback following independent.
    const suspend=()=>{workspaceViewportIntent.current+=1;following=false;window.cancelAnimationFrame(frame);validationReveal.current=undefined}
    const scrollTracker=createViewportScrollTracker()
    const wheel=(event:WheelEvent|TouchEvent)=>{
      if(event instanceof WheelEvent&&!event.deltaX&&!event.deltaY)return
      const canvas=scoreCanvas.current
      if(!canvas||!scrollTracker.isInternalScroll(event,canvas))scoreViewportFollowing.current=false
      suspend()
    }
    const navigation=(event:KeyboardEvent)=>{
      // A pending field's explicit Save requests its confirmation guidance,
      // even after manual inspection suspended resize-following. A later
      // wheel/focus still owns the viewport and may cancel this frame.
      if (isDocumentSaveShortcut(event) && !event.isComposing && event.keyCode !== 229 && event.key !== 'Process') {
        const pending = documentDrafts.findPending()
        if (pending?.input === event.target && !pending.isComposing()) { following = true; update() }
      }
      if(!event.isComposing&&event.keyCode!==229&&!isTextEditingTarget(event.target)&&
        ['PageUp','PageDown','Home','End'].includes(event.key)){
        const canvas=scoreCanvas.current
        if(event.target===document.body||event.target===canvas||event.target instanceof Element&&canvas?.contains(event.target))scoreViewportFollowing.current=false
        suspend()
      }
    }
    const stopScrollbarObservation=observeDocumentScrollbarIntent(()=>{scoreViewportFollowing.current=false;suspend()})
    window.addEventListener('wheel',wheel,{capture:true,passive:true})
    window.addEventListener('touchstart',scrollTracker.touchStart,{capture:true,passive:true})
    window.addEventListener('touchmove',wheel,{capture:true,passive:true})
    window.addEventListener('keydown',navigation,true)
    window.addEventListener('resize',update);update()
    return ()=>{
      window.cancelAnimationFrame(frame);observer?.disconnect();shell?.removeEventListener('focusin',trackSurfaceFocus);window.removeEventListener('resize',update)
      window.removeEventListener('wheel',wheel,true);window.removeEventListener('touchstart',scrollTracker.touchStart,true)
      window.removeEventListener('touchmove',wheel,true);window.removeEventListener('keydown',navigation,true)
      stopScrollbarObservation()
    }
  },[documentDrafts,sharedDocks,shownDock,startScreenVisible])
  useEffect(() => {
    const root=dockWorkspace.current
    if(!root || !sharedDocks)return
    const shell=root.closest('main')
    let frame=0
    const update=()=>{
      window.cancelAnimationFrame(frame)
      frame=window.requestAnimationFrame(()=>{
        const pane=root.querySelector<HTMLElement>('aside:not([hidden])')
        if(!pane)return
        const top=Math.max(0,pane.getBoundingClientRect().top)
        const footer=shell?.querySelector('.studio-status')?.getBoundingClientRect().height ?? 0
        const height=`${Math.max(160,Math.floor(window.innerHeight-footer-top))}px`
        if(root.style.getPropertyValue('--studio-shared-dock-height')!==height)
          root.style.setProperty('--studio-shared-dock-height',height)
      })
    }
    const observer=typeof ResizeObserver==='undefined'?undefined:new ResizeObserver(update)
    if(shell)observer?.observe(shell)
    const footer=shell?.querySelector('.studio-status')
    if(footer)observer?.observe(footer)
    window.addEventListener('resize',update)
    window.addEventListener('scroll',update,{capture:true,passive:true})
    update()
    return ()=>{
      window.cancelAnimationFrame(frame);observer?.disconnect()
      window.removeEventListener('resize',update)
      window.removeEventListener('scroll',update,true)
      root.style.removeProperty('--studio-shared-dock-height')
    }
  },[sharedDocks,shownDock,dockVisibility,startScreenVisible])
  const [fileStatus, setFileStatus] = useState<{
    tone: 'neutral' | 'error'
    message: string
    details?: StudioOperationDiagnostic
  }>()
  const [musicXmlReport, setMusicXmlReport] =
    useState<MusicXmlReportPanelState>()
  const [autosaveRevision, setAutosaveRevision] = useState(0)
  const documentGeneration = useRef(0)
  const [tempoPointRequest, setTempoPointRequest] = useState<{
    generation: number; owner: string; measureId: string; tick: number
  }>()
  // Starting a wizard supersedes older read requests without replacing the
  // current document, dirty state, or history. Cancellation does not revive it.
  const documentOpenIntent = useRef(0)
  const validationReveal = useRef<{target:HTMLInputElement;generation:number;request:number} | undefined>(undefined)
  const inputReveal = useRef<{selection: EditorSelection; generation: number; focus: Element | null} | undefined>(undefined)
  const pendingInputReveal = useRef<{state: NoteInputState; generation: number; focus: Element | null; viewportIntent: number; sourceEvent: boolean} | undefined>(undefined)
  const requestPendingInputReveal = useCallback((state: NoteInputState) => {
    const focus = document.activeElement
    const sourceEvent = focus instanceof SVGElement && focus.matches('.notation-event') &&
      Boolean(scoreCanvas.current?.contains(focus)) && Number(focus.dataset.eventTick) === state.tick &&
      (['partId','staffId','measureId','voiceId'] as const).every(key => focus.dataset[key] === state.target[key])
    pendingInputReveal.current = {state, generation: documentGeneration.current,
      focus, viewportIntent: workspaceViewportIntent.current, sourceEvent}
  }, [])
  useEffect(() => {
    const intent = pendingInputReveal.current
    pendingInputReveal.current = undefined
    if (!intent || intent.state !== noteInputState || !noteInputState?.tupletInput) return
    const frame = window.requestAnimationFrame(() => {
      if (intent.generation !== documentGeneration.current || intent.viewportIntent !== workspaceViewportIntent.current ||
        !(intent.focus?.isConnected && document.activeElement === intent.focus ||
          // A rest replaced by a pending preview has a new event id. The
          // renderer returns its keyboard owner to the stable canvas.
          intent.sourceEvent && !intent.focus?.isConnected && document.activeElement === scoreCanvas.current ||
          isRedrawnScoreOrigin(intent.focus, document.activeElement))) return
      const anchor = findTupletInputPreview(scoreCanvas.current, noteInputState)
      if (anchor) scrollWorkspaceTargetIntoView(anchor)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [noteInputState])
  const selectEnteredEvent = useCallback((eventId: string, address: NoteInputState['target']) => {
    scoreViewportFollowing.current = true
    const next: EditorSelection = {type: 'event', eventId, address}
    inputReveal.current = {selection: next, generation: documentGeneration.current, focus: document.activeElement}
    setSelection(next)
  }, [])
  useEffect(() => {
    const intent = inputReveal.current ?? (inputPosition && scoreViewportFollowing.current && scoreCanvas.current?.contains(document.activeElement)
      ? {selection, generation: documentGeneration.current, focus: document.activeElement} : undefined)
    inputReveal.current = undefined
    if(!intent || intent.selection !== selection || selection.type !== 'event')return
    const frame = window.requestAnimationFrame(() => {
      if(!scoreViewportFollowing.current || intent.generation !== documentGeneration.current ||
        !(document.activeElement === intent.focus && intent.focus?.isConnected ||
          isRedrawnScoreOrigin(intent.focus, document.activeElement)))return
      const target = findNoteInputCursor(scoreCanvas.current, inputPosition) ?? [...(scoreCanvas.current?.querySelectorAll<SVGElement>('.notation-event') ?? [])].find(node =>
        node.dataset.eventId === selection.eventId && (!selection.address ||
          (node.dataset.partId === selection.address.partId && node.dataset.staffId === selection.address.staffId &&
            node.dataset.measureId === selection.address.measureId && node.dataset.voiceId === selection.address.voiceId)))
      if(target)scrollWorkspaceTargetIntoView(target)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [selection, score, inputPosition])
  useEffect(() => {
    const canvas = scoreCanvas.current
    if (!canvas || (!inputPosition && !pendingInputPosition)) return
    scoreViewportFollowing.current = true
    const generation = documentGeneration.current
    let frame = 0
    const revealInput = () => {
      const origin = document.activeElement
      if (!scoreViewportFollowing.current || !canvas.contains(origin)) return
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        if (!scoreViewportFollowing.current || generation !== documentGeneration.current ||
          !(origin?.isConnected && document.activeElement === origin ||
            isRedrawnScoreOrigin(origin, document.activeElement))) return
        // Pending tuplets own a preview member rather than an ordinary cursor.
        // Keep the same resize, inspection and focus ownership as normal input.
        const cursor = pendingInputPosition
          ? findTupletInputPreview(canvas, pendingInputPosition)
          : findNoteInputCursor(canvas, inputPosition)
        if (cursor) scrollWorkspaceTargetIntoView(cursor)
      })
    }
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(revealInput)
    const suspend = () => {
      scoreViewportFollowing.current = false
      window.cancelAnimationFrame(frame)
    }
    const scrollTracker = createViewportScrollTracker()
    const wheel = (event: WheelEvent | TouchEvent) => {
      if (event instanceof WheelEvent && !event.deltaX && !event.deltaY) return
      if (scrollTracker.isInternalScroll(event, canvas)) return
      suspend()
    }
    const keyboard = (event: KeyboardEvent) => {
      if (event.isComposing || event.keyCode === 229 || isTextEditingTarget(event.target)) return
      if (['PageUp','PageDown','Home','End'].includes(event.key) &&
        (event.target === document.body || event.target === canvas || event.target instanceof Element && canvas.contains(event.target))) suspend()
    }
    const stopScrollbarObservation = observeDocumentScrollbarIntent(suspend)
    observer?.observe(canvas)
    // Copy feedback can move the canvas without resizing it. Keep the next
    // input position above the status surface using the same ownership guards.
    const shell = canvas.closest('main')
    if (shell) observer?.observe(shell)
    const footer = shell?.querySelector('.studio-status')
    if (footer) observer?.observe(footer)
    window.addEventListener('resize', revealInput)
    window.addEventListener('wheel', wheel, {capture: true, passive: true})
    window.addEventListener('touchstart',scrollTracker.touchStart,{capture:true,passive:true})
    window.addEventListener('touchmove', wheel, {capture: true, passive: true})
    window.addEventListener('keydown', keyboard, true)
    return () => {
      window.cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('resize', revealInput)
      window.removeEventListener('wheel', wheel, true)
      window.removeEventListener('touchstart',scrollTracker.touchStart,true)
      window.removeEventListener('touchmove', wheel, true)
      window.removeEventListener('keydown', keyboard, true)
      stopScrollbarObservation()
    }
  }, [inputPosition, pendingInputPosition])
  const midiRequest = useRef(0)
  const firstSessionGeneration = useRef<number | undefined>(undefined)
  const firstProjectSaved = useRef(false)
  const [firstAchievement, setFirstAchievement] = useState<{generation:number;score:Score}>()
  const achievementDocumentGeneration = documentGeneration.current
  useEffect(() => {
    // Keep the first real save visible while the user reads or navigates tools.
    // Once editing resumes, dismiss it permanently rather than resurrecting it
    // when undo happens to restore the saved immutable score reference.
    if (firstAchievement && (firstAchievement.generation !== achievementDocumentGeneration || firstAchievement.score !== score)) {
      setFirstAchievement(undefined)
    }
  }, [firstAchievement, achievementDocumentGeneration, score])
  const [midiReport, setMidiReport] = useState<MidiReportPanelState>()
  const [midiFailure, setMidiFailure] = useState<{generation:number;message:string}>()
  const [pdfResult, setPdfResult] = useState<{generation:number;fileName:string;source:PdfRenderSnapshot;lyricOverlap?:boolean;lyricClipped?:boolean;harmonyClipped?:boolean;pageTargetExceeded?:boolean}>()
  const currentPdfContext = useRef<PdfRenderSnapshot | undefined>(undefined)
  const pdfSnapshotRoot = useRef<HTMLDivElement>(null)
  const [pdfSnapshot, setPdfSnapshot] = useState<PdfRenderSnapshot>()
  const pngSnapshotRoot = useRef<HTMLDivElement>(null)
  const [pngSnapshot, setPngSnapshot] = useState<PdfRenderSnapshot>()
  const pngOwner = useRef<{generation:number;id:number} | undefined>(undefined)
  const pngRequest = useRef(0)
  const [pngJob, setPngJob] = useState<{generation:number;id:number;done:number;total:number}>()
  const [pngNotice, setPngNotice] = useState<{generation:number;message:string}>()
  const [pngScope, setPngScope] = useState<'all'|'page'>('all')
  const [pngPage, setPngPage] = useState('1')
  const [pngDpi, setPngDpi] = useState<PngDpi>(300)
  const pngBusy = pngJob?.generation === documentGeneration.current
  const [scoreGuideOpen, setScoreGuideOpen] = useState(false)
  const pdfInFlight = useRef(false)
  const wizardTrigger = useRef<HTMLElement | null>(null)
  const wizardComposing = useRef(false)
  useEffect(() => {
    try { firstProjectSaved.current = localStorage.getItem('chromatics.studio-first-project.v1') === 'saved' } catch { /* Session-only feedback when storage is unavailable. */ }
  }, [])
  const firstSession = firstSessionGeneration.current === documentGeneration.current
  const hasFirstNote = scoreHasNotes(score)
  const currentPdfResult = pdfResult?.generation === documentGeneration.current ? pdfResult : undefined
  const currentMidiReport = midiReport?.generation === documentGeneration.current ? midiReport : undefined
  const currentMidiFailure = midiFailure?.generation === documentGeneration.current ? midiFailure : undefined
  const [spanSelection, setSpanSelection] = useState<{
    reference: SpanReference
    baseSelection: EditorSelection
    generation: number
    viewKey: string
  }>()
  const spanViewKey = `${scoreViewMode}:${selectedScoreViewPartId ?? ''}`
  const activeSpanReference = spanSelection?.baseSelection === selection &&
    spanSelection.generation === documentGeneration.current && spanSelection.viewKey === spanViewKey
    ? spanSelection.reference : undefined
  const [measureTextSelection,setMeasureTextSelection]=useState<MeasureTextPropertySelection>()
  const measureTextFocusSequence=useRef(0)
  const activeMeasureTextRequest=measureTextSelection?.baseSelection===selection&&
    measureTextSelection.generation===documentGeneration.current&&measureTextSelection.viewKey===spanViewKey
    ?measureTextSelection:undefined
  const currentScoreRef = useRef(score)
  currentScoreRef.current = score
  const currentFileStatus = useRef(fileStatus)
  currentFileStatus.current = fileStatus
  const metadataSaveGuidance = useRef<{
    documentKey: number
    session: number
    status: NonNullable<typeof fileStatus>
  } | undefined>(undefined)
  const saveInFlight = useRef(false)
  const activeFileSave = useRef<{ generation: number; kind: 'project' | 'musicxml'; previousStatus: typeof fileStatus } | undefined>(undefined)
  const activeMusicXmlCopy = useRef<{ generation: number; previousStatus: typeof fileStatus } | undefined>(undefined)
  const [savingMusicXml, setSavingMusicXml] = useState(false)
  const [savingNative, setSavingNative] = useState(false)
  // Controlled busy belongs to the live open intent, not an obsolete Button
  // promise that may remain pending after the user starts a new wizard.
  const [openingNative, setOpeningNative] = useState(false)
  const [openingMusicXml, setOpeningMusicXml] = useState(false)
  const [fileOperationFocus, setFileOperationFocus] = useState<{trigger: HTMLButtonElement; generation: number; viewportIntent: number}>()
  const fileOperationDocumentGeneration = documentGeneration.current
  const canRestoreFileFocus = useCallback((trigger: HTMLButtonElement, generation: number, viewportIntent: number) =>
    generation === documentGeneration.current && viewportIntent === workspaceViewportIntent.current && trigger.isConnected &&
    !trigger.closest('[hidden]') && trigger.checkVisibility?.() !== false &&
    (document.activeElement === document.body || document.activeElement === trigger), [])
  const returnFileOperationFocus = useCallback((trigger: HTMLButtonElement | null, generation: number, viewportIntent: number) => {
    // An older/disconnected completion must not replace a newer valid request
    // in the same React batch. Manual navigation during the request also owns
    // the viewport. Recheck both when the shared button unlocks and before reveal.
    if (trigger && canRestoreFileFocus(trigger, generation, viewportIntent)) setFileOperationFocus({ trigger, generation, viewportIntent })
  }, [canRestoreFileFocus])
  useEffect(() => {
    if (!fileOperationFocus) return
    const { trigger, generation, viewportIntent } = fileOperationFocus
    let frame = 0
    // The shared Button's own promise lock can outlive the parent's busy state.
    const restore = () => {
      if (!canRestoreFileFocus(trigger, generation, viewportIntent)) {
        observer.disconnect()
      } else if (!trigger.disabled) {
        observer.disconnect()
        trigger.focus()
        frame = window.requestAnimationFrame(() => {
          if (canRestoreFileFocus(trigger, generation, viewportIntent)) revealWorkspaceTarget(trigger)
        })
      }
    }
    const observer = new MutationObserver(restore)
    observer.observe(trigger, { attributes: true, attributeFilter: ['disabled'] })
    restore()
    return () => { observer.disconnect(); window.cancelAnimationFrame(frame) }
  }, [fileOperationFocus, fileOperationDocumentGeneration, canRestoreFileFocus])
  const nativeFile = useRef<{ filePath: string; fileName: string } | undefined>(undefined)
  const nativeEnvelope = useRef<NativeProject | undefined>(undefined)
  // Dirty counts reset on save; native-only layout edits need an independent
  // monotonic token so an old read cannot mistake reused counts for its snapshot.
  const partLayoutRevision = useRef(0)
  const nativeOpenInFlight = useRef(false)
  const musicXmlOpenInFlight = useRef(false)
  const currentNativeContext = useRef({ score, partPageSetupPreferences, scoreViewMode, selectedScoreViewPartId, autosaveRevision, noteInputState, livePartViewPartId: selectedScoreViewPartId, partLayoutRevision: partLayoutRevision.current })
  currentNativeContext.current = { score, partPageSetupPreferences, scoreViewMode, selectedScoreViewPartId, autosaveRevision, noteInputState, livePartViewPartId: selectedScoreViewPartId, partLayoutRevision: partLayoutRevision.current }
  const restoreDirtyRecoveryAfterClear = useCallback(async () => {
    const latest = currentNativeContext.current
    if (latest.autosaveRevision === 0) return
    await window.inC.autosave.write({ score: latest.score, title: latest.score.title,
      ...(nativeEnvelope.current ? { project: createNativeSnapshot(latest.score, nativeEnvelope.current, latest.partPageSetupPreferences, latest.scoreViewMode, latest.selectedScoreViewPartId) } : {}) })
  }, [])
  const exportInFlight = useRef(false)
  const [exportingMusicXml, setExportingMusicXml] = useState(false)
  useEffect(() => () => { documentGeneration.current += 1 }, [])
  const [recoverySnapshot, setRecoverySnapshot] =
    useState<AutosaveRecoverySnapshot>()
  const [recentMusicXmlFiles, setRecentMusicXmlFiles] = useState<
    RecentMusicXmlFile[]
  >([])
  const currentMusicXmlFileRef = useRef<
    Pick<RecentMusicXmlFile, 'filePath' | 'fileName'> | undefined
  >(undefined)
  const [missingRecentFilePath, setMissingRecentFilePath] = useState<string>()
  const autosaveHasLoaded = useRef(false)
  const [expressionProfile, setExpressionProfile] = useState<ExpressionProfile>()
  const performanceLabEnabled = new URLSearchParams(window.location.search).get('performanceLab') === '1'
  const [naturalPiano, setNaturalPiano] = useState(false)
  const pianoExpression = usePianoExpression(score, naturalPiano)
  const playback = useScorePlayback(score, partMixer, performanceLabEnabled ? expressionProfile : undefined,
    performanceLabEnabled ? undefined : pianoExpression.timeline)
  const playbackViewport = usePlaybackViewport(scoreCanvas,playback.status,scrollWorkspaceTargetIntoView)
  const [rewindSelection,setRewindSelection] = useState<EditorSelection | undefined>(undefined)
  const playFromSelection = useCallback(() => {
    // Tuplet members are an uncommitted preview. Playback-selection sync exits
    // input mode, so do not start a clock that would silently discard them.
    if (noteInputState?.tupletInput) {
      setFileStatus({tone:'neutral',message:'셋잇단음표 입력을 완료하거나 취소한 뒤 재생해 주세요.'})
      return
    }
    if(playback.status !== 'paused' && rewindSelection !== selection && !activeSpanReference && selection.type === 'event') {
      playback.playFromEvent(selection.eventId,selection.address)
    } else playback.play()
    setRewindSelection(undefined)
  },[selection,activeSpanReference,playback.status,playback.play,playback.playFromEvent,rewindSelection,noteInputState?.tupletInput])
  const rewindPlayback = () => {
    // Preserve the editing selection while making the next Play honor Rewind.
    setRewindSelection(selection)
    playback.jumpToStart()
  }
  const stopPlayback = () => { setRewindSelection(selection); playback.stop() }
  const scoreTempo = score.tempo?.bpm ?? DEFAULT_TEMPO_BPM
  const updatePartMixer = useCallback(
    (
      partId: string,
      update: (settings: PlaybackPartMixer) => PlaybackPartMixer
    ) => {
      setPartMixer((currentMixer) => {
        const nextMixer = {
          ...currentMixer,
          [partId]: update(resolvePartMixerSettings(currentMixer[partId]))
        }

        writeStoredPartMixer(nextMixer)
        return nextMixer
      })
    },
    []
  )
  const togglePartMute = useCallback(
    (partId: string) => {
      updatePartMixer(partId, (settings) => ({
        ...settings,
        muted: !settings.muted
      }))
    },
    [updatePartMixer]
  )
  const togglePartSolo = useCallback(
    (partId: string) => {
      updatePartMixer(partId, (settings) => ({
        ...settings,
        solo: !settings.solo
      }))
    },
    [updatePartMixer]
  )
  const changePartVolume = useCallback(
    (partId: string, value: string) => {
      const volume = Number(value) / 100

      updatePartMixer(partId, (settings) => ({
        ...settings,
        volume: Number.isFinite(volume) ? volume : settings.volume
      }))
    },
    [updatePartMixer]
  )
  const eventLocation = useMemo(
    () => {
      if (activeSpanReference) return undefined
      const eventId = getSelectionFocusEventId(selection)

      return eventId
        ? locateEvent(
            score,
            eventId,
            selection.type === 'measure' ? undefined : selection.address
          )
        : undefined
    },
    [activeSpanReference, score, selection]
  )
  // A range focus is a navigation/anchor context, not one selected object.
  const selectedEventLocation = selection.type === 'event' ? eventLocation : undefined
  const measureLocation = useMemo(
    () =>
      selection.type === 'measure'
        ? locateMeasure(score, selection.measureId, selection.address)
        : undefined,
    [score, selection]
  )
  const activeMeasureId = useMemo(
    () => resolveActiveMeasureId(score, selection, noteInputState),
    [noteInputState, score, selection]
  )
  const activeRepeatScope = useMemo(() => activeMeasureId ? resolveRepeatEditScope(score, activeMeasureId) : undefined, [score, activeMeasureId])
  const resolveGlobalMeasure = useMemo(() => createGlobalMeasureResolver(score), [score.parts])
  const globalAnnotationScore = useMemo(() => resolveGlobalAnnotationMeasures(score, resolveGlobalMeasure), [score, resolveGlobalMeasure])
  // Match the same global marks that are actually projected into the current part.
  // This changes only the read/edit address adapter, never the authored anchor.
  const globalTextPropertyScore=useMemo(()=>scoreViewMode==='part'&&selectedScoreViewPartId
    ?createLivePartViewScore(score,selectedScoreViewPartId):score,[score,scoreViewMode,selectedScoreViewPartId])
  const resolveVisibleGlobalTextMeasure=useMemo(()=>createGlobalMeasureResolver(globalTextPropertyScore),[globalTextPropertyScore.parts])
  const measures = score.parts[0]?.staves[0]?.measures ?? []
  const measureCount = measures.length
  const activeMeasureRehearsalMarks = useMemo(()=>activeMeasureId
    ? globalTextPropertyScore.rehearsalMarks?.filter(mark=>resolveVisibleGlobalTextMeasure(mark.measureId)===activeMeasureId)??[]
    :[],[activeMeasureId,globalTextPropertyScore.rehearsalMarks,resolveVisibleGlobalTextMeasure])
  const activeMeasureRehearsalMark = activeMeasureRehearsalMarks[0]
  const activeMeasureStaffTexts = activeMeasureId
    ? score.staffTexts?.filter((text) => text.measureId === activeMeasureId) ?? []
    : []
  const activeMeasureStaffText = activeMeasureStaffTexts[0]
  const activeMeasureSystemTexts = useMemo(()=>activeMeasureId
    ?globalTextPropertyScore.systemTexts?.filter(text=>resolveVisibleGlobalTextMeasure(text.measureId)===activeMeasureId)??[]
    :[],[activeMeasureId,globalTextPropertyScore.systemTexts,resolveVisibleGlobalTextMeasure])
  const activeMeasureSystemText = activeMeasureSystemTexts[0]
  const activeMeasureDynamics = activeMeasureId
    ? score.dynamics?.filter(dynamic => dynamic.measureId === activeMeasureId) ?? []
    : []
  const activeMeasureDynamic = activeMeasureDynamics[0]
  const selectedMeasureDynamic = activeMeasureTextRequest?.family === 'dynamics'
    ? activeMeasureDynamics.find(mark => mark.id === activeMeasureTextRequest.id) : undefined
  const selectedDynamicIsStored = Boolean(selectedMeasureDynamic && selectedMeasureDynamic.id !== activeMeasureDynamic?.id)
  const activeMeasureExpressionTexts=score.expressionTexts?.filter(text=>text.measureId===activeMeasureId)??[]
  const activeMeasureHarmonies=score.harmonies?.filter(mark=>mark.measureId===activeMeasureId)??[]
  const selectedAnnotationTick=activeMeasureTextRequest?.family==='expressionTexts'?activeMeasureExpressionTexts.find(text=>text.id===activeMeasureTextRequest.id)?.tick:activeMeasureTextRequest?.family==='harmonies'?activeMeasureHarmonies.find(mark=>mark.id===activeMeasureTextRequest.id)?.tick:undefined
  const activeLocationMeasureId = eventLocation?.measure.id ?? activeMeasureId
  const tempoPointOwner = JSON.stringify({ selection, annotation: activeMeasureTextRequest,
    span: activeSpanReference, input: noteInputState ? { target: noteInputState.target, tick: noteInputState.tick } : undefined })
  const requestedTempoLocation = tempoPointRequest?.generation === documentGeneration.current && tempoPointRequest.owner === tempoPointOwner
    ? locateMeasure(score, tempoPointRequest.measureId) : undefined
  const requestedTempoPoint = requestedTempoLocation && tempoPointRequest && tempoPointRequest.tick >= 0 &&
    tempoPointRequest.tick <= measureDurationTicks(requestedTempoLocation.measure) ? tempoPointRequest : undefined
  const tempoTargetMeasureId = requestedTempoPoint?.measureId ?? activeLocationMeasureId
  const tempoTargetTick = requestedTempoPoint?.tick ?? eventLocation?.event.position.tick ?? selectedAnnotationTick ?? noteInputState?.tick ?? 0
  const focusedMeasureTextObject=activeMeasureTextRequest&&(activeMeasureTextRequest.family==='rehearsalMarks'?activeMeasureRehearsalMarks:activeMeasureTextRequest.family==='staffTexts'?activeMeasureStaffTexts:activeMeasureTextRequest.family==='expressionTexts'?activeMeasureExpressionTexts:activeMeasureTextRequest.family==='harmonies'?activeMeasureHarmonies:activeMeasureTextRequest.family==='dynamics'?activeMeasureDynamics:activeMeasureSystemTexts).find(mark=>mark.id===activeMeasureTextRequest.id)
  const activeDots =
    noteInputState?.duration.dots ??
    eventLocation?.event.duration.dots ??
    0
  const activeDurationValue =
    noteInputState?.duration.value ??
    eventLocation?.event.duration.value ??
    durationValue
  const activeVoiceId =
    noteInputState?.target.voiceId ??
    eventLocation?.address.voiceId ??
    measureLocation?.address.voiceId
  const activeVoiceNumber = parseVoiceNumber(activeVoiceId)
  const activeAddress =
    noteInputState?.target ??
    eventLocation?.address ??
    measureLocation?.address ??
    selection.address
  const staffTargetOptions = useMemo(
    () => createStaffTargetOptions(score),
    [score]
  )
  const activeStaffTargetValue = resolveActiveStaffTargetValue(
    activeAddress,
    staffTargetOptions
  )
  const activeStructureTarget = resolveActiveStructureTarget(
    score,
    activeAddress
  )
  const activeStructurePart = score.parts.find(
    (part) => part.id === activeStructureTarget?.partId
  )
  const activeStructureStaff = activeStructurePart?.staves.find(
    (staff) => staff.id === activeStructureTarget?.staffId
  )
  const livePartViewPartId = useMemo(() => {
    if (
      selectedScoreViewPartId &&
      score.parts.some((part) => part.id === selectedScoreViewPartId)
    ) {
      return selectedScoreViewPartId
    }

    return activeStructureTarget?.partId ?? score.parts[0]?.id
  }, [activeStructureTarget?.partId, score.parts, selectedScoreViewPartId])
  currentNativeContext.current.livePartViewPartId = livePartViewPartId
  const livePartViewPart = score.parts.find(
    (part) => part.id === livePartViewPartId
  )
  const livePartViewPartLabel = livePartViewPart
    ? createPartOptionLabels(score.parts)[score.parts.findIndex(part=>part.id===livePartViewPart.id)]
    : undefined
  const livePartLayout = nativeEnvelope.current?.partLayouts.find(part => part.partId === livePartViewPartId)
  const automaticLyricSpacingSupported = supportsAutomaticLyricSpacing(score)
  const measuredLyrics = useLyricWidths(score, `${scoreViewMode}:${scoreViewMode==='part'?livePartViewPartId??'':''}`,automaticLyricSpacingSupported)
  const measuredHarmonies = useHarmonyWidths(score, `${scoreViewMode}:${scoreViewMode==='part'?livePartViewPartId??'':''}`)
  const livePartViewTitle = livePartLayout?.title ?? livePartViewPart?.name
  const visiblePlaybackEvent = scoreViewMode === 'part' && livePartViewPartId
    ? playback.getActiveEventForPart(livePartViewPartId) : playback.activeEvent
  // The clock advances every frame. A stable address must not replace the SVG
  // (and its focused lyric target) when the played event has not moved.
  const visiblePlaybackAddress = useMemo(() => visiblePlaybackEvent ? {
    partId:visiblePlaybackEvent.partId,staffId:visiblePlaybackEvent.staffId,
    measureId:visiblePlaybackEvent.measureId,voiceId:visiblePlaybackEvent.voiceId
  } : undefined,[visiblePlaybackEvent?.partId,visiblePlaybackEvent?.staffId,visiblePlaybackEvent?.measureId,visiblePlaybackEvent?.voiceId])
  const changeScoreView = (viewMode: ScoreViewMode, partId = livePartViewPartId) => {
    if (viewMode === 'part' && partId && score.parts.some(part => part.id === partId)) {
      if (activeAddress?.partId !== partId) {
        setSelection(createInitialSelection(score, partId))
        setSpanSelection(undefined)
        setPendingSlurAnchorEventId(undefined)
        setMeasureContextMenu(undefined)
      }
      if (noteInputState && noteInputState.target.partId !== partId) {
        setMode('select')
        setNoteInputState(undefined)
      }
      setSelectedScoreViewPartId(partId)
    }
    setScoreViewMode(viewMode)
  }
  const activeMeasureIndex = activeMeasureId
    ? (activeStructureStaff?.measures ?? measures).findIndex(measure => measure.id === activeMeasureId)
    : -1
  const layoutMeasureId = scoreViewMode === 'part'
    ? activeStructurePart?.id === livePartViewPartId ? livePartViewPart?.staves[0]?.measures[activeMeasureIndex]?.id : undefined
    : measures[activeMeasureIndex]?.id
  const activeLayout = useMemo(() => scoreViewMode === 'part' && livePartViewPartId
    ? applyPortablePartLayout(createLivePartViewScore(score, livePartViewPartId), livePartLayout).layout
    : score.layout, [score, scoreViewMode, livePartViewPartId, livePartLayout])
  const activeMeasureHasSystemBreak = Boolean(layoutMeasureId && activeLayout?.systemBreakBeforeMeasureIds?.includes(layoutMeasureId))
  const activeMeasureHasPageBreak = Boolean(layoutMeasureId && activeLayout?.pageBreakBeforeMeasureIds?.includes(layoutMeasureId))
  const pageSetup = useMemo(() => {
    const partPageSetup =
      scoreViewMode === 'part' && livePartViewPartId
        ? partPageSetupPreferences[livePartViewPartId]
        : undefined

    return normalizePrintPageSetup(partPageSetup ?? score.layout?.pageSetup)
  }, [
    livePartViewPartId,
    partPageSetupPreferences,
    score.layout?.pageSetup,
    scoreViewMode
  ])
  const activeKeySignature =
    eventLocation?.measure.keySignature ??
    measureLocation?.measure.keySignature ??
    score.parts[0]?.staves[0]?.measures[0]?.keySignature
  const activeKeySignatureId = activeKeySignature
    ? resolveKeySignaturePresetId(activeKeySignature)
    : keySignaturePresets[0].id
  const activeTimeSignature =
    eventLocation?.measure.timeSignature ??
    measureLocation?.measure.timeSignature ??
    score.parts[0]?.staves[0]?.measures[0]?.timeSignature
  const activeTimeSignatureId = activeTimeSignature
    ? resolveTimeSignaturePresetId(activeTimeSignature)
    : timeSignaturePresets[2].id
  const activeToolbarCategoryLabel =
    toolbarCategories.find((category) => category.id === toolbarCategory)
      ?.label ?? '음표'
  const selectedSpanObject = activeSpanReference && findSpan(score, activeSpanReference)
  const activeScopeLabel = resolveActiveScopeLabel(score, activeSpanReference
    ? selectedSpanObject && locateEvent(score, selectedSpanObject.startEventId)?.address
    : activeAddress)
  const inputModeLabel = noteInputState
    ? noteInputState.mode === 'rest'
      ? '쉼표 입력'
      : '음표 입력'
    : mode === 'rest'
      ? '쉼표 준비'
      : mode === 'note'
        ? '음표 준비'
        : '선택'
  useEffect(() => {
    const activePlaybackEvent = visiblePlaybackEvent

    if (playback.status !== 'playing' || !activePlaybackEvent) {
      return
    }

    setMode('select')
    setNoteInputState(undefined)
    setSelection({
      type: 'event',
      eventId: activePlaybackEvent.eventId,
      address: {
        partId: activePlaybackEvent.partId,
        staffId: activePlaybackEvent.staffId,
        measureId: activePlaybackEvent.measureId,
        voiceId: activePlaybackEvent.voiceId
      }
    })
  }, [visiblePlaybackEvent, playback.status])
  const addDotCommand =
    noteInputState || selection.type !== 'event'
      ? undefined
      : buildDotCommand(score, selection, 1)
  const removeDotCommand =
    noteInputState || selection.type !== 'event'
      ? undefined
      : buildDotCommand(score, selection, -1)
  const canAddDot = noteInputState
    ? activeDots < MAX_AUGMENTATION_DOTS
    : Boolean(addDotCommand)
  const canRemoveDot = noteInputState
    ? activeDots > 0
    : Boolean(removeDotCommand)
  const isTupletInput = Boolean(noteInputState?.tupletInput)
  const tupletMemberCount =
    noteInputState?.tupletInput
      ? countTupletInputSlots(noteInputState.tupletInput)
      : 0
  const tupletProgress = noteInputState?.tupletInput
    ? `${tupletMemberCount}/${noteInputState.tupletInput.actualNotes}`
    : undefined
  const tieSelected =
    selectedEventLocation?.event.type === 'note' &&
    Boolean(selectedEventLocation.event.ties?.start || selectedEventLocation.event.ties?.stop)
  const tieCommand = useMemo(
    () =>
      selectedEventLocation?.event.type === 'note'
        ? buildTieCommand(score, selectedEventLocation.event.id, !tieSelected)
        : undefined,
    [selectedEventLocation, score, tieSelected]
  )

  const applyEditorCommand = useCallback((command: EditorCommand): EditorCommand => {
    if (command.type === 'part-layout.replace') {
      partLayoutRevision.current += 1
      const project = nativeEnvelope.current ?? createNativeProject(score)
      const previous = project.partLayouts.find(part => part.partId === command.partId)
      nativeEnvelope.current = { ...project, partLayouts: [
        ...project.partLayouts.filter(part => part.partId !== command.partId),
        ...(command.value ? [command.value] : [])
      ] }
      if (command.pageSetupChange) {
        const preferences = { ...partPageSetupPreferences }
        if (command.pageSetupChange.value) preferences[command.partId] = command.pageSetupChange.value
        else delete preferences[command.partId]
        setPartPageSetupPreferences(preferences)
        const filePath = currentMusicXmlFileRef.current?.filePath
        if (filePath) writeStoredPartPageSetups(filePath, preferences)
      }
      return { type: 'part-layout.replace', partId: command.partId, value: previous,
        ...(command.pageSetupChange ? { pageSetupChange: { value: partPageSetupPreferences[command.partId] } } : {}) }
    }
    const result = applyScoreCommand(score, command)
    const previousLayouts = nativeEnvelope.current?.partLayouts ?? []
    if (command.partLayoutState) {
      nativeEnvelope.current = { ...(nativeEnvelope.current ?? createNativeProject(score)), partLayouts: command.partLayoutState }
    }
    setScore(result.score)
    return command.partLayoutState ? { ...result.undo, partLayoutState: previousLayouts } : result.undo
  }, [score, partPageSetupPreferences])

  const executeCommand = useCallback(
    (command: EditorCommand | undefined) => {
      if (!command) {
        return false
      }

      const inverse = applyEditorCommand(command)
      setAutosaveRevision((revision) => revision + 1)
      setUndoStack((entries) => [
        ...entries,
        {
          command: inverse,
          inputState: noteInputState,
          selection,
          measureTextSelection:activeMeasureTextRequest
        }
      ])
      setRedoStack([])
      setPendingSlurAnchorEventId(undefined)
      return true
    },
    [applyEditorCommand, noteInputState, selection,activeMeasureTextRequest]
  )

  const deleteSelectedMeasureText=useCallback(()=>{
    if(!activeMeasureTextRequest)return false
    // A property target must never fall through to the containing measure delete.
    if(!focusedMeasureTextObject)return true
    function remaining<T extends {id:string}>(items:readonly T[]|undefined){
      const next=items?.filter(item=>item.id!==focusedMeasureTextObject!.id)
      return next?.length?next:undefined
    }
    const command:ScoreCommand=activeMeasureTextRequest.family==='dynamics'
      ?{type:'score-dynamics.update',dynamics:remaining(score.dynamics)}
      :activeMeasureTextRequest.family==='harmonies'?{type:'score-harmonies.update',harmonies:remaining(score.harmonies)}
      :activeMeasureTextRequest.family==='expressionTexts'?{type:'score-expression-texts.update',expressionTexts:remaining(score.expressionTexts)}
      :activeMeasureTextRequest.family==='rehearsalMarks'?{type:'score-rehearsal-marks.update',rehearsalMarks:remaining(score.rehearsalMarks)}
      :activeMeasureTextRequest.family==='staffTexts'?{type:'score-staff-texts.update',staffTexts:remaining(score.staffTexts)}
      :{type:'score-system-texts.update',systemTexts:remaining(score.systemTexts)}
    if(executeCommand(command)){
      setMeasureTextSelection(undefined);setSelection(activeMeasureTextRequest.returnSelection)
      const promoted=activeMeasureTextRequest.family==='dynamics'&&
        score.dynamics?.find(mark=>mark.measureId===focusedMeasureTextObject.measureId)?.id===focusedMeasureTextObject.id
        ?score.dynamics?.find(mark=>mark.measureId===focusedMeasureTextObject.measureId&&mark.id!==focusedMeasureTextObject.id):undefined
      setFileStatus({tone:'neutral',message:activeMeasureTextRequest.family==='dynamics'
        ?`선택한 셈여림을 지웠습니다.${promoted?` 이 마디의 다음 셈여림(${promoted.value})을 표시·재생합니다.`:''}`
        :`선택한 ${measureTextLabels[activeMeasureTextRequest.family]}를 지웠습니다.`})
    }
    return true
  },[activeMeasureTextRequest,focusedMeasureTextObject,score.rehearsalMarks,score.systemTexts,score.staffTexts,score.expressionTexts,score.harmonies,score.dynamics,executeCommand])

  const selectSpan = useCallback((reference?: SpanReference) => {
    if (!reference) {
      setSpanSelection(undefined)
      return
    }
    if (!findSpan(score, reference)) return
    setMeasureTextSelection(undefined)
    setMode('select')
    setNoteInputState(undefined)
    setPendingSlurAnchorEventId(undefined)
    setToolbarCategory('span-properties')
    setDockVisibility(current => ({ ...current, properties: true }))
    setActiveDock('properties')
    setSpanSelection({ reference, baseSelection: selection, generation: documentGeneration.current, viewKey: spanViewKey })
  }, [score, selection, spanViewKey])

  const updateSpanEndpoint = useCallback((patch: Partial<{ startEventId: string; endEventId: string }>) => {
    if (!activeSpanReference) return
    try {
      executeCommand(buildSpanEndpointCommand(score, activeSpanReference, patch))
      setFileStatus({ tone: 'neutral', message: '표기 끝점을 수정했습니다.' })
    } catch (error) {
      setFileStatus({ tone: 'error', message: getErrorMessage(error) })
    }
  }, [activeSpanReference, executeCommand, score])

  const deleteSpan = useCallback(() => {
    if (!activeSpanReference) return
    const command = buildSpanDeleteCommand(score, activeSpanReference)
    if (command) executeCommand(command)
  }, [activeSpanReference, executeCommand, score])

  const updateSpanEngraving = useCallback((engraving?: SpanEngraving) => {
    if (!activeSpanReference) return
    try {
      const command = buildSpanEngravingCommand(score, activeSpanReference, engraving)
      const project = nativeEnvelope.current ?? createNativeProject(score)
      if (executeCommand(command)) nativeEnvelope.current = project
    } catch (error) {
      setFileStatus({ tone: 'error', message: getErrorMessage(error) })
    }
  }, [activeSpanReference, executeCommand, score])

  const switchActiveVoice = useCallback(
    (voiceNumber: (typeof voiceNumbers)[number]) => {
      const targetVoiceId = `voice-${voiceNumber}`
      const location = resolveVoiceSwitchLocation(
        score,
        selection,
        noteInputState
      )

      if (!location) {
        setFileStatus({
          tone: 'error',
          message: '성부를 전환할 마디를 선택해 주세요.'
        })
        return
      }

      let targetVoice = location.measure.voices.find(
        (voice) => voice.id === targetVoiceId
      )
      const targetAddress = {
        ...location.address,
        voiceId: targetVoiceId
      }

      if (!targetVoice) {
        if (location.staffMeasures.length === 0) {
          setFileStatus({
            tone: 'error',
            message: '성부를 추가할 보표를 찾지 못했습니다.'
          })
          return
        }

        targetVoice = createVoice({
          id: targetVoiceId,
          events: [
            createFullMeasureRest({
              id: `${location.measure.id}-${targetVoiceId}-full-measure-rest`
            })
          ]
        })

        const command: ScoreCommand = {
          type: 'staff-measures.replace',
          target: {
            partId: location.address.partId,
            staffId: location.address.staffId
          },
          measures: location.staffMeasures.map((measure) =>
            measure.id === location.measure.id
              ? {
                  ...measure,
                  voices: [...measure.voices, targetVoice!]
                }
              : measure
          )
        }

        if (!executeCommand(command)) {
          return
        }
      }

      const targetEvents = sortVoiceEvents(targetVoice.events)
      const activeTick = noteInputState?.tick ?? location.tick
      const targetEvent =
        targetEvents.find((event) => event.position.tick === activeTick) ??
        targetEvents[0]

      if (noteInputState) {
        setNoteInputState({
          ...noteInputState,
          target: targetAddress,
          tick: targetEvent?.position.tick ?? 0
        })
      }

      setSelection(
        targetEvent
          ? {
              type: 'event',
              eventId: targetEvent.id,
              address: targetAddress
            }
          : {
              type: 'measure',
              measureId: location.measure.id,
              address: targetAddress
            }
      )
      setMeasureContextMenu(undefined)
      setToolbarCategory('note')
      setFileStatus({
        tone: 'neutral',
        message: `${voiceNumber}성부로 전환했습니다.`
      })
    },
    [executeCommand, noteInputState, score, selection]
  )

  const switchActiveStaff = useCallback(
    (value: string) => {
      const target = parseStaffTargetValue(value)
      const location = resolveVoiceSwitchLocation(
        score,
        selection,
        noteInputState
      )

      if (!target || !location) {
        setFileStatus({
          tone: 'error',
          message: '입력 보표를 전환할 위치를 선택해 주세요.'
        })
        return
      }

      const targetPart = score.parts.find((part) => part.id === target.partId)
      const targetStaff = targetPart?.staves.find(
        (staff) => staff.id === target.staffId
      )

      if (!targetPart || !targetStaff) {
        setFileStatus({
          tone: 'error',
          message: '전환할 보표를 찾지 못했습니다.'
        })
        return
      }

      const targetMeasure =
        targetStaff.measures[location.measureIndex] ??
        targetStaff.measures.find(
          (measure) => measure.number === location.measure.number
        ) ??
        targetStaff.measures[0]

      if (!targetMeasure) {
        setFileStatus({
          tone: 'error',
          message: '전환할 마디를 찾지 못했습니다.'
        })
        return
      }

      const targetVoiceId = location.address.voiceId
      const targetAddress: VoiceAddress = {
        partId: target.partId,
        staffId: target.staffId,
        measureId: targetMeasure.id,
        voiceId: targetVoiceId
      }
      let targetVoice = targetMeasure.voices.find(
        (voice) => voice.id === targetVoiceId
      )

      if (!targetVoice) {
        targetVoice = createVoice({
          id: targetVoiceId,
          events: [
            createFullMeasureRest({
              id: `${targetMeasure.id}-${targetVoiceId}-full-measure-rest`
            })
          ]
        })

        const command: ScoreCommand = {
          type: 'staff-measures.replace',
          target: {
            partId: target.partId,
            staffId: target.staffId
          },
          measures: targetStaff.measures.map((measure) =>
            measure.id === targetMeasure.id
              ? {
                  ...measure,
                  voices: [...measure.voices, targetVoice!]
                }
              : measure
          )
        }

        if (!executeCommand(command)) {
          return
        }
      }

      const targetEvents = sortVoiceEvents(targetVoice.events)
      const activeTick = noteInputState?.tick ?? location.tick
      const targetEvent =
        targetEvents.find((event) => event.position.tick === activeTick) ??
        targetEvents[0]

      if (noteInputState) {
        setNoteInputState({
          ...noteInputState,
          target: targetAddress,
          tick: activeTick
        })
      }

      setSelection(
        targetEvent
          ? {
              type: 'event',
              eventId: targetEvent.id,
              address: targetAddress
            }
          : {
              type: 'measure',
              measureId: targetMeasure.id,
              address: targetAddress
            }
      )
      setMeasureContextMenu(undefined)
      setToolbarCategory('note')
      setFileStatus({
        tone: 'neutral',
        message: `${describeStaffTarget(score, target)}로 전환했습니다.`
      })
      if (scoreViewMode === 'part') setSelectedScoreViewPartId(target.partId)
    },
    [executeCommand, noteInputState, score, selection, scoreViewMode]
  )

  const updateActivePartLabel = useCallback(
    (field: 'name' | 'abbreviation', value: string) => {
      if (!activeStructurePart) {
        return
      }

      const nextValue = value.trim()
      const fallbackName = activeStructurePart.name.trim() || 'Part'
      const nextPart: Part =
        field === 'name'
          ? {
              ...activeStructurePart,
              name: nextValue || fallbackName
            }
          : {
              ...activeStructurePart,
              abbreviation: nextValue || undefined
            }

      if (
        nextPart.name === activeStructurePart.name &&
        nextPart.abbreviation === activeStructurePart.abbreviation
      ) {
        return
      }

      const command = buildScorePartsReplaceCommand(
        score,
        score.parts.map((part) =>
          part.id === activeStructurePart.id ? nextPart : part
        )
      )

      if (!executeCommand(command)) {
        return
      }

      setFileStatus({
        tone: 'neutral',
        message: `${nextPart.name} 파트 정보를 수정했습니다.`
      })
    },
    [activeStructurePart, executeCommand, score]
  )

  const moveActivePart = useCallback((direction: -1 | 1) => {
    const index = score.parts.findIndex((part) => part.id === activeStructurePart?.id)
    const targetIndex = index + direction
    if (index < 0 || targetIndex < 0 || targetIndex >= score.parts.length) return
    const parts = [...score.parts]
    const [part] = parts.splice(index, 1)
    parts.splice(targetIndex, 0, part)
    executeCommand(buildScorePartsReplaceCommand(score, parts))
  }, [activeStructurePart, executeCommand, score])

  const addPartToScore = useCallback(() => {
    const partPreset = resolvePartPreset(selectedPartPresetId)
    const partId = createUniqueIdFromBase(
      partPreset.id,
      new Set([
        ...score.parts.map(part => part.id),
        ...(nativeEnvelope.current?.partLayouts.map(layout => layout.partId) ?? []),
        ...Object.keys(partPageSetupPreferences)
      ])
    )
    const duplicateCount = countExistingPartNames(score, partPreset.label)
    const suffix = duplicateCount > 0 ? ` ${duplicateCount + 1}` : ''
    const partName = `${partPreset.label}${suffix}`
    const abbreviation = `${partPreset.abbreviation}${suffix}`
    const staves = partPreset.staves.map((staffPreset) =>
      createEmptyStaffFromScore(
        score,
        partId,
        staffPreset.id,
        staffPreset.clef,
        'transposition' in partPreset ? partPreset.transposition : undefined
      )
    )
    const nextPart = createPart({
      id: partId,
      name: partName,
      abbreviation,
      staves
    })
    const nextParts = [...score.parts, nextPart]
    const command = buildScorePartsReplaceCommand(score, nextParts)

    if (!executeCommand(command)) {
      return
    }

    setNoteInputState(undefined)
    setSelection(createStaffStartSelection(partId, staves[0]))
    if (scoreViewMode === 'part') setSelectedScoreViewPartId(partId)
    setToolbarCategory('note')
    setFileStatus({
      tone: 'neutral',
      message: `${partName} 파트를 악기 라이브러리에서 추가했습니다.`
    })
  }, [executeCommand, score, selectedPartPresetId, partPageSetupPreferences, scoreViewMode])

  const removeActivePart = useCallback(() => {
    if (!activeStructurePart || score.parts.length <= 1) {
      setFileStatus({
        tone: 'error',
        message: '마지막 남은 파트는 삭제할 수 없습니다.'
      })
      return
    }

    const nextParts = score.parts.filter(
      (part) => part.id !== activeStructurePart.id
    )
    const nextScore = {
      ...score,
      parts: nextParts
    }
    const command = buildScorePartsReplaceCommand(score, nextParts)

    if (!executeCommand(command)) {
      return
    }

    const nextPartIds = new Set(nextParts.map((part) => part.id))
    setPartMixer((currentMixer) =>
      Object.fromEntries(
        Object.entries(currentMixer).filter(([partId]) =>
          nextPartIds.has(partId)
        )
      )
    )
    setNoteInputState(undefined)
    setSelection(createInitialSelection(nextScore))
    setToolbarCategory('note')
    setFileStatus({
      tone: 'neutral',
      message: `${activeStructurePart.name} 파트를 삭제했습니다.`
    })
  }, [activeStructurePart, executeCommand, score])

  const addStaffToActivePart = useCallback(() => {
    if (!activeStructurePart) {
      return
    }

    const staffId = createUniqueNumberedId(
      'staff',
      new Set(activeStructurePart.staves.map((staff) => staff.id))
    )
    const clef =
      activeStructurePart.staves.length === 1
        ? ({ sign: 'F', line: 4 } as const)
        : ({ sign: 'G', line: 2 } as const)
    const staff = createEmptyStaffFromScore(
      score,
      activeStructurePart.id,
      staffId,
      clef
    )
    const nextParts = score.parts.map((part) =>
      part.id === activeStructurePart.id
        ? {
            ...part,
            staves: [...part.staves, staff]
          }
        : part
    )
    const command = buildScorePartsReplaceCommand(score, nextParts)

    if (!executeCommand(command)) {
      return
    }

    setNoteInputState(undefined)
    setSelection(createStaffStartSelection(activeStructurePart.id, staff))
    setToolbarCategory('note')
    setFileStatus({
      tone: 'neutral',
      message: `${activeStructurePart.name}에 보표를 추가했습니다.`
    })
  }, [activeStructurePart, executeCommand, score])

  const removeActiveStaff = useCallback(() => {
    if (!activeStructurePart || !activeStructureStaff) {
      return
    }

    if (activeStructurePart.staves.length <= 1) {
      setFileStatus({
        tone: 'error',
        message: '파트에는 보표가 하나 이상 필요합니다.'
      })
      return
    }

    const nextParts = score.parts.map((part) =>
      part.id === activeStructurePart.id
        ? {
            ...part,
            staves: part.staves.filter(
              (staff) => staff.id !== activeStructureStaff.id
            )
          }
        : part
    )
    const partLayouts = nativeEnvelope.current?.partLayouts
    const unresolved = unresolvedRemovedStaffLayoutAnchors(score.layout, score.parts, nextParts)
    const unresolvedPart = partLayouts?.some(layout => {
      const previous = score.parts.filter(part => part.id === layout.partId)
      const next = nextParts.filter(part => part.id === layout.partId)
      return unresolvedRemovedStaffLayoutAnchors(layout.layout, previous, next).length > 0
    })
    if (unresolved.length || unresolvedPart) {
      setFileStatus({ tone: 'error', message: '저장된 줄·페이지 나누기를 다른 보표로 옮길 수 없습니다. 해당 나누기를 해제한 뒤 보표를 삭제해 주세요.' })
      return
    }
    const command: EditorCommand = {
      ...buildScorePartsReplaceCommand(score, nextParts),
      ...(partLayouts ? { partLayoutState: partLayouts.map(layout => {
        const previousPart = score.parts.find(part => part.id === layout.partId)
        const nextPart = nextParts.find(part => part.id === layout.partId)
        return previousPart && nextPart ? { ...layout,
          layout: remapRemovedStaffLayoutAnchors(layout.layout, [previousPart], [nextPart]) ?? {}
        } : layout
      }) } : {})
    }

    if (!executeCommand(command)) {
      return
    }

    const nextPart = nextParts.find((part) => part.id === activeStructurePart.id)
    const nextStaff = nextPart?.staves[0]
    const nextScore = {
      ...score,
      parts: nextParts
    }

    setNoteInputState(undefined)
    setSelection(
      nextPart && nextStaff
        ? createStaffStartSelection(nextPart.id, nextStaff)
        : createInitialSelection(nextScore)
    )
    setToolbarCategory('note')
    setFileStatus({
      tone: 'neutral',
      message: `${activeStructurePart.name} 보표를 삭제했습니다.`
    })
  }, [activeStructurePart, activeStructureStaff, executeCommand, score])

  const changeActiveStaffClef = useCallback(
    (clefId: string) => {
      const preset = clefPresets.find((candidate) => candidate.id === clefId)

      if (!preset || !activeStructureTarget || !activeStructureStaff) {
        return
      }

      const command: ScoreCommand = {
        type: 'staff-measures.replace',
        target: {
          partId: activeStructureTarget.partId,
          staffId: activeStructureTarget.staffId
        },
        measures: activeStructureStaff.measures.map((measure) => ({
          ...measure,
          clef: preset.value
        }))
      }

      if (!executeCommand(command)) {
        return
      }

      setFileStatus({
        tone: 'neutral',
        message: `${describeStaffTarget(score, activeStructureTarget)} 음자리표를 바꿨습니다.`
      })
    },
    [activeStructureStaff, activeStructureTarget, executeCommand, score]
  )

  useEffect(() => {
    if (isFixtureMode() || autosaveHasLoaded.current) {
      return
    }

    autosaveHasLoaded.current = true
    let isActive = true
    const generation = documentGeneration.current
    const intent = documentOpenIntent.current

    window.inC.autosave
      .read()
      .then((snapshot) => {
        if (!isActive || generation !== documentGeneration.current || !snapshot || !isAutosaveRecoverySnapshot(snapshot)) {
          return
        }

        setRecoverySnapshot(snapshot)
      })
      .catch((error) => {
        if (!isActive || generation !== documentGeneration.current || intent !== documentOpenIntent.current) {
          return
        }

        setFileStatus({
          tone: 'error',
          message: '자동저장 복구본을 읽지 못했습니다. 프로젝트 파일을 직접 열거나 새 악보로 시작할 수 있습니다.',
          details: { operation: '자동저장 복구', message: getErrorMessage(error) }
        })
      })

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    if (isFixtureMode()) {
      return
    }

    let cancelled = false
    const generation = documentGeneration.current
    const intent = documentOpenIntent.current

    window.inC.recentMusicXml
      .list()
      .then((files) => {
        if (!cancelled) {
          setRecentMusicXmlFiles(files)
        }
      })
      .catch((error) => {
        if (!cancelled && generation === documentGeneration.current && intent === documentOpenIntent.current) {
          setFileStatus({
            tone: 'error',
            message: '최근 악보 목록을 불러오지 못했습니다. 프로젝트 파일을 직접 열거나 새 악보로 시작해 주세요.',
            details: { operation: '최근 악보 목록', message: getErrorMessage(error) }
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (isFixtureMode() || autosaveRevision === 0 || recoverySnapshot) {
      return
    }

    let active = true
    const envelope = nativeEnvelope.current
    const timeoutId = window.setTimeout(() => {
      Promise.resolve().then(() => active ? window.inC.autosave.write({
        score, title: score.title,
        ...(envelope ? { project: createNativeSnapshot(score, envelope, partPageSetupPreferences, scoreViewMode, selectedScoreViewPartId) } : {})
      }) : undefined)
        .catch((error) => {
          if (!active) return
          setFileStatus({
            tone: 'error',
            message: '자동저장에 실패했습니다. 편집 내용은 유지됩니다. 프로젝트 파일로 저장해 주세요.',
            details: { operation: '자동저장', message: getErrorMessage(error) }
          })
        })
    }, 1200)

    return () => {
      active = false
      window.clearTimeout(timeoutId)
    }
  }, [autosaveRevision, recoverySnapshot, score, partPageSetupPreferences, scoreViewMode, selectedScoreViewPartId])

  useEffect(() => {
    if (isFixtureMode()) {
      return
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      markBeforeUnloadWhenUnsaved(event, {
        autosaveRevision
      })
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [autosaveRevision])

  const recoverAutosave = useCallback(() => {
    if (!recoverySnapshot) {
      return
    }

    playback.stop()
    documentGeneration.current += 1
    nativeFile.current = undefined
    nativeEnvelope.current = recoverySnapshot.project
    setScore(recoverySnapshot.score)
    setScoreViewMode(recoverySnapshot.project?.view.mode ?? 'score')
    setSelectedScoreViewPartId(recoverySnapshot.project?.view.mode === 'part' ? recoverySnapshot.project.view.partId : undefined)
    setPartPageSetupPreferences(Object.fromEntries((recoverySnapshot.project?.partLayouts ?? [])
      .filter(part => part.layout.pageSetup)
      .map(part => [part.partId, normalizePrintPageSetup(part.layout.pageSetup)])))
    setAutosaveRevision((revision) => revision + 1)
    setUndoStack([])
    setRedoStack([])
    setMode('select')
    setNoteInputState(undefined)
    setMetadataEdit(undefined)
    setNewScoreDraft(undefined)
    setPendingSlurAnchorEventId(undefined)
    setSelection(createInitialSelection(recoverySnapshot.score,
      recoverySnapshot.project?.view.mode === 'part' ? recoverySnapshot.project.view.partId : undefined))
    setRecoverySnapshot(undefined)
    currentMusicXmlFileRef.current = undefined
    setStartScreenVisible(false)
    setFileStatus({
      tone: 'neutral',
      message: recoverySnapshot.project ? '프로젝트 복구본을 열었습니다. 새 파일로 저장해 주세요.' : '복구본을 열었습니다. 필요한 경우 MusicXML로 내보내 주세요.'
    })
  }, [playback, recoverySnapshot])

  const undo = useCallback(() => {
    const entry = undoStack.at(-1)

    if (!entry) {
      return
    }

    const inverse = applyEditorCommand(entry.command)
    setAutosaveRevision((revision) => revision + 1)
    setUndoStack((entries) => entries.slice(0, -1))
    setRedoStack((entries) => [
      ...entries,
      {
        command: inverse,
        inputState: noteInputState,
        selection,
        measureTextSelection:activeMeasureTextRequest
      }
    ])
    setNoteInputState(entry.inputState)
    setPendingSlurAnchorEventId(undefined)
    setSelection(entry.selection)
    setMeasureTextSelection(entry.measureTextSelection)
    const partId = entry.inputState?.target.partId ?? entry.selection.address?.partId
    if (scoreViewMode === 'part' && partId) setSelectedScoreViewPartId(partId)
  }, [applyEditorCommand, noteInputState, selection, undoStack, scoreViewMode,activeMeasureTextRequest])

  const redo = useCallback(() => {
    const entry = redoStack.at(-1)

    if (!entry) {
      return
    }

    const inverse = applyEditorCommand(entry.command)
    setAutosaveRevision((revision) => revision + 1)
    setRedoStack((entries) => entries.slice(0, -1))
    setUndoStack((entries) => [
      ...entries,
      {
        command: inverse,
        inputState: noteInputState,
        selection,
        measureTextSelection:activeMeasureTextRequest
      }
    ])
    setNoteInputState(entry.inputState)
    setPendingSlurAnchorEventId(undefined)
    setSelection(entry.selection)
    setMeasureTextSelection(entry.measureTextSelection)
    const partId = entry.inputState?.target.partId ?? entry.selection.address?.partId
    if (scoreViewMode === 'part' && partId) setSelectedScoreViewPartId(partId)
  }, [applyEditorCommand, noteInputState, redoStack, selection, scoreViewMode,activeMeasureTextRequest])

  const resolveMetadataSaveGuidance = useCallback((draft: MetadataEdit | undefined, message: string) => {
    const owner = metadataSaveGuidance.current
    if (!draft || !owner || owner.documentKey !== documentGeneration.current ||
      owner.documentKey !== draft.documentKey || owner.session !== draft.session) return
    metadataSaveGuidance.current = undefined
    // A later IO result can contain the same instruction as a historical
    // snapshot advisory. Only replace this exact draft-owned status object.
    // The updater also handles block + Escape in the same React batch.
    setFileStatus(current => current === owner.status ? { tone: 'neutral', message } : current)
  }, [])

  const beginMetadataEdit = useCallback(
    (field: MetadataField, returnTarget?: HTMLButtonElement) => {
      resolveMetadataSaveGuidance(metadataEdit, '악보 정보 입력을 확인했습니다.')
      metadataFocusReturn.current = undefined
      metadataEditOrigin.current = returnTarget
      setMode('select')
      setNoteInputState(undefined)
      setMetadataEdit({
        field,
        documentKey: documentGeneration.current,
        session: ++metadataSession.current,
        value: field === 'title' ? score.title : field === 'partTitle' ? livePartViewTitle ?? '' : score.composer ?? '',
        ...(field === 'partTitle' ? { partId: livePartViewPartId } : {})
      })
    },
    [score.composer, score.title, livePartViewPartId, livePartViewTitle, metadataEdit, resolveMetadataSaveGuidance]
  )

  const cancelMetadataEdit = useCallback(() => {
    resolveMetadataSaveGuidance(metadataEdit, '악보 정보 입력을 취소했습니다.')
    metadataSession.current += 1
    setMetadataEdit(undefined)
  }, [metadataEdit, resolveMetadataSaveGuidance])

  const updateMetadataDraft = (draft: MetadataEdit, value: string) => {
    if (draft.documentKey !== documentGeneration.current || draft.session !== metadataSession.current) return
    setMetadataEdit({ ...draft, value })
  }

  const commitMetadataEdit = useCallback(
    (field: MetadataField, value: string, unchangedBlur = false) => {
      if (!metadataEdit || metadataEdit.field !== field || metadataEdit.documentKey !== documentGeneration.current || metadataEdit.session !== metadataSession.current) return
      resolveMetadataSaveGuidance(metadataEdit, '악보 정보 입력을 확인했습니다.')
      // Consume before state flush: Enter can synchronously be followed by blur.
      metadataSession.current += 1
      // Inspection is not a metadata command. Explicit Enter and a real text
      // edit retain their existing normalization/part-title override contract.
      if (unchangedBlur) { setMetadataEdit(undefined); return }
      const trimmed = value.trim()
      if (field === 'partTitle') {
        const partId = metadataEdit?.partId
        setMetadataEdit(undefined)
        if (!partId || !score.parts.some(part => part.id === partId)) return
        const previous = nativeEnvelope.current?.partLayouts.find(part => part.partId === partId)
        const title = trimmed || undefined
        if (previous?.title === title) return
        executeCommand({ type: 'part-layout.replace', partId, value: { ...previous, partId, title, layout: previous?.layout ?? {} } })
        return
      }
      const title = field === 'title'
        ? trimmed || '제목 없는 악보'
        : score.title
      const composer = field === 'composer'
        ? trimmed || undefined
        : score.composer

      setMetadataEdit(undefined)

      if (title === score.title && composer === score.composer) {
        return
      }

      if (
        executeCommand({
          type: 'score-metadata.update',
          title,
          composer
        })
      ) {
        setFileStatus({
          tone: 'neutral',
          message: '악보 정보를 수정했습니다.'
        })
      }
    },
    [executeCommand, score.composer, score.title, score.parts, metadataEdit, resolveMetadataSaveGuidance]
  )

  const metadataSaveGuard = {
    hasPendingValue: (input: HTMLInputElement) => {
      if (!metadataEdit || metadataEdit.documentKey !== documentGeneration.current || metadataEdit.session !== metadataSession.current) return false
      const value = input.value.trim()
      if (metadataEdit.field === 'partTitle') {
        if (!score.parts.some(part => part.id === metadataEdit.partId)) return false
        return (value || undefined) !== nativeEnvelope.current?.partLayouts.find(part => part.partId === metadataEdit.partId)?.title
      }
      return metadataEdit.field === 'title' ? (value || '제목 없는 악보') !== score.title : (value || undefined) !== score.composer
    },
    onBlocked: () => {
      if (!metadataEdit || metadataEdit.documentKey !== documentGeneration.current || metadataEdit.session !== metadataSession.current) return
      const status = { tone: 'neutral' as const, message: `악보 정보 입력을 확인해 주세요. ${draftSaveGuidance}` }
      metadataSaveGuidance.current = { documentKey: metadataEdit.documentKey, session: metadataEdit.session, status }
      setFileStatus(status)
    }
  }

  const handleMetadataTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.nativeEvent.isComposing || event.keyCode === 229 || event.key === 'Process') {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    // Preserve native button activation without also running the document's Space playback command.
    if (!event.metaKey && !event.ctrlKey && !event.altKey && (event.key === 'Enter' || event.key === ' '))
      event.stopPropagation()
  }

  const restoreMetadataTriggerFocus = (node: HTMLButtonElement | null, field: MetadataField) => {
    const request = metadataFocusReturn.current
    if (!node || !request || request.field !== field) return
    metadataFocusReturn.current = undefined
    if (request.documentKey !== documentGeneration.current || request.session !== metadataSession.current ||
      (field === 'partTitle' && request.partId !== livePartViewPartId)) return
    // Keyboard completion owns this return only while the old field (or its removal) owns focus.
    // A blur commit must leave the user's next control alone.
    if (document.activeElement !== document.body && document.activeElement !== request.input) return
    const target = request.returnTarget?.isConnected && !request.returnTarget.disabled ? request.returnTarget : node
    target.focus({ preventScroll: true })
    revealWorkspaceTarget(target)
  }

  const handleMetadataKeyDown = useCallback(
    (
      event: ReactKeyboardEvent<HTMLInputElement>,
      field: MetadataField,
      value: string
    ) => {
      if (!metadataEdit || metadataEdit.documentKey !== documentGeneration.current || metadataEdit.field !== field || metadataEdit.session !== metadataSession.current) {
        event.stopPropagation()
        return
      }
      if (event.nativeEvent.isComposing || event.keyCode === 229 || event.key === 'Process') {
        event.stopPropagation()
        return
      }
      if (event.key === 'Enter' || event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        metadataFocusReturn.current = { ...metadataEdit, session: metadataSession.current + 1, input: event.currentTarget, returnTarget: metadataEditOrigin.current }
        if (event.key === 'Enter') commitMetadataEdit(field, value)
        else cancelMetadataEdit()
      }
    },
    [cancelMetadataEdit, commitMetadataEdit, metadataEdit]
  )

  const beginDocumentOpen = useCallback((kind?: 'native' | 'musicxml') => {
    const intent = ++documentOpenIntent.current
    nativeOpenInFlight.current = kind === 'native'
    musicXmlOpenInFlight.current = kind === 'musicxml'
    setOpeningNative(kind === 'native')
    setOpeningMusicXml(kind === 'musicxml')
    return intent
  }, [])

  const openNewScoreWizard = useCallback(() => {
    if (
      !isFixtureMode() &&
      !shouldReplaceCurrentScore(
        { autosaveRevision },
        window.confirm.bind(window)
      )
    ) {
      return
    }

    beginDocumentOpen()
    setMetadataEdit(undefined)
    workspaceFocusRequest.current += 1
    wizardTrigger.current = document.activeElement as HTMLElement | null
    wizardComposing.current = false
    setNewScoreDraft(createDefaultNewScoreDraft(playback.tempo))
  }, [autosaveRevision, playback.tempo, beginDocumentOpen])

  const cancelNewScoreWizard = useCallback(() => {
    const root = document.querySelector('.app-shell')
    const generation = documentGeneration.current
    const request = ++workspaceFocusRequest.current
    const trigger = wizardTrigger.current
    const origin = document.activeElement
    setNewScoreDraft(undefined)
    requestAnimationFrame(() => {
      if (!root?.isConnected || generation !== documentGeneration.current || request !== workspaceFocusRequest.current) return
      // Dialog cleanup may already restore its origin. A newer user destination
      // owns focus even when it remains inside the same workspace.
      if (document.activeElement !== document.body && document.activeElement !== origin && document.activeElement !== trigger) return
      if (trigger?.isConnected) trigger.focus()
    })
  }, [])

  const submitNewScoreWizard = useCallback(() => {
    if (!newScoreDraft) {
      return
    }

    const keySignature = resolveKeySignaturePreset(
      newScoreDraft.keySignatureId
    ).value
    const timeSignature = resolveTimeSignaturePreset(
      newScoreDraft.timeSignatureId
    ).value
    const nextScore = createNewScore({
      title: newScoreDraft.title,
      composer: newScoreDraft.composer,
      templateId: newScoreDraft.templateId,
      partName: '멜로디',
      partAbbreviation: 'Mel.',
      keySignature,
      timeSignature,
      measureCount: newScoreDraft.measureCount,
      tempo: newScoreDraft.tempo
    })

    playback.stop()
    documentGeneration.current += 1
    firstSessionGeneration.current = documentGeneration.current
    setMusicXmlReport(undefined)
    nativeFile.current = undefined
    nativeEnvelope.current = undefined
    setScore(nextScore)
    setScoreViewMode('score')
    setSelectedScoreViewPartId(undefined)
    setPartPageSetupPreferences({})
    setAutosaveRevision((revision) => revision + 1)
    setUndoStack([])
    setRedoStack([])
    setMode('select')
    setNoteInputState(undefined)
    setMetadataEdit(undefined)
    setNewScoreDraft(undefined)
    setPendingSlurAnchorEventId(undefined)
    setDurationValue('quarter')
    setSelection(createInitialSelection(nextScore))
    setRecoverySnapshot(undefined)
    currentMusicXmlFileRef.current = undefined
    setStartScreenVisible(false)
    setFileStatus({
      tone: 'neutral',
      message: '새 악보를 만들었습니다.'
    })
    const root = document.querySelector('.app-shell')
    const generation = documentGeneration.current
    const request = ++workspaceFocusRequest.current
    const origin = document.activeElement
    requestAnimationFrame(() => {
      if (!root?.isConnected || generation !== documentGeneration.current || request !== workspaceFocusRequest.current) return
      if (document.activeElement !== document.body && document.activeElement !== origin) return
      root.querySelector<HTMLButtonElement>('[aria-label="음표 입력 전환, 단축키 N"]')?.focus()
    })
  }, [newScoreDraft, playback])

  const changeScoreTempo = useCallback(
    (nextTempo: number) => {
      const tempo = normalizeNumberInput(
        nextTempo,
        MIN_TEMPO_BPM,
        MAX_TEMPO_BPM,
        scoreTempo
      )

      executeCommand({
        type: 'score-tempo.update',
        tempo: createUpdatedTempoMarking(score.tempo, tempo)
      })
    },
    [executeCommand, score.tempo, scoreTempo]
  )

  const changeScoreTempoBeat = useCallback(
    (value: string) => {
      const option = resolveTempoBeatOption(value)

      executeCommand({
        type: 'score-tempo.update',
        tempo: createUpdatedTempoMarking(score.tempo, scoreTempo, {
          beatUnit: option.beatUnit,
          dots: option.dots
        })
      })
    },
    [executeCommand, score.tempo, scoreTempo]
  )

  const changeScoreTempoTransparency = useCallback(
    (transparent: boolean) => {
      executeCommand({
        type: 'score-tempo.update',
        tempo: createUpdatedTempoMarking(score.tempo, scoreTempo, {
          transparent
        })
      })
    },
    [executeCommand, score.tempo, scoreTempo]
  )

  const changeScoreRhythmFeel = useCallback(
    (value: string) => {
      const rhythmFeel = resolveRhythmFeelOption(value)

      executeCommand({
        type: 'score-rhythm-feel.update',
        rhythmFeel
      })
      setFileStatus({
        tone: 'neutral',
        message: rhythmFeel
          ? '리듬 해석 표기를 갱신했습니다.'
          : '리듬 해석 표기를 삭제했습니다.'
      })
    },
    [executeCommand]
  )

  const changeDuration = useCallback(
    (value: DurationValue) => {
      if (noteInputState?.tupletInput) {
        setDurationValue(value)
        setNoteInputState({
          ...noteInputState,
          duration: {
            ...createDuration(value),
            tuplet: {
              actualNotes: noteInputState.tupletInput.actualNotes,
              normalNotes: noteInputState.tupletInput.normalNotes
            }
          }
        })
        return
      }

      if (noteInputState) {
        setDurationValue(value)
        setNoteInputState({
          ...noteInputState,
          duration: createDuration(value)
        })
      } else if (selection.type === 'event') {
        const duration = createDuration(value)
        const command = buildDurationCommand(score, selection, duration)

        if (executeCommand(command)) {
          setDurationValue(value)
          setFileStatus({
            tone: 'neutral',
            message: describeDurationEditSuccess(
              score,
              selection,
              duration,
              durationLabels[value]
            )
          })
        } else {
          setFileStatus({
            tone: 'error',
            message: describeDurationEditFailure(score, selection, duration)
          })
        }
      } else {
        setDurationValue(value)
      }
    },
    [eventLocation, executeCommand, noteInputState, score, selection]
  )

  const toggleNoteInputMode = useCallback(() => {
    if (noteInputState) {
      setMode('select')
      setNoteInputState(undefined)
      setFileStatus({
        tone: 'neutral',
        message: '음표 입력을 종료했습니다.'
      })
      return
    }

    const inputState = createInputState(
      score,
      selection,
      createDuration(durationValue),
      'note'
    )

    if (!inputState) {
      setFileStatus({
        tone: 'error',
        message: '음표 입력을 시작할 위치를 선택해 주세요.'
      })
      return
    }

    setMode('note')
    setMeasureTextSelection(undefined)
    setNoteInputState(inputState)
    setFileStatus({
      tone: 'neutral',
      message: '음표 입력'
    })
  }, [durationValue, noteInputState, score, selection])

  const changeDots = useCallback(
    (direction: -1 | 1) => {
      if (noteInputState) {
        if (noteInputState.tupletInput) {
          return
        }

        const dots = noteInputState.duration.dots + direction

        if (dots < 0 || dots > MAX_AUGMENTATION_DOTS) {
          return
        }

        setNoteInputState({
          ...noteInputState,
          duration: {
            ...noteInputState.duration,
            dots
          }
        })
        return
      }

      executeCommand(direction === 1 ? addDotCommand : removeDotCommand)
    },
    [addDotCommand, executeCommand, noteInputState, removeDotCommand]
  )

  const changeAccidental = useCallback(
    (alter: NonNullable<Pitch['alter']>) => {
      if (noteInputState) {
        setNoteInputState({
          ...noteInputState,
          accidental: alter
        })
        return
      }

      if (executeCommand(buildAccidentalCommand(score, selection, alter)) && eventLocation?.event.type === 'note' && (eventLocation.event.pitches?.length ?? 0) > 1) {
        setFileStatus({ tone: 'neutral', message: '선택한 화음 전체의 임시표를 바꿨습니다.' })
      }
    },
    [executeCommand, noteInputState, score, selection, eventLocation]
  )

  const changeKeySignature = useCallback(
    (presetId: string) => {
      const keySignature = resolveKeySignaturePreset(presetId).value
      const command = buildKeySignatureCommand(score, selection, keySignature)

      if (executeCommand(command)) {
        setMode('select')
        setNoteInputState(undefined)
        setFileStatus({
          tone: 'neutral',
          message: '선택한 마디부터 조표를 바꿨습니다.'
        })
      }
    },
    [executeCommand, score, selection]
  )

  const changeTimeSignature = useCallback(
    (presetId: string) => {
      const timeSignature = resolveTimeSignaturePreset(presetId).value
      const timeSignatureCommand = buildTimeSignatureCommand(
        score,
        selection,
        timeSignature
      )
      const nextTempoBeat = resolveDefaultTempoBeatForTimeSignature(timeSignature)
      const tempoCommand =
        shouldFollowTimeSignatureTempoBeat(
          score.tempo,
          scoreTempo,
          activeTimeSignature ?? timeSignaturePresets[2].value
        ) &&
        ((score.tempo?.beatUnit ?? 'quarter') !== nextTempoBeat.beatUnit ||
          (score.tempo?.dots ?? 0) !== nextTempoBeat.dots)
          ? {
              type: 'score-tempo.update' as const,
              tempo: createUpdatedTempoMarking(
                score.tempo,
                scoreTempo,
                nextTempoBeat
              )
            }
          : undefined
      const command =
        timeSignatureCommand && tempoCommand
          ? {
              type: 'score.batch' as const,
              commands: [timeSignatureCommand, tempoCommand]
            }
          : timeSignatureCommand

      if (executeCommand(command)) {
        setMode('select')
        setNoteInputState(undefined)
        setFileStatus({
          tone: 'neutral',
          message: '선택한 마디의 박자표를 바꿨습니다.'
        })
      } else {
        setFileStatus({
          tone: 'error',
          message: '선택한 마디의 리듬이 새 박자표에 맞지 않습니다.'
        })
      }
    },
    [activeTimeSignature, executeCommand, score, scoreTempo, selection]
  )

  const movePitch = useCallback(
    (movement: PitchMovement, direction: -1 | 1) => {
      const command = buildPitchMovementCommand(score, selection, movement, direction)
      if (!command) {
        setFileStatus({ tone: 'error', message: '선택한 음표 또는 화음을 이동할 수 없습니다. 음높이 범위를 확인해 주세요.' })
        return
      }
      if (executeCommand(command) && eventLocation?.event.type === 'note' && (eventLocation.event.pitches?.length ?? 0) > 1) {
        setFileStatus({ tone: 'neutral', message: '선택한 화음의 모든 음을 이동했습니다.' })
      }
    },
    [executeCommand, score, selection, eventLocation]
  )

  const respellEnharmonically = useCallback(() => {
    if (
      executeCommand(buildEnharmonicRespellCommand(score, selection))
    ) {
      setFileStatus({
        tone: 'neutral',
        message: eventLocation?.event.type === 'note' && (eventLocation.event.pitches?.length ?? 0) > 1 ? '선택한 화음 전체를 같은 소리의 이명동음으로 바꿨습니다.' : '이명동음으로 바꿨습니다.'
      })
    } else {
      setFileStatus({
        tone: 'error',
        message: '이명동음으로 바꿀 음표를 선택해 주세요.'
      })
    }
  }, [executeCommand, score, selection, eventLocation])

  const changePitchStep = useCallback(
    (step: PitchStep) => {
      if (!executeCommand(buildPitchStepCommand(score, selection, step))) {
        setFileStatus({
          tone: 'error',
          message: '음표로 바꿀 수 없습니다. 선택 대상과 음높이 범위를 확인해 주세요.'
        })
      } else if (eventLocation?.event.type === 'note' && (eventLocation.event.pitches?.length ?? 0) > 1) {
        setFileStatus({ tone: 'neutral', message: '선택한 화음을 단음으로 바꿨습니다. 가사와 부착 기호는 유지했습니다.' })
      }
    },
    [executeCommand, score, selection, eventLocation]
  )

  const toggleTie = useCallback(() => {
    if (executeCommand(tieCommand)) {
      setFileStatus({
        tone: 'neutral',
        message: tieSelected ? '타이를 해제했습니다.' : '타이를 추가했습니다.'
      })
      return
    }

    setFileStatus({
      tone: 'error',
      message:
        selectedEventLocation?.event.type === 'note'
          ? '타이는 인접한 같은 음높이의 음표 또는 같은 구성음의 화음과 연결할 수 있습니다.'
          : '타이를 추가하거나 해제할 음표를 선택해 주세요.'
    })
  }, [selectedEventLocation, executeCommand, tieCommand, tieSelected])

  const toggleTuplet = useCallback(() => {
    if (noteInputState?.tupletInput) {
      setNoteInputState(cancelTupletInput(noteInputState))
      setFileStatus({
        tone: 'neutral',
        message: '셋잇단음표 입력을 취소했습니다.'
      })
      return
    }

    const duration = createDuration(tripletPreset.durationValue)

    if (!noteInputState) {
      const removesExistingTuplet = Boolean(eventLocation?.event.duration.tuplet)
      const { command, blockedByRestNotation, blockedBySpanAnchor } = buildTupletGroupCommandResult(
        score,
        selection,
        () => createInputId('event'),
        tripletPreset.actualNotes,
        tripletPreset.normalNotes
      )

      if (blockedByRestNotation) {
        setFileStatus({
          tone: 'error',
          message: '쉼표에 붙은 표기를 보존할 수 없어 잇단음표를 변경하지 않았습니다. 해당 쉼표의 표기와 선택 구간을 확인해 주세요.'
        })
        return
      }

      if (blockedBySpanAnchor) {
        setFileStatus({
          tone: 'error',
          message: '구간 기호의 연결 위치를 보존할 수 없어 잇단음표를 변경하지 않았습니다. 연결된 기호와 선택 구간을 확인해 주세요.'
        })
        return
      }

      if (command && executeCommand(command)) {
        setDurationValue(tripletPreset.durationValue)
        setFileStatus({
          tone: 'neutral',
          message: removesExistingTuplet
            ? '선택한 셋잇단음표를 해제했습니다.'
            : '선택한 구간에 셋잇단음표를 적용했습니다.'
        })
        return
      }

      const canStartTupletInputFromRest =
        eventLocation?.event.type === 'rest' &&
        eventLocation.event.duration.dots === 0
      const inputState = canStartTupletInputFromRest
        ? createInputState(
            score,
            selection,
            duration,
            'note'
          )
        : undefined
      const tupletState = inputState
        ? beginTupletInput(
            inputState,
            `tuplet-${crypto.randomUUID()}`,
            tripletPreset.actualNotes,
            tripletPreset.normalNotes
          )
        : undefined

      if (tupletState) {
        // A later playback event would clear this uncommitted input preview.
        if (playback.status === 'playing') playback.pause()
        setDurationValue(tripletPreset.durationValue)
        setNoteInputState(tupletState)
        setFileStatus({
          tone: 'neutral',
          message:
            '8분음표 셋잇단 입력을 시작했습니다. A-G와 R로 세 음표 또는 쉼표를 입력해 주세요.'
        })
        return
      }

      setFileStatus({
        tone: 'error',
        message: describeTupletToggleFailure(
          score,
          selection,
          tripletPreset.actualNotes,
          tripletPreset.normalNotes
        )
      })
      return
    }

    const inputState = {
      ...noteInputState,
      duration,
      mode: 'note' as const,
      tupletInput: undefined
    }

    const tupletState = beginTupletInput(
      inputState,
      `tuplet-${crypto.randomUUID()}`,
      tripletPreset.actualNotes,
      tripletPreset.normalNotes
    )

    if (tupletState) {
      if (playback.status === 'playing') playback.pause()
      setDurationValue(tripletPreset.durationValue)
      setNoteInputState(tupletState)
      setFileStatus({
        tone: 'neutral',
        message:
          '8분음표 셋잇단 입력을 시작했습니다. A-G와 R로 세 음표 또는 쉼표를 입력해 주세요.'
      })
    } else {
      setFileStatus({
        tone: 'error',
        message: '현재 위치에서는 셋잇단음표 입력을 시작할 수 없습니다.'
      })
    }
  }, [
    eventLocation,
    executeCommand,
    noteInputState,
    playback.status,
    playback.pause,
    score,
    selection
  ])

  const enterNote = useCallback(
    (step: PitchStep) => {
      const inputState =
        noteInputState ??
        createInputState(score, selection, createDuration(durationValue), 'note')

      if (!inputState) {
        return
      }

      const input = buildSequentialInput(
        score,
        {
          ...inputState,
          mode: 'note'
        },
        step,
        createInputId
      )

      if (!input) {
        setFileStatus({
          tone: 'error',
          message: '현재 위치에 음표를 입력할 수 없습니다. 남은 박자와 음높이 범위를 확인해 주세요.'
        })
        return
      }

      if (input.pending) {
        if (commandHasEffects(input.command) && !executeCommand(input.command)) {
          return
        }

        requestPendingInputReveal(input.nextState)
        setNoteInputState(input.nextState)
        setFileStatus({
          tone: 'neutral',
          message: describeTupletProgress(input.nextState)
        })
        return
      }

      if (executeCommand(input.command)) {
        setNoteInputState(input.nextState)

        selectEnteredEvent(input.eventId, inputState.target)
        if (inputState.tupletInput) {
          setFileStatus({
            tone: 'neutral',
            message: '셋잇단음표 입력을 완료했습니다.'
          })
        }
      }
    },
    [durationValue, executeCommand, noteInputState, score, selection, selectEnteredEvent, requestPendingInputReveal]
  )

  const enterRest = useCallback(() => {
    const inputState =
      noteInputState ??
      createInputState(score, selection, createDuration(durationValue), 'rest')

    if (!inputState) {
      setFileStatus({
        tone: 'error',
        message: '쉼표를 입력할 음표나 쉼표를 먼저 선택해 주세요.'
      })
      return
    }

    const input = buildSequentialInput(
      score,
      {
        ...inputState,
        mode: 'rest'
      },
      undefined,
      createInputId
    )

    if (!input) {
      setFileStatus({
        tone: 'error',
        message: noteInputState?.tupletInput
          ? '이 위치에는 셋잇단음표가 들어갈 수 없습니다. 현재 마디 안의 이어진 빈 박자에서 시작해 주세요.'
          : `${durationLabels[durationValue]} 쉼표가 들어갈 빈 박자가 부족합니다.`
      })
      return
    }

    if (input.pending) {
      if (commandHasEffects(input.command) && !executeCommand(input.command)) {
        return
      }

      requestPendingInputReveal(input.nextState)
      setNoteInputState(input.nextState)
      setFileStatus({
        tone: 'neutral',
        message: describeTupletProgress(input.nextState)
      })
      return
    }

    if (executeCommand(input.command)) {
      setNoteInputState(input.nextState)

      selectEnteredEvent(input.eventId, inputState.target)
      if (inputState.tupletInput) {
        setFileStatus({
            tone: 'neutral',
            message: '셋잇단음표 입력을 완료했습니다.'
          })
      }
    }
  }, [durationValue, executeCommand, noteInputState, score, selection, selectEnteredEvent, requestPendingInputReveal])

  const convertSelectionToRest = useCallback(() => {
    if (selection.type === 'range') {
      const result = buildRangeRestResult(score, selection)
      if (executeCommand(result.command)) {
        setMode('select')
        setNoteInputState(undefined)
        setFileStatus({
          tone: 'neutral',
          message: `${selection.eventIds.length}개 선택 범위를 쉼표로 바꿨습니다.`
        })
        return
      }

      setFileStatus({
        tone: 'error',
        message: result.blockedByOctaveEndpoint ? octaveRestConflictMessage() :
          '같은 마디의 단순 범위만 쉼표로 바꿀 수 있습니다. 타이와 셋잇단음표는 아직 제외됩니다.'
      })
      return
    }

    if (selection.type !== 'event' || !eventLocation) {
      setFileStatus({
        tone: 'error',
        message: '쉼표로 바꿀 음표를 선택해 주세요.'
      })
      return
    }

    if (eventLocation.event.type === 'rest') {
      setFileStatus({
        tone: 'neutral',
        message: '이미 쉼표가 선택되어 있습니다.'
      })
      return
    }

    const octaveConflict = describeOctaveRestConflict(score, eventLocation.event.id)
    if (octaveConflict) {
      setFileStatus({ tone: 'error', message: octaveConflict })
      return
    }

    if (
      executeCommand(
        buildRestEntryCommand(
          score,
          selection,
          eventLocation.event.duration,
          () => createInputId('event')
        )
      )
    ) {
      setMode('select')
      setNoteInputState(undefined)
      setFileStatus({
        tone: 'neutral',
        message: '음표를 쉼표로 바꿨습니다.'
      })
    }
  }, [eventLocation, executeCommand, score, selection])

  const clearSelection = useCallback(() => {
    if(deleteSelectedMeasureText())return
    if (selectionObjectTypeFilter !== 'none' && selection.type !== 'measure') {
      setFileStatus({ tone: 'neutral', message: '표기 필터는 마디를 선택한 뒤 사용할 수 있습니다.' })
      return
    }

    if (selection.type === 'measure' && selectionObjectTypeFilter !== 'none') {
      const command = buildMeasureObjectDeleteCommand(
        score,
        selection.measureId,
        selectionObjectTypeFilter
      )

      if (!command) {
        setFileStatus({
          tone: 'error',
          message: '선택한 마디에 필터와 일치하는 표기가 없습니다.'
        })
        return
      }

      if (executeCommand(command)) {
        setFileStatus({
          tone: 'neutral',
          message: `${describeSelectionObjectFilter(selectionObjectTypeFilter)} 표기를 지웠습니다.`
        })
      }
      return
    }

    if (
      (selection.type !== 'event' && selection.type !== 'range') ||
      !eventLocation
    ) {
      return
    }

    const { command, blockedByOctaveEndpoint, blockedBySpanAnchor } = buildFilteredDeleteResult(score, selection, {
      eventTypes: selectionEventTypeFilter
    })

    if (!command) {
      const octaveConflict = eventLocation.event.type === 'note' && selectionEventTypeFilter !== 'rests'
        ? describeOctaveRestConflict(score, eventLocation.event.id) : undefined
      const rangeConflict = blockedByOctaveEndpoint ? octaveRestConflictMessage() : blockedBySpanAnchor
        ? '연결된 기호의 위치를 보존하며 지울 수 없습니다. 0 키로 쉼표로 바꾸거나 연결된 기호를 먼저 확인해 주세요.' : undefined
      const message = rangeConflict ?? (
        selection.type === 'range'
          ? selectionEventTypeFilter === 'notes-and-rests'
            ? '같은 마디의 연속 범위만 안정적으로 지울 수 있습니다.'
            : '현재 선택 범위에 필터와 일치하는 이벤트가 없습니다.'
          : eventLocation.event.duration.tuplet
            ? '잇단음표 구성음은 아직 따로 지울 수 없습니다.'
            : octaveConflict ?? (selectionEventTypeFilter === 'notes-and-rests'
              ? '선택한 음표 또는 쉼표를 이 위치에서는 지울 수 없습니다.'
              : '선택 필터와 일치하는 이벤트를 선택해 주세요.'))

      setFileStatus({
        tone: 'error',
        message
      })
      return
    }

    const result = applyScoreCommand(score, command)
    setScore(result.score)
    setAutosaveRevision((revision) => revision + 1)
    setUndoStack((entries) => [
      ...entries,
      {
        command: result.undo,
        inputState: noteInputState,
        selection
      }
    ])
    setRedoStack([])
    setNoteInputState(undefined)
    setSelection(
      resolveSelectionAfterClear(
        score,
        result.score,
        selection.type === 'range'
          ? selection.eventIds[selection.eventIds.length - 1]
          : selection.eventId,
        selection.address
      )
    )
    setFileStatus({
      tone: 'neutral',
      message:
        selection.type === 'range'
          ? `${selection.eventIds.length}개 이벤트를 지웠습니다.`
          : eventLocation.event.type === 'rest'
          ? '쉼표를 지웠습니다.'
          : '음표를 지웠습니다.'
    })
  }, [
    eventLocation,
    deleteSelectedMeasureText,
    executeCommand,
    noteInputState,
    score,
    selection,
    selectionEventTypeFilter,
    selectionObjectTypeFilter
  ])

  const singleTextPasteMeasureId=selection.type==='measure'?selection.measureId:selection.type==='event'?eventLocation?.measure.id:undefined
  const singleTextPasteTick=selection.type==='event'?eventLocation?.event.position.tick:0
  const copySelection = useCallback(() => {
    if(activeMeasureTextRequest){
      const clipboard=focusedMeasureTextObject&&buildSingleMeasureTextClipboard(score,activeMeasureTextRequest.family,focusedMeasureTextObject.id)
      if(!clipboard)return
      setMeasureMarkingClipboard(clipboard);setRangeClipboard(undefined)
      setFileStatus({tone:'neutral',message:activeMeasureTextRequest.family==='dynamics'?'셈여림 1개를 복사했습니다. 붙여넣으면 선택한 보표의 마디 전체 셈여림을 교체합니다.':`선택한 ${measureTextLabels[activeMeasureTextRequest.family]} 1개를 복사했습니다. 대상 마디나 음표를 선택해 추가하세요.`});return
    }
    if (selectionObjectTypeFilter !== 'none' && selection.type !== 'measure') {
      setFileStatus({ tone: 'neutral', message: '표기 필터는 마디를 선택한 뒤 사용할 수 있습니다.' })
      return
    }

    if (selection.type === 'measure' && selectionObjectTypeFilter !== 'none') {
      const clipboard = buildMeasureMarkingClipboard(
        score,
        selection.measureId,
        selectionObjectTypeFilter
      )

      if (!clipboard) {
        setFileStatus({
          tone: 'error',
          message: '선택한 마디에 필터와 일치하는 표기가 없습니다.'
        })
        return
      }

      setMeasureMarkingClipboard(clipboard)
      setRangeClipboard(undefined)
      setFileStatus({
        tone: 'neutral',
        message: `${describeSelectionObjectFilter(selectionObjectTypeFilter)} 표기를 복사했습니다.`
      })
      return
    }

    const clipboard = buildFilteredRangeClipboard(score, selection, {
      eventTypes: selectionEventTypeFilter
    })

    if (!clipboard) {
      setFileStatus({
        tone: 'error',
        message: '같은 마디의 단순 범위만 복사할 수 있습니다.'
      })
      return
    }

    setRangeClipboard(clipboard)
    setMeasureMarkingClipboard(undefined)
    setFileStatus({
      tone: 'neutral',
      message:
        selectionEventTypeFilter === 'notes-and-rests'
          ? `${clipboard.eventCount}개 이벤트를 복사했습니다.`
          : `${clipboard.eventCount}개 필터된 이벤트를 복사했습니다.`
    })
  }, [score, selection, selectionEventTypeFilter, selectionObjectTypeFilter,activeMeasureTextRequest,focusedMeasureTextObject])

  const pasteSelection = useCallback(() => {
    if (noteInputState?.tupletInput) {
      setFileStatus({
        tone: 'neutral',
        message: '셋잇단음표 입력을 완료하거나 취소한 뒤 붙여넣어 주세요.'
      })
      return
    }
    if(activeMeasureTextRequest){setFileStatus({tone:'neutral',message:'붙여넣을 마디나 음표를 먼저 선택해 주세요.'});return}
    if(measureMarkingClipboard?.pasteMode==='append-single'||measureMarkingClipboard?.pasteMode==='replace-measure'){
      const command=singleTextPasteMeasureId&&buildMeasureMarkingPasteCommand(score,singleTextPasteMeasureId,measureMarkingClipboard,()=>crypto.randomUUID(),singleTextPasteTick)
      if(!command){setFileStatus({tone:'error',message:measureMarkingClipboard.type==='dynamics'?'셈여림을 설정할 마디 또는 음표·쉼표 하나를 선택해 주세요. 선택한 보표의 마디 전체에 적용합니다.':measureMarkingClipboard.type==='harmonies'?'코드 심벌을 추가할 마디 또는 음표·쉼표 하나를 선택해 주세요. 마디 안의 유효한 위치만 지원합니다.':measureMarkingClipboard.type==='expression-texts'?'표현 텍스트를 추가할 마디나 음표를 선택해 주세요. 마디 안의 유효한 위치만 지원합니다.':measureMarkingClipboard.type==='staff-texts'?'추가할 마디나 음표를 선택해 주세요.':'현재는 총보 첫 보표의 마디에만 표기를 추가할 수 있습니다.'});return}
      if(executeCommand(command))setFileStatus({tone:'neutral',message:measureMarkingClipboard.pasteMode==='replace-measure'?'선택한 보표의 마디 전체 셈여림을 복사한 값으로 교체했습니다.':`${describeSelectionObjectFilter(measureMarkingClipboard.type)} 1개를 추가했습니다. 기존 표기는 유지했습니다.`})
      return
    }

    if (selectionObjectTypeFilter !== 'none' && selection.type !== 'measure') {
      setFileStatus({ tone: 'neutral', message: '표기 필터는 마디를 선택한 뒤 사용할 수 있습니다.' })
      return
    }

    if (selection.type === 'measure' && measureMarkingClipboard) {
      const command = buildMeasureMarkingPasteCommand(
        score,
        selection.measureId,
        measureMarkingClipboard,
        () => crypto.randomUUID()
      )

      if (!command) {
        setFileStatus({ tone: 'error', message: measureMarkingClipboard.type === 'system-texts' || measureMarkingClipboard.type === 'rehearsal-marks' ? `선택한 마디에 ${describeSelectionObjectFilter(measureMarkingClipboard.type)}를 붙여넣을 수 없습니다. 현재는 총보 첫 보표의 마디만 지원합니다.` : '선택한 마디에 표기를 붙여넣을 수 없습니다. 마디 길이와 표기 위치를 확인해 주세요.' })
        return
      }
      if (executeCommand(command)) {
        setFileStatus({
          tone: 'neutral',
          message: `${describeSelectionObjectFilter(measureMarkingClipboard.type)} 표기를 붙여넣었습니다.`
        })
      }
      return
    }

    if (!rangeClipboard) {
      setFileStatus({
        tone: 'error',
        message: '먼저 같은 마디의 범위를 복사해 주세요.'
      })
      return
    }

    const { command, blockedByOctaveEndpoint, blockedBySpanAnchor } = buildFilteredRangePasteResult(
      score,
      selection,
      rangeClipboard,
      () => createInputId('event'),
      { eventTypes: selectionEventTypeFilter }
    )

    if (!command) {
      setFileStatus({
        tone: 'error',
        message:
          blockedByOctaveEndpoint ? '옥타브 표시의 연결 위치를 보존하며 붙여넣을 수 없습니다. 원래 범위의 옥타브 표시를 먼저 확인해 주세요.' : blockedBySpanAnchor ? '구간 기호의 연결 위치를 보존하며 붙여넣을 수 없습니다. 연결된 기호와 선택 구간을 먼저 확인해 주세요.' :
          '같은 길이의 단순 범위에만 붙여넣을 수 있습니다. 타이와 셋잇단음표는 아직 제외됩니다.'
      })
      return
    }

    const result = applyScoreCommand(score, command)
    setScore(result.score)
    setAutosaveRevision((revision) => revision + 1)
    setUndoStack((entries) => [
      ...entries,
      {
        command: result.undo,
        inputState: noteInputState,
        selection
      }
    ])
    setRedoStack([])
    setNoteInputState(undefined)

    if (command.type === 'voice-events.replace' && command.editedEventId) {
      const pastedLocation = locateEvent(
        result.score,
        command.editedEventId,
        command.target
      )

      setSelection({
        type: 'event',
        eventId: command.editedEventId,
        address: pastedLocation?.address ?? command.target
      })
    }

    setFileStatus({
      tone: 'neutral',
      message: `${rangeClipboard.eventCount}개 이벤트를 붙여넣었습니다.`
    })
  }, [
    executeCommand,
    activeMeasureTextRequest,
    singleTextPasteMeasureId,
    singleTextPasteTick,
    measureMarkingClipboard,
    noteInputState,
    rangeClipboard,
    score,
    selection,
    selectionEventTypeFilter,
    selectionObjectTypeFilter
  ])

  const insertMeasure = useCallback((
    measureId: string,
    placement: 'before' | 'after'
  ) => {
    const editBuilder =
      placement === 'before' ? buildInsertMeasureBefore : buildInsertMeasureAfter
    const edit = editBuilder(
      score,
      measureId,
      createInputId,
      noteInputState
    )

    if (edit && executeCommand(edit.command)) {
      setSelection(edit.selection)
      setNoteInputState(edit.inputState)
      setMode('select')
      setFileStatus({
        tone: 'neutral',
        message:
          placement === 'before'
            ? '선택한 마디 앞에 새 마디를 추가했습니다.'
            : '선택한 마디 뒤에 새 마디를 추가했습니다.'
      })
      return true
    }

    setFileStatus({ tone: 'error', message: '마디를 추가할 수 없습니다. 선택 위치와 보표별 마디 수를 확인해 주세요.' })
    return false
  }, [executeCommand, noteInputState, score])

  const addMeasure = useCallback(() => {
    if (!activeMeasureId) {
      return
    }

    insertMeasure(activeMeasureId, 'after')
  }, [activeMeasureId, insertMeasure])

  const removeMeasureById = useCallback((measureId: string) => {
    if (measureCount <= 1) {
      setFileStatus({
        tone: 'error',
        message: '마지막 남은 마디는 삭제할 수 없습니다.'
      })
      return
    }

    const edit = buildRemoveMeasure(score, measureId, noteInputState)

    if (edit && executeCommand(edit.command)) {
      setSelection(edit.selection)
      setNoteInputState(edit.inputState)
      setMode('select')
      setFileStatus({
        tone: 'neutral',
        message: '마디를 삭제했습니다.'
      })
      return true
    }

    setFileStatus({ tone: 'error', message: '마디를 삭제할 수 없습니다. 선택 위치와 보표별 마디 수를 확인해 주세요.' })
    return false
  }, [executeCommand, measureCount, noteInputState, score])

  const removeMeasure = useCallback(() => {
    if (!activeMeasureId) {
      setFileStatus({
        tone: 'error',
        message: '삭제할 마디를 선택해 주세요.'
      })
      return
    }

    removeMeasureById(activeMeasureId)
  }, [activeMeasureId, removeMeasureById])

  const updateMeasureById = useCallback(
    (
      measureId: string,
      update: (measure: Measure) => Measure,
      message: string
    ) => {
      for (const part of score.parts) {
        for (const staff of part.staves) {
          if (!staff.measures.some((measure) => measure.id === measureId)) {
            continue
          }

          if (
            executeCommand({
              type: 'staff-measures.replace',
              target: {
                partId: part.id,
                staffId: staff.id
              },
              measures: staff.measures.map((measure) =>
                measure.id === measureId ? update(measure) : measure
              )
            })
          ) {
            setFileStatus({
              tone: 'neutral',
              message
            })
          }

          return
        }
      }
    },
    [executeCommand, score.parts]
  )

  const applyVoltaRange = useCallback(
    (measureId: string, number: 1 | 2) => {
      const scope = resolveRepeatEditScope(score, measureId)
      if (!scope) return
      const targetId = scope.location.measure.id
      for (const part of score.parts) {
        for (const staff of part.staves) {
          const selectedIndex = staff.measures.findIndex(
            (measure) => measure.id === targetId
          )

          if (selectedIndex < 0) {
            continue
          }

          const endIndex = findNextRepeatEndMeasureIndex(
            staff.measures,
            selectedIndex
          )

          executeCommand({
            type: 'staff-measures.replace',
            target: {
              partId: part.id,
              staffId: staff.id
            },
            measures: staff.measures.map((measure, index) => {
              if (measure.volta?.number === number) {
                return {
                  ...measure,
                  volta: undefined
                }
              }

              if (index !== selectedIndex && index !== endIndex) {
                return measure
              }

              const isRangeEnd =
                endIndex !== undefined && index === endIndex

              return {
                ...measure,
                volta: {
                  number,
                  start: index === selectedIndex || undefined,
                  end: isRangeEnd || undefined
                }
              }
            })
          })
          setFileStatus({
            tone: 'neutral',
            message: `${number}번 볼타 괄호를 갱신했습니다.`
          })
          return
        }
      }
    },
    [executeCommand, score]
  )

  const openMeasureContextMenu = useCallback((
    measureId: string,
    position: { x: number; y: number }
  ) => {
    setMode('select')
    setNoteInputState(undefined)
    setPendingSlurAnchorEventId(undefined)
    setSelection(createMeasureSelection(score, measureId))
    setMeasureContextMenu({
      measureId,
      x: position.x,
      y: position.y
    })
  }, [score])

  const closeMeasureContextMenu = useCallback(() => {
    setMeasureContextMenu(undefined)
  }, [])

  const applyMeasureContextAction = useCallback((action: MeasureContextAction) => {
    if (!measureContextMenu) {
      return
    }

    const { measureId } = measureContextMenu
    setMeasureContextMenu(undefined)

    if (action === 'insert-before') {
      insertMeasure(measureId, 'before')
    } else if (action === 'insert-after') {
      insertMeasure(measureId, 'after')
    } else if (action === 'remove') {
      removeMeasureById(measureId)
    } else if (action === 'toggle-repeat-start') {
      const scope = resolveRepeatEditScope(score, measureId)
      if (!scope) return
      updateMeasureById(
        scope.location.measure.id,
        (measure) => ({
          ...measure,
          repeat: normalizeRepeatMark({
            ...measure.repeat,
            start: measure.repeat?.start ? undefined : true
          })
        }),
        '도돌이표 시작을 갱신했습니다.'
      )
    } else if (action === 'toggle-repeat-end') {
      const scope = resolveRepeatEditScope(score, measureId)
      if (!scope) return
      updateMeasureById(
        scope.location.measure.id,
        (measure) => ({
          ...measure,
          repeat: normalizeRepeatMark({
            ...measure.repeat,
            end: measure.repeat?.end ? undefined : true,
            times: measure.repeat?.end ? undefined : measure.repeat?.times ?? 2
          })
        }),
        '도돌이표 끝을 갱신했습니다.'
      )
    } else {
      const number = action === 'toggle-volta-1' ? 1 : 2

      applyVoltaRange(measureId, number)
    }
  }, [
    applyVoltaRange,
    insertMeasure,
    measureContextMenu,
    removeMeasureById,
    updateMeasureById,
    score
  ])

  const toggleLayoutBreak = useCallback((kind: 'system' | 'page') => {
    if (!layoutMeasureId || activeMeasureIndex <= 0) return
    const key = kind === 'system' ? 'systemBreakBeforeMeasureIds' : 'pageBreakBeforeMeasureIds'
    const current = activeLayout?.[key] ?? []
    const removing = current.includes(layoutMeasureId)
    const next = removing ? current.filter(id => id !== layoutMeasureId) : [...current, layoutMeasureId]
    if (scoreViewMode === 'part' && livePartViewPartId) {
      executeCommand({ type: 'part-layout.replace', partId: livePartViewPartId, value: {
        ...livePartLayout, partId: livePartViewPartId,
        layout: { ...livePartLayout?.layout, [key]: next }
      } })
    } else {
      executeCommand({ type: 'score-layout.update', layout: { ...score.layout, [key]: next.length ? next : undefined } })
    }
    const label = kind === 'system' ? '시스템' : '페이지'
    setFileStatus({ tone: 'neutral', message: removing ? `${label} 나누기를 해제했습니다.` : `선택한 마디 앞에 ${label} 나누기를 추가했습니다.` })
  }, [layoutMeasureId, activeMeasureIndex, activeLayout, scoreViewMode, livePartViewPartId, livePartLayout, score.layout, executeCommand])
  const toggleSystemBreak = useCallback(() => toggleLayoutBreak('system'), [toggleLayoutBreak])
  const togglePageBreak = useCallback(() => toggleLayoutBreak('page'), [toggleLayoutBreak])

  const updatePageSetup = useCallback(
    (patch: Partial<Required<ScorePageSetup>>) => {
      const nextPageSetup = normalizePrintPageSetup({
        ...pageSetup,
        ...patch
      })

      if (scoreViewMode === 'part' && livePartViewPartId) {
        if (samePageSetup(nextPageSetup, pageSetup)) return
        executeCommand({ type: 'part-layout.replace', partId: livePartViewPartId,
          value: { ...livePartLayout, partId: livePartViewPartId, layout: { ...livePartLayout?.layout, pageSetup: nextPageSetup } },
          pageSetupChange: { value: nextPageSetup }
        })
        setFileStatus({
          tone: 'neutral',
          message: `${livePartViewPart?.name ?? '선택 파트'} 파트보 PDF 페이지 설정을 갱신했습니다.`
        })
        return
      }

      const layout = {
        ...score.layout,
        pageSetup: nextPageSetup
      }

      if (
        executeCommand({
          type: 'score-layout.update',
          layout
        })
      ) {
        setFileStatus({
          tone: 'neutral',
          message: 'PDF 페이지 설정을 갱신했습니다.'
        })
      }
    },
    [
      executeCommand,
      livePartLayout,
      livePartViewPart?.name,
      livePartViewPartId,
      pageSetup,
      score.layout,
      scoreViewMode
    ]
  )

  const applyPageSetupPreset = useCallback(
    (presetId: string) => {
      const preset = pageSetupPresets.find(
        (candidate) => candidate.id === presetId
      )

      if (!preset) {
        return
      }

      updatePageSetup(preset.value)
    },
    [updatePageSetup]
  )

  const updateActiveRehearsalMark = useCallback(
    (value: string, annotationId?: string) => {
      if (!activeMeasureId) {
        return
      }

      const text = value.trim()
      if(!text&&activeMeasureTextRequest?.family==='rehearsalMarks'&&annotationId===activeMeasureTextRequest.id){
        deleteSelectedMeasureText();return
      }
      const currentMarks = score.rehearsalMarks ?? []
      const existingMark = currentMarks.find(
        (mark) => resolveVisibleGlobalTextMeasure(mark.measureId) === activeMeasureId &&
          (annotationId === undefined || mark.id === annotationId)
      )

      if (annotationId !== undefined && !existingMark) {
        setFileStatus({ tone: 'error', message: '선택한 표기가 현재 위치에 없습니다. 다시 선택해 주세요.' })
        return
      }

      if ((existingMark?.text ?? '') === text) {
        return
      }

      const otherMarks = currentMarks.filter(
        (mark) => mark.id !== existingMark?.id
      )
      const rehearsalMarks =
        text.length > 0
          ? existingMark
            ? currentMarks.map(mark => mark.id === existingMark.id ? { ...mark, text } : mark)
            : [...currentMarks, {
                id: `rehearsal-${crypto.randomUUID()}`,
                measureId: activeMeasureId,
                text
              }]
          : otherMarks

      executeCommand({
        type: 'score-rehearsal-marks.update',
        rehearsalMarks: rehearsalMarks.length > 0 ? rehearsalMarks : undefined
      })
    },
    [activeMeasureId, executeCommand, score.rehearsalMarks, resolveVisibleGlobalTextMeasure, activeMeasureTextRequest, deleteSelectedMeasureText]
  )

  const updateActiveStaffText = useCallback(
    (value: string, annotationId?: string) => {
      if (!activeMeasureId) {
        return
      }

      const text = value.trim()
      if(!text&&activeMeasureTextRequest?.family==='staffTexts'&&annotationId===activeMeasureTextRequest.id){
        deleteSelectedMeasureText();return
      }
      const currentTexts = score.staffTexts ?? []
      const existingText = currentTexts.find(
        (staffText) => staffText.measureId === activeMeasureId &&
          (annotationId === undefined || staffText.id === annotationId)
      )
      if (annotationId !== undefined && !existingText) {
        setFileStatus({ tone: 'error', message: '선택한 표기가 현재 위치에 없습니다. 다시 선택해 주세요.' })
        return
      }

      if ((existingText?.text ?? '') === text) {
        return
      }

      const otherTexts = currentTexts.filter(
        (staffText) => staffText.id !== existingText?.id
      )
      const staffTexts =
        text.length > 0
          ? existingText
            ? currentTexts.map(item => item.id === existingText.id ? { ...item, text } : item)
            : [...currentTexts, {
                id: `staff-text-${crypto.randomUUID()}`,
                measureId: activeMeasureId,
                text
              }]
          : otherTexts

      executeCommand({
        type: 'score-staff-texts.update',
        staffTexts: staffTexts.length > 0 ? staffTexts : undefined
      })
    },
    [activeMeasureId, executeCommand, score.staffTexts, activeMeasureTextRequest, deleteSelectedMeasureText]
  )

  const updateActiveSystemText = useCallback(
    (value: string, annotationId?: string) => {
      if (!activeMeasureId) {
        return
      }

      const text = value.trim()
      if(!text&&activeMeasureTextRequest?.family==='systemTexts'&&annotationId===activeMeasureTextRequest.id){
        deleteSelectedMeasureText();return
      }
      const currentTexts = score.systemTexts ?? []
      const existingText = currentTexts.find(
        (systemText) => resolveVisibleGlobalTextMeasure(systemText.measureId) === activeMeasureId &&
          (annotationId === undefined || systemText.id === annotationId)
      )
      if (annotationId !== undefined && !existingText) {
        setFileStatus({ tone: 'error', message: '선택한 표기가 현재 위치에 없습니다. 다시 선택해 주세요.' })
        return
      }

      if ((existingText?.text ?? '') === text) {
        return
      }

      const otherTexts = currentTexts.filter(
        (systemText) => systemText.id !== existingText?.id
      )
      const systemTexts =
        text.length > 0
          ? existingText
            ? currentTexts.map(item => item.id === existingText.id ? { ...item, text } : item)
            : [...currentTexts, {
                id: `system-text-${crypto.randomUUID()}`,
                measureId: activeMeasureId,
                text
              }]
          : otherTexts

      executeCommand({
        type: 'score-system-texts.update',
        systemTexts: systemTexts.length > 0 ? systemTexts : undefined
      })
      setFileStatus({
        tone: 'neutral',
        message: text.length > 0 ? '시스템 텍스트를 갱신했습니다.' : '시스템 텍스트를 삭제했습니다.'
      })
    },
    [activeMeasureId, executeCommand, score.systemTexts, resolveVisibleGlobalTextMeasure, activeMeasureTextRequest, deleteSelectedMeasureText]
  )

  const updateActiveExpressionText = useCallback(
    (value: string, annotationId?: string) => {
      const targetMeasureId = eventLocation?.measure.id ?? activeMeasureId
      const targetTick =
        eventLocation?.event.position.tick ?? selectedAnnotationTick ?? noteInputState?.tick ?? 0

      if (!targetMeasureId) {
        return
      }

      const text = value.trim()
      if(!text&&activeMeasureTextRequest?.family==='expressionTexts'&&annotationId===activeMeasureTextRequest.id){deleteSelectedMeasureText();return}
      const currentTexts = score.expressionTexts ?? []
      const existingText = currentTexts.find(
        (expressionText) =>
          expressionText.measureId === targetMeasureId &&
          expressionText.tick === targetTick &&
          (annotationId === undefined || expressionText.id === annotationId)
      )
      if (annotationId !== undefined && !existingText) {
        setFileStatus({ tone: 'error', message: '선택한 표기가 현재 위치에 없습니다. 다시 선택해 주세요.' })
        return
      }

      if ((existingText?.text ?? '') === text) {
        return
      }

      const otherTexts = currentTexts.filter(
        (expressionText) => expressionText.id !== existingText?.id
      )
      const expressionTexts =
        text.length > 0
          ? existingText
            ? currentTexts.map(item => item.id === existingText.id ? { ...item, text } : item)
            : [...currentTexts, {
                id: `expression-text-${crypto.randomUUID()}`,
                measureId: targetMeasureId,
                tick: targetTick,
                text
              }]
          : otherTexts

      executeCommand({
        type: 'score-expression-texts.update',
        expressionTexts: expressionTexts.length > 0 ? expressionTexts : undefined
      })
      setFileStatus({
        tone: 'neutral',
        message: text.length > 0 ? '표현 텍스트를 갱신했습니다.' : '표현 텍스트를 삭제했습니다.'
      })
    },
    [
      selectedAnnotationTick,
      activeMeasureId,
      eventLocation,
      executeCommand,
      noteInputState?.tick,
      score.expressionTexts, activeMeasureTextRequest, deleteSelectedMeasureText
    ]
  )

  const updateActiveDynamic = useCallback(
    (value: string) => {
      if (!activeMeasureId || selection.type === 'range') {
        return
      }

      const dynamic = dynamicValues.find((candidate) => candidate === value)
      const currentDynamics = score.dynamics ?? []
      if(activeMeasureTextRequest?.family==='dynamics'){
        const matches=currentDynamics.filter(item=>item.id===activeMeasureTextRequest.id)
        const mark=matches.length===1?matches[0]:undefined
        if(!mark||mark.measureId!==activeMeasureId)return
        if(!dynamic){if(value==='')deleteSelectedMeasureText();return}
        if(mark.value===dynamic)return
        executeCommand({type:'score-dynamics.update',dynamics:currentDynamics.map(item=>item.id===mark.id?{...item,value:dynamic}:item)})
        setFileStatus({tone:'neutral',message:currentDynamics.find(item=>item.measureId===activeMeasureId)?.id===mark.id?'선택한 셈여림만 수정했습니다. 선택한 보표의 마디 전체에 적용합니다.':'선택한 원본 보관 셈여림만 수정했습니다. 표시·재생 중인 첫 번째 값은 유지합니다.'})
        return
      }
      const existingDynamic = currentDynamics.find(
        (mark) => mark.measureId === activeMeasureId
      )

      if ((existingDynamic?.value ?? '') === (dynamic ?? '')) {
        return
      }

      const otherDynamics = currentDynamics.filter(
        (mark) => mark.measureId !== activeMeasureId
      )
      const dynamics = dynamic
        ? [
            ...otherDynamics,
            {
              id: existingDynamic?.id ?? `dynamic-${crypto.randomUUID()}`,
              measureId: activeMeasureId,
              value: dynamic
            }
          ]
        : otherDynamics

      executeCommand({
        type: 'score-dynamics.update',
        dynamics: dynamics.length > 0 ? dynamics : undefined
      })
    },
    [activeMeasureTextRequest,deleteSelectedMeasureText,activeMeasureId, executeCommand, score.dynamics, selection.type]
  )

  const updateActiveMeasure = useCallback(
    (update: (measure: Measure) => Measure) => {
      if (!measureLocation) {
        return false
      }

      const part = score.parts.find(
        (candidate) => candidate.id === measureLocation.address.partId
      )
      const staff = part?.staves.find(
        (candidate) => candidate.id === measureLocation.address.staffId
      )

      if (!staff) {
        return false
      }

      return executeCommand({
        type: 'staff-measures.replace',
        target: {
          partId: measureLocation.address.partId,
          staffId: measureLocation.address.staffId
        },
        measures: staff.measures.map((measure) =>
          measure.id === measureLocation.measure.id ? update(measure) : measure
        )
      })
    },
    [executeCommand, measureLocation, score.parts]
  )

  const changeClef = useCallback(
    (clefId: string) => {
      const preset = clefPresets.find((candidate) => candidate.id === clefId)

      if (!preset || activeSpanReference) {
        return
      }

      if (
        updateActiveMeasure((measure) => ({
          ...measure,
          clef: preset.value
        }))
      ) {
        setFileStatus({
          tone: 'neutral',
          message: '선택한 마디의 음자리표를 바꿨습니다.'
        })
      }
    },
    [updateActiveMeasure, activeSpanReference]
  )

  const updateActiveRepeat = useCallback(
    (repeat: Measure['repeat']) => {
      if (!measureLocation || !activeRepeatScope) return
      updateMeasureById(activeRepeatScope.location.measure.id,
        measure => ({ ...measure, repeat }),
        repeat ? '도돌이표를 갱신했습니다.' : '도돌이표를 해제했습니다.')
    },
    [measureLocation, activeRepeatScope, updateMeasureById]
  )

  const toggleRepeatStart = useCallback(() => {
    const current = activeRepeatScope?.location.measure.repeat
    updateActiveRepeat({
      ...current,
      start: current?.start ? undefined : true
    })
  }, [activeRepeatScope?.location.measure.repeat, updateActiveRepeat])

  const toggleRepeatEnd = useCallback(() => {
    const current = activeRepeatScope?.location.measure.repeat
    updateActiveRepeat({
      ...current,
      end: current?.end ? undefined : true,
      times: current?.end ? undefined : current?.times ?? 2
    })
  }, [activeRepeatScope?.location.measure.repeat, updateActiveRepeat])

  const changeRepeatTimes = useCallback(
    (times: number) => {
      const current = activeRepeatScope?.location.measure.repeat
      const repeatTimes = Number.isNaN(times)
        ? current?.times ?? 2
        : Math.max(2, Math.min(8, Math.round(times)))

      updateActiveRepeat({
        ...current,
        end: true,
        times: repeatTimes
      })
    },
    [activeRepeatScope?.location.measure.repeat, updateActiveRepeat]
  )

  const toggleArticulation = useCallback(
    (articulation: Articulation) => {
      if (!selectedEventLocation || selectedEventLocation.event.type !== 'note') {
        return
      }

      const currentArticulations = new Set(
        selectedEventLocation.event.articulations ?? []
      )

      if (currentArticulations.has(articulation)) {
        currentArticulations.delete(articulation)
      } else {
        currentArticulations.add(articulation)
      }

      const articulations = Array.from(currentArticulations)

      executeCommand({
        type: 'voice-event.replace',
        target: selectedEventLocation.address,
        eventId: selectedEventLocation.event.id,
        event: {
          ...selectedEventLocation.event,
          articulations: articulations.length > 0 ? articulations : undefined
        }
      })
    },
    [selectedEventLocation, executeCommand]
  )

  const replaceSelectedNote = useCallback(
    (
      update: (note: Note) => Note,
      message: string
    ) => {
      if (!selectedEventLocation || selectedEventLocation.event.type !== 'note') {
        setFileStatus({
          tone: 'error',
          message: '음표를 선택해 주세요.'
        })
        return false
      }

      const next = update(selectedEventLocation.event)
      // Duplicate chord members return the original note. Do not add an empty
      // undo command or make a clean document dirty when no edit occurred.
      if (next === selectedEventLocation.event) return false
      if (
        executeCommand({
          type: 'voice-event.replace',
          target: selectedEventLocation.address,
          eventId: selectedEventLocation.event.id,
          event: next
        })
      ) {
        setFileStatus({
          tone: 'neutral',
          message
        })
        return true
      }

      return false
    },
    [selectedEventLocation, executeCommand]
  )

  const addChordTone = useCallback(
    (stepsAbove: 2 | 4) => {
      replaceSelectedNote((note) => {
        const pitches = normalizeChordPitches(note)
        const pitch = transposeChordPitch(note.pitch, stepsAbove)

        if (pitches.some((candidate) => samePitch(candidate, pitch))) {
          return note
        }

        return {
          ...note,
          pitches: [...pitches, pitch].sort(comparePitch)
        }
      }, '화음 구성음을 추가했습니다.')
    },
    [replaceSelectedNote]
  )

  const addChordPitchStep = useCallback(
    (step: PitchStep) => {
      replaceSelectedNote((note) => {
        const pitches = normalizeChordPitches(note)
        const pitch: Pitch = {
          step,
          octave: note.pitch.octave
        }

        if (pitches.some((candidate) => samePitch(candidate, pitch))) {
          return note
        }

        return {
          ...note,
          pitches: [...pitches, pitch].sort(comparePitch)
        }
      }, '화음 구성음을 추가했습니다.')
    },
    [replaceSelectedNote]
  )

  const removeChordTone = useCallback(
    (pitchLabel: string) => {
      replaceSelectedNote((note) => {
        const pitches = normalizeChordPitches(note)
        const nextPitches = pitches.filter(
          (pitch) => pitchToLabel(pitch) !== pitchLabel
        )
        const [primaryPitch] = nextPitches.length > 0 ? nextPitches : [note.pitch]

        return {
          ...note,
          pitch: primaryPitch,
          pitches: nextPitches.length > 1 ? nextPitches : undefined
        }
      }, '화음 구성음을 제거했습니다.')
    },
    [replaceSelectedNote]
  )

  const toggleTremoloMarks = useCallback(
    (marks: 0 | 1 | 2 | 3) => {
      replaceSelectedNote(
        (note) => ({
          ...note,
          tremolo: marks === 0 ? undefined : { type: 'single', marks }
        }),
        marks === 0 ? '트레몰로를 해제했습니다.' : '트레몰로를 추가했습니다.'
      )
    },
    [replaceSelectedNote]
  )

  const toggleOrnament = useCallback(
    (ornament: Ornament) => {
      replaceSelectedNote((note) => {
        const ornaments = new Set(note.ornaments ?? [])

        if (ornaments.has(ornament)) {
          ornaments.delete(ornament)
        } else {
          ornaments.add(ornament)
        }

        const nextOrnaments = Array.from(ornaments)

        return {
          ...note,
          ornaments: nextOrnaments.length > 0 ? nextOrnaments : undefined
        }
      }, '장식음을 갱신했습니다.')
    },
    [replaceSelectedNote]
  )

  const toggleGraceNote = useCallback(() => {
    replaceSelectedNote((note) => {
      const graceNotes = note.graceNotes ?? []

      return {
        ...note,
        graceNotes:
          graceNotes.length > 0
            ? undefined
            : [
                {
                  pitch: transposeChordPitch(note.pitch, -1),
                  slash: true
                }
              ]
      }
    }, eventLocation?.event.type === 'note' && eventLocation.event.graceNotes?.length
      ? '꾸밈음을 제거했습니다.'
      : '꾸밈음을 추가했습니다.')
  }, [eventLocation, replaceSelectedNote])

  const updateLyric = useCallback(
    (
      text: string,
      options?: {
        syllabic?: 'single' | 'begin' | 'middle' | 'end'
        extend?: boolean
        moveNext?: boolean
      }
    ) => {
      if (selectedEventLocation?.event.type !== 'note') {
        setFileStatus({ tone: 'error', message: '음표를 선택해 주세요.' })
        return
      }
      if (selectedEventLocation?.event.type === 'note' && hasAmbiguousLyricVerses(selectedEventLocation.event.lyrics)) {
        setFileStatus({ tone: 'error', message: ambiguousLyricMessage })
        return
      }
      const trimmedText = text.trim()
      const existingLyric =
        selectedEventLocation?.event.type === 'note'
          ? selectedEventLocation.event.lyrics?.find(
              (lyric) => (lyric.number ?? 1) === activeLyricVerse
            )
          : undefined
      const nextSyllabic = options?.syllabic ?? 'single'
      const nextExtend = options?.extend || undefined
      const lyricChanged =
        trimmedText.length > 0
          ? existingLyric?.text !== trimmedText ||
            (existingLyric.syllabic ?? 'single') !== nextSyllabic ||
            (existingLyric.extend || undefined) !== nextExtend
          : Boolean(existingLyric)

      if (lyricChanged) {
        replaceSelectedNote((note) => {
          const otherLyrics = (note.lyrics ?? []).filter(
            (lyric) => (lyric.number ?? 1) !== activeLyricVerse
          )
          const lyrics =
            trimmedText.length > 0
              ? sortLyricsByNumber([
                  ...otherLyrics,
                  {
                    number: activeLyricVerse,
                    syllabic: nextSyllabic,
                    text: trimmedText,
                    extend: nextExtend
                  }
                ])
              : otherLyrics

          return {
            ...note,
            lyrics: lyrics.length > 0 ? lyrics : undefined
          }
        }, trimmedText ? '가사를 갱신했습니다.' : '가사를 삭제했습니다.')
      }

      if (options?.moveNext && selectedEventLocation) {
        const eventId = getAdjacentNoteEventId(
          score,
          selectedEventLocation.event.id,
          1,
          selectedEventLocation.address
        )

        if (eventId) {
          setSelection(createEventSelection(score, eventId))
        }
      }
    },
    [activeLyricVerse, selectedEventLocation, replaceSelectedNote, score]
  )

  const updateHarmonyText = useCallback(
    (value: string, annotationId?: string) => {
      const text = value.trim()
      const targetMeasureId = eventLocation?.measure.id ?? activeMeasureId
      const targetTick =
        eventLocation?.event.position.tick ?? selectedAnnotationTick ?? noteInputState?.tick ?? 0

      if (!targetMeasureId) {
        return
      }

      if(!text&&activeMeasureTextRequest?.family==='harmonies'&&annotationId===activeMeasureTextRequest.id){deleteSelectedMeasureText();return}
      const currentHarmonies = score.harmonies ?? []
      const existingHarmony = currentHarmonies.find(
        (harmony) =>
          harmony.measureId === targetMeasureId && harmony.tick === targetTick &&
          (annotationId === undefined || harmony.id === annotationId)
      )
      if (annotationId !== undefined && !existingHarmony) {
        setFileStatus({ tone: 'error', message: '선택한 표기가 현재 위치에 없습니다. 다시 선택해 주세요.' })
        return
      }
      const otherHarmonies = currentHarmonies.filter(
        (harmony) => harmony.id !== existingHarmony?.id
      )
      const parsedHarmony = text.length > 0 ? parseHarmonyText(text) : undefined

      if (text.length > 0 && !parsedHarmony) {
        setFileStatus({
          tone: 'error',
          message: '지원하는 코드 심벌 형식으로 입력해 주세요. 예: C, Cm, C7, C/G'
        })
        return
      }

      const harmonies =
        parsedHarmony
          ? existingHarmony
            ? currentHarmonies.map(item => item.id === existingHarmony.id ? {
                id: existingHarmony.id, measureId: targetMeasureId, tick: targetTick, ...parsedHarmony
              } : item)
            : [...currentHarmonies, {
                id: `harmony-${crypto.randomUUID()}`,
                measureId: targetMeasureId,
                tick: targetTick,
                ...parsedHarmony
              }]
          : otherHarmonies

      executeCommand({
        type: 'score-harmonies.update',
        harmonies: harmonies.length > 0 ? harmonies : undefined
      })
      setFileStatus({
        tone: 'neutral',
        message: parsedHarmony ? '코드 심벌을 갱신했습니다.' : '코드 심벌을 삭제했습니다.'
      })
    },
    [activeMeasureTextRequest,deleteSelectedMeasureText,selectedAnnotationTick, activeMeasureId, eventLocation, executeCommand, noteInputState?.tick, score.harmonies]
  )

  const updateTempoEvent = useCallback(
    (tempo: TempoEvent | undefined) => {
      const targetMeasureId = tempoTargetMeasureId
      const targetTick = tempoTargetTick

      if (!targetMeasureId) {
        return
      }

      const currentTempoEvents = score.tempoEvents ?? []
      const existingTempoEvent = currentTempoEvents.filter(
        (event) =>
          resolveGlobalMeasure(event.measureId) === targetMeasureId && event.tick === targetTick
      ).at(-1)
      const otherTempoEvents = currentTempoEvents.filter(
        (event) => event.id !== existingTempoEvent?.id
      )
      const tempoEvents = tempo
        ? [
            ...otherTempoEvents,
            {
              ...tempo,
              id: existingTempoEvent?.id ?? `tempo-${crypto.randomUUID()}`,
              measureId: existingTempoEvent?.measureId ?? targetMeasureId,
              tick: targetTick
            }
          ]
        : otherTempoEvents

      executeCommand({
        type: 'score-tempo-events.update',
        tempoEvents: tempoEvents.length > 0 ? tempoEvents : undefined
      })
      setFileStatus({
        tone: 'neutral',
        message: tempo ? '위치별 빠르기를 갱신했습니다.' : '위치별 빠르기를 삭제했습니다.'
      })
    },
    [tempoTargetMeasureId, tempoTargetTick, executeCommand, score.tempoEvents, resolveGlobalMeasure]
  )

  const toggleFermata = useCallback(() => {
    if (!selectedEventLocation) {
      return
    }

    executeCommand({
      type: 'voice-event.replace',
      target: selectedEventLocation.address,
      eventId: selectedEventLocation.event.id,
      event: {
        ...selectedEventLocation.event,
        fermata: selectedEventLocation.event.fermata ? undefined : true
      }
    })
  }, [selectedEventLocation, executeCommand])

  const toggleBreathMark = useCallback(
    (breathMark: BreathMark) => {
      if (!selectedEventLocation) {
        return
      }

      executeCommand({
        type: 'voice-event.replace',
        target: selectedEventLocation.address,
        eventId: selectedEventLocation.event.id,
        event: {
          ...selectedEventLocation.event,
          breathMark:
            selectedEventLocation.event.breathMark === breathMark ? undefined : breathMark
        }
      })
    },
    [selectedEventLocation, executeCommand]
  )

  const toggleHairpin = useCallback(
    (type: HairpinType) => {
      if (selection.type !== 'range' || selection.eventIds.length < 2) {
        setFileStatus({
          tone: 'error',
          message: '헤어핀을 넣을 음표 또는 쉼표 범위를 선택해 주세요.'
        })
        return
      }

      const startEventId = selection.eventIds[0]
      const endEventId = selection.eventIds[selection.eventIds.length - 1]
      const startLocation = locateEvent(score, startEventId)
      const endLocation = locateEvent(score, endEventId)

      if (
        !startLocation ||
        !endLocation ||
        startLocation.address.partId !== endLocation.address.partId ||
        startLocation.address.staffId !== endLocation.address.staffId
      ) {
        setFileStatus({
          tone: 'error',
          message: '헤어핀은 같은 보표의 음표 또는 쉼표 범위에 넣을 수 있습니다.'
        })
        return
      }

      const currentHairpins = score.hairpins ?? []
      const matchingHairpin = currentHairpins.find(
        (hairpin) =>
          hairpin.startEventId === startEventId &&
          hairpin.endEventId === endEventId
      )
      const otherHairpins = currentHairpins.filter(
        (hairpin) => hairpin.id !== matchingHairpin?.id
      )
      const hairpins =
        matchingHairpin?.type === type
          ? otherHairpins
          : [
              ...otherHairpins,
              {
                id: matchingHairpin?.id ?? `hairpin-${crypto.randomUUID()}`,
                startEventId,
                endEventId,
                type
              }
            ]

      executeCommand({
        type: 'score-hairpins.update',
        hairpins: hairpins.length > 0 ? hairpins : undefined
      })
      setFileStatus({
        tone: 'neutral',
        message:
          matchingHairpin?.type === type
            ? '헤어핀을 해제했습니다.'
            : type === 'crescendo'
              ? '크레셴도 헤어핀을 추가했습니다.'
              : '디미누엔도 헤어핀을 추가했습니다.'
      })
    },
    [executeCommand, score, selection]
  )

  const toggleSlur = useCallback(() => {
    const toggleSlurBetween = (startEventId: string, endEventId: string) => {
      const startLocation = locateEvent(score, startEventId)
      const endLocation = locateEvent(score, endEventId)

      if (
        !startLocation ||
        !endLocation ||
        startLocation.event.type !== 'note' ||
        endLocation.event.type !== 'note'
      ) {
        setFileStatus({
          tone: 'error',
          message: '슬러는 음표에서 시작하고 음표에서 끝나야 합니다.'
        })
        return false
      }

      const currentSlurs = score.slurs ?? []
      const matchingSlur = currentSlurs.find(
        (slur) =>
          slur.startEventId === startEventId && slur.endEventId === endEventId
      )
      const slurs = matchingSlur
        ? currentSlurs.filter((slur) => slur.id !== matchingSlur.id)
        : [
            ...currentSlurs,
            {
              id: `slur-${crypto.randomUUID()}`,
              startEventId,
              endEventId
            }
          ]

      executeCommand({
        type: 'score-slurs.update',
        slurs: slurs.length > 0 ? slurs : undefined
      })
      setFileStatus({
        tone: 'neutral',
        message: matchingSlur ? '슬러를 해제했습니다.' : '슬러를 추가했습니다.'
      })
      return true
    }

    if (selection.type === 'event') {
      const currentLocation = locateEvent(
        score,
        selection.eventId,
        selection.address
      )

      if (!currentLocation || currentLocation.event.type !== 'note') {
        setFileStatus({
          tone: 'error',
          message: '슬러는 음표에서 시작해야 합니다.'
        })
        return
      }

      if (!pendingSlurAnchorEventId) {
        setPendingSlurAnchorEventId(selection.eventId)
        setFileStatus({
          tone: 'neutral',
          message: '슬러 시작점을 선택했습니다. ←/→로 끝 음표를 고르고 S로 확정하세요.'
        })
        return
      }

      if (pendingSlurAnchorEventId === selection.eventId) {
        setFileStatus({
          tone: 'neutral',
          message: '끝 음표로 이동한 뒤 S로 슬러를 확정하세요.'
        })
        return
      }

      const rangeSelection = createRangeSelection(
        score,
        pendingSlurAnchorEventId,
        selection.eventId,
        selection.address
      )

      if (!rangeSelection || rangeSelection.type !== 'range') {
        setPendingSlurAnchorEventId(undefined)
        setFileStatus({
          tone: 'error',
          message: '같은 성부의 음표 범위에만 슬러를 넣을 수 있습니다.'
        })
        return
      }

      const startEventId = rangeSelection.eventIds[0]
      const endEventId = rangeSelection.eventIds[rangeSelection.eventIds.length - 1]

      if (toggleSlurBetween(startEventId, endEventId)) {
        setSelection(rangeSelection)
      }
      setPendingSlurAnchorEventId(undefined)
      return
    }

    if (selection.type !== 'range' || selection.eventIds.length < 2) {
      setFileStatus({
        tone: 'error',
        message: '슬러로 묶을 음표 범위를 선택해 주세요.'
      })
      return
    }

    const startEventId = selection.eventIds[0]
    const endEventId = selection.eventIds[selection.eventIds.length - 1]

    setPendingSlurAnchorEventId(undefined)
    toggleSlurBetween(startEventId, endEventId)
  }, [executeCommand, pendingSlurAnchorEventId, score, selection])

  const toggleOctaveShift = useCallback(
    (type: OctaveShiftType) => {
      if (selection.type !== 'range' || selection.eventIds.length < 2) {
        setFileStatus({
          tone: 'error',
          message: '옥타브 표시를 넣을 음표 범위를 선택해 주세요.'
        })
        return
      }

      const startEventId = selection.eventIds[0]
      const endEventId = selection.eventIds[selection.eventIds.length - 1]
      const startLocation = locateEvent(score, startEventId)
      const endLocation = locateEvent(score, endEventId)

      if (
        !startLocation ||
        !endLocation ||
        startLocation.event.type !== 'note' ||
        endLocation.event.type !== 'note'
      ) {
        setFileStatus({
          tone: 'error',
          message: '옥타브 표시는 음표에서 시작하고 음표에서 끝나야 합니다.'
        })
        return
      }

      const currentOctaveShifts = score.octaveShifts ?? []
      const matchingShift = currentOctaveShifts.find(
        (shift) =>
          shift.startEventId === startEventId &&
          shift.endEventId === endEventId &&
          shift.type === type
      )
      const octaveShifts = matchingShift
        ? currentOctaveShifts.filter((shift) => shift.id !== matchingShift.id)
        : [
            ...currentOctaveShifts.filter(
              (shift) =>
                !(
                  shift.startEventId === startEventId &&
                  shift.endEventId === endEventId
                )
            ),
            {
              id: `octave-${crypto.randomUUID()}`,
              startEventId,
              endEventId,
              type
            }
          ]

      executeCommand({
        type: 'score-octave-shifts.update',
        octaveShifts: octaveShifts.length > 0 ? octaveShifts : undefined
      })
      setFileStatus({
        tone: 'neutral',
        message: matchingShift ? '옥타브 표시를 해제했습니다.' : '옥타브 표시를 추가했습니다.'
      })
    },
    [executeCommand, score, selection]
  )

  const deleteSelection = useCallback(() => {
    if(deleteSelectedMeasureText())return
    if (selection.type === 'measure') {
      removeMeasure()
      return
    }

    clearSelection()
  }, [clearSelection, removeMeasure, selection.type,deleteSelectedMeasureText])

  const moveSelection = useCallback(
    (direction: -1 | 1, extendRange = false) => {
      if (noteInputState) {
        const eventId = getEventIdBeforeInputCursor(score, noteInputState)

        if (direction === -1 && eventId) {
          setMode('select')
          setNoteInputState(undefined)
          setSelection(createEventSelection(score, eventId))
        }

        return
      }

      const currentEventId = getSelectionFocusEventId(selection)

      if (!currentEventId) {
        return
      }

      const eventId = getAdjacentEventId(
        score,
        currentEventId,
        direction,
        selection.type === 'measure' ? undefined : selection.address
      )

      if (eventId) {
        setMode('select')
        setNoteInputState(undefined)

        if (extendRange) {
          const anchorEventId =
            selection.type === 'range' ? selection.anchorEventId : currentEventId
          const rangeSelection = createRangeSelection(
            score,
            anchorEventId,
            eventId,
            selection.type === 'measure' ? undefined : selection.address
          )

          setSelection(
            rangeSelection ?? createEventSelection(score, eventId)
          )
        } else {
          if (pendingSlurAnchorEventId) {
            const rangeSelection = createRangeSelection(
              score,
              pendingSlurAnchorEventId,
              eventId,
              selection.type === 'measure' ? undefined : selection.address
            )

            setSelection(
              rangeSelection ?? createEventSelection(score, eventId)
            )
            return
          }

          setSelection(createEventSelection(score, eventId))
        }
        return
      }

      if (direction === 1 && !extendRange) {
        const location = locateEvent(
          score,
          currentEventId,
          selection.type === 'measure' ? undefined : selection.address
        )
        const edit = location
          ? buildInsertMeasureAfter(
              score,
              location.address.measureId,
              createInputId
            )
          : undefined

        if (edit && executeCommand(edit.command)) {
          setMode('select')
          setNoteInputState(undefined)
          setSelection(edit.selection)
          setFileStatus({
            tone: 'neutral',
            message: '새 온쉼표 마디를 추가했습니다.'
          })
        }
      }
    },
    [executeCommand, noteInputState, pendingSlurAnchorEventId, score, selection]
  )

  const moveSelectionVertically = useCallback(
    (direction: -1 | 1): boolean => {
      if (noteInputState) {
        return false
      }

      const currentEventId = getSelectionFocusEventId(selection)

      if (!currentEventId) {
        return false
      }

      const target = resolveVerticalEventSelection(
        score,
        currentEventId,
        direction,
        selection.type === 'measure' ? undefined : selection.address
      )

      if (!target || (scoreViewMode === 'part' && target.address.partId !== livePartViewPartId)) {
        return false
      }

      setMode('select')
      setNoteInputState(undefined)
      setSelection(createEventSelection(score, target.eventId, target.address))
      return true
    },
    [noteInputState, score, selection, scoreViewMode, livePartViewPartId]
  )

  const moveToNextLyricNote = useCallback(() => {
    const currentEventId = getSelectionFocusEventId(selection)

    if (!currentEventId) {
      return
    }

    const eventId = getAdjacentNoteEventId(score, currentEventId, 1)

    if (eventId) {
      setMode('select')
      setNoteInputState(undefined)
      setSelection(createEventSelection(score, eventId))
      return
    }

    moveSelection(1)
  }, [moveSelection, score, selection])

  const moveActiveLyricVerse = useCallback(
    (direction: 1 | -1) => {
      const currentIndex = lyricVerseOptions.indexOf(
        activeLyricVerse as (typeof lyricVerseOptions)[number]
      )
      const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0
      const nextIndex = Math.min(
        lyricVerseOptions.length - 1,
        Math.max(0, safeCurrentIndex + direction)
      )
      const nextVerse = lyricVerseOptions[nextIndex]

      if (nextVerse === activeLyricVerse) {
        return
      }

      setActiveLyricVerse(nextVerse)
      setFileStatus({
        tone: 'neutral',
        message: `${nextVerse}절 가사 입력으로 전환했습니다.`
      })
    },
    [activeLyricVerse]
  )

  const selectEvent = useCallback(
    (
      eventId: string,
      extendRange = false,
      address?: VoiceAddress
    ) => {
      setMode('select')
      setNoteInputState(undefined)
      setMeasureContextMenu(undefined)
      setToolbarCategory(current => current === 'notation' ? current : 'note')

      if (extendRange) {
        const anchorEventId =
          selection.type === 'range'
            ? selection.anchorEventId
            : getSelectionFocusEventId(selection)
        const rangeSelection = anchorEventId
          ? createRangeSelection(
              score,
              anchorEventId,
              eventId,
              address ??
                (selection.type === 'measure' ? undefined : selection.address)
            )
          : undefined

        setSelection(
          rangeSelection ?? createEventSelection(score, eventId, address)
        )
        return
      }

      setSelection(createEventSelection(score, eventId, address))
    },
    [score, selection]
  )

  const selectLyric = useCallback((eventId: string, verse: number) => {
    setLyricFocusRequest(request=>request+1)
    const activeVerse = lyricVerseOptions.includes(
      verse as (typeof lyricVerseOptions)[number]
    )
      ? verse
      : 1

    setMode('select')
    setNoteInputState(undefined)
    setMeasureContextMenu(undefined)
    setActiveLyricVerse(activeVerse)
    setToolbarCategory('lyrics')
    setSelection(createEventSelection(score, eventId))
  }, [score])

  const selectEventRange = useCallback(
    (
      anchorEventId: string,
      focusEventId: string,
      address?: VoiceAddress
    ) => {
      const rangeSelection = createRangeSelection(
        score,
        anchorEventId,
        focusEventId,
        address ?? (selection.type === 'measure' ? undefined : selection.address)
      )

      if (rangeSelection) {
        setMode('select')
        setNoteInputState(undefined)
        setMeasureContextMenu(undefined)
        setSelection(rangeSelection)
      }
    },
    [score, selection]
  )

  const selectMeasure = useCallback((measureId: string) => {
    setMode('select')
    setNoteInputState(undefined)
    setPendingSlurAnchorEventId(undefined)
    setMeasureContextMenu(undefined)
    setSelection(createMeasureSelection(score, measureId))
  }, [score])

  const selectMeasureText=useCallback((family:MeasureTextFamily,reference:{id:string;measureId:string;tick?:number;edit?:boolean},allowStoredDynamic=false)=>{
    const matches=globalTextPropertyScore[family]?.filter(mark=>mark.id===reference.id)??[]
    if(matches.length!==1)return
    const mark=matches[0]
    if(family==='dynamics'&&!allowStoredDynamic&&globalTextPropertyScore.dynamics?.find(item=>item.measureId===mark.measureId)?.id!==mark.id)return
    // Staff text has a concrete owner; global ordinal aliases must not rebind it.
    if(family==='staffTexts'||family==='expressionTexts'||family==='harmonies'||family==='dynamics'?(mark.measureId!==reference.measureId||resolveGlobalMeasure(mark.measureId)!==mark.measureId):resolveVisibleGlobalTextMeasure(mark.measureId)!==reference.measureId)return
    if((family==='expressionTexts'||family==='harmonies')&&(!('tick' in mark)||mark.tick!==reference.tick))return
    const nextSelection=createMeasureSelection(score,reference.measureId)
    setMode('select');setNoteInputState(undefined);setPendingSlurAnchorEventId(undefined)
    setMeasureContextMenu(undefined);setSpanSelection(undefined);setSelection(nextSelection)
    setToolbarCategory('note');setDockVisibility(current=>({...current,properties:true}));setActiveDock('properties')
    setMeasureTextSelection({family,id:mark.id,focus:family==='harmonies'||family==='dynamics'?reference.edit!==false:undefined,sequence:++measureTextFocusSequence.current,baseSelection:nextSelection,
      returnSelection:activeMeasureTextRequest?.returnSelection??selection,
      generation:documentGeneration.current,viewKey:spanViewKey})
  },[globalTextPropertyScore.rehearsalMarks,globalTextPropertyScore.systemTexts,globalTextPropertyScore.staffTexts,globalTextPropertyScore.expressionTexts,globalTextPropertyScore.harmonies,globalTextPropertyScore.dynamics,resolveVisibleGlobalTextMeasure,resolveGlobalMeasure,score,spanViewKey,activeMeasureTextRequest,selection])
  const selectRehearsalMark=useCallback((reference:{id:string;measureId:string})=>selectMeasureText('rehearsalMarks',reference),[selectMeasureText])
  const selectStaffText=useCallback((reference:{id:string;measureId:string})=>selectMeasureText('staffTexts',reference),[selectMeasureText])
  const selectDynamic=useCallback((reference:{id:string;measureId:string;edit?:boolean})=>selectMeasureText('dynamics',reference),[selectMeasureText])
  const selectHarmony=useCallback((reference:{id:string;measureId:string;tick:number;edit?:boolean})=>selectMeasureText('harmonies',reference),[selectMeasureText])
  const selectExpressionText=useCallback((reference:{id:string;measureId:string;tick:number})=>selectMeasureText('expressionTexts',reference),[selectMeasureText])
  const selectSystemText=useCallback((reference:{id:string;measureId:string})=>selectMeasureText('systemTexts',reference),[selectMeasureText])

  const openScore = useCallback(
    (
      nextScore: Score,
      message: string,
      options: AppOpenScoreOptions = {}
    ) => {
      const scoreViewState = resolveStoredMusicXmlViewState(
        nextScore,
        options.viewState
      )

      documentGeneration.current += 1
      nativeFile.current = undefined
      nativeEnvelope.current = undefined
      setScore(nextScore)
      setAutosaveRevision((revision) =>
        options.markDirty === false ? 0 : revision + 1
      )
      setUndoStack([])
      setRedoStack([])
      setMode('select')
      setNoteInputState(undefined)
      setPendingSlurAnchorEventId(undefined)
      setRecoverySnapshot(undefined)
      setMetadataEdit(undefined)
      setStartScreenVisible(false)
      setMusicXmlReport(undefined)
      setScoreViewMode(scoreViewState.mode)
      setSelectedScoreViewPartId(
        scoreViewState.mode === 'part' ? scoreViewState.partId : undefined
      )
      setPartPageSetupPreferences(options.partPageSetupPreferences ?? {})
      setSelection(createInitialSelection(nextScore,
        scoreViewState.mode === 'part' ? scoreViewState.partId : nextScore.parts[0]?.id))
      setFileStatus({
        tone: 'neutral',
        message
      })
    },
    []
  )

  const openNativeProject = useCallback(async (recent?: RecentMusicXmlFile) => {
    if ((nativeOpenInFlight.current && !recent) || !window.inC?.project) return
    if (!shouldReplaceCurrentScore({ autosaveRevision }, window.confirm.bind(window))) return
    const generation = documentGeneration.current
    const intent = beginDocumentOpen('native')
    const initialContext = currentNativeContext.current
    try {
      const file = recent ? await window.inC.recentMusicXml.open({ filePath: recent.filePath }) : await window.inC.project.open()
      if (!file || generation !== documentGeneration.current || intent !== documentOpenIntent.current) return
      if ((currentNativeContext.current.score !== initialContext.score || currentNativeContext.current.partPageSetupPreferences !== initialContext.partPageSetupPreferences || currentNativeContext.current.autosaveRevision !== initialContext.autosaveRevision || currentNativeContext.current.partLayoutRevision !== initialContext.partLayoutRevision) && !window.confirm('파일 선택 중 편집한 내용을 버리고 프로젝트를 열까요?')) return
      const project = decodeNativeProject(file.contents)
      const preferences: PartPageSetupPreferences = {}
      for (const part of project.partLayouts) {
        if (part.layout.pageSetup) preferences[part.partId] = normalizePrintPageSetup(part.layout.pageSetup)
      }
      playback.stop()
      openScore(project.score, `${file.fileName}을 열었습니다.`, { markDirty: false, viewState: project.view, partPageSetupPreferences: preferences })
      nativeFile.current = { filePath: file.filePath, fileName: file.fileName }
      nativeEnvelope.current = project
      currentMusicXmlFileRef.current = undefined
      const openedGeneration = documentGeneration.current
      try {
        const files = await window.inC.recentMusicXml.add({ filePath: file.filePath, fileName: file.fileName, format: 'native' })
        if (openedGeneration === documentGeneration.current && intent === documentOpenIntent.current) setRecentMusicXmlFiles(files)
      } catch (error) {
        if (openedGeneration === documentGeneration.current && intent === documentOpenIntent.current) setFileStatus({
          tone: 'error', message: '프로젝트를 열었지만 최근 목록을 갱신하지 못했습니다. 열린 악보는 사용할 수 있습니다. 기술 정보를 확인해 주세요.',
          details: { operation: '프로젝트 열기', message: getErrorMessage(error) }
        })
      }
    } catch (error) {
      if (generation === documentGeneration.current && intent === documentOpenIntent.current) {
        const message = getErrorMessage(error)
        const missing = recent && message.includes('최근 파일을 찾을 수 없습니다')
        if (missing) setMissingRecentFilePath(recent.filePath)
        setFileStatus({
          tone: 'error',
          message: missing
            ? '최근 프로젝트 파일을 찾을 수 없습니다. 파일 위치를 확인하거나 목록에서 지워 주세요.'
            : '프로젝트를 열지 못했습니다. 현재 악보는 유지됩니다. 파일을 확인한 뒤 다시 시도해 주세요.',
          details: { operation: '프로젝트 열기', message }
        })
      }
    } finally {
      // A superseded read cannot unlock a newer request started after the wizard.
      if (intent === documentOpenIntent.current) {
        nativeOpenInFlight.current = false
        setOpeningNative(false)
      }
    }
  }, [autosaveRevision, openScore, playback, beginDocumentOpen])

  const closeNativeBackups = useCallback(() => {
    backupRequest.current += 1
    setNativeBackupsOpen(false)
  }, [])

  const restoreNativeBackup = useCallback(async (id: string) => {
    if (!shouldReplaceCurrentScore({ autosaveRevision }, window.confirm.bind(window))) return
    const request = ++backupRequest.current
    const generation = documentGeneration.current
    const intent = beginDocumentOpen()
    const context = currentNativeContext.current
    let file: { contents: string }
    try { file = await window.inC.project.readBackup(id) } catch (error) {
      if (request === backupRequest.current && generation === documentGeneration.current && intent === documentOpenIntent.current) throw error
      return
    }
    if (request !== backupRequest.current || generation !== documentGeneration.current || intent !== documentOpenIntent.current) return
    if ((context.score !== currentNativeContext.current.score || context.partPageSetupPreferences !== currentNativeContext.current.partPageSetupPreferences || context.autosaveRevision !== currentNativeContext.current.autosaveRevision) &&
      !window.confirm('복구 중 편집한 내용을 버리고 백업을 열까요?')) return
    const project = decodeNativeProject(file.contents)
    const preferences: PartPageSetupPreferences = Object.fromEntries(project.partLayouts
      .filter(part => part.layout.pageSetup).map(part => [part.partId, normalizePrintPageSetup(part.layout.pageSetup)]))
    playback.stop()
    openScore(project.score, '백업을 복구했습니다. 새 프로젝트 파일로 저장해 주세요.', {
      viewState: project.view, partPageSetupPreferences: preferences
    })
    nativeEnvelope.current = project
    currentMusicXmlFileRef.current = undefined
    closeNativeBackups()
  }, [autosaveRevision, playback, openScore, closeNativeBackups, beginDocumentOpen])

  const saveNativeProject = useCallback(async (saveAs = false) => {
    if (saveInFlight.current || !window.inC?.project) return
    if (!allowDocumentSave()) return
    // This explicit command supersedes default focus scheduled by its opener.
    workspaceFocusRequest.current += 1
    saveInFlight.current = true
    setSavingNative(true)
    const generation = documentGeneration.current
    const viewportIntent = workspaceViewportIntent.current
    activeFileSave.current = { generation, kind: 'project', previousStatus: currentFileStatus.current }
    const saveTrigger = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null
    const context = currentNativeContext.current
    const sameDocument = () => generation === documentGeneration.current
    const sameSnapshot = () => sameDocument() && currentNativeContext.current.score === context.score && currentNativeContext.current.partPageSetupPreferences === context.partPageSetupPreferences && currentNativeContext.current.scoreViewMode === context.scoreViewMode && currentNativeContext.current.selectedScoreViewPartId === context.selectedScoreViewPartId && currentNativeContext.current.autosaveRevision === context.autosaveRevision && (context.scoreViewMode !== 'part' || currentNativeContext.current.livePartViewPartId === context.livePartViewPartId)
    let nativeSaveRequested = false
    try {
      if (context.noteInputState?.tupletInput) throw new Error('셋잇단음표 입력을 완료하거나 취소한 뒤 저장해 주세요.')
      const project = createNativeSnapshot(context.score, nativeEnvelope.current, context.partPageSetupPreferences, context.scoreViewMode, context.livePartViewPartId)
      const contents = encodeNativeProject(project)
      nativeSaveRequested = true
      const result = await window.inC.project.save({
        ...(!saveAs && nativeFile.current ? { filePath: nativeFile.current.filePath } : {}),
        suggestedName: `${toFileName(context.score.title)}.chromatics`, contents
      })
      if (!result || !sameDocument()) return
      nativeFile.current = result
      nativeEnvelope.current ??= project
      currentMusicXmlFileRef.current = undefined
      const files = await window.inC.recentMusicXml.add({ ...result, format: 'native' })
      if (!sameDocument()) return
      setRecentMusicXmlFiles(files)
      if (sameSnapshot()) {
        await window.inC.autosave.clear()
        if (sameSnapshot()) {
          setAutosaveRevision(0)
          const containsNote = scoreHasNotes(context.score)
          if (firstSessionGeneration.current === generation && containsNote && !firstProjectSaved.current) {
            firstProjectSaved.current = true
            setFirstAchievement({ generation, score: context.score })
            try { localStorage.setItem('chromatics.studio-first-project.v1', 'saved') } catch { /* Keep the session result. */ }
          }
        }
        else await restoreDirtyRecoveryAfterClear()
      }
      if (sameDocument()) setFileStatus({ tone: 'neutral', message: describeDocumentSaveCompletion(sameSnapshot() ? `${result.fileName}에 저장했습니다.` : `${result.fileName}에 저장했습니다. 저장 중 변경사항은 아직 저장되지 않았습니다.`) })
    } catch (error) {
      // A write can succeed before recent-file/recovery cleanup fails. Describe
      // the workflow failure without claiming that no file reached the disk.
      if (sameDocument()) setFileStatus(nativeSaveRequested ? {
        tone: 'error',
        message: '프로젝트 저장을 마무리하지 못했습니다. 변경 사항은 유지됩니다. 기술 정보를 확인한 뒤 다시 시도해 주세요.',
        details: { operation: '프로젝트 저장', message: getErrorMessage(error) }
      } : { tone: 'error', message: getErrorMessage(error) })
    } finally {
      saveInFlight.current = false
      activeFileSave.current = undefined
      setSavingNative(false)
      returnFileOperationFocus(saveTrigger, generation, viewportIntent)
    }
  }, [allowDocumentSave, describeDocumentSaveCompletion, restoreDirtyRecoveryAfterClear, returnFileOperationFocus])

  const importMusicXml = useCallback(async () => {
    if (musicXmlOpenInFlight.current) return
    if (
      !isFixtureMode() &&
      !shouldReplaceCurrentScore(
        { autosaveRevision },
        window.confirm.bind(window)
      )
    ) {
      return
    }

    const generation = documentGeneration.current
    const intent = beginDocumentOpen('musicxml')
    const initialContext = currentNativeContext.current
    try {
      const file = await window.inC.musicXml.open()

      if (!file || generation !== documentGeneration.current || intent !== documentOpenIntent.current) {
        return
      }

      const latest = currentNativeContext.current
      if ((latest.score !== initialContext.score || latest.partPageSetupPreferences !== initialContext.partPageSetupPreferences || latest.autosaveRevision !== initialContext.autosaveRevision || latest.partLayoutRevision !== initialContext.partLayoutRevision) && !window.confirm('파일 선택 중 편집한 내용을 버리고 MusicXML을 가져올까요?')) return

      const { report, score: importedScore } = parseMusicXmlWithReport(
        file.contents
      )
      const viewState = readStoredMusicXmlViewState(
        file.filePath,
        importedScore
      )
      const partPageSetups = readStoredPartPageSetups(
        file.filePath,
        importedScore
      )

      setMissingRecentFilePath(undefined)
      openScore(
        importedScore,
        describeMusicXmlImportResult(file.fileName, report),
        {
          markDirty: false,
          viewState,
          partPageSetupPreferences: partPageSetups
        }
      )
      setMusicXmlReport(
        createMusicXmlReportPanelState('import', file.fileName, report)
      )
      currentMusicXmlFileRef.current = {
        filePath: file.filePath,
        fileName: file.fileName
      }

      const openedGeneration = documentGeneration.current
      try {
        const recentFiles = await window.inC.recentMusicXml.add({
          filePath: file.filePath,
          fileName: file.fileName
        })

        if (openedGeneration === documentGeneration.current && intent === documentOpenIntent.current) setRecentMusicXmlFiles(recentFiles)
      } catch (recentError) {
        if (openedGeneration === documentGeneration.current && intent === documentOpenIntent.current) setFileStatus(describeMusicXmlRecentUpdateFailure(recentError))
      }
    } catch (error) {
      if (generation === documentGeneration.current && intent === documentOpenIntent.current) setFileStatus(describeMusicXmlImportFailure(error))
    } finally {
      if (intent === documentOpenIntent.current) {
        musicXmlOpenInFlight.current = false
        setOpeningMusicXml(false)
      }
    }
  }, [autosaveRevision, openScore, beginDocumentOpen])

  const openRecentMusicXml = useCallback(
    async (file: RecentMusicXmlFile) => {
      if (file.format === 'native') {
        await openNativeProject(file)
        return
      }
      if (
        !isFixtureMode() &&
        !shouldReplaceCurrentScore(
          { autosaveRevision },
          window.confirm.bind(window)
        )
      ) {
        return
      }

      const generation = documentGeneration.current
      const intent = beginDocumentOpen()
      try {
        const openedFile = await window.inC.recentMusicXml.open({
          filePath: file.filePath
        })
        if (generation !== documentGeneration.current || intent !== documentOpenIntent.current) return
        const { report, score: importedScore } = parseMusicXmlWithReport(
          openedFile.contents
        )
        const viewState = readStoredMusicXmlViewState(
          openedFile.filePath,
          importedScore
        )
        const partPageSetups = readStoredPartPageSetups(
          openedFile.filePath,
          importedScore
        )

        setMissingRecentFilePath(undefined)
        openScore(
          importedScore,
          describeMusicXmlImportResult(openedFile.fileName, report, true),
          {
            markDirty: false,
            viewState,
            partPageSetupPreferences: partPageSetups
          }
        )
        setMusicXmlReport(
          createMusicXmlReportPanelState('import', openedFile.fileName, report)
        )
        currentMusicXmlFileRef.current = {
          filePath: openedFile.filePath,
          fileName: openedFile.fileName
        }

        const openedGeneration = documentGeneration.current
        try {
          const recentFiles = await window.inC.recentMusicXml.add({
            filePath: openedFile.filePath,
            fileName: openedFile.fileName
          })

          if (openedGeneration === documentGeneration.current && intent === documentOpenIntent.current) setRecentMusicXmlFiles(recentFiles)
        } catch (recentError) {
          if (openedGeneration === documentGeneration.current && intent === documentOpenIntent.current) setFileStatus(describeMusicXmlRecentUpdateFailure(recentError))
        }
      } catch (error) {
        if (generation !== documentGeneration.current || intent !== documentOpenIntent.current) return
        const message = getErrorMessage(error)

        if (message.includes('최근 파일을 찾을 수 없습니다')) {
          setMissingRecentFilePath(file.filePath)
        }

        setFileStatus(describeMusicXmlImportFailure(error))
      }
    },
    [autosaveRevision, openScore, openNativeProject, beginDocumentOpen]
  )

  const removeMissingRecentMusicXml = useCallback(async () => {
    if (!missingRecentFilePath) {
      return
    }

    const generation = documentGeneration.current
    const viewportIntent = workspaceViewportIntent.current
    const trigger = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null
    try {
      const recentFiles = await window.inC.recentMusicXml.remove({
        filePath: missingRecentFilePath
      })

      if (generation !== documentGeneration.current) return
      setRecentMusicXmlFiles(recentFiles)
      setMissingRecentFilePath(undefined)
      setFileStatus({
        tone: 'neutral',
        message: '최근 파일 목록에서 지웠습니다.'
      })
    } catch (error) {
      if (generation === documentGeneration.current) setFileStatus({
        tone: 'error',
        message: '최근 파일 목록을 정리하지 못했습니다. 목록은 유지됩니다. 다시 시도하거나 기술 정보를 확인해 주세요.',
        details: { operation: '최근 악보 목록', message: getErrorMessage(error) }
      })
    } finally {
      returnFileOperationFocus(trigger, generation, viewportIntent)
    }
  }, [missingRecentFilePath, returnFileOperationFocus])

  const saveMusicXml = useCallback(async () => {
    if (saveInFlight.current) return
    if (!allowDocumentSave()) return
    workspaceFocusRequest.current += 1
    saveInFlight.current = true
    setSavingMusicXml(true)
    const savedGeneration = documentGeneration.current
    const viewportIntent = workspaceViewportIntent.current
    activeFileSave.current = { generation: savedGeneration, kind: 'musicxml', previousStatus: currentFileStatus.current }
    const saveTrigger = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null
    const savedContext = currentNativeContext.current
    const sameDocument = () => documentGeneration.current === savedGeneration
    const sameSnapshot = () => sameDocument() && currentScoreRef.current === score &&
      currentNativeContext.current.partPageSetupPreferences === savedContext.partPageSetupPreferences &&
      currentNativeContext.current.partLayoutRevision === savedContext.partLayoutRevision
    let musicXmlSaveRequested = false
    try {
      if (noteInputState?.tupletInput) {
        setFileStatus({
          tone: 'error',
          message:
            '셋잇단음표 입력을 완료하거나 취소한 뒤 MusicXML로 저장해 주세요.'
        })
        return
      }

      const { contents, report } = serializeMusicXmlWithReport(score)
      assertMusicXmlSaveSafe(score, contents)
      const currentMusicXmlFile = currentMusicXmlFileRef.current
      musicXmlSaveRequested = true
      const result = await window.inC.musicXml.save({
        ...(currentMusicXmlFile
          ? { filePath: currentMusicXmlFile.filePath }
          : {}),
        suggestedName: `${toFileName(score.title)}.musicxml`,
        contents
      })

      if (!result || !sameDocument()) {
        return
      }

      if (!result.filePath) {
        throw new Error('MusicXML 저장 경로를 확인하지 못했습니다.')
      }

      currentMusicXmlFileRef.current = {
        filePath: result.filePath,
        fileName: result.fileName
      }
      writeStoredMusicXmlViewState(
        result.filePath,
        createCurrentMusicXmlViewState(scoreViewMode, livePartViewPartId)
      )
      // This is local workspace metadata, not part of the serialized XML.
      // A completed write must not roll back preferences edited while it waited.
      writeStoredPartPageSetups(result.filePath, currentNativeContext.current.partPageSetupPreferences)

      try {
        if (sameSnapshot() && !nativeEnvelope.current) {
          await window.inC.autosave.clear()
          if (sameSnapshot()) {
            setAutosaveRevision(0)
          } else {
            await restoreDirtyRecoveryAfterClear()
          }
        }
      } catch (autosaveError) {
        if (!sameDocument()) return
        setFileStatus({
          tone: 'error',
          message: 'MusicXML 파일은 저장했지만 자동저장 복구본을 정리하지 못했습니다. 기술 정보를 확인한 뒤 다시 시도해 주세요.',
          details: { operation: 'MusicXML 저장', message: getErrorMessage(autosaveError) }
        })
        return
      }

      if (!sameDocument()) return

      try {
        const recentFiles = await window.inC.recentMusicXml.add({
          filePath: result.filePath,
          fileName: result.fileName
        })

        if (!sameDocument()) return
        setRecentMusicXmlFiles(recentFiles)
      } catch (recentError) {
        if (!sameDocument()) return
        setFileStatus({
          tone: 'error',
          message: 'MusicXML 파일은 저장했지만 최근 악보 목록을 갱신하지 못했습니다. 기술 정보를 확인한 뒤 다시 시도해 주세요.',
          details: { operation: 'MusicXML 저장', message: getErrorMessage(recentError) }
        })
        return
      }

      setFileStatus({
        tone: 'neutral',
        message: describeDocumentSaveCompletion(sameSnapshot()
          ? describeMusicXmlExportResult(result.fileName, report)
          : `${result.fileName}에 저장했습니다. 저장 중 추가한 변경사항은 아직 저장되지 않았습니다.`)
      })
      setMusicXmlReport(
        createMusicXmlReportPanelState('export', result.fileName, report)
      )
    } catch (error) {
      if (!sameDocument()) return
      const validationError = error instanceof MusicXmlRepeatConflictError || error instanceof MusicXmlMetadataConflictError || error instanceof MusicXmlSignatureConflictError ? error : describeEmptyMusicXmlMeasure(score, getErrorMessage(error))
      setFileStatus(musicXmlSaveRequested ? {
        tone: 'error',
        message: 'MusicXML 저장을 마무리하지 못했습니다. 변경 사항은 유지됩니다. 기술 정보를 확인한 뒤 다시 시도해 주세요.',
        details: { operation: 'MusicXML 저장', message: getErrorMessage(error) }
      } : validationError ? {
        tone: 'error', message: validationError.message,
        details: { operation: 'MusicXML 저장', message: validationError.technicalMessage }
      } : { tone: 'error', message: getErrorMessage(error) })
    } finally {
      saveInFlight.current = false
      activeFileSave.current = undefined
      setSavingMusicXml(false)
      returnFileOperationFocus(saveTrigger, savedGeneration, viewportIntent)
    }
  }, [
    allowDocumentSave,
    describeDocumentSaveCompletion,
    livePartViewPartId,
    noteInputState?.tupletInput,
    partPageSetupPreferences,
    score,
    scoreViewMode,
    restoreDirtyRecoveryAfterClear,
    returnFileOperationFocus
  ])

  const exportMusicXml = useCallback(async (mode: 'structure' | 'expanded' = 'structure') => {
    if (exportInFlight.current) return
    workspaceFocusRequest.current += 1
    exportInFlight.current = true
    setExportingMusicXml(true)
    const generation = documentGeneration.current
    const viewportIntent = workspaceViewportIntent.current
    activeMusicXmlCopy.current = { generation, previousStatus: currentFileStatus.current }
    const exportTrigger = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null
    let copyExportRequested = false
    let exportScoreForDiagnostics = score
    try {
      if (noteInputState?.tupletInput) {
        throw new Error('셋잇단음표 입력을 완료하거나 취소한 뒤 내보내 주세요.')
      }
      const selectedPart = scoreViewMode === 'part'
        ? score.parts.find(part => part.id === livePartViewPartId)
        : undefined
      if (scoreViewMode === 'part' && !selectedPart) {
        throw new Error('내보낼 파트보를 선택해 주세요.')
      }
      const partScore = selectedPart ? createPartExportScore(score, selectedPart.id) : undefined
      const exportScore = partScore
        ? {
            ...applyPortablePartLayout(partScore, livePartLayout),
            title: livePartLayout?.title ?? score.title
          }
        : score
      const copyScore = mode === 'expanded' ? expandScoreRepeatsForMusicXml(exportScore) : exportScore
      exportScoreForDiagnostics = copyScore
      const { contents, report } = serializeMusicXmlWithReport(copyScore)
      assertMusicXmlSaveSafe(copyScore, contents)
      const projectionWarnings = selectedPart ? collectPartRepeatProjectionWarnings(score, exportScore, selectedPart.id) : []
      const name = selectedPart ? `${score.title}-${selectedPart.name}` : score.title
      copyExportRequested = true
      const result = await window.inC.musicXml.exportCopy({
        suggestedName: `${toFileName(name)}${mode === 'expanded' ? '-반복펼치기' : ''}.musicxml`,
        contents
      })
      if (!result || documentGeneration.current !== generation) return
      const currentPartLayout = selectedPart
        ? nativeEnvelope.current?.partLayouts.find(part => part.partId === selectedPart.id)
        : undefined
      const currentPartTitle = currentPartLayout?.title ?? currentScoreRef.current.title
      const partTitleChanged = selectedPart !== undefined && currentPartTitle !== exportScore.title
      const currentPartCopy = partScore ? applyPortablePartLayout(partScore, currentPartLayout) : undefined
      const currentPartPageSetup = currentPartCopy?.layout?.pageSetup
      const partPageChanged = selectedPart !== undefined &&
        JSON.stringify(buildMusicXmlPageDefaults(currentPartPageSetup)) !==
        JSON.stringify(buildMusicXmlPageDefaults(exportScore.layout?.pageSetup))
      const partBreaksChanged = currentPartCopy !== undefined && currentPartLayout?.layout !== livePartLayout?.layout &&
        musicXmlPrintBreaksKey(mode === 'expanded' ? expandScoreRepeatsForMusicXml(currentPartCopy) : currentPartCopy) !==
        musicXmlPrintBreaksKey(copyScore)
      setFileStatus({
        tone: 'neutral',
        message: `${result.fileName}로 MusicXML을 내보냈습니다.${mode === 'expanded' ? ' 반복을 마디로 펼친 사본이며 원본 악보는 유지됩니다.' : ''}${sameCopySourceScore(currentScoreRef.current, score) && !partTitleChanged && !partPageChanged && !partBreaksChanged ? '' : ' 내보내기 시작 이후의 수정 내용은 포함되지 않았습니다.'}` +
          (currentNativeContext.current.scoreViewMode !== scoreViewMode ||
            (scoreViewMode === 'part' && currentNativeContext.current.livePartViewPartId !== livePartViewPartId)
            ? ' 내보내기 시작 이후의 보기 변경은 포함되지 않았습니다.' : '')
      })
      setMusicXmlReport(createMusicXmlReportPanelState('export', result.fileName, report, projectionWarnings))
    } catch (error) {
      if (documentGeneration.current === generation) {
        const validationError = error instanceof MusicXmlRepeatConflictError || error instanceof MusicXmlMetadataConflictError || error instanceof MusicXmlSignatureConflictError ? error : describeEmptyMusicXmlMeasure(exportScoreForDiagnostics, getErrorMessage(error))
        setFileStatus(copyExportRequested ? {
          tone: 'error',
          message: 'MusicXML 사본 내보내기를 마무리하지 못했습니다. 원본 악보와 변경 사항은 유지됩니다. 기술 정보를 확인한 뒤 다시 시도해 주세요.',
          details: { operation: 'MusicXML 내보내기', message: getErrorMessage(error) }
        } : validationError ? {
          tone: 'error', message: validationError.message,
          details: { operation: 'MusicXML 내보내기', message: validationError.technicalMessage }
        } : { tone: 'error', message: getErrorMessage(error) })
      }
    } finally {
      exportInFlight.current = false
      activeMusicXmlCopy.current = undefined
      setExportingMusicXml(false)
      returnFileOperationFocus(exportTrigger, generation, viewportIntent)
    }
  }, [score, scoreViewMode, livePartViewPartId, livePartLayout, noteInputState?.tupletInput, returnFileOperationFocus])

  const savePdf = useCallback(async () => {
    const startedWithTupletInput = isTupletInput
    if (pdfInFlight.current) return
    let context = currentPdfContext.current
    if (!context || context.generation !== documentGeneration.current) return
    if (!measuredLyrics.ready || !measuredHarmonies.ready) {
      setFileStatus({tone:'neutral',message: !measuredLyrics.ready
        ? '가사 배치를 준비하고 있습니다. 잠시 후 다시 출력해 주세요.'
        : '코드 심벌 배치를 준비하고 있습니다. 잠시 후 다시 출력해 주세요.'})
      return
    }
    if (!parsePdfTargetPages(pdfTargetPages)) {
      setFileStatus({
        tone: 'error',
        message: 'PDF 장수는 1 이상이어야 합니다.'
      })
      return
    }

    const generation = documentGeneration.current
    const viewportIntent = workspaceViewportIntent.current
    pdfInFlight.current = true
    const trigger = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null
    setPdfResult(undefined)
    setScoreGuideOpen(false)
    try {
      setPdfSnapshot(context)
      setPdfExporting(true)
      await waitForNextPaint()
      await document.fonts?.ready
      if (generation !== documentGeneration.current) return
      context = refreshPrintSnapshotWidths(context)
      setPdfSnapshot(context)
      await waitForNextPaint()
      if (generation !== documentGeneration.current) return
      if (!pdfSnapshotRoot.current) throw new Error('PDF 악보를 준비하지 못했습니다. 다시 시도해 주세요.')
      assertPrintPageInk(pdfSnapshotRoot.current,context.plan.pageSetup)
      const lyricInk = readLyricInk(pdfSnapshotRoot.current)
      const lyricOverlap = hasOverlappingLyricInk(lyricInk), lyricClipped = hasClippedLyricInk(lyricInk)
      const harmonyClipped = hasClippedNotationText(readHarmonyInk(pdfSnapshotRoot.current))
      const pageTargetExceeded = pdfLayoutExceedsTarget(pdfSnapshotRoot.current, context.plan)

      const result = await window.inC.pdf.save({
        suggestedName: `${toFileName(
          context.partTitle ? `${context.title}-${context.partTitle}` : context.title
        )}.pdf`
      })

      if (!result || generation !== documentGeneration.current) {
        return
      }

      setPdfResult({generation,fileName:result.fileName,source:context,lyricOverlap,lyricClipped,harmonyClipped,pageTargetExceeded})
      setFileStatus({
        tone: 'neutral',
        message: `${result.fileName}로 PDF를 만들었습니다.` +
          describePendingTupletCopy(startedWithTupletInput, Boolean(currentNativeContext.current.noteInputState?.tupletInput), '출력') +
          (samePdfSource(context, currentPdfContext.current) ? '' : ' 출력 시작 이후의 수정 내용은 포함되지 않았습니다.')
      })
    } catch (error) {
      if (generation === documentGeneration.current) setFileStatus({
        tone: 'error',
        message: error instanceof PrintPageInkError ? error.message : 'PDF 출력을 완료하지 못했습니다. 악보와 변경 사항은 유지됩니다. 다시 시도하거나 기술 정보를 확인해 주세요.',
        details: { operation: 'PDF 출력', message: getErrorMessage(error) }
      })
    } finally {
      pdfInFlight.current = false
      setPdfSnapshot(undefined)
      setPdfExporting(false)
      returnFileOperationFocus(trigger, generation, viewportIntent)
    }
  }, [isTupletInput, livePartViewPart, livePartViewTitle, measuredLyrics.ready, measuredHarmonies.ready, pdfTargetPages, score.title, scoreViewMode, returnFileOperationFocus])

  const savePng = useCallback(async () => {
    let context = currentPdfContext.current
    const generation = documentGeneration.current
    const viewportIntent = workspaceViewportIntent.current
    if (!context || context.generation !== generation || pngOwner.current?.generation === generation) return
    if (!measuredLyrics.ready || !measuredHarmonies.ready || noteInputState?.tupletInput) {
      setFileStatus({tone:'neutral',message:'입력과 표기 배치를 마친 뒤 PNG를 출력해 주세요.'});return
    }
    const page = Number(pngPage)
    if (pngScope === 'page' && (!/^\d+$/.test(pngPage) || !Number.isSafeInteger(page) || page < 1)) {
      setFileStatus({tone:'error',message:'PNG 페이지 번호는 1 이상의 정수여야 합니다.'});return
    }
    const owner = {generation,id:++pngRequest.current}, current = () => pngOwner.current === owner && documentGeneration.current === generation
    const trigger = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null
    pngOwner.current=owner;setPngJob({...owner,done:0,total:0});setPngNotice(undefined);setPngSnapshot(context)
    try {
      await waitForNextPaint();await document.fonts?.ready
      if (!current()) return
      context = refreshPrintSnapshotWidths(context)
      setPngSnapshot(context)
      await waitForNextPaint()
      if (!current()) return
      if (!pngSnapshotRoot.current) throw new Error('PNG 악보를 준비하지 못했습니다.')
      assertPrintPageInk(pngSnapshotRoot.current,context.plan.pageSetup,pngScope==='all'?'all':page)
      const output = await rasterizePngPages(pngSnapshotRoot.current,context.plan,pngDpi,pngScope==='all'?'all':page,current,(done,total)=>{
        if(current())setPngJob({...owner,done,total})
      })
      if (!current()) return
      const result = await window.inC.png.save({suggestedName:toFileName(context.partTitle?`${context.title}-${context.partTitle}`:context.title),pages:output.pages})
      if (!result || !current()) return
      const message = `${result.fileName}${result.kind==='folder'?' 폴더에':'에'} PNG ${result.pageCount}장을 저장했습니다.${samePdfSource(context,currentPdfContext.current)?'':' 출력 시작 이후의 수정이나 보기 변경은 포함되지 않았습니다.'}`
      setPngNotice({generation,message});setFileStatus({tone:'neutral',message})
    } catch(error) {
      if(current()) {
        const message=error instanceof PrintPageInkError || error instanceof PngPageRangeError ? error.message : 'PNG 출력을 완료하지 못했습니다. 악보와 변경 사항은 유지됩니다. 페이지와 해상도를 확인한 뒤 다시 시도해 주세요.'
        setPngNotice({generation,message});setFileStatus({tone:'error',message,details:{operation:'PNG 출력',message:getErrorMessage(error)}})
      }
    } finally {
      if(pngOwner.current===owner){pngOwner.current=undefined;setPngSnapshot(undefined);setPngJob(undefined);returnFileOperationFocus(trigger,generation,viewportIntent)}
    }
  },[pngScope,pngPage,pngDpi,measuredLyrics.ready,measuredHarmonies.ready,noteInputState?.tupletInput,returnFileOperationFocus])

  const saveMidi = useCallback(async () => {
    const startedWithTupletInput = isTupletInput
    const generation = documentGeneration.current
    const request = ++midiRequest.current
    // Disk requests still finish independently;only the latest request owns feedback.
    const ownsFeedback = () => generation === documentGeneration.current && request === midiRequest.current
    try {
      const midiScore =
        scoreViewMode === 'part' && livePartViewPartId
          ? createLivePartViewScore(score, livePartViewPartId)
          : score
      const midiReport = serializeMidiWithReport(midiScore)
      const result = await window.inC.midi.save({
        suggestedName: `${toFileName(
          scoreViewMode === 'part' && livePartViewPart
            ? `${score.title}-${livePartViewPart.name}`
            : score.title
        )}.mid`,
        contents: Array.from(midiReport.bytes)
      })

      if (!result || !ownsFeedback()) {
        return
      }

      setMidiReport(midiReport.warnings.length > 0 ? { generation, fileName: result.fileName, warnings: midiReport.warnings } : undefined)
      setMidiFailure(undefined)
      setFileStatus({
        tone: 'neutral',
        message: describeMidiExportResult(result.fileName, midiReport.warnings) +
          describePendingTupletCopy(startedWithTupletInput, Boolean(currentNativeContext.current.noteInputState?.tupletInput), '내보내기') +
          (!sameCopySourceScore(currentScoreRef.current, score) ? ' 내보내기 시작 이후의 수정 내용은 포함되지 않았습니다.' : '') +
          (currentNativeContext.current.scoreViewMode !== scoreViewMode ||
            (scoreViewMode === 'part' && currentNativeContext.current.livePartViewPartId !== livePartViewPartId)
            ? ' 내보내기 시작 이후의 보기 변경은 포함되지 않았습니다.' : '')
      })
    } catch (error) {
      if (ownsFeedback()) {
        setMidiFailure({ generation, message: getErrorMessage(error) })
        setFileStatus({ tone: 'error', message: midiExportFailureMessage })
      }
    }
  }, [isTupletInput, livePartViewPart, livePartViewPartId, score, scoreViewMode])

  // Keyboard commands must see the document represented by the committed DOM,
  // including the first input before passive effects replace the welcome closure.
  useLayoutEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const usesCommandKey = event.metaKey || event.ctrlKey

      if (event.isComposing || event.key === 'Process' || event.keyCode === 229) {
        return
      }

      // Welcome buttons own native activation; no editor document is open yet.
      if (startScreenVisible) return

      if (usesCommandKey && !event.altKey && event.shiftKey && event.code === 'KeyS' && nativeEnvelope.current) {
        event.preventDefault()
        void saveNativeProject(true)
        return
      }

      if (
        usesCommandKey &&
        !event.altKey &&
        !event.shiftKey &&
        event.code === 'KeyS'
      ) {
        event.preventDefault()
        if (nativeEnvelope.current) void saveNativeProject()
        else void saveMusicXml()
        return
      }

      // A closed list-only Select has no text draft to undo. Keep document
      // undo/redo available without bypassing text inputs or an open choice list.
      const closedSelect = event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>('button[role="combobox"][aria-expanded="false"]')
        : null
      if (closedSelect && !closedSelect.disabled && !event.defaultPrevented) {
        if (isRedoShortcut(event)) { event.preventDefault(); redo(); return }
        if (isUndoShortcut(event)) { event.preventDefault(); undo(); return }
      }

      if (isTextEditingTarget(event.target)) {
        return
      }

      if(activeMeasureTextRequest&&event.key==='Escape'){
        event.preventDefault();setMeasureTextSelection(undefined);setSelection(activeMeasureTextRequest.returnSelection);return
      }

      if (activeSpanReference) {
        if (isUndoShortcut(event)) { event.preventDefault(); undo() }
        else if (isRedoShortcut(event)) { event.preventDefault(); redo() }
        else if (event.key === 'Escape') { event.preventDefault(); setSpanSelection(undefined) }
        else if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); deleteSpan() }
        else if (event.key === ' ') { event.preventDefault(); playback.status === 'playing' ? playback.pause() : playFromSelection() }
        else if (event.key !== 'Tab' && !['Shift', 'Control', 'Meta', 'Alt'].includes(event.key)) event.preventDefault()
        return
      }

      if (
        toolbarCategory === 'lyrics' &&
        !event.altKey &&
        !event.shiftKey &&
        !usesCommandKey &&
        (event.key === 'ArrowUp' || event.key === 'ArrowDown')
      ) {
        event.preventDefault()
        moveActiveLyricVerse(event.key === 'ArrowDown' ? 1 : -1)
        return
      }

      if (toolbarCategory === 'lyrics' && event.key === 'Enter') {
        event.preventDefault()
        moveToNextLyricNote()
        return
      }

      if (toolbarCategory === 'lyrics' && eventLocation?.event.type === 'note' && !usesCommandKey && !event.altKey) {
        document
          .querySelector<HTMLInputElement>('.notation-lyric-editor input')
          ?.focus()
        return
      }

      if (usesCommandKey && !event.altKey && event.code === 'KeyC') {
        event.preventDefault()
        copySelection()
        return
      }

      if (usesCommandKey && !event.altKey && event.code === 'KeyV') {
        event.preventDefault()
        pasteSelection()
        return
      }

      if (isRedoShortcut(event)) {
        event.preventDefault()
        redo()
        return
      }

      if (isUndoShortcut(event)) {
        event.preventDefault()
        undo()
        return
      }

      if (isNoteInputToggleShortcut(event)) {
        event.preventDefault()
        toggleNoteInputMode()
        return
      }

      const voiceShortcut = resolveVoiceShortcut(event, activeVoiceNumber)

      if (voiceShortcut) {
        event.preventDefault()
        switchActiveVoice(voiceShortcut)
        return
      }

      if (!event.altKey && !usesCommandKey && event.code === 'KeyJ') {
        event.preventDefault()
        respellEnharmonically()
        return
      }

      const duration = resolveDurationShortcut(event)

      if (duration) {
        event.preventDefault()
        changeDuration(duration)
        return
      }

      const pitch = resolvePitchShortcut(event)
      const addsChordPitch =
        pitch &&
        event.shiftKey &&
        !noteInputState &&
        eventLocation?.event.type === 'note'
      const pitchAction = pitch
        ? noteInputState
          ? 'enter-note'
          : resolvePitchKeyboardAction(
            mode,
            eventLocation?.event.type === 'note' ||
              eventLocation?.event.type === 'rest'
            )
        : undefined

      if (addsChordPitch) {
        event.preventDefault()
        addChordPitchStep(pitch)
        return
      }

      if (pitch && pitchAction) {
        event.preventDefault()

        if (pitchAction === 'enter-note') {
          enterNote(pitch)
        } else {
          changePitchStep(pitch)
        }

        return
      }

      if (isTupletShortcut(event)) {
        event.preventDefault()
        toggleTuplet()
        return
      }

      if (isTieShortcut(event)) {
        event.preventDefault()
        toggleTie()
        return
      }

      if (isSlurShortcut(event)) {
        event.preventDefault()
        toggleSlur()
        return
      }

      if (isRestShortcut(event)) {
        event.preventDefault()
        if (noteInputState) {
          enterRest()
        } else {
          convertSelectionToRest()
        }
        return
      }

      const dotChange = resolveDotShortcut(event)

      if (dotChange) {
        event.preventDefault()
        changeDots(dotChange)
        return
      }

      switch (event.key) {
        case ' ':
          event.preventDefault()

          if (playback.status === 'playing') {
            playback.pause()
          } else {
            playFromSelection()
          }
          break
        case 't':
        case 'T':
          event.preventDefault()
          toggleTie()
          break
        case 'Delete':
        case 'Backspace':
          event.preventDefault()
          deleteSelection()
          break
        case 'ArrowLeft':
          event.preventDefault()
          moveSelection(-1, event.shiftKey)
          break
        case 'ArrowRight':
          event.preventDefault()
          moveSelection(1, event.shiftKey)
          break
        case 'ArrowUp':
        case 'ArrowDown':
          event.preventDefault()
          if ((event.metaKey || event.ctrlKey) && event.altKey) {
            movePitch('octave', event.key === 'ArrowUp' ? 1 : -1)
          } else if (event.altKey && event.shiftKey) {
            movePitch('chromatic', event.key === 'ArrowUp' ? 1 : -1)
          } else if (event.altKey) {
            movePitch('diatonic', event.key === 'ArrowUp' ? 1 : -1)
          } else if (
            moveSelectionVertically(event.key === 'ArrowUp' ? -1 : 1)
          ) {
            setFileStatus({
              tone: 'neutral',
              message:
                event.key === 'ArrowUp'
                  ? '위 보표로 이동했습니다.'
                  : '아래 보표로 이동했습니다.'
            })
          } else if (eventLocation?.event.type === 'note') {
            setFileStatus({
              tone: 'neutral',
              message: '음높이 변경은 Alt/Option+↑/↓를 사용하세요.'
            })
          }
          break
        case 'Escape':
          if (measureContextMenu) {
            setMeasureContextMenu(undefined)
          }
          if (noteInputState?.tupletInput) {
            setFileStatus({
              tone: 'neutral',
              message: '셋잇단음표 입력을 취소했습니다.'
            })
          } else if (pendingSlurAnchorEventId) {
            setFileStatus({
              tone: 'neutral',
              message: '슬러 입력을 취소했습니다.'
            })
          }
          setMode('select')
          setNoteInputState(undefined)
          setPendingSlurAnchorEventId(undefined)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    activeSpanReference,
    activeMeasureTextRequest,
    deleteSpan,
    addChordPitchStep,
    activeVoiceNumber,
    changeDuration,
    changeDots,
    changePitchStep,
    clearSelection,
    convertSelectionToRest,
    copySelection,
    deleteSelection,
    enterNote,
    enterRest,
    moveActiveLyricVerse,
    movePitch,
    moveSelection,
    moveSelectionVertically,
    moveToNextLyricNote,
    respellEnharmonically,
    mode,
    eventLocation,
    measureContextMenu,
    playback.pause,
    playFromSelection,
    playback.status,
    pasteSelection,
    pendingSlurAnchorEventId,
    redo,
    saveMusicXml,
    saveNativeProject,
    switchActiveVoice,
    toggleSlur,
    toggleTie,
    toggleTuplet,
    toolbarCategory,
    startScreenVisible,
    toggleNoteInputMode,
    undo
  ])

  const selectedEventId = getSelectionFocusEventId(selection)
  const selectedEventIds = useMemo(
    () => getSelectedEventIds(selection),
    [selection]
  )
  const selectedEventAddresses = useMemo(() => {
    if (selection.type !== 'range') return undefined
    const addresses = new Map<string, VoiceAddress>()
    for (const id of selection.eventIds) {
      const location = locateEvent(score, id, selection.address)
      if (location) addresses.set(id, location.address)
    }
    return addresses
  }, [score, selection])
  const filteredSelectedEventIds = useMemo(
    () =>
      getFilteredSelectedEventIds(score, selection, {
        eventTypes: selectionEventTypeFilter
      }),
    [score, selection, selectionEventTypeFilter]
  )
  const selectedMeasureId =
    selection.type === 'measure' ? selection.measureId : undefined
  const previewScore = useMemo(
    () =>
      noteInputState?.tupletInput
        ? createTupletInputPreviewScore(score, noteInputState)
        : score,
    [noteInputState, score]
  )
  const displayScore = useMemo(
    () => {
      const baseScore =
        scoreViewMode === 'part' && livePartViewPartId
          ? applyPortablePartLayout(createLivePartViewScore(previewScore, livePartViewPartId), livePartLayout)
          : previewScore

      return applyPageSetupToScore(baseScore, pageSetup)
    },
    [livePartViewPartId, livePartLayout, pageSetup, previewScore, scoreViewMode]
  )
  // A normal blur commit can change the score during the starting mousedown.
  // It is still the same document/view; actual document replacement and an
  // uncommitted input preview must invalidate the old pointer gesture.
  const notationDocumentKey = documentGeneration.current
  const notationInputPreview = noteInputState?.tupletInput
  const notationInteractionOwner = useMemo(() => ({
    documentKey: notationDocumentKey, inputPreview: notationInputPreview, view: scoreViewMode,
    partId: scoreViewMode === 'part' ? livePartViewPartId : undefined
  }), [notationDocumentKey, notationInputPreview, scoreViewMode, scoreViewMode === 'part' ? livePartViewPartId : undefined])
  const printScore = useMemo(
    () => {
      const baseScore =
        scoreViewMode === 'part' && livePartViewPartId
          ? applyPortablePartLayout(createLivePartViewScore(score, livePartViewPartId), livePartLayout)
          : score

      return applyPageSetupToScore(baseScore, pageSetup)
    },
    [livePartViewPartId, livePartLayout, pageSetup, score, scoreViewMode]
  )
  const pdfTargetPageCount = parsePdfTargetPages(pdfTargetPages)
  const harmonySpacingWidths = useMemo(()=>harmonySpacingByMeasure(printScore,measuredHarmonies.widths),[printScore,measuredHarmonies.widths])
  const lyricMinimumWidths = useMinimumTextScoreWidths(printScore,measuredLyrics.widths,harmonySpacingWidths)
  const pdfTargetPagesInvalid = !pdfTargetPageCount
  const pdfTargetPagesTooltip = pdfTargetPagesInvalid
    ? 'PDF 장수는 1 이상이어야 합니다.'
    : !measuredLyrics.ready ? '가사 배치를 준비하고 있습니다.' : !measuredHarmonies.ready ? '코드 심벌 배치를 준비하고 있습니다.' : 'PDF 변환'
  const printLayoutPlan = useMemo(
    () => resolvePrintLayoutPlan(printScore, pdfTargetPageCount ?? 1, lyricMinimumWidths),
    [pdfTargetPageCount, printScore, lyricMinimumWidths]
  )
  currentPdfContext.current = { generation: documentGeneration.current, score: printScore,
    plan: printLayoutPlan, title: score.title, partTitle: scoreViewMode === 'part' ? livePartViewTitle : undefined,
    partId: scoreViewMode === 'part' ? livePartViewPartId : undefined, viewMode: scoreViewMode,
    lyricWidths: measuredLyrics.widths, harmonyWidths: harmonySpacingWidths, minimumMeasureWidths: lyricMinimumWidths }
  const canEditPitch = selectedEventLocation?.event.type === 'note'
  const selectedNoteArticulations =
    selectedEventLocation?.event.type === 'note'
      ? new Set(selectedEventLocation.event.articulations ?? [])
      : new Set<Articulation>()
  const selectedEventHasFermata = Boolean(selectedEventLocation?.event.fermata)
  const selectedEventBreathMark = selectedEventLocation?.event.breathMark
  const selectedPitchAlters = selectedEventLocation?.event.type === 'note'
    ? (selectedEventLocation.event.pitches?.length ? selectedEventLocation.event.pitches : [selectedEventLocation.event.pitch]).map(member => {
        const voice = selectedEventLocation.measure.voices.find(voice => voice.id === selectedEventLocation.address.voiceId)!
        return resolveNotePitch(selectedEventLocation.measure, voice, { ...selectedEventLocation.event as Note, pitch: member }).alter ?? 0
      })
    : []
  const selectedPitchAlter = selectedPitchAlters.length && selectedPitchAlters.every(alter => alter === selectedPitchAlters[0])
    ? selectedPitchAlters[0] : undefined
  const accidentalEnabled = Boolean(noteInputState || canEditPitch)
  const canEditMeasureNotation =
    Boolean(activeMeasureId) && selection.type !== 'range' && !activeSpanReference
  const canChangeMeasureClef = Boolean(measureLocation) && !activeSpanReference
  const rangeStart = selection.type === 'range' && selection.eventIds.length >= 2
    ? locateEvent(score, selection.eventIds[0], selection.address)
    : undefined
  const rangeEnd = selection.type === 'range' && selection.eventIds.length >= 2
    ? locateEvent(score, selection.eventIds[selection.eventIds.length - 1], selection.address)
    : undefined
  const canApplyRangeHairpin = !activeSpanReference && Boolean(rangeStart && rangeEnd &&
    rangeStart.address.partId === rangeEnd.address.partId &&
    rangeStart.address.staffId === rangeEnd.address.staffId)
  const canApplyNoteSpan = canApplyRangeHairpin &&
    rangeStart?.event.type === 'note' && rangeEnd?.event.type === 'note'
  const canApplySlur = canApplyNoteSpan ||
    (selection.type === 'event' && eventLocation?.event.type === 'note')
  const matchesSelectedRange = (span: { startEventId: string; endEventId: string }) =>
    canApplyRangeHairpin && span.startEventId === rangeStart?.event.id &&
    span.endEventId === rangeEnd?.event.id
  const selectedRangeHairpin = score.hairpins?.find(matchesSelectedRange)
  const selectedRangeSlur = score.slurs?.some(matchesSelectedRange) ?? false
  const selectedRangeOctave = score.octaveShifts?.find(matchesSelectedRange)
  const measureObjectDeleteCommand =
    selection.type === 'measure' && selectionObjectTypeFilter !== 'none'
      ? buildMeasureObjectDeleteCommand(
          score,
          selection.measureId,
          selectionObjectTypeFilter
        )
      : undefined
  const clearSelectionLabel =
    activeMeasureTextRequest?`선택 ${measureTextLabels[activeMeasureTextRequest.family]} 지우기`:selection.type === 'measure' && selectionObjectTypeFilter !== 'none'
      ? `선택 마디 ${describeSelectionObjectFilter(selectionObjectTypeFilter)} 지우기`
      : selection.type === 'range'
      ? '선택 범위 지우기'
      : eventLocation?.event.type === 'rest'
      ? '쉼표 지우기'
      : '음표 지우기'
  const rangeRestResult = selection.type === 'range' ? buildRangeRestResult(score, selection) : undefined
  const canClearSelection = activeMeasureTextRequest?Boolean(focusedMeasureTextObject):!activeSpanReference && (
    Boolean(measureObjectDeleteCommand) ||
    (selectionObjectTypeFilter === 'none' && (selection.type === 'event' || selection.type === 'range') &&
      Boolean(
        buildFilteredDeleteCommand(score, selection, {
          eventTypes: selectionEventTypeFilter
        })
      )))
  const canCopySelection = !activeSpanReference && (activeMeasureTextRequest?Boolean(focusedMeasureTextObject&&buildSingleMeasureTextClipboard(score,activeMeasureTextRequest.family,focusedMeasureTextObject.id)):Boolean(
    (selection.type === 'measure' &&
      selectionObjectTypeFilter !== 'none' &&
      buildMeasureMarkingClipboard(
        score,
        selection.measureId,
        selectionObjectTypeFilter
      )) ||
      (selectionObjectTypeFilter === 'none' && buildFilteredRangeClipboard(score, selection, {
        eventTypes: selectionEventTypeFilter
      }))
  ))
  const canPasteSelection = !isTupletInput && !activeSpanReference && !activeMeasureTextRequest && ((measureMarkingClipboard?.pasteMode==='append-single'||measureMarkingClipboard?.pasteMode==='replace-measure')?Boolean(singleTextPasteMeasureId&&buildMeasureMarkingPasteCommand(score,singleTextPasteMeasureId,measureMarkingClipboard,()=> 'preview-marking',singleTextPasteTick)):Boolean(
    (selection.type === 'measure' && measureMarkingClipboard &&
      buildMeasureMarkingPasteCommand(score, selection.measureId, measureMarkingClipboard, () => 'preview-marking')) ||
      (selectionObjectTypeFilter === 'none' && rangeClipboard &&
      buildFilteredRangePasteCommand(
        score,
        selection,
        rangeClipboard,
        previewInputId,
        { eventTypes: selectionEventTypeFilter }
      ))
  ))
  const copySelectionLabel=activeMeasureTextRequest?`선택 ${measureTextLabels[activeMeasureTextRequest.family]} 복사`:'선택 범위 복사'
  const pasteSelectionLabel=measureMarkingClipboard?.pasteMode==='replace-measure'?'복사한 셈여림으로 마디 설정':measureMarkingClipboard?.pasteMode==='append-single'?`복사한 ${describeSelectionObjectFilter(measureMarkingClipboard.type)} 추가`:'선택 범위에 붙여넣기'
  const canToggleSystemBreak = Boolean(layoutMeasureId) && activeMeasureIndex > 0
  const systemBreakLabel = activeMeasureHasSystemBreak
    ? '시스템 나누기 해제'
    : '시스템 나누기 추가'
  const canTogglePageBreak = Boolean(layoutMeasureId) && activeMeasureIndex > 0
  const pageBreakLabel = activeMeasureHasPageBreak
    ? '페이지 나누기 해제'
    : '페이지 나누기 추가'
  const activeClefId =
    resolveStandardClefPreset(measureLocation?.measure.clef)?.id ?? (measureLocation ? 'unsupported' : 'treble')
  const activeStaffClef = activeStructureStaff?.measures[0]?.clef
  const activeStaffClefId = resolveStandardClefPreset(activeStaffClef)?.id ?? 'unsupported'
  const unsupportedStaffClefLabel = activeStaffClef?.sign==='percussion' ? '타악기 표기 (현재)' :
    activeStaffClef?.sign==='tab' ? 'TAB 표기 (현재)' : `${activeStaffClef?describeInspectorClef(activeStaffClef):'기타 음자리표'} (현재)`
  const selectedNote =
    selectedEventLocation?.event.type === 'note' ? selectedEventLocation.event : undefined
  const selectedChordPitches = selectedNote
    ? normalizeChordPitches(selectedNote)
    : []
  const lyricEditingBlocked = hasAmbiguousLyricVerses(selectedNote?.lyrics)
  const selectedLyric = selectedNote?.lyrics?.find(
    (lyric) => (lyric.number ?? 1) === activeLyricVerse
  )
  const activeTick = eventLocation?.event.position.tick ?? selectedAnnotationTick ?? noteInputState?.tick ?? 0
  const selectedProperties = useMemo(() => {
    if (selection.type === 'event' && eventLocation) {
      const event = eventLocation.event
      return {
        kind: 'event',
        rows: [
          ['대상', event.type === 'note' ? '음표' : '쉼표'],
          ['위치', describeStaffTarget(score, eventLocation.address)],
          ['마디', `${eventLocation.measure.number}`],
          ['성부', String(parseVoiceNumber(eventLocation.address.voiceId))],
          ['틱', `${event.position.tick}`],
          ['음가', durationLabels[event.duration.value]],
          [
            '음높이',
            event.type === 'note'
              ? selectedChordPitches.map((pitch,index)=>{
                  const alter=selectedPitchAlters[index]??pitch.alter??0
                  return `${pitch.step}${alter>0?'#'.repeat(alter):alter<0?'b'.repeat(-alter):''}${pitch.octave}`
                }).join(' · ')
              : '쉼표'
          ]
        ]
      }
    }

    if (selection.type === 'measure' && measureLocation) {
      return {
        kind: 'measure',
        rows: [
          ['대상', '마디'],
          ['위치', describeStaffTarget(score, measureLocation.address)],
          ['마디', `${measureLocation.measure.number}`],
          [
            '음자리표',
            describeInspectorClef(measureLocation.measure.clef)
          ],
          ['조표', describeInspectorKey(measureLocation.measure.keySignature)],
          [
            '박자',
            `${measureLocation.measure.timeSignature.beats}/${measureLocation.measure.timeSignature.beatType}`
          ]
        ]
      }
    }

    if (selection.type === 'range') {
      return {
        kind: 'range',
        rows: [
          ['대상', '범위'],
          [
            '위치',
            selection.address
              ? describeStaffTarget(score, selection.address)
              : '선택 범위'
          ],
          [
            '성부',
            selection.address ? String(parseVoiceNumber(selection.address.voiceId)) : '—'
          ],
          ['선택', `${selectedEventIds.length}개 이벤트`],
          ['필터', describeSelectionFilter(selectionEventTypeFilter)]
        ]
      }
    }

    return {
      kind: 'none',
      rows: [['대상', '선택 없음']]
    }
  }, [
    eventLocation,
    measureLocation,
    score,
    selectedEventIds.length,
    selectedChordPitches,
    selectedPitchAlters,
    selection,
    selectionEventTypeFilter
  ])
  // Location properties edit the selected event; the input caret may already
  // have advanced to another measure while that event remains selected.
  const activeHarmonyCandidates = activeLocationMeasureId
    ? score.harmonies?.filter(
        (harmony) =>
          harmony.measureId === activeLocationMeasureId && harmony.tick === activeTick
      ) ?? []
    : []
  const activeHarmony = activeMeasureTextRequest?.family==='harmonies'?activeHarmonyCandidates.find(mark=>mark.id===activeMeasureTextRequest.id):activeHarmonyCandidates[0]
  const activeTempoCandidates = tempoTargetMeasureId
    ? globalAnnotationScore.tempoEvents?.filter(
        (tempoEvent) =>
          tempoEvent.measureId === tempoTargetMeasureId && tempoEvent.tick === tempoTargetTick
      ) ?? []
    : []
  const activeTempoEvent = activeTempoCandidates.at(-1)
  const tempoTargetLocation = tempoTargetMeasureId ? locateMeasure(score,tempoTargetMeasureId) : undefined
  const tempoTargetDefaultBeat = resolveDefaultTempoBeatForTimeSignature(
    tempoTargetLocation?.measure.timeSignature ?? activeTimeSignature ?? timeSignaturePresets[2].value
  )
  const tempoPointMap = new Map<string, { value: string; label: string; measureId: string; tick: number; number: number; partIndex: number; staffIndex: number }>()
  const addTempoPoint = (measureId: string, tick: number, mark?: TempoEvent) => {
    const location = locateMeasure(score, measureId)
    if (!location || !Number.isSafeInteger(tick) || tick < 0 || tick > measureDurationTicks(location.measure)) return
    const partIndex = score.parts.findIndex(part => part.id === location.address.partId), part = score.parts[partIndex]
    const staffIndex = part.staves.findIndex(staff => staff.id === location.address.staffId)
    const owner = `${part.name}${part.staves.length>1 ? ` · 보표 ${staffIndex+1}` : ''}`
    const value = JSON.stringify([measureId,tick])
    tempoPointMap.set(value, { value, measureId, tick, number: location.measureNumber, partIndex, staffIndex,
      label: `${owner} · ${location.measureNumber}마디 · ${1+tick/TICKS_PER_QUARTER}박 · ${mark ? `${formatTempoBeatOptionLabel(mark.beatUnit??'quarter',normalizeTempoBeatDots(mark.dots??0))} = ${mark.bpm} BPM${mark.transparent ? ' · 숨김' : ''}` : '변경 없음'}` })
  }
  for (const mark of globalAnnotationScore.tempoEvents ?? []) addTempoPoint(mark.measureId,mark.tick,mark)
  const tempoPointValue = requestedTempoPoint ? JSON.stringify([requestedTempoPoint.measureId,requestedTempoPoint.tick]) : ''
  if (requestedTempoPoint && !tempoPointMap.has(tempoPointValue)) addTempoPoint(requestedTempoPoint.measureId,requestedTempoPoint.tick)
  const tempoPointOptions = [{value:'',label:'현재 선택 위치'}, ...[...tempoPointMap.values()].sort((a,b)=>
    a.number-b.number || a.tick-b.tick || a.partIndex-b.partIndex || a.staffIndex-b.staffIndex)]
  const tempoTargetBeat = activeTempoEvent
    ? {beatUnit:activeTempoEvent.beatUnit??'quarter',dots:activeTempoEvent.dots??0}
    : tempoTargetDefaultBeat
  const tempoTargetScope = `총보 공통 · ${tempoTargetLocation?.measureNumber??'—'}마디 · ${1+tempoTargetTick/TICKS_PER_QUARTER}박 (4분음표 기준) · BPM 기준: ${formatTempoBeatOptionLabel(tempoTargetBeat.beatUnit,normalizeTempoBeatDots(tempoTargetBeat.dots))}${activeTempoEvent?.transparent ? ' · 재생에만 적용(숨김)' : ''}`
  const activeExpressionCandidates = activeLocationMeasureId
    ? score.expressionTexts?.filter(
        (expressionText) =>
          expressionText.measureId === activeLocationMeasureId &&
          expressionText.tick === activeTick
      ) ?? []
    : []
  const activeExpressionText = activeExpressionCandidates[0]

  const activeLocationDescription = selectedAnnotationTick!==undefined?`${measureLocation?.measure.number??'—'}마디 · ${1+selectedAnnotationTick/TICKS_PER_QUARTER}박 (4분음표 기준)`:eventLocation?`${eventLocation.measure.number}마디 · ${parseVoiceNumber(eventLocation.address.voiceId)}성부 · ${(eventLocation.measure.voices.find(voice=>voice.id===eventLocation.address.voiceId)?.events.findIndex(event=>event.id===eventLocation.event.id)??-1)+1}번째 표기`:noteInputState?'입력 커서의 현재 위치':`${activeMeasureId?locateMeasure(score,activeMeasureId)?.measureNumber??'—':'—'}마디 · 시작 위치`

  const openToolbarWorkspace = (category: ToolbarCategory, selector?: string) => {
    if(category==='playback') setMixerOpen(true)
    else setToolbarCategory(category)
    if (category === 'note' || category === 'span-properties') {
      setDockVisibility(previous=>({...previous,properties:true}));setActiveDock('properties')
    } else if(category === 'notation' || category === 'palette') {
      setDockVisibility(previous=>({...previous,palette:true}));setActiveDock('palette')
    }
    // Resolve after the visible workspace changes. Never focus a stale document/test root.
    const root = document.querySelector('.app-shell')
    const origin = document.activeElement
    const fromMenu = Boolean(origin?.closest('.studio-application-menu'))
    const scoreOrigin = fromMenu ? menuScoreFocusOrigin.current : origin
    // A public menu restores its trigger when it closes; later user focus belongs to the user.
    const menuTrigger = root?.querySelector<HTMLElement>('[aria-haspopup="menu"][aria-expanded="true"]')
    const generation = documentGeneration.current
    const request = ++workspaceFocusRequest.current
    if (selector) requestAnimationFrame(() => {
      if (!root?.isConnected || generation !== documentGeneration.current || request !== workspaceFocusRequest.current) return
      const field = root.querySelector<HTMLElement>(selector) ?? (category === 'note' ? root.querySelector<HTMLElement>('.studio-properties-dock') : null)
      if (field && !field.hasAttribute('disabled') && (field.checkVisibility?.() ?? true)) {
        const active = document.activeElement
        if (active !== document.body && active !== origin && active !== menuTrigger && active !== field && !(fromMenu && active === scoreOrigin) && !isRedrawnScoreOrigin(scoreOrigin, active)) return
        field.focus()
        revealWorkspaceTarget(field)
      }
    })
  }

  useLayoutEffect(() => {
    revealPendingDraft.current = pending => {
      if (!pending.input.isConnected) return
      if (pending.workspace === 'document') {
        // A paper editor is not a toolbar category. Keep view/zoom/dock state
        // and reveal this exact, still-mounted field without adding paper help.
        workspaceFocusRequest.current += 1
        pending.input.focus({ preventScroll: true })
        revealWorkspaceTarget(pending.input)
        return
      }
      // The public Input ID identifies this exact owner, including a hidden
      // workspace. A later part/document must never inherit its focus request.
      openToolbarWorkspace(pending.workspace, `input[id=${JSON.stringify(pending.input.id)}]`)
    }
  })

  const openMixer = () => openToolbarWorkspace('playback','.studio-part-mixer input[type="range"]:not(:disabled)')
  const toggleMixer = () => {
    if(mixerOpen){workspaceFocusRequest.current+=1;setMixerOpen(false)}
    else openMixer()
  }

  const openLyricWorkspace = () => openToolbarWorkspace('lyrics', selectedNote && !lyricEditingBlocked
    ? 'input[aria-label="선택 음표 가사"]:not(:disabled)'
    : '.studio-lyric-tools')

  const openPaletteFamily = (family: Parameters<typeof paletteWorkspace.reveal>[0]) => {
    paletteWorkspace.reveal(family)
    openToolbarWorkspace('palette', `.studio-notation-palette__family[data-family="${family}"] button[aria-controls][aria-expanded]`)
  }

  const handleResultKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.nativeEvent.isComposing || event.keyCode === 229 ||
      (!event.ctrlKey && !event.metaKey && !event.altKey && (event.key === 'Enter' || event.key === ' '))) event.stopPropagation()
  }

  // Busy guards cover the shared file operation, while visible progress belongs
  // only to its document. Keep the previous result intact for a cancelled retry.
  const ownedFileSave = activeFileSave.current?.generation === documentGeneration.current
    ? activeFileSave.current : undefined
  const fileSaveMessage = ownedFileSave?.kind === 'project' && savingNative
    ? '프로젝트를 저장하는 중입니다.'
    : ownedFileSave?.kind === 'musicxml' && savingMusicXml
      ? 'MusicXML을 저장하는 중입니다.' : undefined
  const ownedMusicXmlCopy = activeMusicXmlCopy.current?.generation === documentGeneration.current
    ? activeMusicXmlCopy.current : undefined
  // A retry temporarily replaces its prior result. A newer result from another
  // file operation must remain visible while the outstanding operation runs.
  const mayShowActivity = (previousStatus: typeof fileStatus) => !fileStatus || fileStatus === previousStatus
  const currentFileActivityMessage = [
    ownedFileSave && mayShowActivity(ownedFileSave.previousStatus) ? fileSaveMessage : undefined,
    ownedMusicXmlCopy && exportingMusicXml && mayShowActivity(ownedMusicXmlCopy.previousStatus)
      ? 'MusicXML 사본을 내보내는 중입니다.' : undefined
  ].filter(Boolean).join(' ')
  const visibleFileStatus = currentFileActivityMessage
    ? { tone: 'neutral', message: currentFileActivityMessage } : fileStatus ?? undefined

  const openCommandSearch = () => {
    workspaceFocusRequest.current += 1
    commandSearchRequest.current += 1
    commandSearchActive.current = true
    commandSearchOwner.current = { generation: documentGeneration.current, workspace: workspaceFocusRequest.current,
      origin: document.querySelector<HTMLElement>('.studio-application-menu [aria-haspopup="menu"][aria-expanded="true"]') ??
        (document.activeElement instanceof HTMLElement ? document.activeElement : undefined) }
    setCommandSearchOpen(true)
  }
  const closeCommandSearch = () => {
    if (!commandSearchActive.current) return
    commandSearchActive.current = false
    const request = ++commandSearchRequest.current, owner = commandSearchOwner.current
    const origin = document.activeElement
    setCommandSearchOpen(false)
    requestAnimationFrame(() => {
      if (request !== commandSearchRequest.current || owner?.generation !== documentGeneration.current || owner.workspace !== workspaceFocusRequest.current || !owner.origin?.isConnected) return
      if (document.activeElement !== document.body && document.activeElement !== origin && document.activeElement !== owner.origin) return
      owner.origin.focus()
    })
  }
  const runSearchCommand = (id: string) => {
    if (!commandSearchActive.current) return
    commandSearchActive.current = false
    const request = ++commandSearchRequest.current, owner = commandSearchOwner.current
    setCommandSearchOpen(false)
    requestAnimationFrame(() => {
      if (request !== commandSearchRequest.current || owner?.generation !== documentGeneration.current || owner.workspace !== workspaceFocusRequest.current) return
      // Resolve live enablement after modal cleanup, not a stale search result.
      const menu = applicationMenusRef.current.find(menu => id.startsWith(`${menu.id}:`))
      const command = menu?.commands.find(command => `${menu.id}:${command.id}` === id)
      if (!command || command.disabled) return
      if (owner.origin?.isConnected) owner.origin.focus()
      command.onSelect()
    })
  }
  const applicationMenus: readonly StudioMenuDefinition[] = [
        {id:'file',label:'파일',commands:[
          {id:'new',label:'새 악보 만들기',group:'project',onSelect:openNewScoreWizard},
          {id:'open',label:'프로젝트 열기',group:'project',disabled:openingNative || !window.inC?.project,onSelect:()=>void openNativeProject()},
          {id:'save',label:'프로젝트 저장',group:'project',disabled:savingNative || savingMusicXml || !window.inC?.project,onSelect:()=>void saveNativeProject()},
          {id:'save-as',label:'프로젝트 다른 이름으로 저장',group:'project',disabled:savingNative || savingMusicXml || !window.inC?.project,onSelect:()=>void saveNativeProject(true)},
          {id:'import',label:'MusicXML 가져오기',group:'exchange',disabled:openingMusicXml,onSelect:()=>void importMusicXml()},
          {id:'xml-save',label:'MusicXML로 저장',group:'exchange',disabled:savingMusicXml || savingNative,onSelect:()=>void saveMusicXml()},
          {id:'export',label:'내보내기 설정',group:'exchange',onSelect:()=>openToolbarWorkspace('export','.studio-page-setup [role="combobox"]:not(:disabled)')},
          {id:'png-tools',label:'PNG 출력 설정',group:'exchange',disabled:pngBusy,onSelect:()=>openToolbarWorkspace('export','.studio-export-tools [aria-label="PNG 출력 설정"] [role="combobox"]:not(:disabled)')},
          {id:'backups',label:'프로젝트 백업',group:'recovery',disabled:!window.inC?.project?.listBackups,onSelect:()=>setNativeBackupsOpen(true)},
          {id:'file-tools',label:'파일 작업 열기',group:'recovery',onSelect:()=>openToolbarWorkspace('file','[aria-label="파일 작업"] button')}
        ]},
        {id:'edit',label:'편집',commands:[
          {id:'undo',label:'실행 취소',group:'history',disabled:undoStack.length===0,onSelect:undo},
          {id:'redo',label:'다시 실행',group:'history',disabled:redoStack.length===0,onSelect:redo},
          {id:'copy',label:copySelectionLabel,group:'selection',disabled:!canCopySelection,onSelect:copySelection},
          {id:'paste',label:pasteSelectionLabel,group:'selection',disabled:!canPasteSelection,onSelect:pasteSelection},
          {id:'clear',label:clearSelectionLabel,group:'selection',disabled:!canClearSelection,onSelect:clearSelection}
        ]},
        {id:'view',label:'보기',commands:[
          {id:'palette',label:'팔레트',checked:dockShown('palette'),onSelect:()=>toggleDock('palette')},
          {id:'properties',label:'속성',checked:dockShown('properties'),onSelect:()=>toggleDock('properties')},
          {id:'mixer',label:'믹서',checked:mixerOpen,onSelect:toggleMixer},
          {id:'score-view',label:'총보·파트보 보기',onSelect:()=>openToolbarWorkspace('view','.studio-score-view [role="combobox"]:not(:disabled)')},
          {id:'guides',label:'페이지 여백 가이드',checked:showPageMarginGuides,onSelect:()=>setShowPageMarginGuides(value=>!value)},
          {id:'score',label:'악보로 이동',onSelect:focusScore}
        ]},
        {id:'add',label:'추가',commands:[
          {id:'notation',label:'표기 팔레트 열기',onSelect:()=>openToolbarWorkspace('palette','.studio-notation-palette input[type="search"]')},
          {id:'signatures',label:'음자리표·조표·박자표 팔레트',group:'notation',onSelect:()=>openPaletteFamily('음자리표·조표·박자표')},
          {id:'dynamics',label:'셈여림 팔레트',group:'notation',onSelect:()=>openPaletteFamily('셈여림')},
          {id:'ranges',label:'범위 기호 팔레트',group:'notation',onSelect:()=>openPaletteFamily('범위 기호')},
          {id:'text',label:'텍스트 표기 팔레트',group:'notation',onSelect:()=>openPaletteFamily('텍스트')},
          {id:'repeats',label:'반복·볼타 팔레트',group:'notation',onSelect:()=>openPaletteFamily('반복·볼타')},
          {id:'lyrics',label:'가사 및 코드',onSelect:openLyricWorkspace}
        ]},
        {id:'format',label:'형식',commands:[
          {id:'metadata',label:'악보 정보 편집',onSelect:()=>setMetadataActionsOpen(true)},
          {id:'score-settings',label:'악보 설정',onSelect:()=>openToolbarWorkspace('measure','[aria-label="악보 편집"] input:not(:disabled)')},
          {id:'page-settings',label:'PDF 페이지 설정',onSelect:()=>openToolbarWorkspace('export','.studio-page-setup [role="combobox"]:not(:disabled)')}
        ]},
        {id:'tools',label:'도구',commands:[
          {id:'command-search',label:'명령 검색',onSelect:openCommandSearch},
          {id:'note-settings',label:'선택 속성 열기',onSelect:()=>openToolbarWorkspace('note','.studio-selected-properties button:not(:disabled),.studio-span-properties button:not(:disabled)')},
          {id:'span-finder',label:'범위 표기 찾기',onSelect:()=>openToolbarWorkspace('span-properties','.studio-span-properties [role="combobox"]')},
          {id:'playback',label:'재생 도구',onSelect:openMixer}
        ]},
        {id:'help',label:'도움말',commands:[
          {id:'shortcuts',label:'단축키 도움말',onSelect:()=>setShortcutHelpOpen(true)}
        ]}
      ]
  applicationMenusRef.current = applicationMenus

  return (
    <DocumentDraftContext.Provider value={documentDrafts}>
    <main
      onBlurCapture={revealWorkspaceValidation}
      onKeyDownCapture={event => {
        // Public buttons retain native activation. Composition confirmation
        // belongs to the IME, not to an editor command or workspace navigation.
        // Editable fields keep their own candidate/commit handling unchanged.
        if (!(event.target instanceof Element) || event.target.closest('.performance-lab') ||
          !event.target.closest('button')?.closest('.ddirori')) return
        if (event.nativeEvent.isComposing || event.keyCode === 229 || event.key === 'Process') {
          if (event.key === 'Enter' || event.key === ' ') event.preventDefault()
          event.stopPropagation()
        }
      }}
      onFocusCapture={event => {
        const target = event.target
        // Reuse footer clearance for export and input navigation. New focus or manual
        // viewport navigation cancels this deferred reveal.
        if (target.closest('.studio-warning-report,.studio-export-tools,.studio-input-target')) {
          const intent=workspaceViewportIntent.current
          window.requestAnimationFrame(() => { if(intent===workspaceViewportIntent.current)revealWorkspaceTarget(target) })
        }
        if (target.matches('.notation-event,.notation-span-target,.notation-rehearsal-mark[role="button"],.notation-system-text-target[role="button"],.notation-staff-text-target[role="button"],.notation-expression-text-target[role="button"],.notation-dynamic-target[role="button"],.notation-harmony-target[role="button"]') && target.closest('.score-canvas')) menuScoreFocusOrigin.current = target
        else if (!target.closest('.studio-application-menu')) menuScoreFocusOrigin.current = null
      }}
      className={`app-shell${startScreenVisible ? ' app-shell--start' : ''}${
        pdfExporting ? ' app-shell--pdf-export' : ''
      }`}
    >
      {commandSearchOpen ? <StudioCommandSearch theme={studioTheme} menus={applicationMenus} onClose={closeCommandSearch} onRun={runSearchCommand} /> : null}
      {pdfExporting ? (
        <style>
          {`@page { size: ${pdfSnapshot?.plan.pageCssSize ?? printLayoutPlan.pageCssSize}; margin: ${pdfSnapshot?.plan.pageMarginMm ?? printLayoutPlan.pageMarginMm}mm; background: #ffffff; }`}
        </style>
      ) : null}
      {pdfExporting && pdfSnapshot ? <PdfSnapshot snapshot={pdfSnapshot} rootRef={pdfSnapshotRoot} /> : null}
      {pngSnapshot?.generation === documentGeneration.current ? <PdfSnapshot snapshot={pngSnapshot} rootRef={pngSnapshotRoot} kind="image"/> : null}
      {startScreenVisible ? (
        <section className="start-screen studio-start ddirori" data-theme={studioTheme} data-density="compact" aria-labelledby="start-screen-title">
          <div className="studio-start__content">
            <ProductSignature product="studio" name="Studio" />
            <div className="studio-welcome">{recentMusicXmlFiles.length === 0 && !recoverySnapshot ? <Bach size={64} /> : null}<Text as="h1" variant="screenTitle" id="start-screen-title">새 악보를 만들어 볼까요?</Text></div>
            <div className="start-actions" aria-label="시작 작업">
              <Button aria-label="새 악보 만들기" onClick={openNewScoreWizard}>
                <span className="studio-start-action__content"><FilePlus2 aria-hidden="true" size={18} strokeWidth={1.75} />
                  <Text variant="action">새 악보 만들기</Text><Text variant="description">조표, 박자표, 마디 수를 정하고 시작합니다.</Text></span>
              </Button>
              <Button kind="secondary" aria-label="MusicXML 가져오기" busy={openingMusicXml} onClick={() => { void importMusicXml() }}>
                <span className="studio-start-action__content"><FileUp aria-hidden="true" size={18} strokeWidth={1.75} />
                  <Text variant="action">MusicXML 가져오기</Text><Text variant="description">다른 사보 도구에서 만든 악보를 불러옵니다.</Text></span>
              </Button>
              <Button kind="secondary" aria-label={recoverySnapshot ? '복구본 열기' : '복구본 없음'} disabled={!recoverySnapshot} onClick={recoverAutosave}>
                <span className="studio-start-action__content"><RotateCcw aria-hidden="true" size={18} strokeWidth={1.75} />
                  <Text variant="action">{recoverySnapshot ? '복구본 열기' : '복구본 없음'}</Text>
                  <Text variant="description">{recoverySnapshot ? `${recoverySnapshot.metadata.title} · ${formatRecoveryTime(recoverySnapshot.metadata.updatedAt)}` : '자동저장된 작업이 있으면 여기에 표시됩니다.'}</Text></span>
              </Button>
              <Button kind="secondary" aria-label="프로젝트 열기" busy={openingNative} onClick={() => { void openNativeProject() }} disabled={!window.inC?.project}>
                <span className="studio-start-action__content"><FileMusic aria-hidden="true" size={18} strokeWidth={1.75} /><Text variant="action">프로젝트 열기</Text></span>
              </Button>
              <Button kind="secondary" aria-label="프로젝트 백업" onClick={() => setNativeBackupsOpen(true)} disabled={!window.inC?.project?.listBackups}>
                <span className="studio-start-action__content"><RotateCcw aria-hidden="true" size={18} strokeWidth={1.75} /><Text variant="action">프로젝트 백업</Text></span>
              </Button>
            </div>
            <section aria-label="최근 악보 파일" className="recent-files">
              <header className="recent-files__header">
                <div className="studio-start__recent-title"><Clock3 aria-hidden="true" size={18} strokeWidth={1.75} /><Text as="h2" variant="itemTitle">최근 악보</Text></div>
                {missingRecentFilePath ? <Button kind="quiet" onClick={removeMissingRecentMusicXml}>목록에서 지우기</Button> : null}
              </header>
              {recentMusicXmlFiles.length > 0 ? <div className="recent-files__list">
                {recentMusicXmlFiles.map(file => <Item key={file.filePath} flat title={file.fileName} subtitle={formatRecoveryTime(file.openedAt)}
                  trailing={file.filePath === missingRecentFilePath ? <Text variant="description">파일을 찾을 수 없음</Text> : undefined}
                  onOpen={() => { void openRecentMusicXml(file) }} />)}
              </div> : <Text as="p" variant="description">아직 최근 파일이 없습니다.</Text>}
            </section>
            {fileStatus ? <Banner kind={fileStatus.tone === 'error' ? 'error' : 'info'}><Text>{fileStatus.message}</Text></Banner> : null}
            {fileStatus?.details ? <StudioOperationDetails details={fileStatus.details} /> : null}
            <MusicXmlReportPanel report={musicXmlReport} theme={studioTheme} />
          </div>
        </section>
      ) : (
        <>
      <section className="studio-document studio-document--system ddirori" data-theme={studioTheme} data-density="compact" aria-label="문서 상태"
        onKeyDown={event=>{if((event.target as HTMLElement).closest('[role="radiogroup"],[role="combobox"]')&&!event.metaKey&&!event.ctrlKey&&!event.altKey)event.stopPropagation()}}>
        <Text as="h1" variant="itemTitle">{`문서: ${score.title || '제목 없음'}`}</Text>
        <Text role="status" variant="description" className="studio-document__state">{fileSaveMessage ? '저장 중' : autosaveRevision > 0 ? '저장하지 않은 변경' : '변경 없음'}</Text>

        <section
          className="studio-workspace-tools ddirori"
          data-theme={studioTheme}
          data-density="compact"
          aria-label="작업 영역 도구"
          onKeyDown={event=>{if(event.key==='Enter'||event.key===' ')event.stopPropagation()}}
        >
          <StudioMetadataActions theme={studioTheme} open={metadataActionsOpen} onOpenChange={setMetadataActionsOpen}
            partView={scoreViewMode === 'part' && Boolean(livePartViewPart)} onEdit={beginMetadataEdit} onNavigateToScore={focusScore} />
          <Button kind="quiet" className="studio-score-navigation" aria-label="악보로 이동" aria-keyshortcuts="F6"
            title="악보로 이동 · F6으로 악보와 도구 사이 이동" onClick={focusScore}
            onKeyDown={event => {
              if (isWorkspaceNavigation(event)) { event.preventDefault(); event.stopPropagation(); focusScore() }
              else if (event.key === 'Enter' || event.key === ' ') event.stopPropagation()
            }}>악보로 이동</Button>
          <span className="studio-workspace-tools__anchor" ref={node=>{paletteToggle.current=node?.querySelector('button')??null}}>
            <Tooltip text="팔레트 표시/숨기기"><IconButton label="팔레트 표시" selected={dockShown('palette')} aria-controls="studio-palette"
              onClick={()=>toggleDock('palette')}><PanelLeft size={18} strokeWidth={1.75} aria-hidden="true" /></IconButton></Tooltip>
          </span>
          <span className="studio-workspace-tools__anchor" ref={node=>{propertiesToggle.current=node?.querySelector('button')??null}}>
            <Tooltip text="속성 표시/숨기기"><IconButton label="속성 표시" selected={dockShown('properties')} aria-controls="studio-properties"
              onClick={()=>toggleDock('properties')}><PanelRight size={18} strokeWidth={1.75} aria-hidden="true" /></IconButton></Tooltip>
          </span>
        </section>
      </section>
      <StudioApplicationMenu theme={studioTheme} menus={applicationMenus} onFocusIntent={() => { workspaceFocusRequest.current += 1 }}
        onNavigationKeyDown={event => {
          if (isWorkspaceNavigation(event)) {
            event.preventDefault(); event.stopPropagation(); focusScore()
          }
        }} />

      <div className="studio-command-bars ddirori" data-theme={studioTheme}>
      <StudioNoteToolbar theme={studioTheme} inputActive={Boolean(noteInputState)}
        onNavigationKeyDown={event => {
          if (!event.defaultPrevented && isWorkspaceNavigation(event, true)) {
            event.preventDefault(); event.stopPropagation(); focusScore()
          }
        }}
        rhythmDisabled={Boolean(activeSpanReference) && !noteInputState}
        context={noteInputState ? '다음 입력' : activeSpanReference ? '선택한 범위 표기 · 음표 입력으로 전환해 사용하세요' : selection.type === 'range' ? '선택한 범위' : eventLocation ? '선택한 표기' : '입력 준비'}
        duration={activeDurationValue} options={durations.map(value => ({ value, label: durationShortcuts[value] ? `${durationLabels[value]}, 단축키 ${durationShortcuts[value]}` : durationLabels[value] }))}
        dots={activeDots} canAddDot={canAddDot} canRemoveDot={canRemoveDot} dotsDisabled={isTupletInput}
        tieSelected={tieSelected} tieEnabled={Boolean(tieCommand)} tupletActive={isTupletInput}
        tupletLabel={isTupletInput ? `셋잇단음표 입력 취소, 단축키 ${tripletPreset.shortcut} 또는 Esc` : `셋잇단음표 적용 또는 입력 준비, 단축키 ${tripletPreset.shortcut}`}
        restEnabled={Boolean(noteInputState) || (!activeSpanReference && ((selection.type === 'event' && eventLocation?.event.type === 'note') || Boolean(rangeRestResult?.command)))}
        restHint={!noteInputState && selection.type === 'range' ? (rangeRestResult?.blockedByOctaveEndpoint ? octaveRestConflictMessage() : rangeRestResult?.command ? '선택한 범위의 음표를 같은 음가의 쉼표로 변환 · 0' : '같은 마디의 타이·잇단음표 없는 음표 범위를 선택하세요.') : undefined}
        onRest={noteInputState ? enterRest : convertSelectionToRest}
        onInput={() => { setSpanSelection(undefined); setToolbarCategory('note'); toggleNoteInputMode() }}
        onDuration={changeDuration} onDots={changeDots} onTie={toggleTie} onTuplet={toggleTuplet}
        accidental={noteInputState ? noteInputState.accidental : selectedPitchAlter}
        accidentalEnabled={accidentalEnabled && (!activeSpanReference || Boolean(noteInputState))}
        onAccidental={changeAccidental}
        targetControls={<StudioInputTarget staffOptions={staffTargetOptions} staff={activeStaffTargetValue} voice={activeVoiceNumber}
          enabled={!activeSpanReference && Boolean(resolveVoiceSwitchLocation(score, selection, noteInputState))}
          inputActive={Boolean(noteInputState)} onStaff={switchActiveStaff} onVoice={switchActiveVoice}/> }>
      <section className="studio-input-context" data-theme={studioTheme} data-density="compact"
        aria-label="다음 입력" data-input-active={Boolean(noteInputState)}>
        <Text as="h2" variant="label">다음 입력</Text>
        <Text as="output" variant="description" aria-label="다음 입력 설정">
          {durationLabels[noteInputState?.duration.value ?? durationValue]} · 점 {noteInputState?.duration.dots ?? 0}
          {noteInputState?.accidental !== undefined ? ` · ${noteInputState.accidental === -1 ? '플랫' : noteInputState.accidental === 1 ? '샤프' : '제자리표'}` : ' · 임시표 자동'}
        </Text>
        <Text variant="description" className="studio-input-context__state">{noteInputState ? inputModeLabel : '대기'}</Text>
        {firstSession && !hasFirstNote ? <Text as="p" variant="description" className="studio-first-input" role="note" aria-label="첫 입력 안내">
          {noteInputState ? 'A–G로 음을 넣거나 쉼표 넣기를 선택하세요.' : 'N으로 음표 입력을 켜고 첫 음을 넣어 보세요.'}
        </Text> : null}
      </section>
      </StudioNoteToolbar>
      <StudioPlayback theme={studioTheme} status={playback.status} position={playback.positionBeat} total={playback.totalBeats}
        loading={playback.audioState === 'loading' || playback.previewing}
        playDisabledReason={playback.audioState === 'loading' ? '피아노 음원을 준비하고 있습니다.' : isTupletInput ? '셋잇단음표 입력을 완료하거나 취소한 뒤 재생해 주세요.' : undefined}
        following={playbackViewport.following} onFollow={playbackViewport.toggleFollowing}
        rewindAvailable={rewindSelection!==selection && selection.type==='event' && Boolean(eventLocation && (eventLocation.measureNumber>1 || eventLocation.event.position.tick>0))}
        mixerOpen={mixerOpen} onStart={rewindPlayback} onPlay={playFromSelection} onPause={playback.pause} onStop={stopPlayback} onMixer={toggleMixer} />
      <StudioPiano theme={studioTheme} state={playback.audioState} progress={playback.audioProgress}
        error={playback.audioError || pianoExpression.error} sustain={playback.sustain} onSustain={playback.setSustain}
        natural={naturalPiano} onNatural={enabled => { stopPlayback(); setNaturalPiano(enabled) }}
        preparing={pianoExpression.preparing} playing={playback.status === 'playing'}
        onPreview={() => { void playback.previewNote() }} />
      {performanceLabEnabled && <PerformanceLab score={score} theme={studioTheme}
        onChange={setExpressionProfile} onStop={stopPlayback} />}
      </div>

      {firstSession && hasFirstNote && !firstProjectSaved.current ? <section className="studio-first-save ddirori" onKeyDown={handleResultKeyDown} data-theme={studioTheme} data-density="compact" aria-label="첫 프로젝트 저장">
        <Text role="status">{savingNative ? '프로젝트 파일 저장 중' : '편집 가능한 원본을 프로젝트 파일로 남겨 주세요.'}</Text>
        <Button kind="secondary" aria-label="프로젝트 파일 저장" busy={savingNative} disabled={savingMusicXml || !window.inC?.project} onClick={() => { void saveNativeProject() }}>프로젝트 파일 저장</Button>
      </section> : null}
      {firstAchievement && firstAchievement.generation === documentGeneration.current && firstAchievement.score === score ? <section className="studio-result ddirori" onKeyDown={handleResultKeyDown} data-theme={studioTheme}>
        <Banner kind="success" action={<IconButton label="첫 저장 알림 닫기" onClick={() => setFirstAchievement(undefined)}><X size={18} strokeWidth={1.75} aria-hidden="true" /></IconButton>}><div className="studio-welcome"><Bach size={48} expression="happy" /><Text>첫 악보를 파일로 저장했어요.</Text></div></Banner>
      </section> : null}
      {currentPdfResult ? <section className="studio-result ddirori" onKeyDown={handleResultKeyDown} data-theme={studioTheme} data-density="compact" aria-label="PDF 출력 결과">
        <Banner action={<><Button kind="secondary" onClick={() => setScoreGuideOpen(true)}>가져오는 방법</Button><IconButton label="PDF 출력 결과 닫기" onClick={() => {setPdfResult(undefined);setScoreGuideOpen(false)}}><X size={18} strokeWidth={1.75} aria-hidden="true" /></IconButton></>}>
          <Text as="h2" variant="itemTitle">PDF로 연습 이어가기</Text>
          <Text as="p" variant="description">{currentPdfResult.fileName} · 프로젝트와 별도로 만든 PDF 사본입니다.</Text>
        </Banner>
        {currentPdfResult.lyricOverlap ? <Banner kind="warning">
          <Text>PDF에 겹치는 가사가 있습니다. 가사와 마디 배치를 확인한 뒤 다시 출력해 주세요.</Text>
        </Banner> : null}
        {currentPdfResult.lyricClipped ? <Banner kind="warning">
          <Text>PDF에서 지면 밖으로 나가는 가사가 있습니다. 가사와 마디 배치를 확인해 주세요.</Text>
        </Banner> : null}
        {currentPdfResult.harmonyClipped ? <Banner kind="warning">
          <Text>PDF에서 지면 밖으로 나가는 코드 심벌이 있습니다. 코드 심벌과 마디 배치를 확인해 주세요.</Text>
        </Banner> : null}
        {currentPdfResult.pageTargetExceeded ? <Banner kind="warning">
          <Text>목표 {currentPdfResult.source.plan.targetPages}장에 맞추기 어려운 배치입니다. PDF 페이지 수를 확인하고, 용지나 악보단 배치를 조정해 주세요.</Text>
        </Banner> : null}
      </section> : null}





      <section
        className="studio-notation-tools ddirori"
        data-theme={studioTheme} data-density="compact"
        aria-label="표기 객체"
        hidden={toolbarCategory !== 'notation'}
      >
        <StudioRangeTools
          hairpin={selectedRangeHairpin?.type}
          slur={Boolean(selectedRangeSlur || (selection.type === 'event' && pendingSlurAnchorEventId === selection.eventId))}
          octave={selectedRangeOctave?.type}
          canHairpin={canApplyRangeHairpin} canSlur={canApplySlur} canOctave={canApplyNoteSpan}
          onHairpin={toggleHairpin} onSlur={toggleSlur} onOctave={toggleOctaveShift}
        />
        <StudioMeasureNotation enabled={canEditMeasureNotation} clefEnabled={canChangeMeasureClef}
          clef={activeClefId}
          clefs={[...(activeClefId === 'unsupported' ? [{value:'unsupported',label:measureLocation?.measure.clef.sign==='percussion'?'타악기 표기 (현재)':measureLocation?.measure.clef.sign==='tab'?'TAB 표기 (현재)':`${measureLocation?describeInspectorClef(measureLocation.measure.clef):'기타 음자리표'} (현재)`,disabled:true}] : []), ...clefPresets.map(preset=>({value:preset.id,label:preset.label}))]}
          onClef={changeClef}
          onText={() => { selectSpan(undefined); openToolbarWorkspace('note','[aria-label="선택 요약 보표 글자"]') }}
          onDynamic={() => { selectSpan(undefined); openToolbarWorkspace('note','.studio-selected-properties__dynamic-value [role="combobox"]') }}/>

        {activeMeasureId ? (
          <StudioRepeatTools
            key={`${documentGeneration.current}:${activeMeasureId}:${activeRepeatScope?.location.measure.id ?? "none"}`}
            scope={activeRepeatScope?.label}
            start={Boolean(activeRepeatScope?.location.measure.repeat?.start)}
            end={Boolean(activeRepeatScope?.location.measure.repeat?.end)}
            times={activeRepeatScope?.location.measure.repeat?.times ?? 2}
            volta={activeRepeatScope?.location.measure.volta?.number}
            enabled={Boolean(measureLocation && activeRepeatScope)}
            onStart={toggleRepeatStart} onEnd={toggleRepeatEnd} onTimes={changeRepeatTimes}
            onVolta={number => applyVoltaRange(activeMeasureId, number)}
          />
        ) : null}
      </section>

      <section
        className="studio-lyrics-tools ddirori"
        data-theme={studioTheme} data-density="compact"
        aria-label="가사 편집"
        hidden={toolbarCategory !== 'lyrics'}
      >
        <StudioLyricTools enabled={Boolean(selectedNote)} blockedReason={lyricEditingBlocked ? ambiguousLyricMessage : undefined} verse={activeLyricVerse} verses={lyricVerseOptions}
          syllabic={selectedLyric?.syllabic ?? 'single'} extend={Boolean(selectedLyric?.extend)}
          onVerse={setActiveLyricVerse} onOpen={openLyricWorkspace}
          onSyllabic={syllabic => updateLyric(selectedLyric?.text ?? '', {syllabic, extend: selectedLyric?.extend})}
          onExtend={extend => updateLyric(selectedLyric?.text ?? '', {syllabic: selectedLyric?.syllabic ?? 'single', extend})}/>

        <section className="studio-harmony-entry" aria-label="코드 심벌 속성"
          onKeyDown={event => {
            if(event.nativeEvent.isComposing || event.keyCode === 229 || (!event.ctrlKey && !event.metaKey && !event.altKey && (event.key === 'Enter' || event.key === ' '))) event.stopPropagation()
          }}>
          <Text as="h3" variant="itemTitle">코드 심벌</Text>
          {activeMeasureId ? <>
            <Text as="output" variant="caption" aria-label="코드 심벌 적용 위치">
              {activeLocationDescription}
            </Text>
            <Text as="p" variant="description">선택 위치의 속성에서 코드 심벌을 편집합니다.</Text>
            <Button kind="secondary" disabled={!canEditMeasureNotation} onClick={() => {selectSpan(undefined);openToolbarWorkspace('note','[aria-label="선택 요약 코드"]')}}>코드 심벌 편집</Button>
          </> : <Text as="p" variant="caption">음표나 마디를 선택하면 코드 심벌 입력 항목이 표시됩니다.</Text>}
        </section>
      </section>

      <div className="studio-score-view-tools ddirori" data-theme={studioTheme} data-density="compact"
        hidden={toolbarCategory !== 'view' && toolbarCategory !== 'measure'}
        onKeyDownCapture={event => {
          if (!event.defaultPrevented && isWorkspaceNavigation(event, true)) {
            event.preventDefault(); event.stopPropagation(); focusScore()
          }
        }}>
        <StudioScoreView mode={scoreViewMode} partId={livePartViewPartId} parts={score.parts}
          target={activeStructureTarget?describeStaffTarget(score,activeStructureTarget):'파트 없음'}
          onMode={changeScoreView} onPart={id=>changeScoreView('part',id)}/>
      </div>

      <section
        className="studio-score-settings ddirori"
        data-theme={studioTheme} data-density="compact"
        aria-label="악보 편집"
        hidden={toolbarCategory !== 'measure'}
      >
        <StudioTempoTools bpm={scoreTempo}
          beat={tempoBeatSelectorValue(score.tempo?.beatUnit ?? 'quarter',normalizeTempoBeatDots(score.tempo?.dots ?? 0))}
          beats={tempoBeatUnitOptions} preview={formatTempoMarkingText({bpm:scoreTempo,beatUnit:score.tempo?.beatUnit??'quarter',dots:score.tempo?.dots??0})}
          visible={Boolean(score.tempo && !score.tempo.transparent)} rhythm={score.rhythmFeel?.unit??'none'} rhythms={rhythmFeelOptions}
          onBpm={changeScoreTempo} onBeat={changeScoreTempoBeat} onVisible={visible=>changeScoreTempoTransparency(!visible)} onRhythm={changeScoreRhythmFeel}/>
        {tempoTargetMeasureId ? <StudioTempoEventInput
          key={`${documentGeneration.current}:${tempoTargetMeasureId}:${tempoTargetTick}:${activeTempoEvent?.id??''}:${activeTempoEvent?.bpm??''}`}
          value={activeTempoEvent?.bpm} count={activeTempoCandidates.length} scope={tempoTargetScope}
          points={tempoPointOptions} pointValue={tempoPointValue} onPointChange={value=>{
            const target=tempoPointMap.get(value)
            setTempoPointRequest(target ? {generation:documentGeneration.current,owner:tempoPointOwner,measureId:target.measureId,tick:target.tick} : undefined)
            openToolbarWorkspace('measure','input[aria-label="위치별 빠르기 BPM"]')
          }}
          onCommit={text=>{
            const parsed=Number.parseInt(text,10)
            const bpm=Number.isNaN(parsed)?undefined:normalizeNumberInput(parsed,MIN_TEMPO_BPM,MAX_TEMPO_BPM,scoreTempo)
            if(bpm===activeTempoEvent?.bpm)return
            if(bpm===undefined){updateTempoEvent(undefined);return}
            const marking=createUpdatedTempoMarking(activeTempoEvent,bpm,{},tempoTargetDefaultBeat)
            updateTempoEvent({...marking,id:activeTempoEvent?.id??'',measureId:tempoTargetMeasureId,tick:tempoTargetTick,
              text:activeTempoEvent?.text===undefined?undefined:marking.text})
          }}/>:null}

        <StudioPartLabels key={`${documentGeneration.current}:${activeStructurePart?.id??'none'}`}
          name={activeStructurePart?.name??''} abbreviation={activeStructurePart?.abbreviation}
          enabled={Boolean(activeStructurePart)} onCommit={updateActivePartLabel}/>

        <StudioStructureActions
          addPart={{label:'파트 추가',onSelect:addPartToScore}}
          removePart={{label:'파트 삭제',onSelect:removeActivePart,disabled:!activeStructurePart||score.parts.length<=1}}
          addStaff={{label:'보표 추가',onSelect:addStaffToActivePart,disabled:!activeStructurePart}}
          removeStaff={{label:'보표 삭제',onSelect:removeActiveStaff,disabled:!activeStructurePart||activeStructurePart.staves.length<=1}}
          moveUp={{label:'파트 위로 이동',onSelect:()=>moveActivePart(-1),disabled:!activeStructurePart||score.parts[0].id===activeStructurePart.id}}
          moveDown={{label:'파트 아래로 이동',onSelect:()=>moveActivePart(1),disabled:!activeStructurePart||score.parts.at(-1)?.id===activeStructurePart.id}}/>

        <StudioPartSetup fields={[
          {label:'현재 보표 음자리표',value:activeStaffClefId,disabled:!activeStructureStaff,
            options:[...(activeStaffClefId==='unsupported'?[{value:'unsupported',label:unsupportedStaffClefLabel,disabled:true}]:[]),...clefPresets.map(preset=>({value:preset.id,label:preset.label}))],
            help:'현재 보표의 모든 마디에 적용합니다.',onChange:changeActiveStaffClef},
          {label:'추가할 악기',value:selectedPartPresetId,
            options:partPresets.map(preset=>({value:preset.id,label:preset.label})),
            help:'파트 추가를 누를 때 사용합니다. 기존 파트는 바뀌지 않습니다.',onChange:setSelectedPartPresetId},
          {label:'현재 파트 이조',disabled:!activeStructurePart,
            value:(()=>{const ids=new Set(activeStructurePart?.staves.flatMap(staff=>staff.measures.map(measure=>resolveInstrumentTranspositionId(measure.transposition))));return ids.size===1?[...ids][0]:'custom'})(),
            options:[{value:'custom',label:'사용자 지정 / 혼합',disabled:true},...instrumentTranspositionPresets.map(preset=>({value:preset.id,label:preset.label}))],
            help:'현재 파트 전체에 적용합니다. 기보 음높이는 유지합니다.',
            onChange:value=>{if(!activeStructurePart)return;const command=buildPartTranspositionCommand(score,activeStructurePart.id,value);if(command)executeCommand(command)}}
        ]}/>

      </section>

      {toolbarCategory === 'export' ? <StudioPageSetup key={`${documentGeneration.current}:${scoreViewMode==='part'?`part:${livePartViewPartId}`:'score'}`} theme={studioTheme}
        value={pageSetup} preset={resolvePageSetupPresetId(pageSetup)}
        presets={[{value:'custom',label:'사용자 설정'},...pageSetupPresets.map(preset=>({value:preset.id,label:preset.label}))]}
        sizes={pageSizeOptions} orientations={pageOrientationOptions}
        onPreset={applyPageSetupPreset} onChange={updatePageSetup}
        showGuides={showPageMarginGuides} onGuides={setShowPageMarginGuides}
        partName={scoreViewMode === 'part' && livePartViewPartId ? livePartViewPart?.name : undefined}
        resetDisabled={!livePartLayout && !(livePartViewPartId && partPageSetupPreferences[livePartViewPartId])}
        onReset={()=>{if(livePartViewPartId)executeCommand({type:'part-layout.replace',partId:livePartViewPartId,pageSetupChange:{}})}}/>:null}

      <section className="workspace" aria-label="악보 편집기" onKeyDown={event=>{
        const input=event.target
        // Mixer ranges and checkboxes have no text draft. Use the existing
        // workspace key and score destination without relaxing text editors.
        if(event.defaultPrevented||!(input instanceof HTMLInputElement)||input.disabled||
          !input.closest('.studio-part-mixer')||!['range','checkbox'].includes(input.type)||!isWorkspaceNavigationKey(event))return
        event.preventDefault();event.stopPropagation();focusScore()
      }} onFocusCapture={event=>{
        const target=event.target
        if(target.closest('.studio-part-mixer')){
          const intent=workspaceViewportIntent.current
          window.requestAnimationFrame(()=>{if(intent===workspaceViewportIntent.current)revealWorkspaceTarget(target)})
        }
      }}>
        {toolbarCategory === 'file' ? <StudioFileTools theme={studioTheme}
          onNavigationKeyDown={event => {
            if (isWorkspaceNavigation(event)) {
              event.preventDefault(); event.stopPropagation(); focusScore()
            }
          }}
          fileActions={[
            {id:'new',label:'새 악보 만들기',text:'새 악보',icon:<FilePlus2 aria-hidden="true" size={18} strokeWidth={1.75}/>,action:openNewScoreWizard},
            {id:'open',label:'프로젝트 열기',text:'프로젝트 열기',icon:<FileUp aria-hidden="true" size={18} strokeWidth={1.75}/>,action:()=>{void openNativeProject()},busy:openingNative,disabled:!window.inC?.project},
            {id:'backups',label:'프로젝트 백업',text:'백업',icon:<RotateCcw aria-hidden="true" size={18} strokeWidth={1.75}/>,action:()=>setNativeBackupsOpen(true),disabled:!window.inC?.project?.listBackups},
            {id:'save',label:'프로젝트 저장',text:'프로젝트 저장',icon:<FileMusic aria-hidden="true" size={18} strokeWidth={1.75}/>,action:()=>saveNativeProject(),busy:savingNative,disabled:savingNative||savingMusicXml||!window.inC?.project},
            {id:'save-as',label:'프로젝트 다른 이름으로 저장',icon:<FileDown aria-hidden="true" size={18} strokeWidth={1.75}/>,action:()=>saveNativeProject(true),disabled:savingNative||savingMusicXml||!window.inC?.project},
            {id:'import',label:'MusicXML 가져오기',text:'MusicXML 가져오기',icon:<FileUp aria-hidden="true" size={18} strokeWidth={1.75}/>,action:()=>{void importMusicXml()},busy:openingMusicXml},
            {id:'save-xml',label:'MusicXML로 저장',text:savingMusicXml?'저장 중':'저장',hint:'현재 악보를 MusicXML 파일로 저장',icon:<FileMusic aria-hidden="true" size={18} strokeWidth={1.75}/>,action:saveMusicXml,busy:savingMusicXml,disabled:savingMusicXml||savingNative},
            {id:'help',label:'단축키 도움말',text:'단축키',icon:<Keyboard aria-hidden="true" size={18} strokeWidth={1.75}/>,action:()=>setShortcutHelpOpen(true)}
          ]}
          editActions={[
            {id:'undo',label:'실행 취소',icon:<RotateCcw aria-hidden="true" size={18} strokeWidth={1.75}/>,action:undo,disabled:undoStack.length===0},
            {id:'redo',label:'다시 실행',icon:<RotateCw aria-hidden="true" size={18} strokeWidth={1.75}/>,action:redo,disabled:redoStack.length===0},
            {id:'copy',label:copySelectionLabel,icon:<Copy aria-hidden="true" size={18} strokeWidth={1.75}/>,action:copySelection,disabled:!canCopySelection},
            {id:'paste',label:pasteSelectionLabel,icon:<ClipboardPaste aria-hidden="true" size={18} strokeWidth={1.75}/>,action:pasteSelection,disabled:!canPasteSelection},
            {id:'clear',label:clearSelectionLabel,icon:<Eraser aria-hidden="true" size={18} strokeWidth={1.75}/>,action:clearSelection,disabled:!canClearSelection}
          ]}
          filters={[
            {label:'선택 필터',value:selectionEventTypeFilter,options:selectionFilterOptions.map(([value,label])=>({value,label})),onChange:value=>setSelectionEventTypeFilter(value as SelectionEventTypeFilter)},
            {label:'표기 필터',help:selectionObjectTypeFilter==='none'?undefined:selectionObjectTypeFilter==='system-texts'||selectionObjectTypeFilter==='rehearsal-marks'?`마디의 ${describeSelectionObjectFilter(selectionObjectTypeFilter)}만 복사·삭제합니다. 붙여넣기는 총보 첫 보표의 마디만 지원합니다.`:'마디를 선택하면 해당 표기만 복사·삭제합니다.',value:selectionObjectTypeFilter,options:selectionObjectFilterOptions.map(([value,label])=>({value,label})),onChange:value=>setSelectionObjectTypeFilter(value as SelectionObjectTypeFilter)}
          ]}/>:null}
        {toolbarCategory === 'export' ? <StudioExportTools theme={studioTheme}
          copySourceHint={isTupletInput ? pendingTupletCopyHint : undefined}
          pageCount={pdfTargetPages} pageCountInvalid={pdfTargetPagesInvalid}
          onPageCountChange={setPdfTargetPages}
          pdfDisabled={pdfTargetPagesInvalid || !measuredLyrics.ready || !measuredHarmonies.ready} pdfHint={pdfTargetPagesTooltip}
          onPdf={savePdf} onMidi={saveMidi} onXml={()=>void exportMusicXml()} onExpandedXml={()=>void exportMusicXml('expanded')} xmlBusy={exportingMusicXml}
          png={{busy:pngBusy,disabled:!window.inC?.png?.save || !measuredLyrics.ready || !measuredHarmonies.ready || Boolean(noteInputState?.tupletInput),scope:pngScope,page:pngPage,dpi:pngDpi,
            message:pngBusy?`PNG ${pngJob?.done ?? 0}/${pngJob?.total || '…'} 페이지 준비 중`:pngNotice?.generation===documentGeneration.current?pngNotice.message:undefined,
            hint:(scoreViewMode==='part'?'현재 파트보의 페이지를 PNG로 저장':'현재 총보의 페이지를 PNG로 저장')+(isTupletInput?' 셋잇단음표 입력을 완료하거나 취소한 뒤 PNG를 출력해 주세요.':''),onScope:setPngScope,onPage:setPngPage,onDpi:setPngDpi,onSave:()=>void savePng()}}
          xmlHint={scoreViewMode === 'part' ? '선택 파트보 MusicXML 내보내기' : '총보 MusicXML 사본 내보내기'}/>:null}
        {toolbarCategory === 'measure' ? <StudioMeasureTools theme={studioTheme} enabled={Boolean(activeMeasureId)}
          actions={[
            {label:'마디 추가',disabled:!activeMeasureId,onSelect:addMeasure,icon:<Plus size={18} strokeWidth={1.75} aria-hidden="true"/>},
            {label:'마디 삭제',disabled:!activeMeasureId,onSelect:removeMeasure,icon:<Minus size={18} strokeWidth={1.75} aria-hidden="true"/>},
            {label:systemBreakLabel,selected:activeMeasureHasSystemBreak,disabled:!canToggleSystemBreak,onSelect:toggleSystemBreak,icon:<ChevronsDown size={18} strokeWidth={1.75} aria-hidden="true"/>},
            {label:pageBreakLabel,selected:activeMeasureHasPageBreak,disabled:!canTogglePageBreak,onSelect:togglePageBreak,icon:<ChevronsUp size={18} strokeWidth={1.75} aria-hidden="true"/>}
          ]}
          signatures={[
            {label:'조표',value:activeKeySignatureId,options:[...(activeKeySignatureId==='unspecified-mode'&&activeKeySignature?[{value:'unspecified-mode',label:`${describeInspectorKey(activeKeySignature)} · 장·단조 미지정 (현재)`,disabled:true}]:[]),...keySignaturePresets.map(preset=>({value:preset.id,label:preset.label}))],onChange:changeKeySignature},
            {label:'박자표',value:activeTimeSignatureId,options:timeSignaturePresets.map(preset=>({value:preset.id,label:preset.label})),onChange:changeTimeSignature}
          ]}/>:null}



        <MusicXmlReportPanel report={musicXmlReport} theme={studioTheme} />
        <MidiFailurePanel failure={currentMidiFailure} theme={studioTheme} />
        <MidiReportPanel report={currentMidiReport} theme={studioTheme} />

        {unsupportedChordTies.length > 0 ? <StudioWarningReport label="서로 다른 화음 타이 안내"
          title="지원하지 않는 화음 타이를 확인해 주세요" fileName={score.title} theme={studioTheme}>
          {unsupportedChordTies.map(warning => <li key={`${documentGeneration.current}:${warning.fromEventId}`}>
            <Text>{describeUnsupportedChordTie(warning, 'current')}</Text>
            <Button kind="quiet" onClick={() => {
              const generation = documentGeneration.current
              if (scoreViewMode === 'part') setSelectedScoreViewPartId(warning.address.partId)
              setSpanSelection(undefined); setMeasureTextSelection(undefined)
              selectEvent(warning.fromEventId, false, warning.address)
              requestAnimationFrame(() => {
                if (generation === documentGeneration.current) focusScoreLatest.current()
              })
            }}>{`${describeChordTieTarget(score, warning)} 타이 음표 선택`}</Button>
            <WarningTechnicalDetails warning={warning} meta={warning.code} />
          </li>)}
        </StudioWarningReport> : null}

        <div ref={dockWorkspace} className="docked-workspace studio-docks" aria-label="도킹 작업 영역" data-palette={dockVisibility.palette} data-properties={dockVisibility.properties}
          onKeyDownCapture={event=>{
            // Property choices shield ordinary keys from global commands.
            // A closed choice can still use the existing workspace return.
            const target=event.target
            if(!event.defaultPrevented&&target instanceof HTMLButtonElement&&
              target.matches('[role="combobox"][aria-expanded="false"]')&&
              !target.closest('[role="dialog"],[role="menu"],[role="listbox"],dialog[open]')&&
              isWorkspaceNavigation(event,true)){
              event.preventDefault();event.stopPropagation();focusScore()
            }
          }}
          onKeyDown={event=>{
            if(!event.defaultPrevented&&isWorkspaceNavigation(event,true)){
              event.preventDefault();event.stopPropagation();focusScore()
            }
          }}
          style={{backgroundColor:ddiroriTokens.themes[studioTheme].surface, '--studio-palette-width': `${dockWidths.palette}px`, '--studio-properties-width': `${dockWidths.properties}px`, '--studio-shared-dock-width': `${dockWidths[shownDock]}px`} as CSSProperties}>
          <div className="studio-dock-switcher ddirori" data-theme={studioTheme} data-density="compact"
            hidden={!sharedDocks || (!dockVisibility.palette && !dockVisibility.properties)}
            onKeyDownCapture={event=>{if(event.nativeEvent.isComposing || event.keyCode===229)event.stopPropagation()}}
            onKeyDown={event=>{if(!event.metaKey&&!event.ctrlKey&&!event.altKey&&['ArrowLeft','ArrowRight','Home','End','Enter',' '].includes(event.key))event.stopPropagation()}}>
            <SegmentedControl label="도크 보기" value={shownDock} onChange={setActiveDock} options={[
              {value:'palette',label:'팔레트',disabled:!dockVisibility.palette},
              {value:'properties',label:'속성',disabled:!dockVisibility.properties}
            ]}/>
          </div>
          {sharedDocks&&(dockVisibility.palette||dockVisibility.properties)?<StudioDockResizeHandle key={shownDock} name={shownDock} width={dockWidths[shownDock]} theme={studioTheme} onReturn={focusScore}
            onWidth={width=>setDockWidths(previous=>({...previous,[shownDock]:width}))}/>:null}
          <aside id="studio-palette" className="docked-palette studio-palette-dock ddirori" data-theme={studioTheme} data-density="compact" aria-label="고정 팔레트" hidden={!dockShown('palette')} onFocusCapture={event=>focusDock('palette',event)}>
            <StudioDockHeader name="팔레트" width={dockWidths.palette} onReturn={focusScore}
              onWidth={width => setDockWidths(previous => ({...previous, palette: width}))}
              onClose={() => { setDockVisibility(previous => ({...previous, palette: false})); paletteToggle.current?.focus() }}>
              <StudioPaletteSettings workspace={paletteWorkspace}/>
            </StudioDockHeader>
            <StudioNotationPalette workspace={paletteWorkspace} values={dynamicValues} active={activeMeasureDynamic?.value} enabled={canEditMeasureNotation}
              clefs={clefPresets} clef={activeClefId} clefEnabled={canChangeMeasureClef}
              clefScope={measureLocation?`${measureLocation.measure.number}마디 · 선택한 한 마디에 적용${activeClefId==='unsupported'?` · 현재 ${describeInspectorClef(measureLocation.measure.clef)}`:''}`:undefined}
              onClef={changeClef}
              articulationEnabled={selection.type==='event'&&Boolean(selectedNote)} articulations={selectedNoteArticulations} onArticulation={toggleArticulation}
              ornamentEnabled={selection.type==='event'&&!activeSpanReference&&Boolean(selectedNote)} ornaments={selectedEventLocation?.event.type==='note'?selectedEventLocation.event.ornaments??[]:[]} onOrnament={toggleOrnament}
              pauseEnabled={selection.type==='event'&&Boolean(eventLocation)} fermata={selectedEventHasFermata} breathMark={selectedEventBreathMark} onFermata={toggleFermata} onBreath={toggleBreathMark}
              onDynamic={updateActiveDynamic} onOpen={entry=>{
                if(entry==='key'||entry==='time') openToolbarWorkspace('measure',`.studio-measure-tools [data-signature="${entry==='key'?'조표':'박자표'}"] [role="combobox"]`)
                else if(entry==='lyrics') openLyricWorkspace()
                else if(entry==='text') { selectSpan(undefined); openToolbarWorkspace('note','[aria-label="선택 요약 보표 글자"]') }
                else openToolbarWorkspace('notation',entry==='clef'?'.studio-measure-notation [role="combobox"]':entry==='repeat'?(measureLocation?'input[aria-label="반복 횟수"]':'.studio-repeat-tools'):'[aria-label="슬러 추가 또는 해제, 단축키 S"]')
              }} />
          </aside>

          <aside id="studio-properties" className="docked-properties studio-properties-dock ddirori" tabIndex={-1} data-theme={studioTheme} data-density="compact" aria-label="속성 도크" hidden={!dockShown('properties')} onFocusCapture={event=>focusDock('properties',event)} >
            <StudioDockHeader name="속성" width={dockWidths.properties} onReturn={focusScore}
              onWidth={width => setDockWidths(previous => ({...previous, properties: width}))}
              onClose={() => { setDockVisibility(previous => ({...previous, properties: false})); propertiesToggle.current?.focus() }} />
            {toolbarCategory === 'span-properties' || activeSpanReference ? <SpanProperties score={score}
              theme={studioTheme}
              scopeLabel="총보·해당 파트보 공통"
              partId={scoreViewMode === 'part' ? livePartViewPartId : undefined}
              selected={activeSpanReference} onSelect={selectSpan} onEngravingChange={updateSpanEngraving}
              onEndpointChange={updateSpanEndpoint} onDelete={deleteSpan} /> : null}
            {!activeSpanReference ? <StudioSelectedProperties theme={studioTheme} kind={activeMeasureTextRequest?(activeMeasureTextRequest.family==='rehearsalMarks'?'rehearsal':activeMeasureTextRequest.family==='staffTexts'?'staff-text':activeMeasureTextRequest.family==='expressionTexts'?'expression-text':activeMeasureTextRequest.family==='harmonies'?'harmony':activeMeasureTextRequest.family==='dynamics'?'dynamic':'system-text'):selectedProperties.kind} rows={focusedMeasureTextObject&&activeMeasureTextRequest?[[measureTextLabels[activeMeasureTextRequest.family],'text' in focusedMeasureTextObject?focusedMeasureTextObject.text:focusedMeasureTextObject.value],...selectedProperties.rows]:selectedProperties.rows}
              identity={`${documentGeneration.current}:${selection.type}:${getSelectionFocusEventId(selection)??''}:${activeMeasureId??''}:${activeVoiceId??''}:${activeTick}:${noteInputState?.target.measureId??''}`}
              dynamicTarget={activeMeasureTextRequest?.family==='dynamics'?{id:activeMeasureTextRequest.id,sequence:activeMeasureTextRequest.sequence,focus:activeMeasureTextRequest.focus,scope:selectedDynamicIsStored?'현재 표시·재생에 사용하지 않는 원본 값입니다. 프로젝트·MusicXML에 보관합니다.':`선택한 보표의 ${activeMeasureId?locateMeasure(score,activeMeasureId)?.measureNumber??'—':'—'}마디 전체에 적용합니다. 선택한 셈여림만 수정하며 다른 표기는 유지합니다.`}:undefined}
              enabled={canEditMeasureNotation} inputActive={Boolean(noteInputState)} dynamics={dynamicValues} dynamic={selectedMeasureDynamic?.value??activeMeasureDynamic?.value} onDynamic={updateActiveDynamic}
              dynamicObjects={activeMeasureDynamics} dynamicListIdentity={`${documentGeneration.current}:${spanViewKey}:${activeMeasureId??''}`} onSelectDynamic={id=>{
                if(!id){setMeasureTextSelection(undefined);return}
                if(activeMeasureId)selectMeasureText('dynamics',{id,measureId:activeMeasureId,edit:false},true)
              }}
              historyFocusScope={`${documentGeneration.current}:${spanViewKey}`}
              measureScope={`${noteInputState?'입력 커서':'선택'} 기준 · ${activeMeasureId?locateMeasure(score,activeMeasureId)?.measureNumber??'—':'—'}마디${activeMeasureDynamics.length>1?` · 이 마디에 셈여림이 ${activeMeasureDynamics.length}개 있습니다. 현재는 첫 번째 값을 표시·재생합니다. 값을 바꾸면 이 마디의 셈여림을 하나로 설정합니다.`:''}`}
              locationScope={activeLocationDescription}
              fields={[
                {label:'코드',objects:activeMeasureHarmonies.map(item=>({...item,positionLabel:`${1+item.tick/TICKS_PER_QUARTER}박`})),objectId:activeHarmony?.id??null,objectHelp:'위치는 4분음표 기준입니다.',request:activeMeasureTextRequest?.family==='harmonies'?activeMeasureTextRequest:undefined,onSelectObject:id=>{const item=activeMeasureHarmonies.find(item=>item.id===id);if(item)selectHarmony({...item,edit:true})},help:describeTextPropertyObjects(activeMeasureHarmonies.length),value:activeHarmony?.text,scope:'location',update:updateHarmonyText},
                {label:'표현 텍스트',objects:activeMeasureExpressionTexts.map(item=>({...item,positionLabel:`${1+item.tick/TICKS_PER_QUARTER}박`})),objectId:activeExpressionText?.id??null,objectHelp:'위치는 4분음표 기준입니다.',request:activeMeasureTextRequest?.family==='expressionTexts'?activeMeasureTextRequest:undefined,onSelectObject:id=>{const item=activeMeasureExpressionTexts.find(item=>item.id===id);if(item)selectExpressionText({id:item.id,measureId:item.measureId,tick:item.tick})},help:describeTextPropertyObjects(activeMeasureExpressionTexts.length),value:activeExpressionText?.text,scope:'location',update:updateActiveExpressionText},
                {label:'연습표',objects:activeMeasureRehearsalMarks,request:activeMeasureTextRequest?.family==='rehearsalMarks'?activeMeasureTextRequest:undefined,onSelectObject:activeMeasureTextRequest?.family==='rehearsalMarks'?id=>setMeasureTextSelection(current=>current?.family==='rehearsalMarks'&&current.baseSelection===selection?{...current,id}:current):undefined,help:describeTextPropertyObjects(activeMeasureRehearsalMarks.length),value:activeMeasureRehearsalMark?.text,scope:'measure',update:updateActiveRehearsalMark},
                {label:'보표 글자',objects:activeMeasureStaffTexts,request:activeMeasureTextRequest?.family==='staffTexts'?activeMeasureTextRequest:undefined,onSelectObject:activeMeasureTextRequest?.family==='staffTexts'?id=>setMeasureTextSelection(current=>current?.family==='staffTexts'&&current.baseSelection===selection?{...current,id}:current):undefined,help:describeTextPropertyObjects(activeMeasureStaffTexts.length),value:activeMeasureStaffText?.text,scope:'measure',update:updateActiveStaffText},
                {label:'시스템 텍스트',objects:activeMeasureSystemTexts,request:activeMeasureTextRequest?.family==='systemTexts'?activeMeasureTextRequest:undefined,onSelectObject:activeMeasureTextRequest?.family==='systemTexts'?id=>setMeasureTextSelection(current=>current?.family==='systemTexts'&&current.baseSelection===selection?{...current,id}:current):undefined,help:describeTextPropertyObjects(activeMeasureSystemTexts.length),value:activeMeasureSystemText?.text,scope:'measure',update:updateActiveSystemText}
              ]}
              technical={`${eventLocation?.event.id??activeMeasureId??'선택 없음'} · tick ${activeTick}`}>
            {selectedEventLocation ? <>
              <StudioEventMarks theme={studioTheme}
              scope={`${selectedEventLocation.measure.number}마디 · ${parseVoiceNumber(selectedEventLocation.address.voiceId)}성부 · 선택한 ${selectedEventLocation.event.type === 'note' ? '음표' : '쉼표'}`}
              note={selectedEventLocation.event.type === 'note'} fermata={selectedEventHasFermata}
              breathMark={selectedEventBreathMark} articulations={selectedNoteArticulations}
              onFermata={toggleFermata} onBreath={toggleBreathMark} onArticulation={toggleArticulation} />
              {selectedNote ? <StudioChordProperties theme={studioTheme} pitches={selectedChordPitches.map(pitchToLabel)} pitchEnabled={canEditPitch} onMove={movePitch} onRespell={respellEnharmonically} onAdd={addChordTone} onRemove={removeChordTone}/> : null}
              {selectedNote ? <StudioNoteDecorations theme={studioTheme} note={selectedNote}
                onTremolo={toggleTremoloMarks} onOrnament={toggleOrnament} onGrace={toggleGraceNote} /> : null}
            </> : null}
            </StudioSelectedProperties> : null}
          </aside>

          <div className="score-canvas" ref={scoreCanvas} tabIndex={-1} aria-label="악보 캔버스" data-notation-sizing={notationView.mode}
            onFocusCapture={event=>{
              const target=event.target
              if(isRestoringNotationFocus(target)&&!shouldRestoreFocusViewport())return
              if(target.matches('.notation-event,.notation-span-target,.notation-rehearsal-mark[role="button"],.notation-system-text-target[role="button"],.notation-staff-text-target[role="button"],.notation-expression-text-target[role="button"],.notation-dynamic-target[role="button"],.notation-harmony-target[role="button"]')){
                const intent=workspaceViewportIntent.current
                window.requestAnimationFrame(()=>{if(intent===workspaceViewportIntent.current)revealWorkspaceTarget(target)})
              }
            }}
            aria-keyshortcuts="F6" onKeyDown={event => {
              if (!isWorkspaceNavigation(event)) return
              event.preventDefault(); event.stopPropagation()
              const navigation = document.querySelector<HTMLButtonElement>('.studio-score-navigation')
              navigation?.focus({ preventScroll: true })
              navigation?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' })
            }}
            style={{
              '--studio-notation-zoom':notationView.zoom / 100,
              '--studio-workspace-focus':ddiroriTokens.themes[studioTheme].focus,
              // Paper stays light in either chrome theme; bind UI focus without inheriting UI typography.
              '--studio-paper-focus':ddiroriTokens.themes.light.focus,
              '--studio-paper-hover':ddiroriTokens.themes.light.interactionHover,
              '--studio-paper-control-border':ddiroriTokens.themes.light.controlBorder,
              '--studio-paper-focus-width':`${ddiroriTokens.control.focusWidth}px`,
              '--studio-paper-focus-offset':`${ddiroriTokens.control.focusOffset}px`
            } as CSSProperties}>

        <div
          className="score-page"
          aria-label="악보 페이지"
          data-part-id={
            scoreViewMode === 'part' && livePartViewPart
              ? livePartViewPart.id
              : undefined
          }
          data-pdf-page-margin-mm={printLayoutPlan.pageSetup.pageMarginMm}
          data-pdf-page-orientation={printLayoutPlan.pageSetup.orientation}
          data-pdf-page-size={printLayoutPlan.pageSetup.pageSize}
          data-pdf-staff-size-percent={
            printLayoutPlan.pageSetup.staffSizePercent
          }
          data-pdf-system-spacing-percent={
            printLayoutPlan.pageSetup.systemSpacingPercent
          }
          data-show-page-margins={
            showPageMarginGuides ? 'true' : 'false'
          }
          data-view-mode={scoreViewMode}
          style={
            {
              '--score-page-margin-guide-inset': `${printLayoutPlan.pageSetup.pageMarginMm}mm`
            } as CSSProperties
          }
        >
          <div className="score-title">
            {metadataEdit?.field === 'title' ? (
              <StudioMetadataInput saveGuard={metadataSaveGuard} theme={studioTheme} key={`${metadataEdit.documentKey}:${metadataEdit.session}:${metadataEdit.field}`} label="악보 제목"
                aria-label="악보 제목"
                autoFocus
                maxLength={metadataMaxLength.title}
                onCommit={(value, edited) =>
                  commitMetadataEdit('title', value, !edited)
                }
                onChange={(event) =>
                  updateMetadataDraft(metadataEdit, event.target.value)
                }
                onFocus={(event) => event.currentTarget.select()}
                onKeyDown={(event) =>
                  handleMetadataKeyDown(event, 'title', metadataEdit.value)
                }
                value={metadataEdit.value}
              />
            ) : (
              <button
                ref={node => restoreMetadataTriggerFocus(node, 'title')}
                onKeyDown={handleMetadataTriggerKeyDown}
                aria-label="악보 제목 수정"
                className="metadata-display metadata-display--title"
                onClick={() => beginMetadataEdit('title')}
                type="button"
              >
                {score.title}
              </button>
            )}

            {scoreViewMode === 'part' && livePartViewPart ? (
              <div
                className="score-part-title"
                aria-label="파트보 제목"
                data-part-id={livePartViewPart.id}
              >
                {metadataEdit?.field === 'partTitle' ? (
                  <StudioMetadataInput saveGuard={metadataSaveGuard} theme={studioTheme} key={`${metadataEdit.documentKey}:${metadataEdit.session}:${metadataEdit.field}`} label="파트보 제목 입력"
                    aria-label="파트보 제목 입력"
                    autoFocus
                    maxLength={metadataMaxLength.title}
                    onCommit={(value, edited) => commitMetadataEdit('partTitle', value, !edited)}
                    onChange={event => updateMetadataDraft(metadataEdit, event.target.value)}
                    onFocus={event => event.currentTarget.select()}
                    onKeyDown={event => handleMetadataKeyDown(event, 'partTitle', metadataEdit.value)}
                    value={metadataEdit.value}
                  />
                ) : (
                  <button ref={node => restoreMetadataTriggerFocus(node, 'partTitle')} onKeyDown={handleMetadataTriggerKeyDown} aria-label="파트보 제목 수정" className="metadata-display metadata-display--composer" onClick={() => beginMetadataEdit('partTitle')} type="button">
                    {livePartViewTitle}
                  </button>
                )}
              </div>
            ) : null}

            {metadataEdit?.field === 'composer' ? (
              <StudioMetadataInput saveGuard={metadataSaveGuard} theme={studioTheme} key={`${metadataEdit.documentKey}:${metadataEdit.session}:${metadataEdit.field}`} label="작곡가"
                aria-label="작곡가"
                autoFocus
                maxLength={metadataMaxLength.composer}
                onCommit={(value, edited) =>
                  commitMetadataEdit('composer', value, !edited)
                }
                onChange={(event) =>
                  updateMetadataDraft(metadataEdit, event.target.value)
                }
                onFocus={(event) => event.currentTarget.select()}
                onKeyDown={(event) =>
                  handleMetadataKeyDown(event, 'composer', metadataEdit.value)
                }
                placeholder="작곡가"
                value={metadataEdit.value}
              />
            ) : (
              <button
                ref={node => restoreMetadataTriggerFocus(node, 'composer')}
                onKeyDown={handleMetadataTriggerKeyDown}
                aria-label="작곡가 수정"
                className="metadata-display metadata-display--composer"
                onClick={() => beginMetadataEdit('composer')}
                type="button"
              >
                {score.composer ?? '작곡가'}
              </button>
            )}
          </div>

          <NotationPreview
            inlineEditorTheme={studioTheme}
            inputPosition={inputPosition}
            lyricWidths={automaticLyricSpacingSupported?measuredLyrics.widths:undefined}
            harmonyWidths={harmonySpacingWidths}
            minimumMeasureWidths={lyricMinimumWidths}
            selectedSpan={activeSpanReference}
            selectedRehearsalMarkId={activeMeasureTextRequest?.family==='rehearsalMarks'?activeMeasureTextRequest.id:undefined}
            selectedSystemTextId={activeMeasureTextRequest?.family==='systemTexts'?activeMeasureTextRequest.id:undefined}
            selectedDynamicId={activeMeasureTextRequest?.family==='dynamics'?activeMeasureTextRequest.id:undefined}
            onSelectDynamic={selectDynamic}
            selectedHarmonyId={activeMeasureTextRequest?.family==='harmonies'?activeMeasureTextRequest.id:undefined}
            onSelectHarmony={selectHarmony}
            selectedExpressionTextId={activeMeasureTextRequest?.family==='expressionTexts'?activeMeasureTextRequest.id:undefined}
            selectedStaffTextId={activeMeasureTextRequest?.family==='staffTexts'?activeMeasureTextRequest.id:undefined}
            onSelectSpan={selectSpan}
            inlineLyricEditor={
              toolbarCategory === 'lyrics' && selectedNote && !lyricEditingBlocked
                ? {
                    documentKey:documentGeneration.current,
                    focusRequest:lyricFocusRequest,
                    eventId: selectedNote.id,
                    number: activeLyricVerse,
                    value: selectedLyric?.text ?? '',
                    syllabic: selectedLyric?.syllabic ?? 'single',
                    extend: selectedLyric?.extend,
                    onCommit: updateLyric,
                    onMoveVerse: moveActiveLyricVerse
                  }
                : undefined
            }
            onSelectEvent={selectEvent}
            onSelectEventRange={selectEventRange}
            onSelectLyric={selectLyric}
            onSelectRehearsalMark={selectRehearsalMark}
            onSelectSystemText={selectSystemText}
            onSelectExpressionText={selectExpressionText}
            onSelectStaffText={selectStaffText}
            onSelectMeasure={selectMeasure}
            onOpenMeasureContextMenu={openMeasureContextMenu}
            score={displayScore}
            interactionOwner={notationInteractionOwner}
            shouldRestoreFocusViewport={shouldRestoreFocusViewport}
            playbackEventId={visiblePlaybackEvent?.eventId}
            playbackRunning={playback.status === 'playing'}
            playbackEventAddress={visiblePlaybackAddress}
            printLayout={false}
            selectedEventAddress={
              selection.type === 'measure'
                ? undefined
                : selection.address
            }
            selectedEventId={activeSpanReference ? undefined : selectedEventId}
            selectedEventIds={activeSpanReference ? [] : selectedEventIds}
            selectedEventAddresses={activeSpanReference ? undefined : selectedEventAddresses}
            selectedMeasureId={activeSpanReference || activeMeasureTextRequest ? undefined : selectedMeasureId}
          />
        </div>
          </div>


        </div>
        <StudioPartMixer theme={studioTheme} open={mixerOpen} parts={score.parts.map(part=>{const settings=resolvePartMixerSettings(partMixer[part.id]);return{id:part.id,name:part.name,muted:settings.muted,solo:settings.solo,volume:Math.round(settings.volume*100),active:playback.isPartPlaying(part.id)}})}
          onMute={togglePartMute} onSolo={togglePartSolo} onVolume={(partId,value)=>changePartVolume(partId,String(value))} />
      </section>
        <StudioStatusBar theme={studioTheme} onNavigationKeyDown={event => {
          if (!event.defaultPrevented && isWorkspaceNavigation(event, true)) {
            event.preventDefault()
            event.stopPropagation()
            focusScore()
          }
        }}
          input={noteInputState ? (noteInputState.tupletInput ? '셋잇단음표 입력' : '입력 중') : undefined}
          duration={durationLabels[durationValue]}
          view={scoreViewMode === 'part' && livePartViewPartLabel ? `파트보: ${livePartViewPartLabel}` : '총보'}
          tuplet={noteInputState?.tupletInput ? `${tripletPreset.label} ${tupletProgress}` : undefined}
          position={describeInputPosition(score, noteInputState)}
          edits={undoStack.length} playback={playbackStatusLabels[playback.status]}
          beat={`${playback.positionBeat.toFixed(1)} / ${playback.totalBeats.toFixed(1)}박`}
          result={visibleFileStatus}>
        <div className="studio-status__context" aria-label="작업과 선택 상태">
        <div className="studio-workspace-tools__readout">
          <Text variant="caption" className="studio-workspace-tools__label">작업</Text>
          <Text as="strong" variant="label">{activeToolbarCategoryLabel}</Text>
        </div>
        <div className="studio-workspace-tools__readout">
          <Text variant="caption" className="studio-workspace-tools__label">입력</Text>
          <Text as="strong" variant="label">{inputModeLabel}</Text>
        </div>
        <div className="studio-workspace-tools__readout">
          <Text variant="caption" className="studio-workspace-tools__label">대상</Text>
          <Text as="strong" variant="label">{activeScopeLabel}</Text>
        </div>
        <div className="studio-workspace-tools__readout">
          <Text variant="caption" className="studio-workspace-tools__label">필터</Text>
          <Text as="strong" variant="label">
            {
              selectionFilterOptions.find(
                ([value]) => value === selectionEventTypeFilter
              )?.[1]
            }
            {selectionObjectTypeFilter !== 'none'
              ? ` · ${describeSelectionObjectFilter(selectionObjectTypeFilter)}`
              : ''}
            {selection.type === 'range'
              ? ` ${filteredSelectedEventIds.length}/${selectedEventIds.length}`
              : ''}
          </Text>
        </div>
        </div>
        <div className="studio-status__view-tools">
          <SegmentedControl label="악보 보기 방식" options={[{value:'fit-width',label:'폭 맞춤'},{value:'fixed',label:'고정 배율'}]}
            value={notationView.mode} onChange={value=>setNotationView(previous=>({...previous,mode:value as 'fit-width'|'fixed'}))} />
          {notationView.mode === 'fixed' ? <Select label="고정 확대율" options={notationZoomOptions} value={String(notationView.zoom)}
            onChange={value=>setNotationView(previous=>({...previous,zoom:Number(value)}))} />
            : <Text as="output" variant="description" aria-label="확대율 상태">폭에 맞춰 자동 조절</Text>}
        </div>
        </StudioStatusBar>
        </>
      )}

      {measureContextMenu ? <StudioMeasureContextMenu key={measureContextMenu.measureId}
        theme={studioTheme} x={measureContextMenu.x} y={measureContextMenu.y}
        scope={resolveRepeatEditScope(score, measureContextMenu.measureId)?.label}
        canRemove={measureCount > 1} onClose={closeMeasureContextMenu} onSelect={applyMeasureContextAction} /> : null}

      {newScoreDraft ? (
        <div className="studio-first-use ddirori" data-theme={studioTheme} data-density="compact" onKeyDown={event => event.stopPropagation()}>
          <Dialog open title="새 악보 만들기" onClose={cancelNewScoreWizard}>
          <form
            aria-label="새 악보 만들기"
            className="studio-new-score-form"
            onCompositionStart={() => { wizardComposing.current = true }}
            onCompositionEnd={() => { wizardComposing.current = false }}
            onKeyDown={event => {
              if (event.key !== 'Tab') event.stopPropagation()
              if ((wizardComposing.current || event.nativeEvent.isComposing || event.keyCode === 229) && ['Enter','Escape'].includes(event.key)) event.preventDefault()
            }}
            onSubmit={(event) => {
              event.preventDefault()
              if (!wizardComposing.current) submitNewScoreWizard()
            }}
          >

            <section aria-label="내장 템플릿" className="studio-new-score-templates">
              <Text as="h3" variant="itemTitle">내장 템플릿</Text>
              <div className="studio-new-score-template-grid">
                {scoreStructurePresets.map(preset => <Button
                  aria-label={`${preset.label} 템플릿`}
                  selected={newScoreDraft.templateId === preset.id}
                  kind="secondary" key={preset.id}
                  onClick={() => setNewScoreDraft({ ...newScoreDraft, templateId: preset.id })}
                >
                  <span className="studio-new-score-template-content">
                    <Text as="span" variant="itemTitle">{preset.label}</Text>
                    <Text as="span" variant="caption">{preset.category}</Text>
                    <Text as="span" variant="description">{preset.summary}</Text>
                  </span>
                </Button>)}
              </div>
            </section>
            <div className="studio-new-score-fields">
              <Input label="제목" autoFocus maxLength={metadataMaxLength.title}
                onChange={event => setNewScoreDraft({ ...newScoreDraft, title: event.target.value })}
                value={newScoreDraft.title}/>
              <Input label="작곡가" maxLength={metadataMaxLength.composer}
                onChange={event => setNewScoreDraft({ ...newScoreDraft, composer: event.target.value })}
                value={newScoreDraft.composer}/>
              <Select label="악보 구성" value={newScoreDraft.templateId}
                options={scoreStructurePresets.map(preset => ({value:preset.id,label:preset.label}))}
                onChange={templateId => setNewScoreDraft({ ...newScoreDraft, templateId })}/>
              <Select label="조표" value={newScoreDraft.keySignatureId}
                options={keySignaturePresets.map(preset => ({value:preset.id,label:preset.label}))}
                onChange={keySignatureId => setNewScoreDraft({ ...newScoreDraft, keySignatureId })}/>
              <Select label="박자표" value={newScoreDraft.timeSignatureId}
                options={timeSignaturePresets.map(preset => ({value:preset.id,label:preset.label}))}
                onChange={timeSignatureId => setNewScoreDraft({ ...newScoreDraft, timeSignatureId })}/>
              <Input label="마디 수" type="number" min={1} max={64} value={newScoreDraft.measureCount}
                onChange={event => setNewScoreDraft({ ...newScoreDraft, measureCount: normalizeNumberInput(event.target.valueAsNumber,1,64,newScoreDraft.measureCount) })}/>
              <Input label={koreanMusicTerms.tempo} type="number" min={40} max={240} help="bpm" value={newScoreDraft.tempo}
                onChange={event => setNewScoreDraft({ ...newScoreDraft, tempo: normalizeNumberInput(event.target.valueAsNumber,40,240,newScoreDraft.tempo) })}/>
            </div>
            <footer className="studio-new-score-actions">
              <Button kind="secondary" onClick={cancelNewScoreWizard}>취소</Button>
              {/* Public Button needs a click handler; creation belongs only to native form submit. */}
              <Button type="submit" onClick={() => {}}>만들기</Button>
            </footer>
          </form>
          </Dialog>
        </div>
      ) : null}

      {currentPdfResult && scoreGuideOpen ? <div className="studio-transfer ddirori" data-theme={studioTheme} data-density="compact" onKeyDown={event => event.stopPropagation()}>
        <Dialog open title="PDF로 연습 이어가기" onClose={() => setScoreGuideOpen(false)}>
          <ProductSignature product="score" name="Score" />
          <Text as="p" variant="description">{currentPdfResult.fileName}</Text>
          <ol className="studio-transfer-steps">
            <li>저장한 PDF를 원하는 파일 보관 방법으로 모바일 기기에 전달해 주세요.</li>
            <li>모바일 기기의 Score에서 PDF 추가를 선택하고 전달한 파일을 가져오세요.</li>
            <li>Score에서 파일 저장과 지면 열기를 확인한 뒤 주석이나 연습을 시작하세요.</li>
          </ol>
          <Text as="p">Studio 프로젝트, 내보낸 PDF, Score 내부 사본은 별개입니다. 이후 Studio 수정은 Score에 자동으로 반영되지 않습니다.</Text>
          <Text as="p" variant="description">이 기기에서는 Score의 설치 여부나 가져오기 완료를 확인하지 않습니다.</Text>
          <Button kind="secondary" onClick={() => setScoreGuideOpen(false)}>확인</Button>
        </Dialog>
      </div> : null}

      {shortcutHelpOpen ? <div className="studio-shortcut-help ddirori" data-theme={studioTheme} data-density="compact" onKeyDown={event => event.stopPropagation()}>
        <Dialog open title="단축키 도움말" onClose={() => setShortcutHelpOpen(false)}>
          <div className="studio-shortcut-sections">
            {shortcutReferenceSections.map(section => <section key={section.title} className="studio-shortcut-section">
              <Text as="h3" variant="itemTitle">{section.title}</Text>
              <dl className="studio-shortcut-list">
                {section.rows.map(([label,shortcut]) => <div key={label} className="studio-shortcut-row">
                  <dt><Text as="span" variant="description">{label}</Text></dt>
                  <dd><Text as="span">{shortcut}</Text></dd>
                </div>)}
              </dl>
            </section>)}
          </div>
          <Button kind="secondary" onClick={() => setShortcutHelpOpen(false)}>확인</Button>
        </Dialog>
      </div> : null}

      {nativeBackupsOpen ? <NativeBackupsDialog theme={studioTheme} onClose={closeNativeBackups} onRestore={restoreNativeBackup} /> : null}

    </main>
    </DocumentDraftContext.Provider>
  )
}

function resolveSelectionAfterClear(
  previousScore: Score,
  nextScore: Score,
  eventId: string,
  address?: VoiceAddress
): EditorSelection {
  const clearedLocation = locateEvent(nextScore, eventId, address)
  const clearedEvent = clearedLocation?.event

  if (
    clearedLocation &&
    clearedEvent?.type === 'rest' &&
    (clearedEvent.fullMeasure || clearedEvent.duration.tuplet)
  ) {
    return {
      type: 'event',
      eventId,
      address: clearedLocation.address
    }
  }

  const nextEventId = getAdjacentEventId(previousScore, eventId, 1, address)

  if (nextEventId) {
    const nextLocation = locateEvent(nextScore, nextEventId, address)

    if (nextLocation) {
      return {
        type: 'event',
        eventId: nextEventId,
        address: nextLocation.address
      }
    }
  }

  const previousEventId = getAdjacentEventId(previousScore, eventId, -1, address)

  if (previousEventId) {
    const previousLocation = locateEvent(nextScore, previousEventId, address)

    if (previousLocation) {
      return {
        type: 'event',
        eventId: previousEventId,
        address: previousLocation.address
      }
    }
  }

  if (clearedLocation) {
    return {
      type: 'event',
      eventId,
      address: clearedLocation.address
    }
  }

  const previousLocation = locateEvent(previousScore, eventId, address)

  return {
    type: 'measure',
    measureId: previousLocation?.address.measureId ?? 'measure-1',
    address: previousLocation?.address
  }
}

function createInputId(kind: 'event' | 'measure'): string {
  return `${kind}-${crypto.randomUUID()}`
}

function previewInputId(): string {
  return `preview-${crypto.randomUUID()}`
}

function createDefaultNewScoreDraft(tempo: number): NewScoreDraft {
  return {
    title: '제목 없는 악보',
    composer: '',
    templateId: 'solo-melody',
    keySignatureId: 'c-major',
    timeSignatureId: '4-4',
    measureCount: 8,
    tempo: normalizeNumberInput(tempo, 40, 240, DEFAULT_TEMPO_BPM)
  }
}

function normalizeNumberInput(
  value: number,
  min: number,
  max: number,
  fallback: number
): number {
  if (!Number.isFinite(value)) {
    return fallback
  }

  return Math.min(max, Math.max(min, Math.round(value)))
}

function createInitialScore(): Score {
  switch (fixtureMode()) {
    case 'single-voice-mvp':
      return createSingleVoiceMvpScore()
    case 'piano-stress':
      return createPianoStressScore()
    case 'release-test':
      return createReleaseTestScore()
    case 'demo':
      return demoScore
    default:
      return createNewScore({
        title: '제목 없는 악보',
        composer: 'in-C',
        partName: '멜로디',
        partAbbreviation: 'Mel.',
        keySignature: resolveKeySignaturePreset('c-major').value,
        timeSignature: resolveTimeSignaturePreset('4-4').value,
        measureCount: 8,
        tempo: DEFAULT_TEMPO_BPM
      })
  }
}

function fixtureMode(): string | null {
  return new URLSearchParams(window.location.search).get('fixture')
}

function isFixtureMode(): boolean {
  return Boolean(fixtureMode())
}

function isAutosaveRecoverySnapshot(
  value: unknown
): value is AutosaveRecoverySnapshot {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const snapshot = value as {
    score?: unknown
    metadata?: unknown
    project?: unknown
  }

  if (snapshot.project !== undefined) {
    try { validateNativeProject(snapshot.project) } catch { return false }
  }

  return isScoreLike(snapshot.score) && isRecoveryMetadata(snapshot.metadata)
}

function isScoreLike(value: unknown): value is Score {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const score = value as Partial<Score>

  return (
    typeof score.id === 'string' &&
    typeof score.title === 'string' &&
    Array.isArray(score.parts)
  )
}

function isRecoveryMetadata(
  value: unknown
): value is AutosaveRecoverySnapshot['metadata'] {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const metadata = value as Partial<AutosaveRecoverySnapshot['metadata']>

  return (
    typeof metadata.title === 'string' &&
    typeof metadata.updatedAt === 'string' &&
    typeof metadata.version === 'string'
  )
}

function formatRecoveryTime(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}

function createInitialSelection(score: Score, partId?: string): EditorSelection {
  const preferred = partId ? undefined : locateEvent(score, 'note-e4')
  const part = score.parts.find(part => part.id === partId) ?? score.parts[0]
  const staff = part?.staves[0]
  const firstMeasure = staff?.measures[0]
  const firstEvent = firstMeasure?.voices[0]?.events[0]

  return preferred
    ? {
        type: 'event',
        eventId: preferred.event.id,
        address: preferred.address
      }
    : firstEvent
      ? {
          type: 'event',
          eventId: firstEvent.id,
          address:
            firstMeasure && part && staff
              ? {
                  partId: part.id,
                  staffId: staff.id,
                  measureId: firstMeasure.id,
                  voiceId: firstMeasure.voices[0]?.id ?? 'voice-1'
                }
              : undefined
        }
      : {
          type: 'measure',
          measureId: firstMeasure?.id ?? 'measure-1',
          address:
            firstMeasure && part && staff
              ? {
                  partId: part.id,
                  staffId: staff.id,
                  measureId: firstMeasure.id,
                  voiceId: firstMeasure.voices[0]?.id ?? 'voice-1'
                }
              : undefined
        }
}

function createInputState(
  score: Score,
  selection: EditorSelection,
  duration: Duration,
  mode: 'note' | 'rest'
): NoteInputState | undefined {
  const focusedEventId = getSelectionFocusEventId(selection)

  if (focusedEventId) {
    const location = locateEvent(
      score,
      focusedEventId,
      selection.type === 'measure' ? undefined : selection.address
    )

    return location
      ? createNoteInputState({
          target: location.address,
          tick: location.event.position.tick,
          duration,
          mode,
          lastPitch:
            location.event.type === 'note'
              ? resolveNotePitch(
                  location.measure,
                  (location.measure.voices.find(
                    (voice) => voice.id === location.address.voiceId
                  ) ?? location.measure.voices[0])!,
                  location.event
                )
              : undefined
        })
      : undefined
  }

  if (selection.type !== 'measure') {
    return undefined
  }

  const location = locateMeasure(score, selection.measureId, selection.address)

  return location
    ? createNoteInputState({
        target: location.address,
        tick: location.events[0]?.position.tick ?? 0,
        duration,
        mode
    })
    : undefined
}

function resolveVoiceSwitchLocation(
  score: Score,
  selection: EditorSelection,
  noteInputState: NoteInputState | undefined
):
  | {
      address: VoiceAddress
      measure: Measure
      measureIndex: number
      staffMeasures: Measure[]
      tick: number
    }
  | undefined {
  if (noteInputState) {
    const location = locateMeasure(
      score,
      noteInputState.target.measureId,
      noteInputState.target
    )

    return location
      ? {
          address: location.address,
          measure: location.measure,
          measureIndex: findMeasureIndex(score, location.address),
          staffMeasures: findStaffMeasures(score, location.address) ?? [],
          tick: noteInputState.tick
        }
      : undefined
  }

  const focusedEventId = getSelectionFocusEventId(selection)

  if (focusedEventId) {
    const location = locateEvent(
      score,
      focusedEventId,
      selection.type === 'measure' ? undefined : selection.address
    )

    return location
      ? {
          address: location.address,
          measure: location.measure,
          measureIndex: findMeasureIndex(score, location.address),
          staffMeasures: findStaffMeasures(score, location.address) ?? [],
          tick: location.event.position.tick
        }
      : undefined
  }

  if (selection.type !== 'measure') {
    return undefined
  }

  const location = locateMeasure(score, selection.measureId, selection.address)

  return location
    ? {
        address: location.address,
        measure: location.measure,
        measureIndex: findMeasureIndex(score, location.address),
        staffMeasures: findStaffMeasures(score, location.address) ?? [],
        tick: location.events[0]?.position.tick ?? 0
      }
    : undefined
}

function resolveActiveStructureTarget(
  score: Score,
  address: VoiceAddress | undefined
): { partId: string; staffId: string } | undefined {
  if (address) {
    const part = score.parts.find((candidate) => candidate.id === address.partId)
    const staff = part?.staves.find(
      (candidate) => candidate.id === address.staffId
    )

    if (part && staff) {
      return {
        partId: part.id,
        staffId: staff.id
      }
    }
  }

  const firstPart = score.parts[0]
  const firstStaff = firstPart?.staves[0]

  return firstPart && firstStaff
    ? {
        partId: firstPart.id,
        staffId: firstStaff.id
      }
    : undefined
}

function createEmptyStaffFromScore(
  score: Score,
  partId: string,
  staffId: string,
  clef: Clef,
  transposition?: Measure['transposition']
): Staff {
  const referenceMeasures =
    score.parts[0]?.staves[0]?.measures ?? [createMeasure()]

  return createStaff({
    id: staffId,
    measures: referenceMeasures.map((measure, index) =>
      createMeasure({
        id: `${partId}-${staffId}-measure-${index + 1}`,
        number: measure.number,
        timing: measure.timing,
        timeSignature: measure.timeSignature,
        keySignature: measure.keySignature,
        clef,
        transposition: transposition ?? score.parts.find((part) => part.id === partId)?.staves[0]?.measures[index]?.transposition
      })
    )
  })
}

function createStaffStartSelection(partId: string, staff: Staff): EditorSelection {
  const measure = staff.measures[0]
  const voice = measure?.voices[0]
  const event = voice?.events[0]
  const address =
    measure && voice
      ? {
          partId,
          staffId: staff.id,
          measureId: measure.id,
          voiceId: voice.id
        }
      : undefined

  return event
    ? {
        type: 'event',
        eventId: event.id,
        address
      }
    : {
        type: 'measure',
        measureId: measure?.id ?? 'measure-1',
        address
      }
}

function createUniqueNumberedId(
  prefix: string,
  usedIds: Set<string>,
  startIndex = 1
): string {
  let index = Math.max(1, startIndex)
  let id = `${prefix}-${index}`

  while (usedIds.has(id)) {
    index += 1
    id = `${prefix}-${index}`
  }

  return id
}

function createUniqueIdFromBase(baseId: string, usedIds: Set<string>): string {
  if (!usedIds.has(baseId)) {
    return baseId
  }

  let index = 2
  let id = `${baseId}-${index}`

  while (usedIds.has(id)) {
    index += 1
    id = `${baseId}-${index}`
  }

  return id
}

function countExistingPartNames(score: Score, baseName: string): number {
  return score.parts.filter(
    (part) => part.name === baseName || part.name.startsWith(`${baseName} `)
  ).length
}

function buildScorePartsReplaceCommand(
  score: Score,
  parts: Part[]
): ScoreCommand {
  const repeatSource = scoreRepeatSource(score)
  const repeatPartId = repeatSource ? score.parts.find(part => part.staves.includes(repeatSource))?.id : undefined
  if (repeatSource && !parts.some(part => part.id === repeatPartId && part.staves.some(staff => staff.id === repeatSource.id))) {
    parts = parts.map(part => ({ ...part, staves: part.staves.map(staff => ({ ...staff,
      measures: staff.measures.map((measure, index) => ({ ...measure,
        repeat: repeatSource.measures[index]?.repeat,
        volta: repeatSource.measures[index]?.volta
      }))
    })) }))
  }
  const commands: ScoreCommand[] = [
    {
      type: 'score-parts.replace',
      parts
    }
  ]
  const measureIds = collectPartMeasureIds(parts)
  const measureNumbers = collectPartMeasureNumbers(parts)
  const eventIds = collectPartEventIds(parts)
  const globalMeasureSurvives = (measureId: string) =>
    matchesPartViewMeasureReference(measureId, measureIds, measureNumbers, true)
  const preserveGlobalMarkings = <T extends { measureId: string }>(
    source: T[] | undefined, createCommand: (items: T[] | undefined) => ScoreCommand
  ) => {
    if (!source) return
    const next = source.flatMap(item => {
      if (globalMeasureSurvives(item.measureId)) return [item]
      const original = score.parts.flatMap(part => part.staves.flatMap(staff => staff.measures))
        .find(measure => measure.id === item.measureId)
      return original && measureNumbers.has(original.number)
        ? [{ ...item, measureId: `measure-${original.number}` }] : []
    })
    if (next.length !== source.length || next.some((item, index) => item !== source[index])) {
      commands.push(createCommand(next.length ? next : undefined))
    }
  }

  preserveGlobalMarkings(score.tempoEvents, (tempoEvents) => ({
    type: 'score-tempo-events.update',
    tempoEvents
  }))
  addFilteredCommand(commands, score.pedalEvents, (pedalEvents) => ({
    type: 'score-pedal-events.update', pedalEvents
  }), pedal => parts.some(part => part.id === pedal.partId && part.staves.some(staff =>
    staff.id === pedal.staffId && staff.measures.some(measure => measure.id === pedal.measureId))))
  preserveGlobalMarkings(score.rehearsalMarks, (rehearsalMarks) => ({
    type: 'score-rehearsal-marks.update',
    rehearsalMarks
  }))
  addFilteredCommand(commands, score.staffTexts, (staffTexts) => ({
    type: 'score-staff-texts.update',
    staffTexts
  }), (text) => measureIds.has(text.measureId))
  preserveGlobalMarkings(score.systemTexts, (systemTexts) => ({
    type: 'score-system-texts.update',
    systemTexts
  }))
  addFilteredCommand(commands, score.expressionTexts, (expressionTexts) => ({
    type: 'score-expression-texts.update',
    expressionTexts
  }), (text) => measureIds.has(text.measureId))
  addFilteredCommand(commands, score.dynamics, (dynamics) => ({
    type: 'score-dynamics.update',
    dynamics
  }), (dynamic) => measureIds.has(dynamic.measureId))
  addFilteredCommand(commands, score.harmonies, (harmonies) => ({
    type: 'score-harmonies.update',
    harmonies
  }), (harmony) => measureIds.has(harmony.measureId))
  addFilteredCommand(commands, score.octaveShifts, (octaveShifts) => ({
    type: 'score-octave-shifts.update',
    octaveShifts
  }), (shift) => eventIds.has(shift.startEventId) && eventIds.has(shift.endEventId))
  addFilteredCommand(commands, score.hairpins, (hairpins) => ({
    type: 'score-hairpins.update',
    hairpins
  }), (hairpin) =>
    eventIds.has(hairpin.startEventId) && eventIds.has(hairpin.endEventId)
  )
  addFilteredCommand(commands, score.slurs, (slurs) => ({
    type: 'score-slurs.update',
    slurs
  }), (slur) => eventIds.has(slur.startEventId) && eventIds.has(slur.endEventId))

  const nextLayout = filterLayoutForMeasureIds(remapRemovedStaffLayoutAnchors(score.layout, score.parts, parts), measureIds)

  if (JSON.stringify(nextLayout) !== JSON.stringify(score.layout)) {
    commands.push({
      type: 'score-layout.update',
      layout: nextLayout
    })
  }

  return commands.length === 1
    ? commands[0]
    : {
        type: 'score.batch',
        commands
      }
}

function addFilteredCommand<T>(
  commands: ScoreCommand[],
  source: T[] | undefined,
  createCommand: (items: T[] | undefined) => ScoreCommand,
  predicate: (item: T) => boolean
): void {
  if (!source) {
    return
  }

  const filtered = source.filter(predicate)

  if (filtered.length !== source.length) {
    commands.push(createCommand(filtered.length > 0 ? filtered : undefined))
  }
}

function collectPartMeasureIds(parts: Part[]): Set<string> {
  return new Set(
    parts.flatMap((part) =>
      part.staves.flatMap((staff) =>
        staff.measures.map((measure) => measure.id)
      )
    )
  )
}

function collectPartMeasureNumbers(parts: Part[]): Set<number> {
  return new Set(
    parts.flatMap((part) =>
      part.staves.flatMap((staff) =>
        staff.measures.map((measure) => measure.number)
      )
    )
  )
}

function collectPartEventIds(parts: Part[]): Set<string> {
  return new Set(
    parts.flatMap((part) =>
      part.staves.flatMap((staff) =>
        staff.measures.flatMap((measure) =>
          measure.voices.flatMap((voice) =>
            voice.events.map((event) => event.id)
          )
        )
      )
    )
  )
}

function filterLayoutForMeasureIds(
  layout: Score['layout'],
  measureIds: Set<string>
): Score['layout'] {
  if (!layout) {
    return undefined
  }

  const systemBreakBeforeMeasureIds =
    layout.systemBreakBeforeMeasureIds?.filter((measureId) =>
      measureIds.has(measureId)
    )
  const pageBreakBeforeMeasureIds = layout.pageBreakBeforeMeasureIds?.filter(
    (measureId) => measureIds.has(measureId)
  )
  const nextLayout: Score['layout'] = {
    pageSetup: layout.pageSetup,
    systemBreakBeforeMeasureIds:
      systemBreakBeforeMeasureIds && systemBreakBeforeMeasureIds.length > 0
        ? systemBreakBeforeMeasureIds
        : undefined,
    pageBreakBeforeMeasureIds:
      pageBreakBeforeMeasureIds && pageBreakBeforeMeasureIds.length > 0
        ? pageBreakBeforeMeasureIds
        : undefined
  }

  return nextLayout.pageSetup ||
    nextLayout.systemBreakBeforeMeasureIds ||
    nextLayout.pageBreakBeforeMeasureIds
    ? nextLayout
    : undefined
}

function createNativeSnapshot(score: Score, previous: NativeProject | undefined, preferences: PartPageSetupPreferences, mode: ScoreViewMode, partId: string | undefined): NativeProject {
  const project = previous ? { ...previous, score } : createNativeProject(score)
  project.partLayouts = score.parts.flatMap(part => {
    const saved = project.partLayouts.find(layout => layout.partId === part.id)
    const preference = preferences[part.id]
    const savedPageSetup = saved?.layout.pageSetup
    // Opening/recovering derives safe print controls from the stored settings.
    // That display normalization is not an edit: preserve optional fields and
    // schema-valid values outside the current print control range on save.
    // A real layout command updates both the envelope and its preferences.
    const pageSetup = preference && savedPageSetup &&
      samePageSetup(preference, normalizePrintPageSetup(savedPageSetup))
      ? savedPageSetup : preference
    if (!saved && !pageSetup) return []
    const layout = { ...saved?.layout, ...(pageSetup ? { pageSetup } : {}) }
    const measureIds = new Set(part.staves.flatMap(staff => staff.measures.map(measure => measure.id)))
    // Keep the live anchors for undo; only the saved snapshot drops deleted measures.
    for (const key of ['systemBreakBeforeMeasureIds', 'pageBreakBeforeMeasureIds'] as const) {
      if (layout[key]) layout[key] = layout[key].filter(id => measureIds.has(id))
    }
    return [{ ...saved, partId: part.id, layout }]
  })
  project.view = mode === 'part' && partId ? { mode: 'part', partId } : { mode: 'score' }
  return validateNativeProject(project)
}

function createPartExportScore(score: Score, partId: string): Score {
  const projected = createLivePartViewScore(score, partId)
  const primaryMeasures = projected.parts[0]?.staves[0]?.measures ?? []
  // Global directions use generic measure IDs in the full score. Bind them to
  // the extracted part before round-trip validation, without changing the source.
  const anchor = <T extends { measureId: string }>(items: T[] | undefined) =>
    items?.map(item => ({
      ...item,
      measureId: primaryMeasures.find(measure =>
        item.measureId === `measure-${measure.number}`
      )?.id ?? item.measureId
    }))
  return {
    ...projected,
    tempoEvents: anchor(projected.tempoEvents),
    rehearsalMarks: anchor(projected.rehearsalMarks),
    systemTexts: anchor(projected.systemTexts)
  }
}

function createLivePartViewScore(score: Score, partId: string): Score {
  const part = score.parts.find((candidate) => candidate.id === partId)

  if (!part) {
    return score
  }

  // Linked part views/print/MIDI/XML share the score's performed repeat plan.
  // This projection preserves IDs and native ownership;layout is applied later.
  const repeatSource=scoreRepeatSource(score)
  const projectedPart=repeatSource?{...part,staves:part.staves.map(staff=>({...staff,
    measures:staff.measures.map((measure,index)=>({...measure,
      repeat:repeatSource.measures[index]!.repeat,volta:repeatSource.measures[index]!.volta
    }))
  }))}:part

  const measureIds = collectPartMeasureIds([part])
  const measureNumbers = collectPartMeasureNumbers([part])
  const eventIds = collectPartEventIds([part])
  const isPrimaryPart = score.parts[0]?.id === part.id
  const matchesGlobalMeasure = (measureId: string) =>
    matchesPartViewMeasureReference(measureId, measureIds, measureNumbers, true)
  const matchesStaffMeasure = (measureId: string) =>
    matchesPartViewMeasureReference(
      measureId,
      measureIds,
      measureNumbers,
      isPrimaryPart
    )

  return {
    ...score,
    parts: [projectedPart],
    pedalEvents: score.pedalEvents?.filter(pedal => pedal.partId === part.id),
    tempoEvents: score.tempoEvents?.filter((tempoEvent) =>
      matchesGlobalMeasure(tempoEvent.measureId)
    ),
    octaveShifts: score.octaveShifts?.filter(
      (shift) =>
        eventIds.has(shift.startEventId) && eventIds.has(shift.endEventId)
    ),
    harmonies: score.harmonies?.filter((harmony) =>
      matchesStaffMeasure(harmony.measureId)
    ),
    rehearsalMarks: score.rehearsalMarks?.filter((mark) =>
      matchesGlobalMeasure(mark.measureId)
    ),
    staffTexts: score.staffTexts?.filter((text) =>
      matchesStaffMeasure(text.measureId)
    ),
    systemTexts: score.systemTexts?.filter((text) =>
      matchesGlobalMeasure(text.measureId)
    ),
    expressionTexts: score.expressionTexts?.filter((text) =>
      matchesStaffMeasure(text.measureId)
    ),
    dynamics: score.dynamics?.filter((dynamic) =>
      matchesStaffMeasure(dynamic.measureId)
    ),
    hairpins: score.hairpins?.filter(
      (hairpin) =>
        eventIds.has(hairpin.startEventId) && eventIds.has(hairpin.endEventId)
    ),
    slurs: score.slurs?.filter(
      (slur) =>
        eventIds.has(slur.startEventId) && eventIds.has(slur.endEventId)
    ),
    layout: filterLayoutForMeasureIds(score.layout, measureIds)
  }
}

function applyPageSetupToScore(
  score: Score,
  pageSetup: Required<ScorePageSetup>
): Score {
  return {
    ...score,
    layout: {
      ...score.layout,
      pageSetup
    }
  }
}

function matchesPartViewMeasureReference(
  measureId: string,
  measureIds: Set<string>,
  measureNumbers: Set<number>,
  includeGenericMeasureReferences: boolean
): boolean {
  if (measureIds.has(measureId)) {
    return true
  }

  if (!includeGenericMeasureReferences) {
    return false
  }

  const genericMeasureNumber = readGenericMeasureReference(measureId)

  return (
    genericMeasureNumber !== undefined &&
    measureNumbers.has(genericMeasureNumber)
  )
}

function readGenericMeasureReference(measureId: string): number | undefined {
  const match = /^measure-(\d+)$/.exec(measureId)

  if (!match) {
    return undefined
  }

  return Number.parseInt(match[1]!, 10)
}

function createStaffTargetOptions(score: Score): StaffTargetOption[] {
  const labels = createPartOptionLabels(score.parts)
  const options = score.parts.flatMap((part,partIndex) =>
    part.staves.map((staff, staffIndex) => ({
      value: encodeStaffTargetValue(part.id, staff.id),
      label:
        part.staves.length === 1
          ? labels[partIndex]!
          : `${labels[partIndex]} 보표 ${staffIndex + 1}`,
      partId: part.id,
      staffId: staff.id
    }))
  )
  // Unique part names can still collide with another part's staff suffix.
  if (new Set(options.map(option=>option.label)).size !== options.length) {
    const partIndices = new Map(score.parts.map((part,index)=>[part.id,index+1]))
    return options.map(option=>({...option,label:`${partIndices.get(option.partId)} · ${option.label}`}))
  }
  return options
}

function encodeStaffTargetValue(partId: string, staffId: string): string {
  return `${encodeURIComponent(partId)}:${encodeURIComponent(staffId)}`
}

function parseStaffTargetValue(
  value: string
): { partId: string; staffId: string } | undefined {
  const separatorIndex = value.indexOf(':')

  if (separatorIndex < 0) {
    return undefined
  }

  try {
    return {
      partId: decodeURIComponent(value.slice(0, separatorIndex)),
      staffId: decodeURIComponent(value.slice(separatorIndex + 1))
    }
  } catch {
    return undefined
  }
}

function resolveActiveStaffTargetValue(
  address: VoiceAddress | undefined,
  options: StaffTargetOption[]
): string {
  const fallback = options[0]?.value ?? ''

  if (!address) {
    return fallback
  }

  return (
    options.find(
      (option) =>
        option.partId === address.partId && option.staffId === address.staffId
    )?.value ?? fallback
  )
}

function describeStaffTarget(
  score: Score,
  target: { partId: string; staffId: string }
): string {
  const option = createStaffTargetOptions(score).find(option=>option.partId===target.partId&&option.staffId===target.staffId)
  if (option) return option.label
  const part = score.parts.find((candidate) => candidate.id === target.partId)
  const staffIndex =
    part?.staves.findIndex((staff) => staff.id === target.staffId) ?? -1

  if (!part) {
    return '입력 보표'
  }

  return part.staves.length === 1 || staffIndex < 0
    ? part.name
    : `${part.name} 보표 ${staffIndex + 1}`
}

function describeSelectionFilter(filter: SelectionEventTypeFilter): string {
  return selectionFilterOptions.find(([value]) => value === filter)?.[1] ?? '전체'
}

function describeSelectionObjectFilter(
  filter: SelectionObjectTypeFilter
): string {
  return selectionObjectFilterOptions.find(([value]) => value === filter)?.[1] ?? '없음'
}


function findMeasureIndex(score: Score, address: VoiceAddress): number {
  return (
    findStaffMeasures(score, address)?.findIndex(
      (measure) => measure.id === address.measureId
    ) ?? -1
  )
}

function findStaffMeasures(
  score: Score,
  address: VoiceAddress
): Measure[] | undefined {
  return score.parts
    .find((part) => part.id === address.partId)
    ?.staves.find((staff) => staff.id === address.staffId)
    ?.measures
}

function resolveVerticalEventSelection(
  score: Score,
  eventId: string,
  direction: -1 | 1,
  address?: VoiceAddress
): { address: VoiceAddress; eventId: string } | undefined {
  const location = locateEvent(score, eventId, address)

  if (!location) {
    return undefined
  }

  const measureIndex = findMeasureIndex(score, location.address)
  const lanes = createVoiceLanes(score, measureIndex)
  const currentLaneIndex = lanes.findIndex(
    (lane) =>
      lane.address.partId === location.address.partId &&
      lane.address.staffId === location.address.staffId &&
      lane.address.voiceId === location.address.voiceId
  )

  if (measureIndex < 0 || currentLaneIndex < 0) {
    return undefined
  }

  for (
    let laneIndex = currentLaneIndex + direction;
    laneIndex >= 0 && laneIndex < lanes.length;
    laneIndex += direction
  ) {
    const lane = lanes[laneIndex]
    const events = sortVoiceEvents(lane.voice.events)

    if (events.length === 0) {
      continue
    }

    const targetEvent = findNearestEventAtTick(events, location.event.position.tick)

    return {
      address: {
        ...lane.address,
        measureId: lane.measure.id
      },
      eventId: targetEvent.id
    }
  }

  return undefined
}

function createVoiceLanes(
  score: Score,
  measureIndex: number
): Array<{
  address: Omit<VoiceAddress, 'measureId'>
  measure: Measure
  voice: Measure['voices'][number]
}> {
  if (measureIndex < 0) {
    return []
  }

  return score.parts.flatMap((part) =>
    part.staves.flatMap((staff) => {
      const measure = staff.measures[measureIndex]

      if (!measure) {
        return []
      }

      return measure.voices.map((voice) => ({
        address: {
          partId: part.id,
          staffId: staff.id,
          voiceId: voice.id
        },
        measure,
        voice
      }))
    })
  )
}

function findNearestEventAtTick(
  events: Measure['voices'][number]['events'],
  tick: number
): Measure['voices'][number]['events'][number] {
  return events.reduce((nearest, event) =>
    Math.abs(event.position.tick - tick) <
    Math.abs(nearest.position.tick - tick)
      ? event
      : nearest
  )
}

function parseVoiceNumber(voiceId: string | undefined): number {
  const match = voiceId ? /^voice-(\d+)$/.exec(voiceId) : undefined

  return match ? Number(match[1]) : 1
}

function resolveStandardClefPreset(clef: Clef | undefined) {
  if(!clef || (clef.octaveChange??0)!==0)return undefined
  return clefPresets.find(preset=>preset.value.sign===clef.sign&&preset.value.line===clef.line)
}

function describeInspectorClef(clef: Clef): string {
  const label=clefPresets.find(preset=>preset.value.sign===clef.sign&&preset.value.line===clef.line)?.label
    ?? (clef.sign==='percussion'?'타악기 보표':clef.sign==='tab'?'태브 보표':'기타 음자리표')
  const octave=clef.octaveChange??0
  return octave===0?label:`${label} · 옥타브 ${octave>0?'+':''}${octave}`
}

function describeInspectorKey(key: Measure['keySignature']): string {
  const preset=keySignaturePresets.find(preset=>preset.value.fifths===key.fifths&&preset.value.mode===key.mode)
  if(preset)return preset.label
  return key.fifths===0?'조표 없음':`${key.fifths>0?'샤프':'플랫'} ${Math.abs(key.fifths)}개`
}

function resolveClefPresetId(clef: Clef | undefined): string {
  return (
    clefPresets.find(
      (preset) =>
        preset.value.sign === clef?.sign && preset.value.line === clef.line
    )?.id ?? 'treble'
  )
}

function resolvePageSetupPresetId(setup: Required<ScorePageSetup>): string {
  return (
    pageSetupPresets.find((preset) => samePageSetup(preset.value, setup))?.id ??
    'custom'
  )
}

function samePageSetup(
  left: Required<ScorePageSetup>,
  right: Required<ScorePageSetup>
): boolean {
  return (
    left.pageSize === right.pageSize &&
    left.orientation === right.orientation &&
    left.pageMarginMm === right.pageMarginMm &&
    left.staffSizePercent === right.staffSizePercent &&
    left.systemSpacingPercent === right.systemSpacingPercent
  )
}

function resolveVoiceShortcut(
  event: KeyboardEvent,
  activeVoiceNumber: number
): (typeof voiceNumbers)[number] | undefined {
  const usesCommandKey = event.metaKey || event.ctrlKey

  if (usesCommandKey && event.altKey && !event.shiftKey) {
    const digit = /^Digit([1-4])$/.exec(event.code)?.[1]

    if (digit) {
      return Number(digit) as (typeof voiceNumbers)[number]
    }
  }

  if (!usesCommandKey && !event.altKey && event.code === 'KeyV') {
    const currentVoiceNumber = voiceNumbers.includes(
      activeVoiceNumber as (typeof voiceNumbers)[number]
    )
      ? (activeVoiceNumber as (typeof voiceNumbers)[number])
      : 1
    const currentIndex = voiceNumbers.indexOf(currentVoiceNumber)
    const offset = event.shiftKey ? -1 : 1
    const nextIndex =
      (currentIndex + offset + voiceNumbers.length) % voiceNumbers.length

    return voiceNumbers[nextIndex]
  }

  return undefined
}

function getEventIdBeforeInputCursor(
  score: Score,
  inputState: NoteInputState
): string | undefined {
  const location = locateMeasure(
    score,
    inputState.target.measureId,
    inputState.target
  )
  const previousEvent = location?.events
    .filter((event) => event.position.tick < inputState.tick)
    .at(-1)

  return previousEvent?.id
}

function describeTupletProgress(state: NoteInputState): string {
  const tupletInput = state.tupletInput

  if (!tupletInput) {
    return '셋잇단음표 입력 상태가 아닙니다.'
  }

  const entered = countTupletInputSlots(tupletInput)
  const remaining = tupletInput.actualNotes - entered

  return remaining > 0
    ? `셋잇단음표 ${entered}/${tupletInput.actualNotes}개 입력됨. ${remaining}개 더 입력해 주세요.`
    : '셋잇단음표 입력을 완료했습니다.'
}

function countTupletInputSlots(
  tupletInput: NonNullable<NoteInputState['tupletInput']>
): number {
  const baseDurationTicks = durationToTicks(tupletInput.baseDuration)

  return tupletInput.members.reduce((sum, member) => {
    const { tuplet: _tuplet, ...duration } = member.duration
    return sum + durationToTicks(duration) / baseDurationTicks
  }, 0)
}

function describeDurationEditSuccess(
  score: Score,
  selection: EditorSelection,
  duration: Duration,
  label: string
): string {
  if (selection.type !== 'event') {
    return `음가를 ${label}로 바꿨습니다.`
  }

  const location = locateEvent(score, selection.eventId, selection.address)

  if (!location) {
    return `음가를 ${label}로 바꿨습니다.`
  }

  const currentEndTick =
    location.event.position.tick +
    voiceEventDurationTicks(location.event, location.measure)
  const nextEndTick = location.event.position.tick + durationToTicks(duration)
  const subject = location.event.type === 'rest' ? '쉼표 음가' : '음가'

  return nextEndTick > currentEndTick
    ? `${subject}를 ${label}로 바꾸고 뒤의 쉼표를 사용했습니다.`
    : `${subject}를 ${label}로 바꿨습니다.`
}

function describeOctaveRestConflict(score: Score, eventId: string): string | undefined {
  if (!score.octaveShifts?.some(span => span.startEventId === eventId || span.endEventId === eventId)) return undefined
  return octaveRestConflictMessage()
}

function octaveRestConflictMessage(): string {
  return '옥타브 표시의 연결 음표는 그대로 쉼표로 바꾸거나 지울 수 없습니다. 원래 음표 범위를 선택하고 범위 기호에서 옥타브 표시를 해제한 뒤 다시 시도해 주세요.'
}

function describeDurationEditFailure(
  score: Score,
  selection: EditorSelection,
  duration: Duration
): string {
  if (selection.type !== 'event') {
    return '음가를 바꿀 음표나 쉼표를 선택해 주세요.'
  }

  const location = locateEvent(score, selection.eventId, selection.address)

  if (!location) {
    return '선택한 음표나 쉼표를 찾을 수 없습니다.'
  }

  const voice = location.measure.voices.find(
    (candidate) => candidate.id === location.address.voiceId
  )
  const isTupletMember = Boolean(
    location.event.duration.tuplet ||
      voice?.tuplets?.some((group) =>
        group.eventIds.includes(location.event.id)
      )
  )

  if (isTupletMember) {
    return '잇단음표 구성음의 음가는 아직 따로 바꿀 수 없습니다.'
  }

  const startTick = location.event.position.tick
  const currentEndTick =
    startTick + voiceEventDurationTicks(location.event, location.measure)
  const nextEndTick = startTick + durationToTicks(duration)
  const measureEndTick = measureDurationTicks(location.measure)

  if (nextEndTick > measureEndTick) {
    return '음가가 현재 마디를 넘어갑니다.'
  }

  if (nextEndTick > currentEndTick) {
    const events = sortVoiceEvents(voice?.events ?? [])
    let coveredUntil = currentEndTick

    for (const event of events) {
      if (event.position.tick >= nextEndTick) {
        break
      }

      if (
        event.id === location.event.id ||
        event.position.tick + voiceEventDurationTicks(event, location.measure) <=
          currentEndTick
      ) {
        continue
      }

      if (event.position.tick !== coveredUntil) {
        return '선택한 음표 뒤에 이어진 쉼표 공간이 필요합니다.'
      }

      if (event.type !== 'rest') {
        return event.ties?.start || event.ties?.stop
          ? `타이로 연결된 음표 ${event.id} 때문에 음가를 늘릴 수 없습니다.`
          : `음표 ${event.id} 때문에 음가를 늘릴 수 없습니다.`
      }

      if (event.duration.tuplet) {
        return '잇단음표 쉼표는 자동으로 사용할 수 없습니다. 잇단음표 그룹을 먼저 수정해 주세요.'
      }

      if (event.fermata || event.breathMark) {
        const marking = event.fermata ? koreanMusicTerms.fermata :
          event.breathMark === 'caesura' ? koreanMusicTerms.caesura : koreanMusicTerms.breathMark
        return `${marking}가 붙은 쉼표는 음가를 늘리는 공간으로 사용할 수 없습니다. 해당 쉼표의 표기를 확인해 주세요.`
      }

      if (event.position.tick + voiceEventDurationTicks(event, location.measure) <= nextEndTick &&
        [...(score.hairpins ?? []), ...(score.slurs ?? []), ...(score.octaveShifts ?? [])]
          .some(span => span.startEventId === event.id || span.endEventId === event.id)) {
        return '구간 기호가 연결된 쉼표를 없애며 음가를 늘릴 수 없습니다. 연결된 기호와 선택 구간을 확인해 주세요.'
      }

      coveredUntil =
        event.position.tick + voiceEventDurationTicks(event, location.measure)

      if (coveredUntil >= nextEndTick) {
        break
      }
    }

    return '선택한 음표 뒤에 더 많은 이어진 쉼표 공간이 필요합니다.'
  }

  return '마디의 박자를 유지한 채로는 음가를 바꿀 수 없습니다.'
}

function normalizeChordPitches(note: Note): Pitch[] {
  const pitches = note.pitches?.length ? note.pitches : [note.pitch]
  const uniquePitches: Pitch[] = []

  pitches.forEach((pitch) => {
    if (!uniquePitches.some((candidate) => samePitch(candidate, pitch))) {
      uniquePitches.push(pitch)
    }
  })

  return uniquePitches.length > 0 ? uniquePitches : [note.pitch]
}

function transposeChordPitch(pitch: Pitch, diatonicSteps: number): Pitch {
  const steps: PitchStep[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
  const currentIndex = steps.indexOf(pitch.step)
  const nextIndex = currentIndex + diatonicSteps
  const octaveOffset = Math.floor(nextIndex / steps.length)
  const step = steps[((nextIndex % steps.length) + steps.length) % steps.length]

  return {
    step,
    octave: pitch.octave + octaveOffset,
    alter: pitch.alter
  }
}

function comparePitch(left: Pitch, right: Pitch): number {
  const stepOrder: Record<PitchStep, number> = {
    C: 0,
    D: 1,
    E: 2,
    F: 3,
    G: 4,
    A: 5,
    B: 6
  }

  return (
    left.octave * 7 +
    stepOrder[left.step] -
    (right.octave * 7 + stepOrder[right.step])
  )
}

function samePitch(left: Pitch, right: Pitch): boolean {
  return (
    left.step === right.step &&
    left.octave === right.octave &&
    (left.alter ?? 0) === (right.alter ?? 0)
  )
}

function pitchToLabel(pitch: Pitch): string {
  const accidental =
    pitch.alter === -2
      ? 'bb'
      : pitch.alter === -1
        ? 'b'
        : pitch.alter === 1
          ? '#'
          : pitch.alter === 2
            ? '##'
            : ''

  return `${pitch.step}${accidental}${pitch.octave}`
}

function tempoBeatSelectorValue(
  beatUnit: DurationValue,
  dots: TempoBeatDots
): TempoBeatSelectorValue {
  return `${beatUnit}:${dots}` as TempoBeatSelectorValue
}

function normalizeTempoBeatDots(dots: number): TempoBeatDots {
  if (dots >= 2) {
    return 2
  }

  return dots >= 1 ? 1 : 0
}

function resolveTempoBeatOption(value: string) {
  return (
    tempoBeatUnitOptions.find((option) => option.value === value) ??
    tempoBeatUnitOptions.find((option) => option.value === 'quarter:0') ??
    tempoBeatUnitOptions[0]
  )
}

function formatTempoBeatOptionLabel(
  beatUnit: DurationValue,
  dots: TempoBeatDots
): string {
  const label = durationLabels[beatUnit]

  return dots === 0 ? label : dots === 1 ? `점${label}` : `겹점${label}`
}

function createUpdatedTempoMarking(
  currentTempo: TempoMarking | undefined,
  bpm: number,
  overrides: Partial<Pick<TempoMarking, 'beatUnit' | 'dots' | 'transparent'>> = {},
  fallbackBeat: Required<Pick<TempoMarking, 'beatUnit' | 'dots'>> = {
    beatUnit: 'quarter',
    dots: 0
  }
): TempoMarking {
  // Omitted fields on an existing mark already mean quarter/0 to playback
  // and serialization. A meter-based fallback is only for a newly created point.
  const baseBeat: Required<Pick<TempoMarking, 'beatUnit' | 'dots'>> = currentTempo
    ? {beatUnit:currentTempo.beatUnit??'quarter',dots:currentTempo.dots??0}
    : fallbackBeat
  const tempo = {
    ...currentTempo,
    bpm,
    beatUnit: overrides.beatUnit ?? baseBeat.beatUnit,
    dots: overrides.dots ?? baseBeat.dots,
    transparent: overrides.transparent ?? currentTempo?.transparent
  }

  return {
    ...tempo,
    text: currentTempo?.text && currentTempo.text!==formatTempoMarkingText(currentTempo)
      ? currentTempo.text : formatTempoMarkingText(tempo)
  }
}

function resolveRhythmFeelOption(
  value: string
): RhythmFeelMarking | undefined {
  return value === 'eighth' || value === '16th' ? { unit: value } : undefined
}

function shouldFollowTimeSignatureTempoBeat(
  tempo: TempoMarking | undefined,
  bpm: number,
  timeSignature: TimeSignature
): boolean {
  if (!tempo) {
    return true
  }

  const defaultBeat = resolveDefaultTempoBeatForTimeSignature(timeSignature)
  const defaultText = formatTempoMarkingText({
    bpm,
    ...defaultBeat
  })

  return (
    (tempo.beatUnit ?? 'quarter') === defaultBeat.beatUnit &&
    (tempo.dots ?? 0) === defaultBeat.dots &&
    (!tempo.text || tempo.text === defaultText)
  )
}

function assertMusicXmlSaveSafe(score: Score, contents: string): void {
  if (scoreContainsPreviewArtifacts(score)) {
    throw new Error(
      '미리보기 전용 이벤트가 악보 데이터에 섞여 있어 MusicXML 저장을 중단했습니다.'
    )
  }

  const roundTripScore = parseMusicXml(contents)
  const originalSignature = createSaveSignature(score)
  const roundTripSignature = createSaveSignature(roundTripScore)

  if (originalSignature !== roundTripSignature) {
    const original = JSON.parse(originalSignature) as Record<string, unknown>
    const reopened = JSON.parse(roundTripSignature) as Record<string, unknown>
    const differences = Object.keys(original).filter(
      key => JSON.stringify(original[key]) !== JSON.stringify(reopened[key])
    )
    const diagnostic = `MusicXML 저장 검증에 실패했습니다. 저장하면 악보 내용이 달라질 수 있어 파일을 쓰지 않았습니다. (${differences.map(key=>key==='tempoEvents'?'위치별 빠르기(tempoEvents)':key).join(', ')})`
    if (differences.includes('parts')) {
      const conflict = createMusicXmlRepeatConflictError(score, diagnostic)
      if (conflict) throw conflict
    }
    const metadataConflict=createMusicXmlMetadataConflictError(differences,diagnostic)
    if(metadataConflict)throw metadataConflict
    const signatureConflict=createMusicXmlSignatureConflictError(differences,diagnostic)
    if(signatureConflict)throw signatureConflict
    throw new Error(diagnostic)
  }
}

function scoreContainsPreviewArtifacts(score: Score): boolean {
  return score.parts.some((part) =>
    part.staves.some((staff) =>
      staff.measures.some((measure) =>
        measure.voices.some(
          (voice) =>
            voice.events.some((event) => event.id.startsWith('preview-')) ||
            (voice.tuplets ?? []).some(
              (group) =>
                group.id.startsWith('preview-') ||
                group.eventIds.some((eventId) =>
                  eventId.startsWith('preview-')
                )
            )
        )
      )
    )
  )
}

function normalizeRepeatMark(repeat: Measure['repeat']): Measure['repeat'] {
  if (!repeat?.start && !repeat?.end) {
    return undefined
  }

  return {
    start: repeat.start,
    end: repeat.end,
    times: repeat.end ? repeat.times : undefined
  }
}

function findNextRepeatEndMeasureIndex(
  measures: Measure[],
  startIndex: number
): number | undefined {
  for (let index = startIndex; index < measures.length; index += 1) {
    if (measures[index].repeat?.end) {
      return index
    }
  }

  return undefined
}

function createSaveSignature(score: Score): string {
  const eventReferences = createEventReferenceMap(score)
  const measureReferences = createMeasureReferenceMap(score)

  return JSON.stringify({
    title: score.title,
    composer: score.composer ?? '',
    tempo: normalizeTempoForSaveSignature(score.tempo),
    tempoEvents: orderMeasureMarkingSignatures((score.tempoEvents ?? []).map(event=>({
      measure:measureReferences.get(event.measureId),
      tick:event.tick,
      ...normalizeTempoForSaveSignature(event)
    }))),
    pedalEvents: orderMeasureMarkingSignatures((score.pedalEvents ?? []).map(event => ({
      measure: measureReferences.get(event.measureId), tick: event.tick, value: event.value
    }))),
    rhythmFeel: normalizeRhythmFeelForSaveSignature(score.rhythmFeel),
    parts: score.parts.map(part=>{
      const barlines=comparableMusicXmlBarlines(score,part)
      return {
        name:part.name,abbreviation:part.abbreviation??'',
        staves:part.staves.map(staff=>({
          measures:staff.measures.map((measure,index)=>({
            number:measure.number,timing:measure.timing,timeSignature:measure.timeSignature,
            keySignature:measure.keySignature,clef:measure.clef,
            repeat:barlines?barlines[index].repeat:measure.repeat??null,
            volta:barlines?barlines[index].volta:measure.volta??null,
            voices:sortScoreVoices(measure.voices).map(voice=>createVoiceSaveSignature(measure,voice))
          }))
        }))
      }
    }),
    harmonies: orderMeasureMarkingSignatures((score.harmonies ?? []).map(inferHarmonyStructure).map((harmony) => ({
      measure: measureReferences.get(harmony.measureId),
      tick: harmony.tick,
      text: harmony.text,
      kind: harmony.kind ?? null,
      root: harmony.root ? normalizeHarmonyPitch(harmony.root) : null,
      bass: harmony.bass ? normalizeHarmonyPitch(harmony.bass) : null
    }))),
    rehearsalMarks: orderMeasureMarkingSignatures((score.rehearsalMarks ?? []).map((mark) => ({
      measure: measureReferences.get(mark.measureId),
      text: mark.text
    }))),
    staffTexts: orderMeasureMarkingSignatures((score.staffTexts ?? []).map((text) => ({
      measure: measureReferences.get(text.measureId),
      text: text.text
    }))),
    systemTexts: orderMeasureMarkingSignatures((score.systemTexts ?? []).map((text) => ({
      measure: measureReferences.get(text.measureId),
      text: text.text
    }))),
    expressionTexts: orderMeasureMarkingSignatures((score.expressionTexts ?? []).map((text) => ({
      measure: measureReferences.get(text.measureId),
      tick: text.tick,
      text: text.text
    }))),
    dynamics: orderMeasureMarkingSignatures((score.dynamics ?? []).map((dynamic) => ({
      measure: measureReferences.get(dynamic.measureId),
      value: dynamic.value
    }))),
    hairpins: (score.hairpins ?? []).map((hairpin) => ({
      type: hairpin.type,
      start: eventReferences.get(hairpin.startEventId),
      end: eventReferences.get(hairpin.endEventId)
    })),
    slurs: createSlurSaveSignature(score, eventReferences),
    octaveShifts: (score.octaveShifts ?? []).map((octaveShift) => ({
      type: octaveShift.type,
      start: eventReferences.get(octaveShift.startEventId),
      end: eventReferences.get(octaveShift.endEventId)
    }))
  })
}

function createSlurSaveSignature(
  score: Score,
  eventReferences: Map<string, string>
) {
  return (score.slurs ?? [])
    .map((slur, index) => ({
      number: slur.number ?? index + 1,
      start: eventReferences.get(slur.startEventId),
      end: eventReferences.get(slur.endEventId)
    }))
    .sort(compareRangeSignatures)
}

function compareRangeSignatures(
  first: { number: number; start?: string; end?: string },
  second: { number: number; start?: string; end?: string }
): number {
  return (
    compareEventReference(first.start, second.start) ||
    compareEventReference(first.end, second.end) ||
    first.number - second.number
  )
}

function compareEventReference(
  first: string | undefined,
  second: string | undefined
): number {
  const firstParts = parseEventReference(first)
  const secondParts = parseEventReference(second)
  const length = Math.max(firstParts.length, secondParts.length)

  for (let index = 0; index < length; index += 1) {
    const diff = (firstParts[index] ?? -1) - (secondParts[index] ?? -1)

    if (diff !== 0) {
      return diff
    }
  }

  return 0
}

function parseEventReference(reference: string | undefined): number[] {
  return reference?.split(':').map((part) => Number(part)) ?? []
}

function normalizeTempoForSaveSignature(
  tempo: Score['tempo']
) {
  if (!tempo) {
    return null
  }

  return {
    bpm: tempo.bpm,
    beatUnit: tempo.beatUnit ?? 'quarter',
    dots: tempo.dots ?? 0,
    text: tempo.text || formatTempoMarkingText(tempo),
    transparent: Boolean(tempo.transparent)
  }
}

function normalizeRhythmFeelForSaveSignature(
  rhythmFeel: Score['rhythmFeel']
) {
  if (!rhythmFeel) {
    return null
  }

  return {
    unit: rhythmFeel.unit,
    text: rhythmFeel.text ?? null
  }
}

function createMeasureReferenceMap(score: Score): Map<string, string> {
  const references = new Map<string, string>()

  score.parts[0]?.staves[0]?.measures.forEach((measure, index) => {
    references.set(`measure-${measure.number}`, `0:0:${index}`)
  })

  score.parts.forEach((part, partIndex) => {
    part.staves.forEach((staff, staffIndex) => {
      staff.measures.forEach((measure, measureIndex) => {
        references.set(
          measure.id,
          [partIndex, staffIndex, measureIndex].join(':')
        )
      })
    })
  })

  return references
}

function createEventReferenceMap(score: Score): Map<string, string> {
  const references = new Map<string, string>()

  score.parts.forEach((part, partIndex) => {
    part.staves.forEach((staff, staffIndex) => {
      staff.measures.forEach((measure, measureIndex) => {
        sortScoreVoices(measure.voices).forEach((voice, voiceIndex) => {
          sortVoiceEvents(voice.events).forEach((event, eventIndex) => {
            references.set(
              event.id,
              [partIndex, staffIndex, measureIndex, voiceIndex, eventIndex].join(
                ':'
              )
            )
          })
        })
      })
    })
  })

  return references
}

function createVoiceSaveSignature(
  measure: Measure,
  voice: Measure['voices'][number]
) {
  const events = sortVoiceEvents(voice.events)
  const eventIndexes = new Map(
    events.map((event, index) => [event.id, index])
  )

  return {
    voiceNumber: readMusicXmlVoiceNumber(voice.id),
    presentation: resolveSameStaffVoicePresentation(voice.id, measure.voices.length),
    events: events.map((event) =>
      createEventSaveSignature(measure, voice, event)
    ),
    tuplets: (voice.tuplets ?? []).map((group) => ({
      actualNotes: group.actualNotes,
      normalNotes: group.normalNotes,
      eventIndexes: group.eventIds.map((eventId) => eventIndexes.get(eventId))
    }))
  }
}

function createEventSaveSignature(
  measure: Measure,
  voice: Measure['voices'][number],
  event: Measure['voices'][number]['events'][number]
) {
  return {
    type: event.type,
    tick: event.position.tick,
    duration: normalizeDurationForSaveSignature(event.duration),
    ...(event.type === 'rest'
      ? {
          fullMeasure: Boolean(event.fullMeasure)
        }
      : {
          pitches: resolveEventPitches(measure, voice, event),
          ties:
            event.ties?.start || event.ties?.stop
              ? {
                  start: Boolean(event.ties.start),
                  stop: Boolean(event.ties.stop)
                }
              : null,
          articulations: event.articulations ?? [],
          graceNotes: (event.graceNotes ?? []).map((graceNote) => ({
            pitch: normalizePitch(graceNote.pitch),
            slash: Boolean(graceNote.slash)
          })),
          lyrics: event.lyrics ? sortLyricsByNumber(event.lyrics) : [],
          ornaments: event.ornaments ?? [],
          tremolo: event.tremolo ?? null
        }),
    fermata: Boolean(event.fermata),
    breathMark: event.breathMark ?? null
  }
}

function sortLyricsByNumber(lyrics: LyricSyllable[]): LyricSyllable[] {
  return [...lyrics].sort(
    (left, right) => (left.number ?? 1) - (right.number ?? 1)
  )
}

function getAdjacentNoteEventId(
  score: Score,
  eventId: string,
  direction: -1 | 1,
  address?: VoiceAddress
): string | undefined {
  let nextEventId = getAdjacentEventId(score, eventId, direction, address)

  while (nextEventId) {
    const location = locateEvent(score, nextEventId, address)

    if (location?.event.type === 'note') {
      return nextEventId
    }

    nextEventId = getAdjacentEventId(score, nextEventId, direction, address)
  }

  return undefined
}

function normalizeDurationForSaveSignature(duration: Duration): Duration {
  return {
    value: duration.value,
    dots: duration.dots,
    ...(duration.tuplet
      ? {
          tuplet: {
            actualNotes: duration.tuplet.actualNotes,
            normalNotes: duration.tuplet.normalNotes
          }
        }
      : {})
  }
}

function resolveEventPitches(
  measure: Measure,
  voice: Measure['voices'][number],
  event: Note
): Pitch[] {
  return event.pitches?.length
    ? event.pitches.map(pitch => normalizePitch(resolveNotePitch(measure, voice, { ...event, pitch })))
    : [normalizePitch(resolveNotePitch(measure, voice, event))]
}

function normalizePitch(pitch: Pitch): Pitch {
  return {
    step: pitch.step,
    octave: pitch.octave,
    alter: pitch.alter ?? 0
  }
}

function normalizeHarmonyPitch(pitch: NonNullable<HarmonyMark['root']>) {
  return {
    step: pitch.step,
    alter: pitch.alter ?? 0
  }
}

function createCurrentMusicXmlViewState(
  mode: ScoreViewMode,
  partId?: string
): StoredMusicXmlViewState {
  return mode === 'part' && partId
    ? {
        mode,
        partId
      }
    : {
        mode: 'score'
      }
}

function readStoredMusicXmlViewState(
  filePath: string,
  score: Score
): StoredMusicXmlViewState {
  try {
    const item = window.localStorage.getItem(musicXmlViewStateStorageKey)
    const stored = item ? JSON.parse(item) : undefined
    const state =
      stored &&
      typeof stored === 'object' &&
      !Array.isArray(stored) &&
      filePath in stored
        ? parseStoredMusicXmlViewState(
            (stored as Record<string, unknown>)[filePath]
          )
        : undefined

    return resolveStoredMusicXmlViewState(score, state)
  } catch {
    return { mode: 'score' }
  }
}

function writeStoredMusicXmlViewState(
  filePath: string,
  state: StoredMusicXmlViewState
): void {
  try {
    const item = window.localStorage.getItem(musicXmlViewStateStorageKey)
    const stored = item ? JSON.parse(item) : undefined
    const next =
      stored && typeof stored === 'object' && !Array.isArray(stored)
        ? { ...(stored as Record<string, unknown>) }
        : {}

    next[filePath] = state
    window.localStorage.setItem(
      musicXmlViewStateStorageKey,
      JSON.stringify(next)
    )
  } catch {
    // Local view preferences must never block MusicXML saves.
  }
}

function readStoredPartPageSetups(
  filePath: string,
  score: Score
): PartPageSetupPreferences {
  try {
    const item = window.localStorage.getItem(partPageSetupStorageKey)
    const stored = item ? JSON.parse(item) : undefined
    const fileEntry =
      stored &&
      typeof stored === 'object' &&
      !Array.isArray(stored) &&
      filePath in stored
        ? (stored as Record<string, unknown>)[filePath]
        : undefined

    return parseStoredPartPageSetups(fileEntry, score)
  } catch {
    return {}
  }
}

function writeStoredPartPageSetups(
  filePath: string,
  preferences: PartPageSetupPreferences
): void {
  try {
    const item = window.localStorage.getItem(partPageSetupStorageKey)
    const stored = item ? JSON.parse(item) : undefined
    const next =
      stored && typeof stored === 'object' && !Array.isArray(stored)
        ? { ...(stored as Record<string, unknown>) }
        : {}

    next[filePath] = preferences
    window.localStorage.setItem(partPageSetupStorageKey, JSON.stringify(next))
  } catch {
    // Local part layout preferences must never block MusicXML saves.
  }
}

function parseStoredMusicXmlViewState(
  value: unknown
): StoredMusicXmlViewState | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }

  const mode = (value as { mode?: unknown }).mode
  const partId = (value as { partId?: unknown }).partId

  if (mode === 'part' && typeof partId === 'string') {
    return { mode, partId }
  }

  if (mode === 'score') {
    return { mode }
  }

  return undefined
}

function parseStoredPartPageSetups(
  value: unknown,
  score: Score
): PartPageSetupPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  const partIds = new Set(score.parts.map((part) => part.id))

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([partId]) => partIds.has(partId))
      .map(([partId, setup]) => [partId, parseStoredPageSetup(setup)])
      .filter((entry): entry is [string, Required<ScorePageSetup>] =>
        Boolean(entry[1])
      )
  )
}

function parseStoredPageSetup(
  value: unknown
): Required<ScorePageSetup> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }

  const setup = value as Partial<Record<keyof ScorePageSetup, unknown>>
  const pageSize = setup.pageSize
  const orientation = setup.orientation

  if (
    pageSize !== 'a4' &&
    pageSize !== 'letter' &&
    pageSize !== undefined
  ) {
    return undefined
  }

  if (
    orientation !== 'portrait' &&
    orientation !== 'landscape' &&
    orientation !== undefined
  ) {
    return undefined
  }

  return normalizePrintPageSetup({
    pageSize,
    orientation,
    pageMarginMm:
      typeof setup.pageMarginMm === 'number' ? setup.pageMarginMm : undefined,
    staffSizePercent:
      typeof setup.staffSizePercent === 'number'
        ? setup.staffSizePercent
        : undefined,
    systemSpacingPercent:
      typeof setup.systemSpacingPercent === 'number'
        ? setup.systemSpacingPercent
        : undefined
  })
}

function resolveStoredMusicXmlViewState(
  score: Score,
  state?: StoredMusicXmlViewState
): StoredMusicXmlViewState {
  if (
    state?.mode === 'part' &&
    state.partId &&
    score.parts.some((part) => part.id === state.partId)
  ) {
    return state
  }

  return { mode: 'score' }
}

// Ephemeral UI identity only;never serialized into a score/project or report DTO.
let musicXmlReportSequence = 0

function createMusicXmlReportPanelState(
  kind: MusicXmlReportPanelState['kind'],
  fileName: string,
  report: MusicXmlImportReport | MusicXmlExportReport,
  projectionWarnings: readonly StudioPartRepeatProjectionWarning[] = []
): MusicXmlReportPanelState | undefined {
  if (report.warnings.length + projectionWarnings.length === 0) {
    return undefined
  }

  return {
    snapshotId: ++musicXmlReportSequence,
    fileName,
    kind,
    warnings: [...report.warnings, ...projectionWarnings]
  }
}

const memberSpecificChordTieImportMessage = '구성음별 타이는 지원하지 않아 원래 연결 범위를 보존하지 못했습니다. 원본 MusicXML을 함께 보관하고 가져온 화음의 타이와 재생을 확인해 주세요.'

function MusicXmlReportPanel({
  report,
  theme
}: {
  report?: MusicXmlReportPanelState
  theme: 'light' | 'dark'
}) {
  // Open state belongs to this report snapshot, including same-file reimports.
  const [expandedReport, setExpandedReport] = useState<MusicXmlReportPanelState>()
  if (!report) {
    return null
  }

  const title =
    report.kind === 'import'
      ? `MusicXML 가져오기 경고 ${report.warnings.length}개`
      : `MusicXML 내보내기 경고 ${report.warnings.length}개`

  const hasMemberLoss = report.warnings.some(warning => warning.message.startsWith('Member-specific chord ties'))
  const hasTechnicalLoss = report.warnings.some(warning => warning.message === 'technical playing instructions are not imported yet.')
  // Summarize only known losses. Unclassified warnings retain their full visible
  // instructions rather than disappearing behind a generic disclosure.
  const repeatedKnownLoss = report.kind === 'import' && report.warnings.length > 1 &&
    report.warnings.every(warning => warning.message.startsWith('Member-specific chord ties') ||
      warning.message === 'technical playing instructions are not imported yet.')
  const lossSummary = hasMemberLoss && hasTechnicalLoss
    ? '구성음별 타이와 연주 기법 표기를 보존하지 못했습니다. 원본 MusicXML을 보관하고 타이·재생·연주 기법을 확인해 주세요.'
    : hasTechnicalLoss
      ? '연주 기법 표기는 가져오지 못했습니다. 원본 MusicXML을 보관하고 연주 기법을 확인해 주세요.'
      : '구성음별 타이는 보존되지 않았습니다. 원본 MusicXML을 보관하고 타이·재생을 확인해 주세요.'
  return <StudioWarningReport key={report.snapshotId} theme={theme} label="MusicXML 경고 상세" title={title} fileName={report.fileName}
    details={repeatedKnownLoss ? {
      summary: lossSummary,
      title: `마디별 경고 상세 ${report.warnings.length}개`,
      open: expandedReport === report,
      onOpenChange: open => setExpandedReport(open ? report : undefined)
    } : undefined}>
    {report.warnings.map((warning, index) => <li key={`${warning.path}-${index}`}>
      <Text>{describeMusicXmlWarning(warning)}</Text>
      <WarningTechnicalDetails warning={warning} meta={formatMusicXmlWarningMeta(warning)} />
    </li>)}
  </StudioWarningReport>
}

function MidiFailurePanel({ failure, theme }: {
  failure?: { message: string }
  theme: 'light' | 'dark'
}) {
  if (!failure) return null
  return <section className="studio-warning-report midi-failure ddirori" data-theme={theme} data-density="compact" aria-label="MIDI 오류 상세">
    <Banner kind="error">
      <Text>{midiExportFailureMessage}</Text>
      <WarningTechnicalDetails warning={failure} meta="MIDI 내보내기 오류" />
    </Banner>
  </section>
}

function MidiReportPanel({ report, theme }: {
  report?: MidiReportPanelState
  theme: 'light' | 'dark'
}) {
  if (!report) return null
  return <StudioWarningReport theme={theme} label="MIDI 경고 상세" title={`MIDI 내보내기 경고 ${report.warnings.length}개`} fileName={report.fileName}>
    {report.warnings.map((warning, index) => <li key={`${warning.path}-${index}`}>
      <Text>{describeMidiWarning(warning)}</Text>
      <WarningTechnicalDetails warning={warning} meta={warning.code} />
    </li>)}
  </StudioWarningReport>
}

function describeChordTieTarget(score: Score, warning: { address: VoiceAddress; measureNumber: number }): string {
  const partIndex = score.parts.findIndex(part => part.id === warning.address.partId)
  const part = score.parts[partIndex]
  const staffIndex = part.staves.findIndex(staff => staff.id === warning.address.staffId)
  return `${createPartOptionLabels(score.parts)[partIndex]} · 보표 ${staffIndex + 1} · ${warning.measureNumber}마디`
}

function describeUnsupportedChordTie(warning: { measureNumber?: number }, context: 'current' | 'export' = 'export'): string {
  const position = warning.measureNumber === undefined ? '' : `${warning.measureNumber}마디 · `
  return context === 'current'
    ? `${position}서로 다른 화음을 잇는 타이는 지원하지 않습니다. 재생과 MusicXML 결과가 다를 수 있습니다. 원본 프로젝트는 보존됩니다. 음표를 선택하고 T로 타이를 해제해 주세요.`
    : `${position}서로 다른 화음을 잇는 타이는 지원하지 않습니다. 내보낸 파일에는 기존 타이가 포함되어 재생과 MusicXML 결과가 다를 수 있습니다. 원본 프로젝트를 보관하고, 수정한 내용은 다시 내보내 주세요.`
}

function describeMidiWarning(warning: MidiExportWarning): string {
  if (warning.code === 'unsupported-chord-tie') return describeUnsupportedChordTie(warning)
  if (warning.code === 'shared-midi-channel') {
    const part = /^part\[(\d+)\]/.exec(warning.path)?.[1]
    return `${part ? `${part}번째 파트가` : '일부 파트가'} MIDI 채널을 다른 파트와 공유합니다. 음색·페달·겹치는 음이 서로 영향을 줄 수 있습니다. 파트보를 따로 내보내거나 결과를 비교해 주세요.`
  }
  if (warning.message.startsWith('Percussion notation ')) {
    return '타악기 표기가 있는 마디의 음은 MIDI에 포함되지 않았습니다. 원본은 프로젝트 파일로 보관해 주세요.'
  }
  if (warning.message.startsWith('Tab notation ')) {
    return 'TAB 표기가 있는 마디의 음은 MIDI에 포함되지 않았습니다. 원본은 프로젝트 파일로 보관해 주세요.'
  }
  return 'MIDI 지원 범위를 확인해 주세요. 자세한 내용은 기술 정보에서 볼 수 있습니다.'
}

function describeMusicXmlWarning(warning: MusicXmlReportWarning): string {
  if (warning.code === 'unsupported-chord-tie') return describeUnsupportedChordTie(warning)
  if (warning.code === 'studio-part-repeat-projection') return warning.summary
  const passSpecificTieMessage = warning.message.startsWith('Pass-specific tie ')
    ? '반복 차수별 타이 조건은 보존하지 못했습니다. 원본 MusicXML을 보관하고 반복 재생을 비교해 주세요.'
    : undefined
  const playbackMessage=([
    ['Explicit MIDI instrument program','MusicXML의 MIDI 악기 프로그램은 별도로 보존하지 않습니다. MIDI 사본의 악기는 파트 이름으로 정합니다. 원본을 보관하고 음색을 비교해 주세요.'],
    ['Explicit note dynamics','음표별로 지정된 재생 시작 세기는 가져오지 못했습니다. 원본 MusicXML을 보관하고 재생 세기를 비교해 주세요.'],
    ['Explicit note end-dynamics','음표별로 지정된 재생 끝 세기는 가져오지 못했습니다. 원본 MusicXML을 보관하고 재생 세기를 비교해 주세요.'],
    ['Explicit sound dynamics','별도로 지정된 재생 세기는 가져오지 못했습니다. 표시된 셈여림과 다를 수 있으므로 원본 MusicXML을 보관하고 재생 세기를 비교해 주세요.'],
    ['Direct measure sound tempo','마디에 직접 기록된 빠르기 정보는 별도로 보존하지 못했습니다. 원본 MusicXML을 보관하고 재생 빠르기를 확인해 주세요.'],
    ['Independent sound tempo','표시 빠르기와 별도로 지정된 재생 빠르기는 지원하지 않습니다. 원본 MusicXML을 함께 보관하고 재생 전에 비교해 주세요.'],
    ['Independent tempo offset','빠르기 기호와 다른 재생 위치는 지원하지 않습니다. 원본 MusicXML과 재생 위치를 비교해 주세요.']
  ] as const).find(([prefix])=>warning.message.startsWith(prefix))?.[1]
  const knownMessages: Record<string, string> = {
    'let-ring tie notation is not imported yet.':
      '울림 유지 타이 표기를 가져오지 못했습니다. 원본 MusicXML을 보관하고 표기를 비교해 주세요.',
    'Member-specific chord ties are not represented by the event-level tie model. Keep the original MusicXML and compare imported ties and playback.':
      memberSpecificChordTieImportMessage,
    'Staff size and system spacing percentages are preserved in projects, not MusicXML page defaults.':
      '보표 크기와 악보단 간격 비율은 MusicXML에 포함되지 않습니다. 프로젝트 파일을 함께 보관해 주세요.',
    'Physical page settings require a positive millimeters/tenths scale; no scale was inferred.':
      '용지 설정의 실제 단위를 확인할 수 없어 가져오지 못했습니다. 원본의 용지·여백 설정을 확인해 주세요.',
    'Custom or incomplete paper dimensions are not represented by A4/Letter settings.':
      '원본 용지는 지원하는 A4·Letter 규격과 달라 가져오지 못했습니다. 출력 전에 용지 크기를 확인해 주세요.',
    'Asymmetric, incomplete or unsupported page margins were not averaged or clamped.':
      '서로 다르거나 지원 범위를 벗어난 여백은 가져오지 못했습니다. 출력 전에 원본과 여백을 비교해 주세요.',
    'Page-specific page layout is not represented by the score-wide page settings.':
      '페이지마다 다른 용지·여백 설정은 가져오지 못했습니다. 전체 악보의 설정만 적용되므로 출력 결과를 확인해 주세요.',
    'Manual span placement and shape are preserved in Chromatics projects, not MusicXML export.':
      '슬러·헤어핀의 수동 배치는 프로젝트 파일에 보존됩니다. MusicXML에는 수동 배치가 포함되지 않습니다.',
    'PDF page setup is not exported to MusicXML yet; MusicXML consumers may use their own page settings.':
      'PDF 용지·여백 설정은 MusicXML에 포함되지 않습니다. 받는 앱에서 페이지 설정을 확인해 주세요.',
    'system break has no aligned score measure and was not exported to MusicXML.':
      '마디 위치를 찾을 수 없어 시스템 나누기를 내보내지 못했습니다. 악보의 마디 배치를 확인해 주세요.',
    'page break has no aligned score measure and was not exported to MusicXML.':
      '마디 위치를 찾을 수 없어 페이지 나누기를 내보내지 못했습니다. 악보의 마디 배치를 확인해 주세요.',
    'technical playing instructions are not imported yet.':
      '연주 기법 표기를 가져오지 못했습니다. 원본 악보와 비교해 주세요.'
  }
  const message = knownMessages[warning.message] ?? playbackMessage ?? passSpecificTieMessage ?? (
    warning.code === 'unsupported-layout'
      ? '일부 배치를 MusicXML에 보존하지 못했습니다. 프로젝트 파일을 함께 보관해 주세요.'
      : warning.code === 'unsupported-direction'
        ? '일부 지시 기호를 가져오지 못했습니다. 원본 악보와 비교해 주세요.'
        : warning.code === 'unsupported-notation'
          ? '일부 표기를 가져오지 못했습니다. 원본 악보와 비교해 주세요.'
          : 'MusicXML 지원 범위를 확인해 주세요. 자세한 내용은 기술 정보에서 볼 수 있습니다.'
  )
  const part = 'partNumber' in warning && warning.partNumber !== undefined
    ? String(warning.partNumber) : /^part\[(\d+)\]/.exec(warning.path)?.[1]
  const location = [
    part ? `${part}번째 파트` : undefined,
    'measureNumber' in warning && warning.measureNumber !== undefined ? `${warning.measureNumber}마디` : undefined
  ].filter(Boolean)
  return location.length ? `${location.join(' · ')} · ${message}` : message
}

function formatMusicXmlWarningMeta(warning: MusicXmlReportWarning): string {
  const details: string[] = [warning.code]

  if ('measureNumber' in warning && warning.measureNumber !== undefined) {
    details.push(`M${warning.measureNumber}`)
  }

  if ('eventIndex' in warning && warning.eventIndex !== undefined) {
    details.push(`event ${warning.eventIndex}`)
  }

  if ('measureId' in warning && warning.measureId) {
    details.push(warning.measureId)
  }

  return details.join(' · ')
}

function describeMusicXmlImportResult(
  fileName: string,
  report: MusicXmlImportReport,
  reopened = false
): string {
  const baseMessage = reopened
    ? `${fileName}을 다시 열었습니다.`
    : `${fileName}을 가져왔습니다.`

  if (report.warnings.length === 0) {
    return baseMessage
  }

  if (report.warnings.some(warning => warning.message.startsWith('Member-specific chord ties'))) {
    return `${baseMessage} MusicXML 경고 ${report.warnings.length}개: 경고 상세에서 보존되지 않은 타이를 확인해 주세요.`
  }

  if (report.warnings.some(warning => warning.message.startsWith('Pass-specific tie '))) {
    return `${baseMessage} MusicXML 경고 ${report.warnings.length}개: 경고 상세에서 반복 차수별 타이 조건을 확인해 주세요.`
  }

  if (report.warnings.some(warning => warning.message === 'let-ring tie notation is not imported yet.')) {
    return `${baseMessage} MusicXML 경고 ${report.warnings.length}개: 경고 상세에서 보존되지 않은 울림 유지 표기를 확인해 주세요.`
  }

  if (report.warnings.every(warning =>
    warning.message.startsWith('Explicit sound dynamics (') ||
    warning.message.startsWith('Explicit note dynamics (') ||
    warning.message.startsWith('Explicit note end-dynamics ('))) {
    return `${baseMessage} MusicXML 경고 ${report.warnings.length}개: 경고 상세에서 보존되지 않은 재생 세기를 확인해 주세요.`
  }

  if (report.warnings.every(warning => warning.message === 'technical playing instructions are not imported yet.')) {
    return `${baseMessage} MusicXML 경고 ${report.warnings.length}개: 경고 상세에서 보존되지 않은 연주 기법 표기를 확인해 주세요.`
  }

  const samples = report.warnings
    .slice(0, 2)
    .map(describeMusicXmlWarning)
  const remainingCount = report.warnings.length - samples.length
  const remainingMessage =
    remainingCount > 0 ? ` 외 ${remainingCount}개` : ''

  return `${baseMessage} MusicXML 경고 ${report.warnings.length}개: ${samples.join('; ')}${remainingMessage}`
}

function describeMusicXmlExportResult(
  fileName: string,
  report: MusicXmlExportReport
): string {
  const baseMessage = `${fileName}을 MusicXML로 내보냈습니다.`

  if (report.warnings.length === 0) {
    return baseMessage
  }

  const samples = report.warnings
    .slice(0, 2)
    .map(describeMusicXmlWarning)
  const remainingCount = report.warnings.length - samples.length
  const remainingMessage =
    remainingCount > 0 ? ` 외 ${remainingCount}개` : ''

  return `${baseMessage} MusicXML 내보내기 경고 ${report.warnings.length}개: ${samples.join('; ')}${remainingMessage}`
}

function describePendingTupletCopy(initial: boolean, current: boolean, operation: '출력' | '내보내기'): string {
  if (initial) return ' 미완성 셋잇단음표 입력은 포함되지 않았습니다.'
  if (current) return ` ${operation} 시작 이후의 미완성 셋잇단음표 입력은 포함되지 않았습니다.`
  return ''
}

function sameCopySourceScore(current: Score, source: Score): boolean {
  // Undo applies inverse commands and can restore equal JSON score content
  // without restoring object identity. Do not claim omitted edits in that case.
  return current === source || JSON.stringify(current) === JSON.stringify(source)
}

function describeMidiExportResult(
  fileName: string,
  warnings: MidiExportWarning[]
): string {
  const baseMessage = `${fileName}로 MIDI를 내보냈습니다.`

  if (warnings.length === 0) {
    return baseMessage
  }

  if (warnings.every(warning => warning.code === 'shared-midi-channel')) {
    return `${baseMessage} MIDI 경고 ${warnings.length}개: 경고 상세에서 파트 간 채널 공유를 확인해 주세요.`
  }

  const samples = warnings
    .slice(0, 2)
    .map(describeMidiWarning)
  const remainingCount = warnings.length - samples.length
  const remainingMessage =
    remainingCount > 0 ? ` 외 ${remainingCount}개` : ''

  return `${baseMessage} MIDI 경고 ${warnings.length}개: ${samples.join('; ')}${remainingMessage}`
}

function resolvePartMixerSettings(
  settings: PlaybackPartMixer | undefined
): PlaybackPartMixer {
  return {
    muted: settings?.muted ?? false,
    solo: settings?.solo ?? false,
    volume: Math.min(1.5, Math.max(0, settings?.volume ?? 1))
  }
}

function readStoredPartMixer(): PlaybackPartMixerMap {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const storedMixer = window.localStorage.getItem(partMixerStorageKey)

    if (!storedMixer) {
      return {}
    }

    return parseStoredPartMixer(JSON.parse(storedMixer))
  } catch {
    return {}
  }
}

function writeStoredPartMixer(mixer: PlaybackPartMixerMap): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(partMixerStorageKey, JSON.stringify(mixer))
  } catch {
    // Mixer persistence is a convenience; playback should still work.
  }
}

function parseStoredPartMixer(value: unknown): PlaybackPartMixerMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([partId, settings]) => [
        partId,
        parseStoredPartMixerSettings(settings)
      ])
      .filter((entry): entry is [string, PlaybackPartMixer] => Boolean(entry[1]))
  )
}

function parseStoredPartMixerSettings(
  value: unknown
): PlaybackPartMixer | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }

  const settings = value as Record<string, unknown>
  const volume = Number(settings.volume)

  return resolvePartMixerSettings({
    muted: settings.muted === true,
    solo: settings.solo === true,
    volume: Number.isFinite(volume) ? volume : 1
  })
}

function parsePdfTargetPages(value: PdfTargetPagesValue): number | undefined {
  const pageCount = Number(value)

  return Number.isInteger(pageCount) && pageCount >= 1 ? pageCount : undefined
}

function resolveActiveScopeLabel(
  score: Score,
  address: VoiceAddress | undefined
): string {
  if (!address) {
    return '선택 없음'
  }

  const partIndex = score.parts.findIndex((part) => part.id === address.partId)
  const part = partIndex >= 0 ? score.parts[partIndex] : undefined
  const staff = part?.staves.find((candidate) => candidate.id === address.staffId)
  const staffIndex =
    part?.staves.findIndex((candidate) => candidate.id === address.staffId) ?? -1
  const measure = staff?.measures.find(
    (candidate) => candidate.id === address.measureId
  )
  const voiceIndex =
    measure?.voices.findIndex((voice) => voice.id === address.voiceId) ?? -1
  const partLabel = part ? createPartOptionLabels(score.parts)[partIndex]! : `Part ${partIndex + 1}`
  const staffLabel = staffIndex >= 0 ? `보표 ${staffIndex + 1}` : '보표 ?'
  const voiceNumber = /^voice-\d+$/.test(address.voiceId)
    ? parseVoiceNumber(address.voiceId)
    : voiceIndex + 1
  const voiceLabel = voiceIndex >= 0 ? `성부 ${voiceNumber}` : '성부 ?'

  return `${partLabel} · ${staffLabel} · ${voiceLabel}`
}

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    const scheduleFrame =
      typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame.bind(window)
        : (callback: FrameRequestCallback) =>
            window.setTimeout(() => callback(performance.now()), 0)

    scheduleFrame(() => scheduleFrame(() => resolve()))
  })
}

function scoreHasNotes(score: Score): boolean {
  return score.parts.some(part => part.staves.some(staff =>
    staff.measures.some(measure => measure.voices.some(voice =>
      voice.events.some(event => event.type === 'note')))))
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function findNoteInputCursor(canvas: HTMLElement | null, position: {address: NoteInputState['target']; tick: number} | undefined) {
  if (!canvas || !position) return undefined
  const {address, tick} = position
  return [...canvas.querySelectorAll<SVGElement>('.notation-note-input-cursor')].find(node =>
    node.dataset.partId === address.partId && node.dataset.staffId === address.staffId &&
    node.dataset.measureId === address.measureId && node.dataset.voiceId === address.voiceId &&
    Number(node.dataset.tick) === tick)
}

function findTupletInputPreview(canvas: HTMLElement | null, state: NoteInputState | undefined) {
  if (!canvas || !state?.tupletInput) return undefined
  const {target, tupletInput} = state
  const previews = [...canvas.querySelectorAll<SVGElement>('.notation-event.is-preview')].filter(node =>
    node.dataset.partId === target.partId && node.dataset.staffId === target.staffId &&
    node.dataset.measureId === target.measureId && node.dataset.voiceId === target.voiceId)
  return previews[tupletInput.members.length] ?? previews.at(-1)
}

// A synchronous engraving paint replaces a focused SVG element. Only the
// detached origin's complete logical identity may resume its pending menu focus.
function isRedrawnScoreOrigin(origin: Element | null, active: Element | null): boolean {
  if (!origin || origin.isConnected || !active?.closest('.score-canvas')) return false
  return isSameNotationFocus(origin, active)
}

function describeTextPropertyObjects(count: number): string | undefined {
  return count > 1 ? `${count}개 중 선택한 표기만 수정합니다. 다른 표기는 유지됩니다.` : undefined
}

function commandHasEffects(command: ScoreCommand): boolean {
  return command.type !== 'score.batch' ||
    command.commands.some(commandHasEffects)
}

const rootElement = document.getElementById('root')

if (rootElement) {
  createRoot(rootElement).render(<App />)
}
