import { useCallback, useEffect, useMemo, useState } from 'react'
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
  FileUp,
  Link2,
  Minus,
  MousePointer2,
  Music2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Square,
  Unlink2
} from 'lucide-react'

import {
  applyScoreCommand,
  buildTieCommand,
  MAX_AUGMENTATION_DOTS,
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
  createDuration,
  durationLabels,
  getAdjacentEventId,
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
  '4': 'quarter',
  '8': 'eighth',
  '6': '16th'
}

const tools: Array<{
  mode: EditorMode
  label: string
  icon: typeof MousePointer2
}> = [
  {
    mode: 'select',
    label: 'Select',
    icon: MousePointer2
  },
  {
    mode: 'note',
    label: 'Note',
    icon: Music2
  },
  {
    mode: 'rest',
    label: 'Rest',
    icon: Pause
  }
]

const modeStatus: Record<EditorMode, string> = {
  select: 'Select · A–G edits selected note',
  note: 'Note input · A–G enters notes',
  rest: 'Rest input · R enters rests'
}

interface EditorHistoryEntry {
  command: ScoreCommand
  inputState?: NoteInputState
  selection: EditorSelection
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
  const [fileStatus, setFileStatus] = useState<{
    tone: 'neutral' | 'error'
    message: string
  }>()
  const playback = useScorePlayback(score)

  const eventLocation = useMemo(
    () =>
      selection.type === 'event'
        ? locateEvent(score, selection.eventId)
        : undefined,
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
  const tieEnabled =
    eventLocation?.event.type === 'note' &&
    Boolean(eventLocation.event.ties?.start)
  const tieCommand = useMemo(
    () =>
      eventLocation?.event.type === 'note'
        ? buildTieCommand(score, eventLocation.event.id, !tieEnabled)
        : undefined,
    [eventLocation, score, tieEnabled]
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

  const changeDuration = useCallback(
    (value: DurationValue) => {
      if (noteInputState?.tupletInput) {
        return
      }

      setDurationValue(value)

      if (noteInputState) {
        setNoteInputState({
          ...noteInputState,
          duration: createDuration(value, noteInputState.duration.dots)
        })
      } else if (selection.type === 'event') {
        const dots = eventLocation?.event.duration.dots ?? 0
        executeCommand(
          buildDurationCommand(
            score,
            selection,
            createDuration(value, dots)
          )
        )
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
      executeCommand(buildPitchStepCommand(score, selection, step))
    },
    [executeCommand, score, selection]
  )

  const toggleTie = useCallback(() => {
    executeCommand(tieCommand)
  }, [executeCommand, tieCommand])

  const toggleTuplet = useCallback(() => {
    if (noteInputState?.tupletInput) {
      setNoteInputState(cancelTupletInput(noteInputState))
      return
    }

    const inputState =
      noteInputState ??
      createInputState(
        score,
        selection,
        createDuration(durationValue),
        mode === 'rest' ? 'rest' : 'note'
      )

    if (!inputState) {
      return
    }

    const tupletState = beginTupletInput(
      inputState,
      `tuplet-${crypto.randomUUID()}`
    )

    if (tupletState) {
      setMode(tupletState.mode)
      setNoteInputState(tupletState)
    }
  }, [durationValue, mode, noteInputState, score, selection])

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

      setMode('note')

      if (input.pending) {
        setNoteInputState(input.nextState)
        return
      }

      if (executeCommand(input.command)) {
        setNoteInputState(input.nextState)

        setSelection({
          type: 'event',
          eventId: input.eventId
        })
      }
    },
    [durationValue, executeCommand, noteInputState, score, selection]
  )

  const enterRest = useCallback(() => {
    const inputState =
      noteInputState ??
      createInputState(score, selection, createDuration(durationValue), 'rest')

    if (!inputState) {
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
      return
    }

    setMode('rest')

    if (input.pending) {
      setNoteInputState(input.nextState)
      return
    }

    if (executeCommand(input.command)) {
      setNoteInputState(input.nextState)

      setSelection({
        type: 'event',
        eventId: input.eventId
      })
    }
  }, [durationValue, executeCommand, noteInputState, score, selection])

  const activateTool = useCallback(
    (toolMode: EditorMode) => {
      setMode(toolMode)

      if (toolMode === 'select') {
        setNoteInputState(undefined)
        return
      }

      setNoteInputState(
        createInputState(
          score,
          selection,
          createDuration(durationValue),
          toolMode
        )
      )
    },
    [durationValue, score, selection]
  )

  const clearSelection = useCallback(() => {
    if (selection.type !== 'event' || !eventLocation) {
      return
    }

    const command = buildDeleteCommand(score, selection)

    if (!command) {
      setFileStatus({
        tone: 'error',
        message:
          eventLocation.event.type === 'rest'
            ? 'Selected rest is already empty. Adjacent rests can be merged.'
            : 'Tied notes must be untied before clearing.'
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
          ? 'Adjacent rests merged'
          : 'Note cleared to rest'
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
      return
    }

    const edit = buildRemoveMeasure(score, activeMeasureId, noteInputState)

    if (edit && executeCommand(edit.command)) {
      setSelection(edit.selection)
      setNoteInputState(edit.inputState)
    }
  }, [activeMeasureId, executeCommand, noteInputState, score])

  const moveSelection = useCallback(
    (direction: -1 | 1) => {
      if (selection.type !== 'event') {
        return
      }

      const eventId = getAdjacentEventId(score, selection.eventId, direction)

      if (eventId) {
        setSelection({
          type: 'event',
          eventId
        })
      }
    },
    [score, selection]
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
        message: `${file.fileName} imported`
      })
    } catch (error) {
      setFileStatus({
        tone: 'error',
        message: getErrorMessage(error)
      })
    }
  }, [])

  const exportMusicXml = useCallback(async () => {
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
        message: `${result.fileName} exported`
      })
    } catch (error) {
      setFileStatus({
        tone: 'error',
        message: getErrorMessage(error)
      })
    }
  }, [score])

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
        ? resolvePitchKeyboardAction(
            mode,
            eventLocation?.event.type === 'note'
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
        case 'r':
        case 'R':
          event.preventDefault()
          enterRest()
          break
        case 't':
        case 'T':
          event.preventDefault()
          toggleTuplet()
          break
        case 'Delete':
        case 'Backspace':
          event.preventDefault()
          clearSelection()
          break
        case 'ArrowLeft':
          event.preventDefault()
          moveSelection(-1)
          break
        case 'ArrowRight':
          event.preventDefault()
          moveSelection(1)
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
    toggleTuplet,
    undo
  ])

  const selectedEventId =
    selection.type === 'event' ? selection.eventId : undefined
  const selectedMeasureId =
    selection.type === 'measure' ? selection.measureId : undefined
  const canEditPitch = eventLocation?.event.type === 'note'
  const accidentalEnabled = Boolean(noteInputState || canEditPitch)
  const clearSelectionLabel =
    eventLocation?.event.type === 'rest'
      ? 'Merge adjacent rests'
      : 'Clear note to rest'
  const canClearSelection =
    selection.type === 'event' &&
    Boolean(buildDeleteCommand(score, selection))

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Score navigation">
        <div>
          <p className="eyebrow">in-C</p>
          <h1>{score.title}</h1>
        </div>

        <nav className="panel-list" aria-label="Open panels">
          <button className="panel-list__item panel-list__item--active" type="button">
            Score
          </button>
          <button className="panel-list__item" type="button">
            Parts
          </button>
          <button className="panel-list__item" type="button">
            Mixer
          </button>
        </nav>

        <section className="inspector" aria-label="Selection inspector">
          <h2>Selection</h2>
          <dl>
            <div>
              <dt>Type</dt>
              <dd>
                {eventLocation?.event.type ??
                  (measureLocation ? 'measure' : '—')}
              </dd>
            </div>
            <div>
              <dt>Event</dt>
              <dd>{eventLocation?.event.id ?? '—'}</dd>
            </div>
            <div>
              <dt>Measure</dt>
              <dd>
                {eventLocation?.measureNumber ??
                  measureLocation?.measureNumber ??
                  '—'}
              </dd>
            </div>
            <div>
              <dt>Voice</dt>
              <dd>
                {eventLocation?.address.voiceId ??
                  measureLocation?.address.voiceId ??
                  '—'}
              </dd>
            </div>
          </dl>
        </section>
      </aside>

      <section className="workspace" aria-label="Notation editor">
        <header className="toolbar">
          <div className="toolbar__group">
            <div className="file-actions" aria-label="MusicXML file actions">
              <button onClick={importMusicXml} type="button">
                <FileUp aria-hidden="true" size={17} />
                <span>Import</span>
              </button>
              <button onClick={exportMusicXml} type="button">
                <FileDown aria-hidden="true" size={17} />
                <span>Export</span>
              </button>
            </div>

            <div className="segmented-control" aria-label="Editing tools">
              {tools.map((tool) => {
                const Icon = tool.icon

                return (
                  <button
                    aria-label={tool.label}
                    aria-pressed={mode === tool.mode}
                    className={mode === tool.mode ? 'is-active' : undefined}
                    key={tool.mode}
                    onClick={() => activateTool(tool.mode)}
                    title={tool.label}
                    type="button"
                  >
                    <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
                    <span>{tool.label}</span>
                  </button>
                )
              })}
            </div>

            <button
              aria-label="Undo"
              className="icon-button"
              disabled={undoStack.length === 0}
              onClick={undo}
              title="Undo"
              type="button"
            >
              <RotateCcw aria-hidden="true" size={18} />
            </button>

            <button
              aria-label="Redo"
              className="icon-button"
              disabled={redoStack.length === 0}
              onClick={redo}
              title="Redo"
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
              aria-label="Add measure"
              className="icon-button"
              disabled={!activeMeasureId}
              onClick={addMeasure}
              title="Add measure"
              type="button"
            >
              <Plus aria-hidden="true" size={18} />
            </button>

            <button
              aria-label="Delete measure"
              className="icon-button"
              disabled={!activeMeasureId || measureCount <= 1}
              onClick={removeMeasure}
              title="Delete measure"
              type="button"
            >
              <Minus aria-hidden="true" size={18} />
            </button>

            <div className="accidental-control" aria-label="Accidental">
              {([
                [-1, '♭', 'Flat'],
                [0, '♮', 'Natural'],
                [1, '♯', 'Sharp']
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

            <button
              aria-label="Move pitch down"
              className="icon-button"
              disabled={!canEditPitch}
              onClick={() => movePitch('diatonic', -1)}
              title="Move pitch down"
              type="button"
            >
              <ArrowDown aria-hidden="true" size={18} />
            </button>

            <button
              aria-label="Move pitch up"
              className="icon-button"
              disabled={!canEditPitch}
              onClick={() => movePitch('diatonic', 1)}
              title="Move pitch up"
              type="button"
            >
              <ArrowUp aria-hidden="true" size={18} />
            </button>

            <button
              aria-label="Move pitch down an octave"
              className="icon-button"
              disabled={!canEditPitch}
              onClick={() => movePitch('octave', -1)}
              title="Move pitch down an octave"
              type="button"
            >
              <ChevronsDown aria-hidden="true" size={18} />
            </button>

            <button
              aria-label="Move pitch up an octave"
              className="icon-button"
              disabled={!canEditPitch}
              onClick={() => movePitch('octave', 1)}
              title="Move pitch up an octave"
              type="button"
            >
              <ChevronsUp aria-hidden="true" size={18} />
            </button>

            <button
              aria-label={tieEnabled ? 'Remove tie' : 'Add tie'}
              className="icon-button"
              disabled={!tieCommand}
              onClick={toggleTie}
              title={tieEnabled ? 'Remove tie' : 'Add tie'}
              type="button"
            >
              {tieEnabled ? (
                <Unlink2 aria-hidden="true" size={18} />
              ) : (
                <Link2 aria-hidden="true" size={18} />
              )}
            </button>
          </div>

          <div className="duration-strip" aria-label="Note duration">
            <Clock3 aria-hidden="true" size={17} />
            {durations.map((duration) => (
              <button
                aria-pressed={durationValue === duration}
                className={durationValue === duration ? 'is-active' : undefined}
                disabled={isTupletInput}
                key={duration}
                onClick={() => changeDuration(duration)}
                type="button"
              >
                {durationLabels[duration]}
              </button>
            ))}

            <div className="dot-control" aria-label="Augmentation dots">
              <button
                aria-label="Remove augmentation dot"
                disabled={isTupletInput || !canRemoveDot}
                onClick={() => changeDots(-1)}
                title="Remove augmentation dot"
                type="button"
              >
                <CircleMinus aria-hidden="true" size={17} />
              </button>
              <output aria-label="Augmentation dot count">
                {activeDots}
              </output>
              <button
                aria-label="Add augmentation dot"
                disabled={isTupletInput || !canAddDot}
                onClick={() => changeDots(1)}
                title="Add augmentation dot"
                type="button"
              >
                <CirclePlus aria-hidden="true" size={17} />
              </button>
            </div>

            <button
              aria-label={isTupletInput ? 'Cancel triplet' : 'Start triplet'}
              aria-pressed={isTupletInput}
              className={isTupletInput ? 'is-active' : undefined}
              disabled={!isTupletInput && activeDots > 0}
              onClick={toggleTuplet}
              title={isTupletInput ? 'Cancel triplet' : 'Start triplet'}
              type="button"
            >
              3:2
            </button>
          </div>

        </header>

        <div className="playback-strip">
          <div className="transport-controls" aria-label="Playback controls">
            <button
              aria-label="Play"
              className="icon-button"
              disabled={playback.status === 'playing'}
              onClick={playback.play}
              title="Play"
              type="button"
            >
              <Play aria-hidden="true" size={18} />
            </button>
            <button
              aria-label="Pause"
              className="icon-button"
              disabled={playback.status !== 'playing'}
              onClick={playback.pause}
              title="Pause"
              type="button"
            >
              <Pause aria-hidden="true" size={18} />
            </button>
            <button
              aria-label="Stop"
              className="icon-button"
              disabled={playback.status === 'stopped'}
              onClick={playback.stop}
              title="Stop"
              type="button"
            >
              <Square aria-hidden="true" size={17} />
            </button>
          </div>

          <label className="tempo-control">
            <span>Tempo</span>
            <input
              aria-label="Tempo"
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
          <span>{modeStatus[mode]}</span>
          <span>{durationLabels[durationValue]}</span>
          {noteInputState?.tupletInput ? (
            <span>
              Triplet {tupletMemberCount}/{noteInputState.tupletInput.actualNotes}
            </span>
          ) : null}
          {noteInputState ? (
            <span>
              M
              {locateMeasure(score, noteInputState.target.measureId)
                ?.measureNumber ?? '—'}{' '}
              · {noteInputState.tick} ticks
            </span>
          ) : null}
          <span>{undoStack.length} edits</span>
          <span>{playback.status}</span>
          <span>
            {playback.positionBeat.toFixed(1)} / {playback.totalBeats.toFixed(1)} beats
          </span>
          {fileStatus ? (
            <span className={fileStatus.tone === 'error' ? 'is-error' : undefined}>
              {fileStatus.message}
            </span>
          ) : null}
        </div>

        <div className="score-page" aria-label="Score page">
          <div className="score-title">
            <span>{score.title}</span>
            <small>Andante · 4/4</small>
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
            onSelectEvent={(eventId) =>
              setSelection({
                type: 'event',
                eventId
              })
            }
            onSelectMeasure={(measureId) =>
              setSelection({
                type: 'measure',
                measureId
              })
            }
            score={score}
            playbackEventId={playback.activeEventId}
            selectedEventId={selectedEventId}
            selectedMeasureId={selectedMeasureId}
          />
        </div>
      </section>
    </main>
  )
}

function resolveSelectionAfterClear(
  previousScore: Score,
  nextScore: Score,
  eventId: string
): EditorSelection {
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
  if (selection.type === 'event') {
    const location = locateEvent(score, selection.eventId)

    return location
      ? createNoteInputState({
          target: location.address,
          tick: location.event.position.tick,
          duration,
          mode
        })
      : undefined
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

createRoot(document.getElementById('root') as HTMLElement).render(<App />)
