import { useCallback, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Clock3,
  FileDown,
  FileUp,
  MousePointer2,
  Music2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Square,
  Trash2
} from 'lucide-react'

import {
  applyScoreCommand,
  type DurationValue,
  type PitchStep,
  type ScoreCommand
} from '../../score-core'
import { parseMusicXml, serializeMusicXml } from '../../musicxml'
import './styles.css'
import {
  buildDeleteCommand,
  buildDurationCommand,
  buildNoteEntryCommand,
  buildRestEntryCommand,
  createDuration,
  durationLabels,
  getAdjacentEventId,
  locateEvent,
  locateMeasure,
  type EditorMode,
  type EditorSelection
} from './editor/editor-state'
import { demoScore } from './notation/demo-score'
import { NotationPreview } from './notation/NotationPreview'
import { useScorePlayback } from './playback/useScorePlayback'

const durations: DurationValue[] = ['whole', 'half', 'quarter', 'eighth']
const durationKeys: Partial<Record<string, DurationValue>> = {
  '1': 'whole',
  '2': 'half',
  '4': 'quarter',
  '8': 'eighth'
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

interface EditorHistoryEntry {
  command: ScoreCommand
  selection: EditorSelection
}

const App = () => {
  const [score, setScore] = useState(() => demoScore)
  const [selection, setSelection] = useState<EditorSelection>({
    type: 'event',
    eventId: 'note-e4'
  })
  const [mode, setMode] = useState<EditorMode>('select')
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
          selection
        }
      ])
      setRedoStack([])
      return true
    },
    [score, selection]
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
        selection
      }
    ])
    setSelection(entry.selection)
  }, [score, selection, undoStack])

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
        selection
      }
    ])
    setSelection(entry.selection)
  }, [redoStack, score, selection])

  const changeDuration = useCallback(
    (value: DurationValue) => {
      setDurationValue(value)

      if (selection.type === 'event') {
        executeCommand(
          buildDurationCommand(score, selection, createDuration(value))
        )
      }
    },
    [executeCommand, score, selection]
  )

  const enterNote = useCallback(
    (step: PitchStep) => {
      const command = buildNoteEntryCommand(
        score,
        selection,
        step,
        createDuration(durationValue),
        createEventId
      )
      const eventId = getCommandEventId(command)

      if (executeCommand(command) && eventId) {
        setMode('note')
        setSelection({
          type: 'event',
          eventId
        })
      }
    },
    [durationValue, executeCommand, score, selection]
  )

  const enterRest = useCallback(() => {
    const command = buildRestEntryCommand(
      score,
      selection,
      createDuration(durationValue),
      createEventId
    )
    const eventId = getCommandEventId(command)

    if (executeCommand(command) && eventId) {
      setMode('rest')
      setSelection({
        type: 'event',
        eventId
      })
    }
  }, [durationValue, executeCommand, score, selection])

  const deleteSelection = useCallback(() => {
    if (selection.type !== 'event') {
      return
    }

    const command = buildDeleteCommand(score, selection)

    executeCommand(command)
  }, [executeCommand, score, selection])

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
      const target = event.target as HTMLElement | null

      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
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

      const pitch = event.key.toUpperCase()

      if (/^[A-G]$/.test(pitch)) {
        event.preventDefault()
        enterNote(pitch as PitchStep)
        return
      }

      switch (event.key) {
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
        case 'Delete':
        case 'Backspace':
          event.preventDefault()
          deleteSelection()
          break
        case 'ArrowLeft':
          event.preventDefault()
          moveSelection(-1)
          break
        case 'ArrowRight':
          event.preventDefault()
          moveSelection(1)
          break
        case 'Escape':
          setMode('select')
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    changeDuration,
    deleteSelection,
    enterNote,
    enterRest,
    moveSelection,
    playback.pause,
    playback.play,
    playback.status,
    redo,
    undo
  ])

  const selectedEventId =
    selection.type === 'event' ? selection.eventId : undefined
  const selectedMeasureId =
    selection.type === 'measure' ? selection.measureId : undefined

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
                    onClick={() => setMode(tool.mode)}
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
              aria-label="Delete selection"
              className="icon-button"
              disabled={selection.type !== 'event'}
              onClick={deleteSelection}
              title="Delete selection"
              type="button"
            >
              <Trash2 aria-hidden="true" size={18} />
            </button>
          </div>

          <div className="duration-strip" aria-label="Note duration">
            <Clock3 aria-hidden="true" size={17} />
            {durations.map((duration) => (
              <button
                aria-pressed={durationValue === duration}
                className={durationValue === duration ? 'is-active' : undefined}
                key={duration}
                onClick={() => changeDuration(duration)}
                type="button"
              >
                {durationLabels[duration]}
              </button>
            ))}
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
          <span>{mode}</span>
          <span>{durationLabels[durationValue]}</span>
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

function createEventId(): string {
  return `event-${crypto.randomUUID()}`
}

function getCommandEventId(command: ScoreCommand | undefined): string | undefined {
  if (
    command?.type === 'voice-event.insert' ||
    command?.type === 'voice-event.replace'
  ) {
    return command.event.id
  }

  return command?.type === 'voice-events.replace'
    ? command.editedEventId
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
