import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent
} from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowDown,
  ArrowUp,
  ChevronsDown,
  ChevronsUp,
  CircleMinus,
  CirclePlus,
  Clock3,
  Eraser,
  FileDown,
  FilePlus2,
  FileUp,
  Link2,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Save,
  Square,
  Unlink2
} from 'lucide-react'

import {
  applyScoreCommand,
  buildTieCommand,
  durationToTicks,
  MAX_AUGMENTATION_DOTS,
  measureDurationTicks,
  sortVoiceEvents,
  voiceEventDurationTicks,
  type Duration,
  type DurationValue,
  type Pitch,
  type PitchStep,
  type Score,
  type ScoreCommand
} from '../../score-core'
import { parseMusicXml, serializeMusicXml } from '../../musicxml'
import { createSingleVoiceMvpScore } from '../../testing/single-voice-mvp-fixture'
import './styles.css'
import {
  buildDeleteCommand,
  buildDotCommand,
  buildDurationCommand,
  buildRestEntryCommand,
  buildTupletGroupCommand,
  createRangeSelection,
  createDuration,
  durationLabels,
  getAdjacentEventId,
  getSelectedEventIds,
  getSelectionFocusEventId,
  locateEvent,
  locateMeasure,
  type EditorMode,
  type EditorSelection
} from './editor/editor-state'
import {
  buildInsertMeasureAfter,
  buildRemoveMeasure,
  resolveActiveMeasureId
} from './editor/measure-management'
import { buildKeySignatureCommand } from './editor/key-signature'
import {
  createNewScore,
  keySignaturePresets,
  partPresets,
  resolveKeySignaturePreset,
  resolveKeySignaturePresetId,
  resolvePartPreset,
  resolveTimeSignaturePreset,
  resolveTimeSignaturePresetId,
  timeSignaturePresets
} from './editor/new-score'
import { buildTimeSignatureCommand } from './editor/time-signature'
import {
  buildAccidentalCommand,
  buildPitchMovementCommand,
  buildPitchStepCommand,
  type PitchMovement
} from './editor/pitch-editing'
import {
  isTextEditingTarget,
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
import { useScorePlayback } from './playback/useScorePlayback'

const durations: DurationValue[] = [
  'whole',
  'half',
  'quarter',
  'eighth',
  '16th'
]
const durationKeys: Partial<Record<string, DurationValue>> = {
  '1': 'whole',
  '2': 'half',
  '3': 'quarter',
  '4': 'eighth',
  '5': '16th'
}
const durationShortcuts: Partial<Record<DurationValue, string>> = {
  whole: '1',
  half: '2',
  quarter: '3',
  eighth: '4',
  '16th': '5'
}
const tripletPreset = {
  actualNotes: 3,
  durationValue: 'eighth',
  label: '셋잇단음표',
  normalNotes: 2,
  shortcut: 'T'
} satisfies {
  actualNotes: number
  durationValue: DurationValue
  label: string
  normalNotes: number
  shortcut: string
}

const modeStatus: Record<EditorMode, string> = {
  select: '선택 모드 · A-G로 선택한 음표나 쉼표를 바꿉니다',
  note: '음표 입력 · A-G로 음표를 입력합니다',
  rest: '쉼표 입력 · R로 쉼표를 입력합니다'
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

interface EditorHistoryEntry {
  command: ScoreCommand
  inputState?: NoteInputState
  selection: EditorSelection
}

type MetadataField = 'title' | 'composer'

interface MetadataEdit {
  field: MetadataField
  value: string
}

interface NewScoreDraft {
  title: string
  composer: string
  partPresetId: string
  keySignatureId: string
  timeSignatureId: string
  measureCount: number
  tempo: number
}

const metadataMaxLength: Record<MetadataField, number> = {
  title: 120,
  composer: 80
}

const App = () => {
  const [score, setScore] = useState(createInitialScore)
  const [selection, setSelection] = useState<EditorSelection>(() =>
    createInitialSelection(score)
  )
  const [mode, setMode] = useState<EditorMode>('select')
  const [noteInputState, setNoteInputState] = useState<NoteInputState>()
  const [durationValue, setDurationValue] = useState<DurationValue>('quarter')
  const [undoStack, setUndoStack] = useState<EditorHistoryEntry[]>([])
  const [redoStack, setRedoStack] = useState<EditorHistoryEntry[]>([])
  const [metadataEdit, setMetadataEdit] = useState<MetadataEdit>()
  const [newScoreDraft, setNewScoreDraft] = useState<NewScoreDraft>()
  const [fileStatus, setFileStatus] = useState<{
    tone: 'neutral' | 'error'
    message: string
  }>()
  const playback = useScorePlayback(score)

  const eventLocation = useMemo(
    () => {
      const eventId = getSelectionFocusEventId(selection)

      return eventId ? locateEvent(score, eventId) : undefined
    },
    [score, selection]
  )
  const measureLocation = useMemo(
    () =>
      selection.type === 'measure'
        ? locateMeasure(score, selection.measureId)
        : undefined,
    [score, selection]
  )
  const activeMeasureId = useMemo(
    () => resolveActiveMeasureId(score, selection, noteInputState),
    [noteInputState, score, selection]
  )
  const measureCount = score.parts[0]?.staves[0]?.measures.length ?? 0
  const activeDots =
    noteInputState?.duration.dots ??
    eventLocation?.event.duration.dots ??
    0
  const activeDurationValue =
    noteInputState?.duration.value ??
    eventLocation?.event.duration.value ??
    durationValue
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
    noteInputState?.tupletInput?.members.length ?? 0
  const tupletProgress = noteInputState?.tupletInput
    ? `${tupletMemberCount}/${noteInputState.tupletInput.actualNotes}`
    : undefined
  const tieSelected =
    eventLocation?.event.type === 'note' &&
    Boolean(eventLocation.event.ties?.start || eventLocation.event.ties?.stop)
  const tieCommand = useMemo(
    () =>
      eventLocation?.event.type === 'note'
        ? buildTieCommand(score, eventLocation.event.id, !tieSelected)
        : undefined,
    [eventLocation, score, tieSelected]
  )

  const executeCommand = useCallback(
    (command: ScoreCommand | undefined) => {
      if (!command) {
        return false
      }

      const result = applyScoreCommand(score, command)
      setScore(result.score)
      setUndoStack((entries) => [
        ...entries,
        {
          command: result.undo,
          inputState: noteInputState,
          selection
        }
      ])
      setRedoStack([])
      return true
    },
    [noteInputState, score, selection]
  )

  const undo = useCallback(() => {
    const entry = undoStack.at(-1)

    if (!entry) {
      return
    }

    const result = applyScoreCommand(score, entry.command)
    setScore(result.score)
    setUndoStack((entries) => entries.slice(0, -1))
    setRedoStack((entries) => [
      ...entries,
      {
        command: result.undo,
        inputState: noteInputState,
        selection
      }
    ])
    setNoteInputState(entry.inputState)
    setSelection(entry.selection)
  }, [noteInputState, score, selection, undoStack])

  const redo = useCallback(() => {
    const entry = redoStack.at(-1)

    if (!entry) {
      return
    }

    const result = applyScoreCommand(score, entry.command)
    setScore(result.score)
    setRedoStack((entries) => entries.slice(0, -1))
    setUndoStack((entries) => [
      ...entries,
      {
        command: result.undo,
        inputState: noteInputState,
        selection
      }
    ])
    setNoteInputState(entry.inputState)
    setSelection(entry.selection)
  }, [noteInputState, redoStack, score, selection])

  const beginMetadataEdit = useCallback(
    (field: MetadataField) => {
      setMode('select')
      setNoteInputState(undefined)
      setMetadataEdit({
        field,
        value: field === 'title' ? score.title : score.composer ?? ''
      })
    },
    [score.composer, score.title]
  )

  const cancelMetadataEdit = useCallback(() => {
    setMetadataEdit(undefined)
  }, [])

  const commitMetadataEdit = useCallback(
    (field: MetadataField, value: string) => {
      const trimmed = value.trim()
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
    [executeCommand, score.composer, score.title]
  )

  const handleMetadataKeyDown = useCallback(
    (
      event: ReactKeyboardEvent<HTMLInputElement>,
      field: MetadataField,
      value: string
    ) => {
      if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
        event.preventDefault()
        commitMetadataEdit(field, value)
      } else if (event.key === 'Escape') {
        event.preventDefault()
        cancelMetadataEdit()
      }
    },
    [cancelMetadataEdit, commitMetadataEdit]
  )

  const openNewScoreWizard = useCallback(() => {
    if (
      undoStack.length > 0 &&
      !window.confirm(
        '현재 악보의 변경사항이 사라집니다. 새 악보를 만들까요?'
      )
    ) {
      return
    }

    setMetadataEdit(undefined)
    setNewScoreDraft(createDefaultNewScoreDraft(playback.tempo))
  }, [playback.tempo, undoStack.length])

  const cancelNewScoreWizard = useCallback(() => {
    setNewScoreDraft(undefined)
  }, [])

  const submitNewScoreWizard = useCallback(() => {
    if (!newScoreDraft) {
      return
    }

    const part = resolvePartPreset(newScoreDraft.partPresetId)
    const keySignature = resolveKeySignaturePreset(
      newScoreDraft.keySignatureId
    ).value
    const timeSignature = resolveTimeSignaturePreset(
      newScoreDraft.timeSignatureId
    ).value
    const nextScore = createNewScore({
      title: newScoreDraft.title,
      composer: newScoreDraft.composer,
      partName: part.label,
      partAbbreviation: part.abbreviation,
      keySignature,
      timeSignature,
      measureCount: newScoreDraft.measureCount
    })

    playback.stop()
    playback.setTempo(newScoreDraft.tempo)
    setScore(nextScore)
    setUndoStack([])
    setRedoStack([])
    setMode('select')
    setNoteInputState(undefined)
    setMetadataEdit(undefined)
    setNewScoreDraft(undefined)
    setDurationValue('quarter')
    setSelection(createInitialSelection(nextScore))
    setFileStatus({
      tone: 'neutral',
      message: '새 악보를 만들었습니다.'
    })
  }, [newScoreDraft, playback])

  const changeDuration = useCallback(
    (value: DurationValue) => {
      if (noteInputState?.tupletInput) {
        return
      }

      if (noteInputState) {
        setDurationValue(value)
        setNoteInputState({
          ...noteInputState,
          duration: createDuration(value, noteInputState.duration.dots)
        })
      } else if (selection.type === 'event') {
        const dots = eventLocation?.event.duration.dots ?? 0
        const duration = createDuration(value, dots)
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

      executeCommand(buildAccidentalCommand(score, selection, alter))
    },
    [executeCommand, noteInputState, score, selection]
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
      const command = buildTimeSignatureCommand(score, selection, timeSignature)

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
    [executeCommand, score, selection]
  )

  const movePitch = useCallback(
    (movement: PitchMovement, direction: -1 | 1) => {
      executeCommand(
        buildPitchMovementCommand(score, selection, movement, direction)
      )
    },
    [executeCommand, score, selection]
  )

  const changePitchStep = useCallback(
    (step: PitchStep) => {
      if (!executeCommand(buildPitchStepCommand(score, selection, step))) {
        setFileStatus({
          tone: 'error',
          message: '음표로 바꿀 수 있는 음표나 쉼표를 선택해 주세요.'
        })
      }
    },
    [executeCommand, score, selection]
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
        eventLocation?.event.type === 'note'
          ? '타이는 같은 음높이의 바로 다음 음표와 연결할 수 있습니다.'
          : '타이를 추가하거나 해제할 음표를 선택해 주세요.'
    })
  }, [eventLocation, executeCommand, tieCommand, tieSelected])

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
      const command = buildTupletGroupCommand(
        score,
        selection,
        () => createInputId('event'),
        tripletPreset.actualNotes,
        tripletPreset.normalNotes
      )

      if (executeCommand(command)) {
        setDurationValue(tripletPreset.durationValue)
        setFileStatus({
          tone: 'neutral',
          message: removesExistingTuplet
            ? '선택한 셋잇단음표를 해제했습니다.'
            : '선택한 구간에 셋잇단음표를 적용했습니다.'
        })
      } else {
        setFileStatus({
          tone: 'error',
          message:
            '셋잇단음표를 만들려면 선택한 음표와 마디 안의 충분한 빈 박자가 필요합니다.'
        })
      }
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
        return
      }

      if (input.pending) {
        if (commandHasEffects(input.command) && !executeCommand(input.command)) {
          return
        }

        setNoteInputState(input.nextState)
        setFileStatus({
          tone: 'neutral',
          message: describeTupletProgress(input.nextState)
        })
        return
      }

      if (executeCommand(input.command)) {
        setNoteInputState(input.nextState)

        setSelection({
          type: 'event',
          eventId: input.eventId
        })
        if (inputState.tupletInput) {
          setFileStatus({
            tone: 'neutral',
            message: '셋잇단음표 입력을 완료했습니다.'
          })
        }
      }
    },
    [durationValue, executeCommand, noteInputState, score, selection]
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

      setNoteInputState(input.nextState)
      setFileStatus({
        tone: 'neutral',
        message: describeTupletProgress(input.nextState)
      })
      return
    }

    if (executeCommand(input.command)) {
      setNoteInputState(input.nextState)

      setSelection({
        type: 'event',
        eventId: input.eventId
      })
      if (inputState.tupletInput) {
        setFileStatus({
            tone: 'neutral',
            message: '셋잇단음표 입력을 완료했습니다.'
          })
      }
    }
  }, [durationValue, executeCommand, noteInputState, score, selection])

  const convertSelectionToRest = useCallback(() => {
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
    if (selection.type !== 'event' || !eventLocation) {
      return
    }

    const command = buildDeleteCommand(score, selection)

    if (!command) {
      setFileStatus({
        tone: 'error',
        message:
          eventLocation.event.duration.tuplet
            ? '잇단음표 구성음은 아직 따로 지울 수 없습니다.'
            : '선택한 음표 또는 쉼표를 이 위치에서는 지울 수 없습니다.'
      })
      return
    }

    const result = applyScoreCommand(score, command)
    setScore(result.score)
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
    setSelection(resolveSelectionAfterClear(score, result.score, selection.eventId))
    setFileStatus({
      tone: 'neutral',
      message:
        eventLocation.event.type === 'rest'
          ? '쉼표를 지웠습니다.'
          : '음표를 지웠습니다.'
    })
  }, [eventLocation, noteInputState, score, selection])

  const addMeasure = useCallback(() => {
    if (!activeMeasureId) {
      return
    }

    const edit = buildInsertMeasureAfter(
      score,
      activeMeasureId,
      createInputId,
      noteInputState
    )

    if (edit && executeCommand(edit.command)) {
      setSelection(edit.selection)
      setNoteInputState(edit.inputState)
    }
  }, [activeMeasureId, executeCommand, noteInputState, score])

  const removeMeasure = useCallback(() => {
    if (!activeMeasureId) {
      setFileStatus({
        tone: 'error',
        message: '삭제할 마디를 선택해 주세요.'
      })
      return
    }

    if (measureCount <= 1) {
      setFileStatus({
        tone: 'error',
        message: '마지막 남은 마디는 삭제할 수 없습니다.'
      })
      return
    }

    const edit = buildRemoveMeasure(score, activeMeasureId, noteInputState)

    if (edit && executeCommand(edit.command)) {
      setSelection(edit.selection)
      setNoteInputState(edit.inputState)
      setMode('select')
      setFileStatus({
        tone: 'neutral',
        message: '마디를 삭제했습니다.'
      })
    }
  }, [activeMeasureId, executeCommand, measureCount, noteInputState, score])

  const deleteSelection = useCallback(() => {
    if (selection.type === 'measure') {
      removeMeasure()
      return
    }

    clearSelection()
  }, [clearSelection, removeMeasure, selection.type])

  const moveSelection = useCallback(
    (direction: -1 | 1, extendRange = false) => {
      if (noteInputState) {
        const eventId = getEventIdBeforeInputCursor(score, noteInputState)

        if (direction === -1 && eventId) {
          setMode('select')
          setNoteInputState(undefined)
          setSelection({
            type: 'event',
            eventId
          })
        }

        return
      }

      const currentEventId = getSelectionFocusEventId(selection)

      if (!currentEventId) {
        return
      }

      const eventId = getAdjacentEventId(score, currentEventId, direction)

      if (eventId) {
        setMode('select')
        setNoteInputState(undefined)

        if (extendRange) {
          const anchorEventId =
            selection.type === 'range' ? selection.anchorEventId : currentEventId
          const rangeSelection = createRangeSelection(
            score,
            anchorEventId,
            eventId
          )

          setSelection(
            rangeSelection ?? {
              type: 'event',
              eventId
            }
          )
        } else {
          setSelection({
            type: 'event',
            eventId
          })
        }
        return
      }

      if (direction === 1 && !extendRange) {
        const inputState = createInputStateAfterEvent(
          score,
          currentEventId,
          createDuration(durationValue),
          'note'
        )

        if (inputState) {
          setNoteInputState(inputState)
        }
      }
    },
    [durationValue, noteInputState, score, selection]
  )

  const selectEvent = useCallback(
    (eventId: string, extendRange = false) => {
      setMode('select')
      setNoteInputState(undefined)

      if (extendRange) {
        const anchorEventId =
          selection.type === 'range'
            ? selection.anchorEventId
            : getSelectionFocusEventId(selection)
        const rangeSelection = anchorEventId
          ? createRangeSelection(score, anchorEventId, eventId)
          : undefined

        setSelection(
          rangeSelection ?? {
            type: 'event',
            eventId
          }
        )
        return
      }

      setSelection({
        type: 'event',
        eventId
      })
    },
    [score, selection]
  )

  const selectEventRange = useCallback(
    (anchorEventId: string, focusEventId: string) => {
      const rangeSelection = createRangeSelection(
        score,
        anchorEventId,
        focusEventId
      )

      if (rangeSelection) {
        setMode('select')
        setNoteInputState(undefined)
        setSelection(rangeSelection)
      }
    },
    [score]
  )

  const importMusicXml = useCallback(async () => {
    try {
      const file = await window.inC.musicXml.open()

      if (!file) {
        return
      }

      const importedScore = parseMusicXml(file.contents)
      const firstMeasure = importedScore.parts[0]?.staves[0]?.measures[0]
      const firstEvent = firstMeasure?.voices[0]?.events[0]

      setScore(importedScore)
      setUndoStack([])
      setRedoStack([])
      setMode('select')
      setNoteInputState(undefined)
      setSelection(
        firstEvent
          ? {
              type: 'event',
              eventId: firstEvent.id
            }
          : {
              type: 'measure',
              measureId: firstMeasure?.id ?? 'measure-1'
            }
      )
      setFileStatus({
        tone: 'neutral',
        message: `${file.fileName}을 가져왔습니다.`
      })
    } catch (error) {
      setFileStatus({
        tone: 'error',
        message: getErrorMessage(error)
      })
    }
  }, [])

  const saveMusicXml = useCallback(async () => {
    try {
      const contents = serializeMusicXml(score)
      const result = await window.inC.musicXml.save({
        suggestedName: `${toFileName(score.title)}.musicxml`,
        contents
      })

      if (!result) {
        return
      }

      setFileStatus({
        tone: 'neutral',
        message: `${result.fileName}을 저장했습니다.`
      })
    } catch (error) {
      setFileStatus({
        tone: 'error',
        message: getErrorMessage(error)
      })
    }
  }, [score])

  const savePdf = useCallback(async () => {
    try {
      const result = await window.inC.pdf.save({
        suggestedName: `${toFileName(score.title)}.pdf`
      })

      if (!result) {
        return
      }

      setFileStatus({
        tone: 'neutral',
        message: `${result.fileName}로 PDF를 만들었습니다.`
      })
    } catch (error) {
      setFileStatus({
        tone: 'error',
        message: getErrorMessage(error)
      })
    }
  }, [score.title])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        isTextEditingTarget(event.target) ||
        event.isComposing ||
        event.key === 'Process'
      ) {
        return
      }

      const usesCommandKey = event.metaKey || event.ctrlKey

      if (
        usesCommandKey &&
        (event.key.toLowerCase() === 'y' ||
          (event.shiftKey && event.key.toLowerCase() === 'z'))
      ) {
        event.preventDefault()
        redo()
        return
      }

      if (usesCommandKey && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        undo()
        return
      }

      const duration = durationKeys[event.key]

      if (duration) {
        event.preventDefault()
        changeDuration(duration)
        return
      }

      const pitch = resolvePitchShortcut(event)
      const pitchAction = pitch
        ? noteInputState
          ? 'enter-note'
          : resolvePitchKeyboardAction(
            mode,
            eventLocation?.event.type === 'note' ||
              eventLocation?.event.type === 'rest'
            )
        : undefined

      if (pitch && pitchAction) {
        event.preventDefault()

        if (pitchAction === 'enter-note') {
          enterNote(pitch)
        } else {
          changePitchStep(pitch)
        }

        return
      }

      if (!event.altKey && !usesCommandKey && event.code === 'KeyT') {
        event.preventDefault()
        toggleTuplet()
        return
      }

      if (!event.altKey && !usesCommandKey && event.code === 'KeyL') {
        event.preventDefault()
        toggleTie()
        return
      }

      if (isRestShortcut(event) && !event.altKey && !usesCommandKey) {
        event.preventDefault()
        if (noteInputState) {
          enterRest()
        } else {
          convertSelectionToRest()
        }
        return
      }

      switch (event.key) {
        case '.':
          event.preventDefault()
          changeDots(1)
          break
        case ',':
          event.preventDefault()
          changeDots(-1)
          break
        case ' ':
          event.preventDefault()

          if (playback.status === 'playing') {
            playback.pause()
          } else {
            playback.play()
          }
          break
        case 't':
        case 'T':
          event.preventDefault()
          toggleTuplet()
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
          movePitch(
            event.shiftKey
              ? 'octave'
              : event.altKey
                ? 'chromatic'
                : 'diatonic',
            event.key === 'ArrowUp' ? 1 : -1
          )
          break
        case 'Escape':
          if (noteInputState?.tupletInput) {
            setFileStatus({
              tone: 'neutral',
              message: '셋잇단음표 입력을 취소했습니다.'
            })
          }
          setMode('select')
          setNoteInputState(undefined)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    changeDuration,
    changeDots,
    changePitchStep,
    clearSelection,
    convertSelectionToRest,
    deleteSelection,
    enterNote,
    enterRest,
    movePitch,
    moveSelection,
    mode,
    eventLocation,
    playback.pause,
    playback.play,
    playback.status,
    redo,
    toggleTie,
    toggleTuplet,
    undo
  ])

  const selectedEventId = getSelectionFocusEventId(selection)
  const selectedEventIds = useMemo(
    () => getSelectedEventIds(selection),
    [selection]
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
  const canEditPitch = eventLocation?.event.type === 'note'
  const accidentalEnabled = Boolean(noteInputState || canEditPitch)
  const clearSelectionLabel =
    eventLocation?.event.type === 'rest'
      ? '쉼표 지우기'
      : '음표 지우기'
  const canClearSelection =
    selection.type === 'event' &&
    Boolean(buildDeleteCommand(score, selection))

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="악보 탐색">
        <div>
          <p className="eyebrow">in-C</p>
          <h1>{score.title}</h1>
        </div>

        <nav className="panel-list" aria-label="패널 열기">
          <button className="panel-list__item panel-list__item--active" type="button">
            악보
          </button>
          <button className="panel-list__item" type="button">
            파트
          </button>
          <button className="panel-list__item" type="button">
            믹서
          </button>
        </nav>

        <section className="inspector" aria-label="선택 정보">
          <h2>선택 정보</h2>
          <dl>
            <div>
              <dt>종류</dt>
              <dd>
                {selection.type === 'range'
                  ? '범위'
                  : eventLocation
                  ? eventTypeLabels[eventLocation.event.type]
                  : measureLocation
                    ? '마디'
                    : '—'}
              </dd>
            </div>
            <div>
              <dt>ID</dt>
              <dd>
                {selection.type === 'range'
                  ? `${selection.eventIds.length}개 선택`
                  : eventLocation?.event.id ?? '—'}
              </dd>
            </div>
            <div>
              <dt>마디</dt>
              <dd>
                {eventLocation?.measureNumber ??
                  measureLocation?.measureNumber ??
                  '—'}
              </dd>
            </div>
            <div>
              <dt>성부</dt>
              <dd>
                {eventLocation?.address.voiceId ??
                  measureLocation?.address.voiceId ??
                  '—'}
              </dd>
            </div>
          </dl>
        </section>
      </aside>

      <section className="workspace" aria-label="악보 편집기">
        <header className="toolbar">
          <div className="toolbar__group">
            <div className="file-actions" aria-label="파일 작업">
              <button
                aria-label="새 악보 만들기"
                onClick={openNewScoreWizard}
                type="button"
              >
                <FilePlus2 aria-hidden="true" size={17} />
                <span>새 악보</span>
              </button>
              <button onClick={importMusicXml} type="button">
                <FileUp aria-hidden="true" size={17} />
                <span>가져오기</span>
              </button>
              <button onClick={saveMusicXml} type="button">
                <Save aria-hidden="true" size={17} />
                <span>저장하기</span>
              </button>
              <button onClick={savePdf} type="button">
                <FileDown aria-hidden="true" size={17} />
                <span>PDF 변환</span>
              </button>
            </div>

            <button
              aria-label="실행 취소"
              className="icon-button"
              disabled={undoStack.length === 0}
              onClick={undo}
              title="실행 취소"
              type="button"
            >
              <RotateCcw aria-hidden="true" size={18} />
            </button>

            <button
              aria-label="다시 실행"
              className="icon-button"
              disabled={redoStack.length === 0}
              onClick={redo}
              title="다시 실행"
              type="button"
            >
              <RotateCw aria-hidden="true" size={18} />
            </button>

            <button
              aria-label={clearSelectionLabel}
              className="icon-button"
              disabled={!canClearSelection}
              onClick={clearSelection}
              title={clearSelectionLabel}
              type="button"
            >
              <Eraser aria-hidden="true" size={18} />
            </button>

            <button
              aria-label="마디 추가"
              className="icon-button"
              disabled={!activeMeasureId}
              onClick={addMeasure}
              title="마디 추가"
              type="button"
            >
              <Plus aria-hidden="true" size={18} />
            </button>

            <button
              aria-label="마디 삭제"
              className="icon-button"
              disabled={!activeMeasureId}
              onClick={removeMeasure}
              title="마디 삭제"
              type="button"
            >
              <Minus aria-hidden="true" size={18} />
            </button>

            <div className="accidental-control" aria-label="임시표">
              {([
                [-1, '♭', '플랫'],
                [0, '♮', '제자리표'],
                [1, '♯', '샤프']
              ] as const).map(([alter, symbol, label]) => (
                <button
                  aria-label={label}
                  aria-pressed={noteInputState?.accidental === alter}
                  className={
                    noteInputState?.accidental === alter
                      ? 'is-active'
                      : undefined
                  }
                  disabled={!accidentalEnabled}
                  key={alter}
                  onClick={() => changeAccidental(alter)}
                  title={label}
                  type="button"
                >
                  {symbol}
                </button>
              ))}
            </div>

            <label className="key-signature-control">
              <span>조표</span>
              <select
                aria-label="조표"
                disabled={!activeMeasureId}
                onChange={(event) => changeKeySignature(event.target.value)}
                value={activeKeySignatureId}
              >
                {keySignaturePresets.map((keySignature) => (
                  <option key={keySignature.id} value={keySignature.id}>
                    {keySignature.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="time-signature-control">
              <span>박자표</span>
              <select
                aria-label="박자표"
                disabled={!activeMeasureId}
                onChange={(event) => changeTimeSignature(event.target.value)}
                value={activeTimeSignatureId}
              >
                {timeSignaturePresets.map((timeSignature) => (
                  <option key={timeSignature.id} value={timeSignature.id}>
                    {timeSignature.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              aria-label="음높이 한 칸 내리기"
              className="icon-button"
              disabled={!canEditPitch}
              onClick={() => movePitch('diatonic', -1)}
              title="음높이 한 칸 내리기"
              type="button"
            >
              <ArrowDown aria-hidden="true" size={18} />
            </button>

            <button
              aria-label="음높이 한 칸 올리기"
              className="icon-button"
              disabled={!canEditPitch}
              onClick={() => movePitch('diatonic', 1)}
              title="음높이 한 칸 올리기"
              type="button"
            >
              <ArrowUp aria-hidden="true" size={18} />
            </button>

            <button
              aria-label="한 옥타브 내리기"
              className="icon-button"
              disabled={!canEditPitch}
              onClick={() => movePitch('octave', -1)}
              title="한 옥타브 내리기"
              type="button"
            >
              <ChevronsDown aria-hidden="true" size={18} />
            </button>

            <button
              aria-label="한 옥타브 올리기"
              className="icon-button"
              disabled={!canEditPitch}
              onClick={() => movePitch('octave', 1)}
              title="한 옥타브 올리기"
              type="button"
            >
              <ChevronsUp aria-hidden="true" size={18} />
            </button>

          </div>

          <div className="duration-strip" aria-label="음가">
            <Clock3 aria-hidden="true" size={17} />
            {durations.map((duration) => {
              const shortcut = durationShortcuts[duration]
              const label = shortcut
                ? `${durationLabels[duration]}, 단축키 ${shortcut}`
                : durationLabels[duration]

              return (
                <button
                  aria-label={label}
                  aria-pressed={activeDurationValue === duration}
                  className={
                    activeDurationValue === duration ? 'is-active' : undefined
                  }
                  disabled={isTupletInput}
                  key={duration}
                  onClick={() => changeDuration(duration)}
                  title={label}
                  type="button"
                >
                  {durationLabels[duration]}
                </button>
              )
            })}

            <div className="dot-control" aria-label="점음표">
              <button
                aria-label="점 줄이기"
                disabled={isTupletInput || !canRemoveDot}
                onClick={() => changeDots(-1)}
                title="점 줄이기"
                type="button"
              >
                <CircleMinus aria-hidden="true" size={17} />
              </button>
              <output aria-label="점 개수">
                {activeDots}
              </output>
              <button
                aria-label="점 추가"
                disabled={isTupletInput || !canAddDot}
                onClick={() => changeDots(1)}
                title="점 추가"
                type="button"
              >
                <CirclePlus aria-hidden="true" size={17} />
              </button>
            </div>

            <button
              aria-label={tieSelected ? '타이 해제, 단축키 L' : '타이 추가, 단축키 L'}
              aria-pressed={tieSelected}
              className={`tie-button${tieSelected ? ' is-active' : ''}`}
              disabled={!tieCommand}
              onClick={toggleTie}
              title={tieSelected ? '타이 해제 (L)' : '타이 추가 (L)'}
              type="button"
            >
              {tieSelected ? (
                <Unlink2 aria-hidden="true" size={17} />
              ) : (
                <Link2 aria-hidden="true" size={17} />
              )}
              <span>타이</span>
              <span className="shortcut-badge">L</span>
            </button>

            <button
              aria-label={
                isTupletInput
                  ? `셋잇단음표 입력 취소, 단축키 ${tripletPreset.shortcut} 또는 Esc`
                  : `셋잇단음표 적용 또는 입력 준비, 단축키 ${tripletPreset.shortcut}`
              }
              aria-pressed={isTupletInput}
              className={`tuplet-button${isTupletInput ? ' is-active' : ''}`}
              onClick={toggleTuplet}
              title={
                isTupletInput
                  ? `셋잇단음표 취소 (${tupletProgress})`
                  : `셋잇단음표 적용 또는 입력 준비 (${tripletPreset.shortcut})`
              }
              type="button"
            >
              <span>{tripletPreset.label}</span>
              <span className="tuplet-duration-label">8분</span>
              <span className="shortcut-badge">{tripletPreset.shortcut}</span>
            </button>
          </div>

        </header>

        <div className="playback-strip">
          <div className="transport-controls" aria-label="재생 컨트롤">
            <button
              aria-label="재생"
              className="icon-button"
              disabled={playback.status === 'playing'}
              onClick={playback.play}
              title="재생"
              type="button"
            >
              <Play aria-hidden="true" size={18} />
            </button>
            <button
              aria-label="일시정지"
              className="icon-button"
              disabled={playback.status !== 'playing'}
              onClick={playback.pause}
              title="일시정지"
              type="button"
            >
              <Pause aria-hidden="true" size={18} />
            </button>
            <button
              aria-label="정지"
              className="icon-button"
              disabled={playback.status === 'stopped'}
              onClick={playback.stop}
              title="정지"
              type="button"
            >
              <Square aria-hidden="true" size={17} />
            </button>
          </div>

          <label className="tempo-control">
            <span>템포</span>
            <input
              aria-label="템포"
              max="240"
              min="40"
              onChange={(event) =>
                playback.setTempo(Number.parseInt(event.target.value, 10))
              }
              step="1"
              type="range"
              value={playback.tempo}
            />
            <output>{playback.tempo} BPM</output>
          </label>
        </div>

        <div className="editor-status" aria-live="polite">
          <span>
            {noteInputState
              ? noteInputState.tupletInput
                ? '셋잇단음표 입력 · A-G로 음표, R로 쉼표, Esc로 취소'
                : '입력 커서 · A-G로 음표, R로 쉼표를 추가합니다'
              : modeStatus[mode]}
          </span>
          <span>{durationLabels[durationValue]}</span>
          {noteInputState?.tupletInput ? (
            <span className="tuplet-progress">
              {tripletPreset.label} {tupletProgress}
            </span>
          ) : null}
          {noteInputState ? (
            <span>
              M
              {locateMeasure(score, noteInputState.target.measureId)
                ?.measureNumber ?? '—'}{' '}
              · {noteInputState.tick}틱
            </span>
          ) : null}
          <span>{undoStack.length}회 수정</span>
          <span>{playbackStatusLabels[playback.status]}</span>
          <span>
            {playback.positionBeat.toFixed(1)} / {playback.totalBeats.toFixed(1)}박
          </span>
          {fileStatus ? (
            <span className={fileStatus.tone === 'error' ? 'is-error' : undefined}>
              {fileStatus.message}
            </span>
          ) : null}
        </div>

        <div className="score-page" aria-label="악보 페이지">
          <div className="score-title">
            {metadataEdit?.field === 'title' ? (
              <input
                aria-label="악보 제목"
                autoFocus
                className="metadata-input metadata-input--title"
                maxLength={metadataMaxLength.title}
                onBlur={() =>
                  commitMetadataEdit('title', metadataEdit.value)
                }
                onChange={(event) =>
                  setMetadataEdit({
                    field: 'title',
                    value: event.target.value
                  })
                }
                onFocus={(event) => event.currentTarget.select()}
                onKeyDown={(event) =>
                  handleMetadataKeyDown(event, 'title', metadataEdit.value)
                }
                value={metadataEdit.value}
              />
            ) : (
              <button
                aria-label="악보 제목 수정"
                className="metadata-display metadata-display--title"
                onClick={() => beginMetadataEdit('title')}
                type="button"
              >
                {score.title}
              </button>
            )}

            {metadataEdit?.field === 'composer' ? (
              <input
                aria-label="작곡가"
                autoFocus
                className="metadata-input metadata-input--composer"
                maxLength={metadataMaxLength.composer}
                onBlur={() =>
                  commitMetadataEdit('composer', metadataEdit.value)
                }
                onChange={(event) =>
                  setMetadataEdit({
                    field: 'composer',
                    value: event.target.value
                  })
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
            inputCursor={
              noteInputState
                ? {
                    measureId: noteInputState.target.measureId,
                    tick: noteInputState.tick
                  }
                : undefined
            }
            onSelectEvent={selectEvent}
            onSelectEventRange={selectEventRange}
            onSelectMeasure={(measureId) => {
              setMode('select')
              setNoteInputState(undefined)
              setSelection({
                type: 'measure',
                measureId
              })
            }}
            score={previewScore}
            playbackEventId={playback.activeEventId}
            selectedEventId={selectedEventId}
            selectedEventIds={selectedEventIds}
            selectedMeasureId={selectedMeasureId}
          />
        </div>
      </section>

      {newScoreDraft ? (
        <div className="modal-backdrop" role="presentation">
          <form
            aria-label="새 악보 만들기"
            className="new-score-dialog"
            onSubmit={(event) => {
              event.preventDefault()
              submitNewScoreWizard()
            }}
            role="dialog"
          >
            <header>
              <h2>새 악보</h2>
            </header>

            <div className="new-score-form">
              <label>
                <span>제목</span>
                <input
                  autoFocus
                  maxLength={metadataMaxLength.title}
                  onChange={(event) =>
                    setNewScoreDraft({
                      ...newScoreDraft,
                      title: event.target.value
                    })
                  }
                  value={newScoreDraft.title}
                />
              </label>

              <label>
                <span>작곡가</span>
                <input
                  maxLength={metadataMaxLength.composer}
                  onChange={(event) =>
                    setNewScoreDraft({
                      ...newScoreDraft,
                      composer: event.target.value
                    })
                  }
                  value={newScoreDraft.composer}
                />
              </label>

              <label>
                <span>파트</span>
                <select
                  onChange={(event) =>
                    setNewScoreDraft({
                      ...newScoreDraft,
                      partPresetId: event.target.value
                    })
                  }
                  value={newScoreDraft.partPresetId}
                >
                  {partPresets.map((part) => (
                    <option key={part.id} value={part.id}>
                      {part.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>조표</span>
                <select
                  onChange={(event) =>
                    setNewScoreDraft({
                      ...newScoreDraft,
                      keySignatureId: event.target.value
                    })
                  }
                  value={newScoreDraft.keySignatureId}
                >
                  {keySignaturePresets.map((keySignature) => (
                    <option key={keySignature.id} value={keySignature.id}>
                      {keySignature.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>박자표</span>
                <select
                  onChange={(event) =>
                    setNewScoreDraft({
                      ...newScoreDraft,
                      timeSignatureId: event.target.value
                    })
                  }
                  value={newScoreDraft.timeSignatureId}
                >
                  {timeSignaturePresets.map((timeSignature) => (
                    <option key={timeSignature.id} value={timeSignature.id}>
                      {timeSignature.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>마디 수</span>
                <input
                  max="64"
                  min="1"
                  onChange={(event) =>
                    setNewScoreDraft({
                      ...newScoreDraft,
                      measureCount: normalizeNumberInput(
                        event.target.valueAsNumber,
                        1,
                        64,
                        newScoreDraft.measureCount
                      )
                    })
                  }
                  type="number"
                  value={newScoreDraft.measureCount}
                />
              </label>

              <label>
                <span>템포</span>
                <input
                  max="240"
                  min="40"
                  onChange={(event) =>
                    setNewScoreDraft({
                      ...newScoreDraft,
                      tempo: normalizeNumberInput(
                        event.target.valueAsNumber,
                        40,
                        240,
                        newScoreDraft.tempo
                      )
                    })
                  }
                  type="number"
                  value={newScoreDraft.tempo}
                />
              </label>
            </div>

            <footer className="dialog-actions">
              <button onClick={cancelNewScoreWizard} type="button">
                취소
              </button>
              <button className="primary-action" type="submit">
                만들기
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </main>
  )
}

function resolveSelectionAfterClear(
  previousScore: Score,
  nextScore: Score,
  eventId: string
): EditorSelection {
  const clearedEvent = locateEvent(nextScore, eventId)?.event

  if (
    clearedEvent?.type === 'rest' &&
    (clearedEvent.fullMeasure || clearedEvent.duration.tuplet)
  ) {
    return {
      type: 'event',
      eventId
    }
  }

  const nextEventId = getAdjacentEventId(previousScore, eventId, 1)

  if (nextEventId && locateEvent(nextScore, nextEventId)) {
    return {
      type: 'event',
      eventId: nextEventId
    }
  }

  const previousEventId = getAdjacentEventId(previousScore, eventId, -1)

  if (previousEventId && locateEvent(nextScore, previousEventId)) {
    return {
      type: 'event',
      eventId: previousEventId
    }
  }

  if (locateEvent(nextScore, eventId)) {
    return {
      type: 'event',
      eventId
    }
  }

  const previousLocation = locateEvent(previousScore, eventId)

  return {
    type: 'measure',
    measureId: previousLocation?.address.measureId ?? 'measure-1'
  }
}

function createInputId(kind: 'event' | 'measure'): string {
  return `${kind}-${crypto.randomUUID()}`
}

function isRestShortcut(event: KeyboardEvent): boolean {
  return event.code === 'KeyR' || event.key === 'r' || event.key === 'R'
}

function createDefaultNewScoreDraft(tempo: number): NewScoreDraft {
  return {
    title: '제목 없는 악보',
    composer: 'in-C',
    partPresetId: 'piano',
    keySignatureId: 'c-major',
    timeSignatureId: '4-4',
    measureCount: 8,
    tempo
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
  return new URLSearchParams(window.location.search).get('fixture') ===
    'single-voice-mvp'
    ? createSingleVoiceMvpScore()
    : demoScore
}

function createInitialSelection(score: Score): EditorSelection {
  const preferred = locateEvent(score, 'note-e4')
  const firstMeasure = score.parts[0]?.staves[0]?.measures[0]
  const firstEvent = firstMeasure?.voices[0]?.events[0]

  return preferred
    ? {
        type: 'event',
        eventId: preferred.event.id
      }
    : firstEvent
      ? {
          type: 'event',
          eventId: firstEvent.id
        }
      : {
          type: 'measure',
          measureId: firstMeasure?.id ?? 'measure-1'
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
    const location = locateEvent(score, focusedEventId)

    return location
      ? createNoteInputState({
          target: location.address,
          tick: location.event.position.tick,
          duration,
          mode
        })
      : undefined
  }

  if (selection.type !== 'measure') {
    return undefined
  }

  const location = locateMeasure(score, selection.measureId)

  return location
    ? createNoteInputState({
        target: location.address,
        tick: location.events[0]?.position.tick ?? 0,
        duration,
        mode
      })
    : undefined
}

function createInputStateAfterEvent(
  score: Score,
  eventId: string,
  duration: Duration,
  mode: 'note' | 'rest'
): NoteInputState | undefined {
  const location = locateEvent(score, eventId)

  if (!location) {
    return undefined
  }

  return createNoteInputState({
    target: location.address,
    tick:
      location.event.position.tick +
      voiceEventDurationTicks(location.event, location.measure),
    duration,
    mode
  })
}

function getEventIdBeforeInputCursor(
  score: Score,
  inputState: NoteInputState
): string | undefined {
  const location = locateMeasure(score, inputState.target.measureId)
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

  const entered = tupletInput.members.length
  const remaining = tupletInput.actualNotes - entered

  return remaining > 0
    ? `셋잇단음표 ${entered}/${tupletInput.actualNotes}개 입력됨. ${remaining}개 더 입력해 주세요.`
    : '셋잇단음표 입력을 완료했습니다.'
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

  const location = locateEvent(score, selection.eventId)

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

function describeDurationEditFailure(
  score: Score,
  selection: EditorSelection,
  duration: Duration
): string {
  if (selection.type !== 'event') {
    return '음가를 바꿀 음표나 쉼표를 선택해 주세요.'
  }

  const location = locateEvent(score, selection.eventId)

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

function toFileName(title: string): string {
  const normalized = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return normalized || 'untitled-score'
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function commandHasEffects(command: ScoreCommand): boolean {
  return command.type !== 'score.batch' ||
    command.commands.some(commandHasEffects)
}

createRoot(document.getElementById('root') as HTMLElement).render(<App />)
