// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import recentMusicXml from '../../musicxml/fixtures/single-part-treble.musicxml?raw'
import tupletInputProgressMusicXml from '../../musicxml/fixtures/tuplet-input-progress.musicxml?raw'
import { parseMusicXml } from '../../musicxml'
import { unsavedScoreChangesMessage } from './editor/file-lifecycle'
import { demoScore } from './notation/demo-score'

const withPercussionClef = (musicXml: string) =>
  musicXml.replace(
    /<clef>\s*<sign>G<\/sign>\s*<line>2<\/line>\s*<\/clef>/,
    `<clef>
          <sign>percussion</sign>
          <line>2</line>
        </clef>`
  )

const twoPartMusicXmlWithPrimaryAnnotations = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <work>
    <work-title>Imported Duo</work-title>
  </work>
  <part-list>
    <score-part id="P1">
      <part-name>Violin</part-name>
    </score-part>
    <score-part id="P2">
      <part-name>Cello</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>
      <direction placement="above">
        <direction-type>
          <rehearsal>Reh-One</rehearsal>
        </direction-type>
      </direction>
      <direction placement="above">
        <direction-type>
          <words>PrimaryOnlyText</words>
        </direction-type>
      </direction>
      <direction placement="below">
        <direction-type>
          <dynamics>
            <mf/>
          </dynamics>
        </direction-type>
      </direction>
      <harmony>
        <root>
          <root-step>C</root-step>
        </root>
        <kind text="maj7">major-seventh</kind>
      </harmony>
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>whole</type>
      </note>
    </measure>
  </part>
  <part id="P2">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>F</sign>
          <line>4</line>
        </clef>
      </attributes>
      <note>
        <pitch>
          <step>C</step>
          <octave>3</octave>
        </pitch>
        <duration>4</duration>
        <type>whole</type>
      </note>
    </measure>
  </part>
</score-partwise>`

const playbackMockState = vi.hoisted(() => ({
  jumpToStart: vi.fn(),
  lastPartMixer: {} as Record<
    string,
    {
      muted: boolean
      solo: boolean
      volume: number
    }
  >,
  pause: vi.fn(),
  play: vi.fn(),
  stop: vi.fn(),
  value: {
    activeEvent: undefined as
      | {
          eventId: string
          partId: string
          staffId: string
          measureId: string
          voiceId: string
        }
      | undefined,
    activeEventId: undefined as string | undefined,
    positionBeat: 0,
    status: 'stopped' as 'stopped' | 'playing' | 'paused',
    totalBeats: 16
  }
}))

vi.mock('./notation/NotationPreview', () => ({
  NotationPreview: ({
    score,
    inlineLyricEditor,
    onSelectEvent,
    onSelectEventRange,
    onSelectLyric,
    onOpenMeasureContextMenu,
    onSelectMeasure,
    selectedEventAddress,
    selectedEventId,
    selectedEventIds,
    selectedMeasureId,
    playbackEventId,
    playbackEventAddress,
    printLayout,
    printLayoutPlan,
  }: {
    score: typeof demoScore
    inlineLyricEditor?: {
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
    onSelectEvent: (
      eventId: string,
      extendRange?: boolean,
      address?: {
        partId: string
        staffId: string
        measureId: string
        voiceId: string
      }
    ) => void
    onSelectEventRange: (
      anchorEventId: string,
      focusEventId: string,
      address?: {
        partId: string
        staffId: string
        measureId: string
        voiceId: string
      }
    ) => void
    onSelectLyric: (eventId: string, verse: number) => void
    onOpenMeasureContextMenu: (
      measureId: string,
      position: { x: number; y: number }
    ) => void
    onSelectMeasure: (measureId: string) => void
    selectedEventId?: string
    selectedEventIds?: string[]
    selectedMeasureId?: string
    selectedEventAddress?: {
      partId: string
      staffId: string
      measureId: string
      voiceId: string
    }
    playbackEventId?: string
    playbackEventAddress?: {
      partId: string
      staffId: string
      measureId: string
      voiceId: string
    }
    printLayout?: boolean
    printLayoutPlan?: {
      estimatedPageCount: number
      id: string
      overflowedTarget: boolean
      pageCount: number
      pageCssSize?: string
      pageMarginMm: number
      renderWidth: number
      scale: number
      targetPages?: number
    }
  }) => (
    <div
      aria-label="악보 미리보기 테스트 더블"
      data-event-count={score.parts[0]?.staves[0]?.measures.reduce(
        (count, measure) =>
          count + measure.voices.reduce((sum, voice) => sum + voice.events.length, 0),
        0
      )}
      data-event-durations={score.parts[0]?.staves[0]?.measures
        .flatMap((measure) =>
          measure.voices.flatMap((voice) =>
            voice.events.map((event) =>
              [
                event.id,
                event.duration.value,
                event.duration.tuplet
                  ? `${event.duration.tuplet.actualNotes}:${event.duration.tuplet.normalNotes}`
                  : 'regular'
              ].join(':')
            )
          )
        )
        .join(',')}
      data-event-pitches={score.parts[0]?.staves[0]?.measures
        .flatMap((measure) =>
          measure.voices.flatMap((voice) =>
            voice.events.map((event) =>
              event.type === 'note'
                ? `${event.id}:${event.pitch.step}${event.pitch.alter ?? ''}${event.pitch.octave}`
                : `${event.id}:rest`
            )
          )
        )
        .join(',')}
      data-all-event-pitches={score.parts
        .flatMap((part) =>
          part.staves.flatMap((staff) =>
            staff.measures.flatMap((measure) =>
              measure.voices.flatMap((voice) =>
                voice.events.map((event) =>
                  [
                    part.id,
                    staff.id,
                    measure.id,
                    voice.id,
                    event.id,
                    event.type === 'note'
                      ? `${event.pitch.step}${event.pitch.alter ?? ''}${event.pitch.octave}`
                      : 'rest'
                  ].join(':')
                )
              )
            )
          )
        )
        .join(',')}
      data-global-tempo={score.tempo?.bpm}
      data-rhythm-feel={score.rhythmFeel?.unit ?? ''}
      data-part-structure={score.parts
        .map((part) => `${part.id}:${part.name}:${part.staves.length}`)
        .join('|')}
      data-staff-clefs={score.parts
        .flatMap((part) =>
          part.staves.map((staff) =>
            [
              part.id,
              staff.id,
              `${staff.measures[0]?.clef.sign}${staff.measures[0]?.clef.line}`,
              staff.measures.length
            ].join(':')
          )
        )
        .join('|')}
      data-measure-clefs={score.parts[0]?.staves[0]?.measures
        .map((measure) => `${measure.clef.sign}${measure.clef.line}`)
        .join(',')}
      data-voice-ids={score.parts[0]?.staves[0]?.measures
        .map(
          (measure) =>
            `${measure.id}:${measure.voices.map((voice) => voice.id).join('/')}`
        )
        .join('|')}
      data-all-voice-ids={score.parts
        .flatMap((part) =>
          part.staves.flatMap((staff) =>
            staff.measures.map((measure) =>
              [
                part.id,
                staff.id,
                measure.id,
                measure.voices.map((voice) => voice.id).join('/')
              ].join(':')
            )
          )
        )
        .join('|')}
      data-lyrics={score.parts[0]?.staves[0]?.measures
        .flatMap((measure) =>
          measure.voices.flatMap((voice) =>
            voice.events.flatMap((event) =>
              event.type === 'note'
                ? (event.lyrics ?? []).map(
                    (lyric) =>
                      `${event.id}:${lyric.number ?? 1}:${lyric.syllabic ?? ''}:${lyric.text}`
                  )
                : []
            )
          )
        )
        .join('|')}
      data-measure-count={score.parts[0]?.staves[0]?.measures.length ?? 0}
      data-measure-marks={score.parts[0]?.staves[0]?.measures
        .map((measure) =>
          [
            measure.number,
            `${measure.repeat?.start ? 'S' : ''}${measure.repeat?.end ? 'E' : ''}`,
            measure.repeat?.times ?? '',
            measure.volta
              ? `${measure.volta.number}:${measure.volta.start ? 'S' : ''}${
                  measure.volta.end ? 'E' : ''
                }`
              : ''
          ].join(':')
        )
        .join('|')}
      data-selected-event-id={selectedEventId ?? ''}
      data-selected-event-ids={(selectedEventIds ?? []).join(',')}
      data-selected-event-address={
        selectedEventAddress
          ? [
              selectedEventAddress.partId,
              selectedEventAddress.staffId,
              selectedEventAddress.measureId,
              selectedEventAddress.voiceId
            ].join(':')
          : ''
      }
      data-selected-measure-id={selectedMeasureId ?? ''}
      data-playback-event-id={playbackEventId ?? ''}
      data-playback-event-address={
        playbackEventAddress
          ? [
              playbackEventAddress.partId,
              playbackEventAddress.staffId,
              playbackEventAddress.measureId,
              playbackEventAddress.voiceId
            ].join(':')
          : ''
      }
      data-print-layout={printLayout ? 'true' : 'false'}
      data-print-layout-id={printLayoutPlan?.id ?? ''}
      data-print-layout-margin={printLayoutPlan?.pageMarginMm ?? ''}
      data-print-page-css-size={printLayoutPlan?.pageCssSize ?? ''}
      data-print-layout-overflowed={printLayoutPlan?.overflowedTarget ? 'true' : 'false'}
      data-print-layout-pages={printLayoutPlan?.pageCount ?? ''}
      data-print-layout-scale={printLayoutPlan?.scale ?? ''}
      data-print-layout-target={printLayoutPlan?.targetPages ?? ''}
      data-print-layout-width={printLayoutPlan?.renderWidth ?? ''}
      data-testid="notation-preview"
    >
      {inlineLyricEditor ? (
        <input
          aria-label="선택 음표 가사"
          defaultValue={inlineLyricEditor.value}
          onBlur={(event) =>
            inlineLyricEditor.onCommit(event.currentTarget.value, {
              syllabic: inlineLyricEditor.syllabic,
              extend: inlineLyricEditor.extend
            })
          }
          onKeyDown={(event) => {
            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
              event.preventDefault()
              inlineLyricEditor.onCommit(event.currentTarget.value, {
                syllabic: inlineLyricEditor.syllabic,
                extend: inlineLyricEditor.extend
              })
              inlineLyricEditor.onMoveVerse(
                event.key === 'ArrowDown' ? 1 : -1
              )
            } else if (event.key === 'Enter') {
              event.preventDefault()
              inlineLyricEditor.onCommit(event.currentTarget.value, {
                syllabic: inlineLyricEditor.syllabic,
                extend: inlineLyricEditor.extend,
                moveNext: true
              })
            }
          }}
        />
      ) : null}
      {score.parts[0]?.staves[0]?.measures[0]?.voices[0]?.events[0]?.id}
      {score.parts[0]?.staves[0]?.measures.map((measure) => (
        <button
          aria-label={`${measure.number}마디 선택`}
          key={`${measure.id}-select`}
          onClick={() => onSelectMeasure(measure.id)}
          onContextMenu={(event) => {
            event.preventDefault()
            onOpenMeasureContextMenu(measure.id, {
              x: event.clientX,
              y: event.clientY
            })
          }}
          type="button"
        />
      ))}
      {score.parts.flatMap((part) =>
        part.staves.flatMap((staff) =>
          staff.measures.flatMap((measure) =>
            measure.voices.flatMap((voice) =>
              voice.events.map((event) => (
                <button
                  aria-label={`${event.id} 선택`}
                  key={`${event.id}-select`}
                  onClick={(clickEvent) =>
                    onSelectEvent(event.id, clickEvent.shiftKey, {
                      partId: part.id,
                      staffId: staff.id,
                      measureId: measure.id,
                      voiceId: voice.id
                    })
                  }
                  type="button"
                />
              ))
            )
          )
        )
      )}
      {score.parts.flatMap((part) =>
        part.staves.flatMap((staff) =>
          staff.measures.flatMap((measure) =>
            measure.voices.flatMap((voice) =>
              voice.events.flatMap((event) =>
                event.type === 'note'
                  ? (event.lyrics ?? []).map((lyric) => (
                      <button
                        aria-label={`${event.id} ${
                          lyric.number ?? 1
                        }절 가사 선택`}
                        key={`${event.id}-${lyric.number ?? 1}-lyric-select`}
                        onClick={() =>
                          onSelectLyric(event.id, lyric.number ?? 1)
                        }
                        type="button"
                      />
                    ))
                  : []
              )
            )
          )
        )
      )}
      {(score.hairpins ?? []).map((hairpin) => (
        <span data-hairpin-type={hairpin.type} key={hairpin.id}>
          {hairpin.startEventId}–{hairpin.endEventId}
        </span>
      ))}
      {(score.slurs ?? []).map((slur) => (
        <span data-slur="true" key={slur.id}>
          slur:{slur.startEventId}–{slur.endEventId}
        </span>
      ))}
      {(score.rehearsalMarks ?? []).map((mark) => (
        <span data-measure-id={mark.measureId} key={mark.id}>
          {mark.text}
        </span>
      ))}
      {(score.staffTexts ?? []).map((text) => (
        <span data-measure-id={text.measureId} key={text.id}>
          {text.text}
        </span>
      ))}
      {(score.systemTexts ?? []).map((text) => (
        <span data-measure-id={text.measureId} key={text.id}>
          {text.text}
        </span>
      ))}
      {(score.expressionTexts ?? []).map((text) => (
        <span data-measure-id={text.measureId} data-tick={text.tick} key={text.id}>
          {text.text}
        </span>
      ))}
      {(score.dynamics ?? []).map((dynamic) => (
        <span data-measure-id={dynamic.measureId} key={dynamic.id}>
          {dynamic.value}
        </span>
      ))}
      {(score.harmonies ?? []).map((harmony) => (
        <span
          data-measure-id={harmony.measureId}
          data-tick={harmony.tick}
          key={harmony.id}
        >
          {harmony.text}
        </span>
      ))}
      {score.parts.flatMap((part) =>
        part.staves.flatMap((staff) =>
          staff.measures.flatMap((measure) =>
            measure.voices.flatMap((voice) =>
              voice.events.flatMap((event) => [
                event.fermata ? (
                  <span data-event-id={event.id} key={`${event.id}-fermata`}>
                    페르마타 표시
                  </span>
                ) : null,
                event.breathMark ? (
                  <span data-event-id={event.id} key={`${event.id}-breath-mark`}>
                    {event.breathMark === 'caesura' ? '중지표 표시' : '숨표 표시'}
                  </span>
                ) : null,
                event.type === 'note' && event.tremolo ? (
                  <span data-event-id={event.id} key={`${event.id}-tremolo`}>
                    트레몰로 {event.tremolo.marks}줄 표시
                  </span>
                ) : null,
                event.type === 'note' && event.ornaments?.length ? (
                  <span data-event-id={event.id} key={`${event.id}-ornaments`}>
                    {event.ornaments
                      .map((ornament) =>
                        ornament === 'trill'
                          ? 'tr'
                          : ornament === 'mordent'
                            ? 'mord.'
                            : 'turn'
                      )
                      .join(' ')}
                  </span>
                ) : null
              ])
            )
          )
        )
      )}
    </div>
  )
}))

vi.mock('./playback/useScorePlayback', () => ({
  useScorePlayback: (
    _score: unknown,
    partMixer?: typeof playbackMockState.lastPartMixer
  ) => {
    playbackMockState.lastPartMixer = partMixer ?? {}

    return {
      activeEvent: playbackMockState.value.activeEvent,
      activeEventId: playbackMockState.value.activeEventId,
      jumpToStart: playbackMockState.jumpToStart,
      pause: playbackMockState.pause,
      play: playbackMockState.play,
      positionBeat: playbackMockState.value.positionBeat,
      setTempo: vi.fn(),
      status: playbackMockState.value.status,
      stop: playbackMockState.stop,
      tempo: 120,
      totalBeats: playbackMockState.value.totalBeats
    }
  }
}))

const installPreloadStub = () => {
  window.inC = {
    appName: 'in-C',
    autosave: {
      clear: vi.fn().mockResolvedValue(undefined),
      read: vi.fn().mockResolvedValue(undefined),
      write: vi.fn().mockResolvedValue(undefined)
    },
    musicXml: {
      open: vi.fn().mockResolvedValue(undefined),
      save: vi.fn().mockResolvedValue(undefined)
    },
    pdf: {
      save: vi.fn().mockResolvedValue(undefined)
    },
    midi: {
      save: vi.fn().mockResolvedValue(undefined)
    },
    promotions: {
      getConcertPosters: vi.fn().mockResolvedValue({ posters: [] })
    },
    recentMusicXml: {
      add: vi.fn().mockResolvedValue([]),
      list: vi.fn().mockResolvedValue([]),
      open: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue([])
    },
    versions: {
      chrome: 'test',
      electron: 'test',
      node: 'test'
    }
  }
}

const installLocalStorageStub = () => {
  try {
    if (window.localStorage) {
      return
    }
  } catch {
    // jsdom can expose localStorage as unavailable for opaque origins.
  }

  const store = new Map<string, string>()
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      clear: () => store.clear(),
      getItem: (key: string) => store.get(key) ?? null,
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      removeItem: (key: string) => {
        store.delete(key)
      },
      setItem: (key: string, value: string) => {
        store.set(key, String(value))
      },
      get length() {
        return store.size
      }
    }
  })
}

describe('App component shell', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.resetModules()
    playbackMockState.value = {
      activeEvent: undefined,
      activeEventId: undefined,
      positionBeat: 0,
      status: 'stopped',
      totalBeats: 16
    }
    playbackMockState.lastPartMixer = {}
    playbackMockState.jumpToStart.mockReset()
    playbackMockState.pause.mockReset()
    playbackMockState.play.mockReset()
    playbackMockState.stop.mockReset()
    window.history.replaceState({}, '', '/')
    window.confirm = vi.fn(() => true)
    installLocalStorageStub()
    window.localStorage.clear()
    installPreloadStub()
  })

  it('start-recovery.show-start-screen renders the start screen with Korean entry actions', async () => {
    const { App } = await import('./App')
    render(<App />)

    expect(
      screen.getByRole('heading', { name: '무엇을 시작할까요?' })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /새 악보 만들기/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /MusicXML 가져오기/ })).toBeInTheDocument()
    expect(screen.getByLabelText('최근 MusicXML 파일')).toBeInTheDocument()
  })

  it('start-recovery.no-autosave keeps primary start actions available without a recovery snapshot', async () => {
    const { App } = await import('./App')
    render(<App />)

    expect(
      screen.getByRole('button', { name: /새 악보 만들기/ })
    ).toBeEnabled()
    expect(
      screen.getByRole('button', { name: /MusicXML 가져오기/ })
    ).toBeEnabled()
    expect(screen.getByRole('button', { name: /복구본 없음/ })).toBeDisabled()
  })

  it('start-recovery.new-score starts from blank measures instead of demo notes', async () => {
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /새 악보 만들기/ }))
    fireEvent.click(
      within(screen.getByRole('dialog', { name: '새 악보 만들기' })).getByRole(
        'button',
        { name: '만들기' }
      )
    )

    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-event-count',
      '8'
    )
    expect(screen.getByTestId('notation-preview')).not.toHaveTextContent('note-c4')
  })

  it('score-setup.create-grand-staff-score creates a piano grand staff from the wizard', async () => {
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /새 악보 만들기/ }))
    const dialog = screen.getByRole('dialog', { name: '새 악보 만들기' })
    fireEvent.change(within(dialog).getByLabelText('악보 구성'), {
      target: { value: 'piano-grand-staff' }
    })
    fireEvent.click(within(dialog).getByRole('button', { name: '만들기' }))

    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-part-structure',
      'part-1:Piano:2'
    )
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-staff-clefs',
      'part-1:staff-1:G2:8|part-1:staff-2:F4:8'
    )
  })

  it('layout.multi-staff-notation-object-anchoring stores staff annotations on the selected staff measure', async () => {
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /새 악보 만들기/ }))
    const dialog = screen.getByRole('dialog', { name: '새 악보 만들기' })
    fireEvent.change(within(dialog).getByLabelText('악보 구성'), {
      target: { value: 'piano-grand-staff' }
    })
    fireEvent.click(within(dialog).getByRole('button', { name: '만들기' }))

    fireEvent.click(
      screen.getByRole('button', {
        name: 'part-1-staff-2-measure-1-full-measure-rest 선택'
      })
    )
    fireEvent.keyDown(window, { code: 'KeyN', key: 'n' })
    fireEvent.keyDown(window, { code: 'KeyC', key: 'c' })

    const lowerMeasureId = 'part-1-staff-2-measure-1'
    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-all-event-pitches',
        expect.stringContaining(
          'part-1:staff-2:part-1-staff-2-measure-1:voice-1:part-1-staff-2-measure-1-full-measure-rest:C04'
        )
      )
    })

    fireEvent.change(screen.getByLabelText('보표 글자'), {
      target: { value: 'dolce lower' }
    })
    fireEvent.blur(screen.getByLabelText('보표 글자'))
    fireEvent.change(screen.getByLabelText('표현 텍스트'), {
      target: { value: 'sotto voce' }
    })
    fireEvent.blur(screen.getByLabelText('표현 텍스트'))
    fireEvent.change(screen.getByLabelText('셈여림'), {
      target: { value: 'mf' }
    })
    fireEvent.change(screen.getByLabelText('코드 심벌'), {
      target: { value: 'C7/G' }
    })
    fireEvent.blur(screen.getByLabelText('코드 심벌'))

    const preview = screen.getByTestId('notation-preview')
    expect(within(preview).getByText('dolce lower')).toHaveAttribute(
      'data-measure-id',
      lowerMeasureId
    )
    expect(within(preview).getByText('sotto voce')).toHaveAttribute(
      'data-measure-id',
      lowerMeasureId
    )
    expect(within(preview).getByText('mf')).toHaveAttribute(
      'data-measure-id',
      lowerMeasureId
    )
    expect(within(preview).getByText('C7/G')).toHaveAttribute(
      'data-measure-id',
      lowerMeasureId
    )
  })

  it('score-setup.create-ensemble-score creates a four-part ensemble from the wizard', async () => {
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /새 악보 만들기/ }))
    const dialog = screen.getByRole('dialog', { name: '새 악보 만들기' })
    fireEvent.change(within(dialog).getByLabelText('악보 구성'), {
      target: { value: 'string-quartet' }
    })
    fireEvent.click(within(dialog).getByRole('button', { name: '만들기' }))

    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-part-structure',
      'violin-1:Violin I:1|violin-2:Violin II:1|viola:Viola:1|cello:Cello:1'
    )
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-staff-clefs',
      'violin-1:staff-1:G2:8|violin-2:staff-1:G2:8|viola:staff-1:C3:8|cello:staff-1:F4:8'
    )
  })

  it('layout.live-part-view previews and exports the selected ensemble part', async () => {
    let finishPdfSave: ((value: { fileName: string }) => void) | undefined
    vi.mocked(window.inC.pdf.save).mockImplementation(
      () =>
        new Promise((resolve) => {
          finishPdfSave = resolve
        })
    )
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /새 악보 만들기/ }))
    const dialog = screen.getByRole('dialog', { name: '새 악보 만들기' })
    fireEvent.change(within(dialog).getByLabelText('악보 구성'), {
      target: { value: 'string-quartet' }
    })
    fireEvent.click(within(dialog).getByRole('button', { name: '만들기' }))
    fireEvent.click(screen.getByRole('button', { name: '악보' }))

    fireEvent.change(screen.getByLabelText('악보 보기'), {
      target: { value: 'part' }
    })
    fireEvent.change(screen.getByLabelText('파트보 선택'), {
      target: { value: 'viola' }
    })
    fireEvent.change(screen.getByLabelText('PDF 설정 프리셋'), {
      target: { value: 'compact-parts' }
    })

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-part-structure',
        'viola:Viola:1'
      )
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-staff-clefs',
        'viola:staff-1:C3:8'
      )
      expect(screen.getByLabelText('파트보 제목')).toHaveTextContent('Viola')
      expect(screen.getByLabelText('파트보 제목')).toHaveAttribute(
        'data-part-id',
        'viola'
      )
      expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
        'data-view-mode',
        'part'
      )
      expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
        'data-part-id',
        'viola'
      )
      expect(screen.getByText('파트보: Viola')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: 'PDF 변환' }))

    await waitFor(() => {
      expect(window.inC.pdf.save).toHaveBeenCalledWith({
        suggestedName: '제목-없는-악보-viola.pdf'
      })
    })
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-print-layout',
      'true'
    )
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-part-structure',
      'viola:Viola:1'
    )
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-all-event-pitches',
      expect.stringContaining('viola:staff-1:')
    )
    expect(screen.getByTestId('notation-preview')).not.toHaveAttribute(
      'data-all-event-pitches',
      expect.stringContaining('violin-1:')
    )
    expect(screen.getByTestId('notation-preview')).not.toHaveAttribute(
      'data-all-event-pitches',
      expect.stringContaining('cello:')
    )
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-print-page-css-size',
      'A4 portrait'
    )
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-print-layout-margin',
      '6'
    )
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-print-layout-scale',
      '0.9'
    )
    expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
      'data-pdf-page-size',
      'a4'
    )
    expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
      'data-pdf-page-orientation',
      'portrait'
    )
    expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
      'data-pdf-page-margin-mm',
      '6'
    )
    expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
      'data-pdf-staff-size-percent',
      '90'
    )
    expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
      'data-pdf-system-spacing-percent',
      '90'
    )

    finishPdfSave?.({ fileName: 'in-c-viola.pdf' })
    expect(
      await screen.findByText('in-c-viola.pdf로 PDF를 만들었습니다.')
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-print-layout',
        'false'
      )
    )
  })

  it('layout.live-part-view keeps imported primary-part annotations out of other part PDFs', async () => {
    let finishPdfSave: ((value: { fileName: string }) => void) | undefined
    vi.mocked(window.inC.musicXml.open).mockResolvedValue({
      filePath: '/scores/imported-duo.musicxml',
      fileName: 'imported-duo.musicxml',
      contents: twoPartMusicXmlWithPrimaryAnnotations
    })
    vi.mocked(window.inC.pdf.save).mockImplementation(
      () =>
        new Promise((resolve) => {
          finishPdfSave = resolve
        })
    )

    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /MusicXML 가져오기/ }))

    expect(await screen.findByText('Imported Duo')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    fireEvent.change(screen.getByLabelText('악보 보기'), {
      target: { value: 'part' }
    })

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-part-structure',
        'P1:Violin:1'
      )
    })
    const primaryPreview = within(screen.getByTestId('notation-preview'))
    expect(primaryPreview.getByText('Reh-One')).toHaveAttribute(
      'data-measure-id',
      'measure-1'
    )
    expect(primaryPreview.getByText('PrimaryOnlyText')).toHaveAttribute(
      'data-measure-id',
      'measure-1'
    )
    expect(primaryPreview.getByText('maj7')).toHaveAttribute(
      'data-measure-id',
      'measure-1'
    )
    expect(primaryPreview.getByText('mf')).toHaveAttribute(
      'data-measure-id',
      'measure-1'
    )

    fireEvent.change(screen.getByLabelText('파트보 선택'), {
      target: { value: 'P2' }
    })

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-part-structure',
        'P2:Cello:1'
      )
      expect(screen.getByLabelText('파트보 제목')).toHaveTextContent('Cello')
      expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
        'data-part-id',
        'P2'
      )
    })

    const celloPreview = within(screen.getByTestId('notation-preview'))
    expect(celloPreview.getByText('Reh-One')).toHaveAttribute(
      'data-measure-id',
      'measure-1'
    )
    expect(celloPreview.queryByText('PrimaryOnlyText')).not.toBeInTheDocument()
    expect(celloPreview.queryByText('maj7')).not.toBeInTheDocument()
    expect(celloPreview.queryByText('mf')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: 'PDF 변환' }))

    await waitFor(() => {
      expect(window.inC.pdf.save).toHaveBeenCalledWith({
        suggestedName: 'imported-duo-cello.pdf'
      })
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-print-layout',
        'true'
      )
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-part-structure',
        'P2:Cello:1'
      )
    })
    const printPreview = within(screen.getByTestId('notation-preview'))
    expect(printPreview.getByText('Reh-One')).toBeInTheDocument()
    expect(printPreview.queryByText('PrimaryOnlyText')).not.toBeInTheDocument()
    expect(printPreview.queryByText('maj7')).not.toBeInTheDocument()
    expect(printPreview.queryByText('mf')).not.toBeInTheDocument()

    finishPdfSave?.({ fileName: 'imported-duo-cello.pdf' })
    expect(
      await screen.findByText('imported-duo-cello.pdf로 PDF를 만들었습니다.')
    ).toBeInTheDocument()
  })

  it('layout.live-part-view restores the saved MusicXML part view preference on reopen', async () => {
    let savedContents = ''
    const savedFile = {
      filePath: '/scores/quartet.musicxml',
      fileName: 'quartet.musicxml',
      openedAt: '2026-09-02T00:00:00.000Z'
    }
    vi.mocked(window.inC.musicXml.save).mockImplementation(async (input) => {
      savedContents = input.contents

      return {
        filePath: savedFile.filePath,
        fileName: savedFile.fileName
      }
    })
    vi.mocked(window.inC.recentMusicXml.add).mockResolvedValue([savedFile])

    const { App } = await import('./App')
    const { unmount } = render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /새 악보 만들기/ }))
    const dialog = screen.getByRole('dialog', { name: '새 악보 만들기' })
    fireEvent.change(within(dialog).getByLabelText('악보 구성'), {
      target: { value: 'string-quartet' }
    })
    fireEvent.click(within(dialog).getByRole('button', { name: '만들기' }))
    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    fireEvent.change(screen.getByLabelText('악보 보기'), {
      target: { value: 'part' }
    })
    fireEvent.change(screen.getByLabelText('파트보 선택'), {
      target: { value: 'cello' }
    })

    await waitFor(() =>
      expect(screen.getByText('파트보: Cello')).toBeInTheDocument()
    )

    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))

    await waitFor(() => {
      expect(window.inC.musicXml.save).toHaveBeenCalled()
      expect(savedContents).toContain('<score-partwise')
    })
    expect(
      window.localStorage.getItem('chromatics.musicxml-view-state.v1')
    ).toContain('"partId":"cello"')

    unmount()
    vi.mocked(window.inC.recentMusicXml.list).mockResolvedValue([savedFile])
    vi.mocked(window.inC.recentMusicXml.open).mockResolvedValue({
      filePath: savedFile.filePath,
      fileName: savedFile.fileName,
      contents: savedContents
    })

    render(<App />)
    fireEvent.click(
      await screen.findByRole('button', { name: /quartet\.musicxml/ })
    )

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-part-structure',
        'cello:Cello:1'
      )
      expect(screen.getByText('파트보: Cello')).toBeInTheDocument()
    })
  })

  it('score-setup.edit-active-part-label updates the selected part metadata', async () => {
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /새 악보 만들기/ }))
    const dialog = screen.getByRole('dialog', { name: '새 악보 만들기' })
    fireEvent.change(within(dialog).getByLabelText('악보 구성'), {
      target: { value: 'duet' }
    })
    fireEvent.click(within(dialog).getByRole('button', { name: '만들기' }))
    fireEvent.click(screen.getByRole('button', { name: '악보' }))

    const partName = screen.getByLabelText('현재 파트 이름')
    fireEvent.change(partName, { target: { value: 'Lead' } })
    fireEvent.blur(partName)

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-part-structure',
        'part-1:Lead:1|part-2:Part 2:1'
      )
    })
  })

  it('score-setup.edit-score-structure adds and removes parts and staves', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    fireEvent.click(screen.getByRole('button', { name: '파트 추가' }))

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-part-structure',
        'piano:피아노:1|violin:바이올린:1'
      )
      expect(screen.getByLabelText('입력 보표')).toHaveValue('violin:staff-1')
    })

    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    fireEvent.click(screen.getByRole('button', { name: '보표 추가' }))

    await waitFor(() => {
      expect(screen.getByLabelText('입력 보표')).toHaveValue('violin:staff-2')
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-part-structure',
        'piano:피아노:1|violin:바이올린:2'
      )
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-staff-clefs',
        expect.stringContaining('violin:staff-2:F4:2')
      )
    })

    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    fireEvent.click(screen.getByRole('button', { name: '보표 삭제' }))

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-part-structure',
        'piano:피아노:1|violin:바이올린:1'
      )
    })

    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    fireEvent.click(screen.getByRole('button', { name: '파트 삭제' }))

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-part-structure',
        'piano:피아노:1'
      )
      expect(screen.getByLabelText('입력 보표')).toHaveValue('piano:piano-staff')
    })
  })

  it('score-setup.add-instrument-library-part creates preset staves and clefs', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    fireEvent.change(screen.getByLabelText('추가할 악기'), {
      target: { value: 'cello' }
    })
    fireEvent.click(screen.getByRole('button', { name: '파트 추가' }))

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-part-structure',
        'piano:피아노:1|cello:첼로:1'
      )
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-staff-clefs',
        expect.stringContaining('cello:staff-1:F4:2')
      )
      expect(screen.getByLabelText('입력 보표')).toHaveValue('cello:staff-1')
      expect(
        screen.getByText('첼로 파트를 악기 라이브러리에서 추가했습니다.')
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    fireEvent.change(screen.getByLabelText('추가할 악기'), {
      target: { value: 'piano' }
    })
    fireEvent.click(screen.getByRole('button', { name: '파트 추가' }))

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-part-structure',
        'piano:피아노:1|cello:첼로:1|piano-2:피아노 2:2'
      )
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-staff-clefs',
        expect.stringContaining('piano-2:staff-1:G2:2')
      )
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-staff-clefs',
        expect.stringContaining('piano-2:staff-2:F4:2')
      )
      expect(screen.getByLabelText('입력 보표')).toHaveValue('piano-2:staff-1')
    })
  })

  it('start-recovery.open-autosave restores the saved score metadata and events', async () => {
    const recoveredScore = {
      ...demoScore,
      title: '복구한 연습곡',
      parts: demoScore.parts.map((part, partIndex) =>
        partIndex === 0
          ? {
              ...part,
              staves: part.staves.map((staff, staffIndex) =>
                staffIndex === 0
                  ? {
                      ...staff,
                      measures: staff.measures.map((measure, measureIndex) =>
                        measureIndex === 0
                          ? {
                              ...measure,
                              keySignature: { fifths: 1, mode: 'major' as const },
                              timeSignature: { beats: 3, beatType: 4 }
                            }
                          : measure
                      )
                    }
                  : staff
              )
            }
          : part
      )
    }
    vi.mocked(window.inC.autosave.read).mockResolvedValue({
      score: recoveredScore,
      metadata: {
        title: recoveredScore.title,
        updatedAt: '2026-07-21T00:00:00.000Z',
        version: '1'
      }
    })

    const { App } = await import('./App')
    render(<App />)

    const recoveryButton = await screen.findByRole('button', {
      name: /복구본 열기/
    })
    fireEvent.click(recoveryButton)

    expect(screen.getByText('복구한 연습곡')).toBeInTheDocument()
    expect(screen.getByLabelText('조표')).toHaveValue('g-major')
    expect(screen.getByLabelText('박자표')).toHaveValue('3-4')
    expect(screen.getByTestId('notation-preview')).toHaveTextContent('note-c4')
  })

  it('start-recovery.reopen-recent-musicxml opens the score and requests recent-order refresh', async () => {
    const firstFile = {
      filePath: '/scores/first.musicxml',
      fileName: 'first.musicxml',
      openedAt: '2026-07-20T00:00:00.000Z'
    }
    const selectedFile = {
      filePath: '/scores/sketch.musicxml',
      fileName: 'sketch.musicxml',
      openedAt: '2026-07-19T00:00:00.000Z'
    }
    vi.mocked(window.inC.recentMusicXml.list).mockResolvedValue([
      firstFile,
      selectedFile
    ])
    vi.mocked(window.inC.recentMusicXml.open).mockResolvedValue({
      ...selectedFile,
      contents: recentMusicXml
    })
    vi.mocked(window.inC.recentMusicXml.add).mockResolvedValue([
      { ...selectedFile, openedAt: '2026-07-21T00:00:00.000Z' },
      firstFile
    ])

    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(
      await screen.findByRole('button', { name: /sketch\.musicxml/ })
    )

    expect(await screen.findByText('MusicXML Sketch')).toBeInTheDocument()
    await waitFor(() => {
      expect(window.inC.recentMusicXml.add).toHaveBeenCalledWith({
        filePath: selectedFile.filePath,
        fileName: selectedFile.fileName
      })
    })
  })

  it('import-export.unsupported-musicxml-report shows actionable warnings after import', async () => {
    vi.mocked(window.inC.musicXml.open).mockResolvedValue({
      filePath: '/scores/external.musicxml',
      fileName: 'external.musicxml',
      contents: recentMusicXml.replace(
        '<type>quarter</type>',
        `<type>quarter</type>
        <notations>
          <technical>
            <up-bow/>
          </technical>
        </notations>`
      )
    })

    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /MusicXML 가져오기/ }))

    expect(await screen.findByText('MusicXML Sketch')).toBeInTheDocument()
    expect(
      await screen.findByText(
        /external\.musicxml을 가져왔습니다\. MusicXML 경고 1개: measure\[1\]\.note\[1\]\.notations\.technical: technical playing instructions are not imported yet\./
      )
    ).toBeInTheDocument()
    const report = await screen.findByRole('region', {
      name: 'MusicXML 경고 상세'
    })
    expect(
      within(report).getByText('MusicXML 가져오기 경고 1개')
    ).toBeInTheDocument()
    expect(within(report).getByText('external.musicxml')).toBeInTheDocument()
    expect(
      within(report).getByText('unsupported-notation · M1 · event 1')
    ).toBeInTheDocument()
    expect(
      within(report).getByText('measure[1].note[1].notations.technical')
    ).toBeInTheDocument()
    expect(
      within(report).getByText(
        'technical playing instructions are not imported yet.'
      )
    ).toBeInTheDocument()
  })

  it('file-lifecycle.cancelled-unsaved-import keeps the current score open', async () => {
    window.confirm = vi.fn(() => false)
    vi.mocked(window.inC.musicXml.open).mockResolvedValue({
      filePath: '/scores/imported.musicxml',
      fileName: 'imported.musicxml',
      contents: recentMusicXml
    })

    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /새 악보 만들기/ }))
    fireEvent.click(
      within(screen.getByRole('dialog', { name: '새 악보 만들기' })).getByRole(
        'button',
        { name: '만들기' }
      )
    )
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))

    expect(window.confirm).toHaveBeenCalledWith(unsavedScoreChangesMessage)
    expect(window.inC.musicXml.open).not.toHaveBeenCalled()
    expect(screen.getByText('제목 없는 악보')).toBeInTheDocument()
  })

  it('file-lifecycle.opened-recent-score-is-clean-until-edited', async () => {
    const selectedFile = {
      filePath: '/scores/sketch.musicxml',
      fileName: 'sketch.musicxml',
      openedAt: '2026-07-19T00:00:00.000Z'
    }
    vi.mocked(window.inC.recentMusicXml.list).mockResolvedValue([selectedFile])
    vi.mocked(window.inC.recentMusicXml.open).mockResolvedValue({
      ...selectedFile,
      contents: recentMusicXml
    })
    vi.mocked(window.inC.recentMusicXml.add).mockResolvedValue([selectedFile])

    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(
      await screen.findByRole('button', { name: /sketch\.musicxml/ })
    )
    expect(await screen.findByText('MusicXML Sketch')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '새 악보 만들기' }))

    expect(window.confirm).not.toHaveBeenCalled()
    expect(
      screen.getByRole('dialog', { name: '새 악보 만들기' })
    ).toBeInTheDocument()
  })

  it('import-export.save-existing-musicxml overwrites the opened recent file path', async () => {
    const selectedFile = {
      filePath: '/scores/sketch.musicxml',
      fileName: 'sketch.musicxml',
      openedAt: '2026-07-19T00:00:00.000Z'
    }
    vi.mocked(window.inC.recentMusicXml.list).mockResolvedValue([selectedFile])
    vi.mocked(window.inC.recentMusicXml.open).mockResolvedValue({
      ...selectedFile,
      contents: recentMusicXml
    })
    vi.mocked(window.inC.recentMusicXml.add).mockResolvedValue([selectedFile])
    vi.mocked(window.inC.musicXml.save).mockResolvedValue({
      filePath: selectedFile.filePath,
      fileName: selectedFile.fileName
    })

    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(
      await screen.findByRole('button', { name: /sketch\.musicxml/ })
    )
    expect(await screen.findByText('MusicXML Sketch')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))

    await waitFor(() => {
      expect(window.inC.musicXml.save).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: selectedFile.filePath,
          suggestedName: 'musicxml-sketch.musicxml',
          contents: expect.stringContaining('<score-partwise')
        })
      )
    })
    expect(window.inC.recentMusicXml.add).toHaveBeenLastCalledWith({
      filePath: selectedFile.filePath,
      fileName: selectedFile.fileName
    })
    expect(
      await screen.findByText('sketch.musicxml을 MusicXML로 내보냈습니다.')
    ).toBeInTheDocument()
  })

  it('navigation.arrow-right-at-last-event appends a full-measure rest measure instead of showing an input cursor', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { App } = await import('./App')
    render(<App />)

    const preview = screen.getByTestId('notation-preview')
    expect(preview).toHaveAttribute('data-event-count', '9')
    expect(preview).toHaveAttribute('data-selected-event-id', 'note-e4')

    Array.from({ length: 7 }).forEach(() => {
      fireEvent.keyDown(window, { key: 'ArrowRight' })
    })

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-event-count',
        '10'
      )
    })
    expect(screen.getByText('새 온쉼표 마디를 추가했습니다.')).toBeInTheDocument()
    expect(screen.queryByText('입력 중')).not.toBeInTheDocument()
  })

  it('measure.context-menu inserts measures before and after, then removes the target measure', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { App } = await import('./App')
    render(<App />)

    const initialMeasureCount = Number(
      screen.getByTestId('notation-preview').getAttribute('data-measure-count')
    )

    fireEvent.contextMenu(screen.getByRole('button', { name: '2마디 선택' }), {
      clientX: 160,
      clientY: 180
    })

    let menu = screen.getByRole('menu', { name: '마디 작업' })
    expect(
      within(menu).getByRole('menuitem', { name: '앞에 마디 추가' })
    ).toBeInTheDocument()
    expect(
      within(menu).getByRole('menuitem', { name: '뒤에 마디 추가' })
    ).toBeInTheDocument()
    expect(
      within(menu).getByRole('menuitem', { name: '도돌이표 시작' })
    ).toBeInTheDocument()
    expect(
      within(menu).getByRole('menuitem', { name: '도돌이표 끝' })
    ).toBeInTheDocument()
    expect(
      within(menu).getByRole('menuitem', { name: '1번 볼타' })
    ).toBeInTheDocument()
    expect(
      within(menu).getByRole('menuitem', { name: '2번 볼타' })
    ).toBeInTheDocument()
    expect(
      within(menu).getByRole('menuitem', { name: '마디 제거' })
    ).toBeInTheDocument()

    fireEvent.click(within(menu).getByRole('menuitem', { name: '도돌이표 시작' }))
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-measure-marks',
      expect.stringContaining('2:S::')
    )
    expect(screen.getByText('도돌이표 시작을 갱신했습니다.')).toBeInTheDocument()

    fireEvent.contextMenu(screen.getByRole('button', { name: '2마디 선택' }), {
      clientX: 160,
      clientY: 180
    })
    menu = screen.getByRole('menu', { name: '마디 작업' })
    fireEvent.click(within(menu).getByRole('menuitem', { name: '도돌이표 끝' }))
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-measure-marks',
      expect.stringContaining('2:SE:2:')
    )
    expect(screen.getByText('도돌이표 끝을 갱신했습니다.')).toBeInTheDocument()

    fireEvent.contextMenu(screen.getByRole('button', { name: '1마디 선택' }), {
      clientX: 160,
      clientY: 180
    })
    menu = screen.getByRole('menu', { name: '마디 작업' })
    fireEvent.click(within(menu).getByRole('menuitem', { name: '1번 볼타' }))
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-measure-marks',
      expect.stringContaining('1:::1:S')
    )
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-measure-marks',
      expect.stringContaining('2:SE:2:1:E')
    )
    expect(screen.getByText('1번 볼타 괄호를 갱신했습니다.')).toBeInTheDocument()

    fireEvent.contextMenu(screen.getByRole('button', { name: '2마디 선택' }), {
      clientX: 160,
      clientY: 180
    })
    menu = screen.getByRole('menu', { name: '마디 작업' })
    fireEvent.click(within(menu).getByRole('menuitem', { name: '뒤에 마디 추가' }))
    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-measure-count',
        String(initialMeasureCount + 1)
      )
    })
    expect(
      screen.getByText('선택한 마디 뒤에 새 마디를 추가했습니다.')
    ).toBeInTheDocument()

    fireEvent.contextMenu(screen.getByRole('button', { name: '3마디 선택' }), {
      clientX: 160,
      clientY: 180
    })
    menu = screen.getByRole('menu', { name: '마디 작업' })
    fireEvent.click(within(menu).getByRole('menuitem', { name: '2번 볼타' }))
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-measure-marks',
      expect.stringContaining('3:::2:S')
    )
    expect(
      screen.getByText('2번 볼타 괄호를 갱신했습니다.')
    ).toBeInTheDocument()

    fireEvent.contextMenu(screen.getByRole('button', { name: '3마디 선택' }), {
      clientX: 160,
      clientY: 180
    })
    fireEvent.click(
      within(screen.getByRole('menu', { name: '마디 작업' })).getByRole(
        'menuitem',
        { name: '마디 제거' }
      )
    )
    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-measure-count',
        String(initialMeasureCount)
      )
    })
    expect(screen.getByText('마디를 삭제했습니다.')).toBeInTheDocument()

    fireEvent.contextMenu(screen.getByRole('button', { name: '2마디 선택' }), {
      clientX: 160,
      clientY: 180
    })
    menu = screen.getByRole('menu', { name: '마디 작업' })
    fireEvent.click(within(menu).getByRole('menuitem', { name: '앞에 마디 추가' }))

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-measure-count',
        String(initialMeasureCount + 1)
      )
    })
    expect(
      screen.getByText('선택한 마디 앞에 새 마디를 추가했습니다.')
    ).toBeInTheDocument()
  })

  it('playback.global-tempo lyrics.edit-selected-note lyrics.block-note-shortcuts edits lyrics without triggering note input in fixture mode', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    const workspace = screen.getByRole('region', { name: '악보 편집기' })
    const toolbarTabs = screen.getByRole('navigation', {
      name: '편집 도구 카테고리'
    })
    expect(
      within(toolbarTabs).queryByRole('link', { name: 'Columns 출발 읽기' })
    ).not.toBeInTheDocument()
    expect(
      within(workspace).queryByLabelText('Columns 추천')
    ).not.toBeInTheDocument()
    expect(
      within(toolbarTabs)
        .getAllByRole('button')
        .filter((button) => button.hasAttribute('aria-pressed'))
        .map((button) => button.textContent)
    ).toEqual(['파일', '악보', '음표', '가사', '재생'])
    expect(screen.getByRole('button', { name: '파일' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '음표' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(
      within(workspace).queryByRole('button', { name: '재생' })
    ).not.toBeInTheDocument()
    screen
      .getAllByLabelText('빠르기')
      .forEach((element) => expect(element).not.toBeVisible())
    expect(
      within(toolbarTabs).queryByRole('button', { name: '선택' })
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '가사' })).toBeInTheDocument()
    expect(screen.getByLabelText('코드 심벌')).toBeInTheDocument()
    expect(screen.queryByLabelText('선택 음표 가사')).not.toBeInTheDocument()
    expect(screen.getByLabelText('선택 마디 음자리표')).not.toBeVisible()
    expect(screen.getByLabelText('위치별 빠르기 BPM')).not.toBeVisible()

    fireEvent.click(within(toolbarTabs).getByRole('button', { name: '가사' }))
    expect(screen.getByLabelText('가사 절')).toBeVisible()
    const preview = screen.getByLabelText('악보 미리보기 테스트 더블')
    const lyricInput = within(preview).getByLabelText('선택 음표 가사')
    const initialEventCount = preview.getAttribute('data-event-count')
    expect(lyricInput).toBeVisible()
    expect(screen.getByLabelText('가사 음절')).toBeVisible()
    expect(screen.getByText('멜리스마')).toBeVisible()
    expect(
      within(screen.getByLabelText('가사 절')).getAllByRole('option').map(
        (option) => option.textContent
      )
    ).toEqual(['1절', '2절', '3절', '4절'])
    expect(screen.getByLabelText('코드 심벌')).not.toBeVisible()
    fireEvent.keyDown(lyricInput, { key: 'ArrowDown' })
    expect(screen.getByLabelText('가사 절')).toHaveValue('2')
    expect(
      screen.getByText('2절 가사 입력으로 전환했습니다.')
    ).toBeInTheDocument()
    fireEvent.keyDown(
      within(screen.getByTestId('notation-preview')).getByLabelText(
        '선택 음표 가사'
      ),
      { key: 'ArrowUp' }
    )
    expect(screen.getByLabelText('가사 절')).toHaveValue('1')
    const firstVerseInput = within(
      screen.getByTestId('notation-preview')
    ).getByLabelText('선택 음표 가사')
    expect(fireEvent.keyDown(firstVerseInput, { key: 'q' })).toBe(true)
    expect(fireEvent.keyDown(firstVerseInput, { key: ' ' })).toBe(true)
    expect(fireEvent.keyDown(firstVerseInput, { key: '-' })).toBe(true)
    expect(preview).toHaveAttribute('data-event-count', initialEventCount)
    fireEvent.change(firstVerseInput, { target: { value: 'hello world' } })
    expect(fireEvent.keyDown(firstVerseInput, { key: 'Enter' })).toBe(false)
    expect(screen.getByText('가사를 갱신했습니다.')).toBeInTheDocument()
    const eventCountAfterLyricAdvance =
      screen.getByTestId('notation-preview').getAttribute('data-event-count')
    fireEvent.keyDown(window, { code: 'KeyA', key: 'a' })
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-event-count',
      eventCountAfterLyricAdvance
    )

    fireEvent.click(screen.getByRole('button', { name: 'm3-half-rest 선택' }))
    expect(screen.getByRole('region', { name: '음표 편집' })).toBeVisible()
    expect(screen.queryByLabelText('선택 음표 가사')).not.toBeInTheDocument()
    fireEvent.click(within(toolbarTabs).getByRole('button', { name: '가사' }))
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-selected-event-id',
      'm4-f-natural-1'
    )
    expect(within(preview).getByLabelText('선택 음표 가사')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'm1-c4 선택' }))
    expect(screen.getByRole('region', { name: '음표 편집' })).toBeVisible()
    fireEvent.click(within(toolbarTabs).getByRole('button', { name: '가사' }))
    fireEvent.change(screen.getByLabelText('가사 절'), {
      target: { value: '4' }
    })
    const fourthVerseInput = within(preview).getByLabelText('선택 음표 가사')
    fireEvent.change(fourthVerseInput, { target: { value: '한-글 두음절' } })
    fireEvent.blur(fourthVerseInput)
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-lyrics',
      expect.stringContaining('m1-c4:4:single:한-글 두음절')
    )
    const editCountAfterLyricCommit = document.querySelector('.editor-status')
      ?.textContent
    fireEvent.blur(fourthVerseInput)
    expect(document.querySelector('.editor-status')?.textContent).toBe(
      editCountAfterLyricCommit
    )
    fireEvent.click(within(toolbarTabs).getByRole('button', { name: '악보' }))
    fireEvent.click(
      screen.getByRole('button', { name: 'm1-c4 4절 가사 선택' })
    )
    expect(screen.getByRole('region', { name: '가사 편집' })).toBeVisible()
    expect(screen.getByLabelText('가사 절')).toHaveValue('4')
    expect(within(preview).getByLabelText('선택 음표 가사')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'm1-d4 선택' }))
    expect(screen.getByRole('region', { name: '음표 편집' })).toBeVisible()

    fireEvent.click(within(toolbarTabs).getByRole('button', { name: '악보' }))
    expect(screen.getByLabelText('조표')).toBeVisible()
    expect(screen.getByLabelText('박자표')).toBeVisible()
    expect(screen.getByLabelText('선택 마디 음자리표')).toBeVisible()
    expect(screen.getByLabelText('위치별 빠르기 BPM')).toBeVisible()
    const tempoInput = screen.getByRole('slider', { name: '빠르기' })
    const tempoBeatUnit = screen.getByLabelText('빠르기 기준 음가')
    const tempoText = screen.getByLabelText('빠르기말')
    const rhythmFeelSelect = screen.getByLabelText('리듬 해석 표기')
    expect(tempoInput).toHaveValue('75')
    expect(tempoBeatUnit).toHaveValue('quarter:0')
    expect(tempoText).toHaveTextContent('♩ = 75')
    fireEvent.change(tempoInput, { target: { value: '90' } })
    expect(tempoText).toHaveTextContent('♩ = 90')
    expect(preview).toHaveAttribute('data-global-tempo', '90')
    fireEvent.change(tempoBeatUnit, { target: { value: 'eighth:0' } })
    expect(tempoText).toHaveTextContent('♪ = 90')
    expect(rhythmFeelSelect).toHaveValue('none')
    fireEvent.change(rhythmFeelSelect, { target: { value: 'eighth' } })
    expect(rhythmFeelSelect).toHaveValue('eighth')
    expect(preview).toHaveAttribute('data-rhythm-feel', 'eighth')
    const tempoVisibilityToggle = screen.getByLabelText('악보에 빠르기말 표기')
    expect(tempoVisibilityToggle).toBeChecked()
    fireEvent.click(tempoVisibilityToggle)
    expect(tempoVisibilityToggle).not.toBeChecked()

    fireEvent.click(within(toolbarTabs).getByRole('button', { name: '파일' }))
    expect(within(workspace).getByLabelText('새 악보 만들기')).toBeInTheDocument()
    expect(within(workspace).getByLabelText('MusicXML 가져오기')).toBeInTheDocument()

    fireEvent.click(within(workspace).getByLabelText('새 악보 만들기'))
    const newScoreDialog = screen.getByRole('dialog', {
      name: '새 악보 만들기'
    })
    expect(newScoreDialog).toBeInTheDocument()
    expect(window.confirm).not.toHaveBeenCalled()
    fireEvent.click(within(newScoreDialog).getByRole('button', { name: '취소' }))

    fireEvent.click(within(toolbarTabs).getByRole('button', { name: '재생' }))
    expect(within(workspace).getByRole('button', { name: '재생' })).toBeVisible()
    screen
      .getAllByLabelText('빠르기')
      .forEach((element) => expect(element).not.toBeVisible())

    fireEvent.click(within(toolbarTabs).getByRole('button', { name: '음표' }))
    expect(
      within(workspace).queryByRole('button', { name: '재생' })
    ).not.toBeInTheDocument()
    screen
      .getAllByLabelText('빠르기')
      .forEach((element) => expect(element).not.toBeVisible())
    expect(screen.getByLabelText('선택 마디 음자리표')).not.toBeVisible()
    expect(screen.getByLabelText('코드 심벌')).toBeInTheDocument()
    expect(screen.queryByLabelText('선택 음표 가사')).not.toBeInTheDocument()
    expect(screen.getByLabelText('위치별 빠르기 BPM')).not.toBeVisible()
  }, 15000)

  it('playback.cursor-selection-sync selects the active playback event with its voice address', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    playbackMockState.value = {
      activeEvent: {
        eventId: 'note-g4',
        partId: 'piano',
        staffId: 'piano-staff',
        measureId: 'measure-2',
        voiceId: 'voice-1'
      },
      activeEventId: 'note-g4',
      positionBeat: 4,
      status: 'playing',
      totalBeats: 8
    }
    const { App } = await import('./App')
    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-selected-event-id',
        'note-g4'
      )
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-playback-event-id',
        'note-g4'
      )
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-playback-event-address',
        'piano:piano-staff:measure-2:voice-1'
      )
    })
    expect(screen.getByRole('button', { name: '1성부' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('playback.cursor-selection-sync keeps editing selection stable after stop and jump-to-start', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    playbackMockState.value = {
      activeEvent: {
        eventId: 'note-a4',
        partId: 'piano',
        staffId: 'piano-staff',
        measureId: 'measure-2',
        voiceId: 'voice-1'
      },
      activeEventId: 'note-a4',
      positionBeat: 4.5,
      status: 'playing',
      totalBeats: 8
    }
    const { App } = await import('./App')
    const { rerender } = render(<App />)
    const toolbarTabs = screen.getByRole('navigation', {
      name: '편집 도구 카테고리'
    })

    fireEvent.click(within(toolbarTabs).getByRole('button', { name: '재생' }))
    fireEvent.click(screen.getByRole('button', { name: '처음으로' }))

    expect(playbackMockState.jumpToStart).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-selected-event-id',
        'note-a4'
      )
    })

    playbackMockState.value = {
      activeEvent: undefined,
      activeEventId: undefined,
      positionBeat: 0,
      status: 'stopped',
      totalBeats: 8
    }
    rerender(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-selected-event-id',
        'note-a4'
      )
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-playback-event-id',
        ''
      )
    })
  })

  it('playback.cursor-selection-sync keeps a multi-part playback selection after jump-to-start', async () => {
    const { App } = await import('./App')
    const { rerender } = render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /새 악보 만들기/ }))
    const dialog = screen.getByRole('dialog', { name: '새 악보 만들기' })
    fireEvent.change(within(dialog).getByLabelText('악보 구성'), {
      target: { value: 'string-quartet' }
    })
    fireEvent.click(within(dialog).getByRole('button', { name: '만들기' }))

    playbackMockState.value = {
      activeEvent: {
        eventId: 'cello-staff-1-measure-1-full-measure-rest',
        partId: 'cello',
        staffId: 'staff-1',
        measureId: 'cello-staff-1-measure-1',
        voiceId: 'voice-1'
      },
      activeEventId: 'cello-staff-1-measure-1-full-measure-rest',
      positionBeat: 0,
      status: 'playing',
      totalBeats: 32
    }
    rerender(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-selected-event-id',
        'cello-staff-1-measure-1-full-measure-rest'
      )
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-selected-event-address',
        'cello:staff-1:cello-staff-1-measure-1:voice-1'
      )
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-playback-event-address',
        'cello:staff-1:cello-staff-1-measure-1:voice-1'
      )
    })

    fireEvent.click(screen.getByRole('button', { name: '재생' }))
    fireEvent.click(screen.getByRole('button', { name: '처음으로' }))
    expect(playbackMockState.jumpToStart).toHaveBeenCalledTimes(1)

    playbackMockState.value = {
      activeEvent: undefined,
      activeEventId: undefined,
      positionBeat: 0,
      status: 'stopped',
      totalBeats: 32
    }
    rerender(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-selected-event-id',
        'cello-staff-1-measure-1-full-measure-rest'
      )
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-selected-event-address',
        'cello:staff-1:cello-staff-1-measure-1:voice-1'
      )
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-playback-event-id',
        ''
      )
    })
  })

  it('playback.part-mixer sends part mute, solo, and volume settings to playback', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '재생' }))
    const mixer = screen.getByLabelText('파트 믹서')
    const mute = within(mixer).getByLabelText('Melody 음소거')
    const solo = within(mixer).getByLabelText('Melody 솔로')
    const volume = within(mixer).getByLabelText('Melody 볼륨')

    expect(volume).toHaveValue('100')

    fireEvent.click(mute)
    expect(playbackMockState.lastPartMixer['part-1']).toMatchObject({
      muted: true,
      solo: false,
      volume: 1
    })

    fireEvent.click(solo)
    expect(playbackMockState.lastPartMixer['part-1']).toMatchObject({
      muted: true,
      solo: true,
      volume: 1
    })

    fireEvent.change(volume, { target: { value: '65' } })
    expect(playbackMockState.lastPartMixer['part-1']).toMatchObject({
      muted: true,
      solo: true,
      volume: 0.65
    })
    expect(within(mixer).getByText('65%')).toBeInTheDocument()
  })

  it('playback.part-mixer keeps independent controls for a 4-part ensemble', async () => {
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /새 악보 만들기/ }))
    const dialog = screen.getByRole('dialog', { name: '새 악보 만들기' })
    fireEvent.change(within(dialog).getByLabelText('악보 구성'), {
      target: { value: 'string-quartet' }
    })
    fireEvent.click(within(dialog).getByRole('button', { name: '만들기' }))
    fireEvent.click(screen.getByRole('button', { name: '재생' }))

    const mixer = screen.getByLabelText('파트 믹서')
    const violinMute = within(mixer).getByLabelText('Violin I 음소거')
    const celloSolo = within(mixer).getByLabelText('Cello 솔로')
    const violaVolume = within(mixer).getByLabelText('Viola 볼륨')

    expect(within(mixer).getByText('Violin I')).toBeInTheDocument()
    expect(within(mixer).getByText('Violin II')).toBeInTheDocument()
    expect(within(mixer).getByText('Viola')).toBeInTheDocument()
    expect(within(mixer).getByText('Cello')).toBeInTheDocument()
    expect(violaVolume).toHaveValue('100')

    fireEvent.click(violinMute)
    await waitFor(() => {
      expect(playbackMockState.lastPartMixer['violin-1']).toMatchObject({
        muted: true,
        solo: false,
        volume: 1
      })
    })

    fireEvent.click(celloSolo)
    await waitFor(() => {
      expect(playbackMockState.lastPartMixer['cello']).toMatchObject({
        muted: false,
        solo: true,
        volume: 1
      })
    })

    fireEvent.change(violaVolume, { target: { value: '45' } })
    await waitFor(() => {
      expect(playbackMockState.lastPartMixer['viola']).toMatchObject({
        muted: false,
        solo: false,
        volume: 0.45
      })
    })
    expect(playbackMockState.lastPartMixer['violin-2']).toBeUndefined()
    expect(within(mixer).getByText('45%')).toBeInTheDocument()
  })

  it('promotion.concert-posters does not render the deprecated toolbar banner', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    vi.mocked(window.inC.promotions.getConcertPosters).mockResolvedValue({
      posters: [
        {
          id: 'concert:test-poster',
          title: '테스트 공연 포스터',
          meta: '2026년 8월 테스트 · 온라인',
          description: '서버 API에서 내려온 공연 포스터입니다.',
          imageUrl: '../assets/posters/test.svg',
          imageAlt: '테스트 공연 포스터 이미지',
          targetUrl: '../concerts.html',
          theme: 'blue'
        }
      ],
      sourceUrl: 'https://in-c.mannlab.app/api/concert-posters.json'
    })

    const { App } = await import('./App')
    render(<App />)

    await waitFor(() =>
      expect(window.inC.promotions.getConcertPosters).not.toHaveBeenCalled()
    )
    expect(screen.queryByRole('group', {
      name: '공연 포스터 보기'
    })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: '공연 포스터' })).not.toBeInTheDocument()
  })

  it('clef.change-selected-measure changes only the selected measure clef and reports the result', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '1마디 선택' }))
    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    const clefSelect = screen.getByLabelText('선택 마디 음자리표')
    const preview = screen.getByTestId('notation-preview')
    const initialClefs = preview.getAttribute('data-measure-clefs')?.split(',')

    expect(initialClefs?.length).toBeGreaterThan(1)
    expect(clefSelect).toHaveValue('treble')
    fireEvent.change(clefSelect, { target: { value: 'bass' } })

    await waitFor(() => {
      const changedClefs = screen
        .getByTestId('notation-preview')
        .getAttribute('data-measure-clefs')
        ?.split(',')
      const changedIndexes = changedClefs
        ?.map((clef, index) => (clef === initialClefs?.[index] ? -1 : index))
        .filter((index) => index >= 0)
      expect(changedIndexes).toHaveLength(1)
      expect(changedClefs?.[changedIndexes?.[0] ?? -1]).toBe('F4')
    })
    expect(
      screen.getByText('선택한 마디의 음자리표를 바꿨습니다.')
    ).toBeInTheDocument()
  })

  it('clef.change-current-staff changes every measure clef in the active staff', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    const staffClefSelect = screen.getByLabelText('현재 보표 음자리표')

    expect(staffClefSelect).toHaveValue('treble')
    fireEvent.change(staffClefSelect, { target: { value: 'alto' } })

    await waitFor(() => {
      expect(screen.getByLabelText('현재 보표 음자리표')).toHaveValue('alto')
      expect(
        screen
          .getByTestId('notation-preview')
          .getAttribute('data-measure-clefs')
          ?.split(',')
      ).toEqual(['C3', 'C3'])
    })
    expect(
      screen.getByText('피아노 음자리표를 바꿨습니다.')
    ).toBeInTheDocument()
  })

  it('import-export.save-pdf sends the score title and keeps PDF separate from MusicXML', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    vi.mocked(window.inC.pdf.save).mockResolvedValue({
      fileName: 'release-test.pdf'
    })
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    const fileActions = screen.getByLabelText('파일 작업')
    const pdfButton = within(fileActions).getByRole('button', {
      name: 'PDF 변환'
    })
    const musicXmlButton = within(fileActions).getByRole('button', {
      name: 'MusicXML로 저장'
    })
    const pageTarget = within(fileActions).getByLabelText('PDF 목표 장수')

    expect(pdfButton).not.toBe(musicXmlButton)
    expect(pageTarget).toHaveValue(2)
    expect(pageTarget).toHaveAttribute('min', '1')
    expect(pageTarget).toHaveAttribute('step', '1')
    fireEvent.click(pdfButton)

    await waitFor(() => {
      expect(window.inC.pdf.save).toHaveBeenCalledWith({
        suggestedName: 'release-test.pdf'
      })
    })
    expect(window.inC.musicXml.save).not.toHaveBeenCalled()
  })

  it('import-export.export-midi writes a Standard MIDI File separate from MusicXML and PDF', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    vi.mocked(window.inC.midi.save).mockResolvedValue({
      fileName: 'release-test.mid'
    })
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    const fileActions = screen.getByLabelText('파일 작업')
    const midiButton = within(fileActions).getByRole('button', {
      name: 'MIDI 내보내기'
    })

    expect(midiButton).not.toBe(
      within(fileActions).getByRole('button', { name: 'MusicXML로 저장' })
    )
    expect(midiButton).not.toBe(
      within(fileActions).getByRole('button', { name: 'PDF 변환' })
    )
    fireEvent.click(midiButton)

    await waitFor(() => {
      expect(window.inC.midi.save).toHaveBeenCalledWith({
        suggestedName: 'release-test.mid',
        contents: expect.any(Array)
      })
    })
    const saveInput = vi.mocked(window.inC.midi.save).mock.calls[0]?.[0]

    expect(asciiBytes(saveInput?.contents ?? [], 0, 4)).toBe('MThd')
    expect(saveInput?.contents).toEqual(
      expect.arrayContaining([0xff, 0x51, 0x03])
    )
    expect(window.inC.musicXml.save).not.toHaveBeenCalled()
    expect(window.inC.pdf.save).not.toHaveBeenCalled()
    expect(
      await screen.findByText('release-test.mid로 MIDI를 내보냈습니다.')
    ).toBeInTheDocument()
  })

  it('import-export.export-midi reports the V1 percussion and tab policy', async () => {
    vi.mocked(window.inC.musicXml.open).mockResolvedValue({
      filePath: '/scores/percussion.musicxml',
      fileName: 'percussion.musicxml',
      contents: withPercussionClef(recentMusicXml)
    })
    vi.mocked(window.inC.midi.save).mockResolvedValue({
      fileName: 'percussion-policy.mid'
    })

    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /MusicXML 가져오기/ }))
    expect(await screen.findByText('MusicXML Sketch')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    const fileActions = screen.getByLabelText('파일 작업')
    fireEvent.click(
      within(fileActions).getByRole('button', { name: 'MIDI 내보내기' })
    )

    await waitFor(() => {
      expect(window.inC.midi.save).toHaveBeenCalledWith({
        suggestedName: 'musicxml-sketch.mid',
        contents: expect.any(Array)
      })
    })
    await waitFor(() => {
      const pageText = document.body.textContent ?? ''

      expect(pageText).toContain('percussion-policy.mid로 MIDI를 내보냈습니다.')
      expect(pageText).toContain('MIDI 경고 1개')
      expect(pageText).toContain('part[1].staff[1].measure[1].clef')
      expect(pageText).toContain(
        'Percussion notation is not interpreted in V1 MIDI export; notes on this staff were skipped.'
      )
    })
  })

  it('import-export.save-pdf hides editor selection state while printing', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    let finishPdfSave: ((value: { fileName: string }) => void) | undefined
    vi.mocked(window.inC.pdf.save).mockImplementation(
      () =>
        new Promise((resolve) => {
          finishPdfSave = resolve
        })
    )
    const { App } = await import('./App')
    render(<App />)

    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-selected-event-id',
      'note-e4'
    )

    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: 'PDF 변환' }))

    await waitFor(() => expect(window.inC.pdf.save).toHaveBeenCalled())
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-selected-event-id',
      ''
    )
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-selected-event-ids',
      ''
    )
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-selected-measure-id',
      ''
    )
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-playback-event-id',
      ''
    )
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-print-layout',
      'true'
    )
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-print-layout-id',
      'comfortable'
    )

    finishPdfSave?.({ fileName: 'demo.pdf' })
    expect(await screen.findByText('demo.pdf로 PDF를 만들었습니다.')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-selected-event-id',
        'note-e4'
      )
    )
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-print-layout',
      'false'
    )
  })

  it('import-export.save-pdf applies a strict target page count when possible', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    let finishPdfSave: ((value: { fileName: string }) => void) | undefined
    vi.mocked(window.inC.pdf.save).mockImplementation(
      () =>
        new Promise((resolve) => {
          finishPdfSave = resolve
        })
    )
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    const addMeasureButton = screen.getByRole('button', { name: '마디 추가' })

    for (let index = 0; index < 80; index += 1) {
      fireEvent.click(addMeasureButton)
    }

    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.change(screen.getByLabelText('PDF 목표 장수'), {
      target: { value: '2' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'PDF 변환' }))

    await waitFor(() => expect(window.inC.pdf.save).toHaveBeenCalled())
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-print-layout-target',
      '2'
    )
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-print-layout-overflowed',
      'false'
    )
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-print-layout-pages',
      '2'
    )

    finishPdfSave?.({ fileName: 'two-page.pdf' })
    expect(
      await screen.findByText('two-page.pdf로 PDF를 만들었습니다.')
    ).toBeInTheDocument()
  })

  it('layout.page-setup applies PDF page settings to export layout', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    let finishPdfSave: ((value: { fileName: string }) => void) | undefined
    vi.mocked(window.inC.pdf.save).mockImplementation(
      () =>
        new Promise((resolve) => {
          finishPdfSave = resolve
        })
    )
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    fireEvent.change(screen.getByLabelText('PDF 용지'), {
      target: { value: 'letter' }
    })
    fireEvent.change(screen.getByLabelText('PDF 방향'), {
      target: { value: 'landscape' }
    })
    fireEvent.change(screen.getByLabelText('PDF 여백 mm'), {
      target: { value: '12' }
    })
    fireEvent.change(screen.getByLabelText('PDF 보표 크기'), {
      target: { value: '90' }
    })
    fireEvent.change(screen.getByLabelText('PDF 시스템 간격'), {
      target: { value: '120' }
    })

    expect(screen.getByText('PDF 페이지 설정을 갱신했습니다.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: 'PDF 변환' }))

    await waitFor(() => expect(window.inC.pdf.save).toHaveBeenCalled())
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-print-page-css-size',
      'Letter landscape'
    )
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-print-layout-margin',
      '12'
    )
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-print-layout-scale',
      '0.9'
    )
    expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
      'data-pdf-page-size',
      'letter'
    )
    expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
      'data-pdf-page-orientation',
      'landscape'
    )
    expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
      'data-pdf-page-margin-mm',
      '12'
    )
    expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
      'data-pdf-staff-size-percent',
      '90'
    )
    expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
      'data-pdf-system-spacing-percent',
      '120'
    )
    expect(
      Number(
        screen
          .getByTestId('notation-preview')
          .getAttribute('data-print-layout-width')
      )
    ).toBeGreaterThan(900)

    finishPdfSave?.({ fileName: 'letter-landscape.pdf' })
    expect(
      await screen.findByText('letter-landscape.pdf로 PDF를 만들었습니다.')
    ).toBeInTheDocument()
  })

  it('layout.page-setup applies V1 PDF presets to the export layout', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    let finishPdfSave: ((value: { fileName: string }) => void) | undefined
    vi.mocked(window.inC.pdf.save).mockImplementation(
      () =>
        new Promise((resolve) => {
          finishPdfSave = resolve
        })
    )
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    const presetSelect = screen.getByLabelText('PDF 설정 프리셋')

    expect(presetSelect).toHaveValue('default-a4')
    fireEvent.change(presetSelect, { target: { value: 'publication-a4' } })

    expect(screen.getByLabelText('PDF 용지')).toHaveValue('a4')
    expect(screen.getByLabelText('PDF 방향')).toHaveValue('portrait')
    expect(screen.getByLabelText('PDF 여백 mm')).toHaveValue(12)
    expect(screen.getByLabelText('PDF 보표 크기')).toHaveValue('95')
    expect(screen.getByLabelText('PDF 시스템 간격')).toHaveValue('125')
    expect(presetSelect).toHaveValue('publication-a4')
    expect(screen.getByText('PDF 페이지 설정을 갱신했습니다.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: 'PDF 변환' }))

    await waitFor(() => expect(window.inC.pdf.save).toHaveBeenCalled())
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-print-page-css-size',
      'A4 portrait'
    )
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-print-layout-margin',
      '12'
    )
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-print-layout-scale',
      '0.95'
    )
    expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
      'data-pdf-page-size',
      'a4'
    )
    expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
      'data-pdf-page-orientation',
      'portrait'
    )
    expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
      'data-pdf-page-margin-mm',
      '12'
    )
    expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
      'data-pdf-staff-size-percent',
      '95'
    )
    expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
      'data-pdf-system-spacing-percent',
      '125'
    )

    finishPdfSave?.({ fileName: 'publication.pdf' })
    expect(
      await screen.findByText('publication.pdf로 PDF를 만들었습니다.')
    ).toBeInTheDocument()
  })

  it('import-export.export-unsupported-musicxml-report warns when MusicXML cannot preserve page setup', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    vi.mocked(window.inC.musicXml.save).mockResolvedValue({
      filePath: '/scores/release-test.musicxml',
      fileName: 'release-test.musicxml'
    })
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    fireEvent.change(screen.getByLabelText('PDF 용지'), {
      target: { value: 'letter' }
    })
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))

    await waitFor(() => {
      expect(window.inC.musicXml.save).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestedName: 'release-test.musicxml',
          contents: expect.stringContaining('<score-partwise')
        })
      )
    })
    expect(
      await screen.findByText(
        /release-test\.musicxml을 MusicXML로 내보냈습니다\. MusicXML 내보내기 경고 1개: score\.layout\.pageSetup/
      )
    ).toBeInTheDocument()
    const report = await screen.findByRole('region', {
      name: 'MusicXML 경고 상세'
    })
    expect(
      within(report).getByText('MusicXML 내보내기 경고 1개')
    ).toBeInTheDocument()
    expect(within(report).getByText('release-test.musicxml')).toBeInTheDocument()
    expect(within(report).getByText('unsupported-layout')).toBeInTheDocument()
    expect(within(report).getByText('score.layout.pageSetup')).toBeInTheDocument()
  })

  it('import-export.save-pdf disables PDF export when the target page count is zero', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    const pageTarget = screen.getByLabelText('PDF 목표 장수')
    const pdfButton = screen.getByRole('button', { name: 'PDF 변환' })

    fireEvent.change(pageTarget, { target: { value: '0' } })

    expect(pageTarget).toHaveAccessibleDescription(
      'PDF 장수는 1 이상이어야 합니다.'
    )
    expect(pdfButton).toBeDisabled()
    expect(pdfButton).toHaveAccessibleDescription(
      'PDF 장수는 1 이상이어야 합니다.'
    )
    fireEvent.click(pdfButton)
    expect(window.inC.pdf.save).not.toHaveBeenCalled()
  })

  it('import-export.distinguish-musicxml-save-from-autosave keeps file save separate from import and recovery', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    const editor = render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    const fileActions = screen.getByLabelText('파일 작업')
    const importButton = within(fileActions).getByRole('button', {
      name: 'MusicXML 가져오기'
    })
    const saveButton = within(fileActions).getByRole('button', {
      name: 'MusicXML로 저장'
    })

    expect(importButton).not.toBe(saveButton)
    expect(saveButton).toHaveAttribute(
      'title',
      '현재 악보를 MusicXML 파일로 저장'
    )

    editor.unmount()
    window.history.replaceState({}, '', '/')
    render(<App />)

    const startActions = screen.getByLabelText('시작 작업')
    const recoveryButton = within(startActions).getByRole('button', {
      name: /복구본 없음/
    })

    expect(recoveryButton).not.toBe(importButton)
    expect(recoveryButton).not.toBe(saveButton)
    expect(recoveryButton).toHaveTextContent(
      '자동저장된 작업이 있으면 여기에 표시됩니다.'
    )
  })

  it('import-export.keyboard-save uses Ctrl+S without a current file path', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    vi.mocked(window.inC.musicXml.save).mockResolvedValue({
      filePath: '/scores/release-test.musicxml',
      fileName: 'release-test.musicxml'
    })
    const { App } = await import('./App')
    render(<App />)

    fireEvent.keyDown(window, {
      code: 'KeyS',
      ctrlKey: true,
      key: 's'
    })

    await waitFor(() => {
      expect(window.inC.musicXml.save).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestedName: 'release-test.musicxml',
          contents: expect.stringContaining('<score-partwise')
        })
      )
    })
    expect(
      vi.mocked(window.inC.musicXml.save).mock.calls[0]?.[0]
    ).not.toHaveProperty('filePath')
  })

  it('import-export.blocks-save-while-tuplet-input-preview-is-active', async () => {
    const recentFile = {
      filePath: '/scores/tuplet-input-progress.musicxml',
      fileName: 'tuplet-input-progress.musicxml',
      openedAt: '2026-07-28T00:00:00.000Z'
    }
    vi.mocked(window.inC.recentMusicXml.list).mockResolvedValue([recentFile])
    vi.mocked(window.inC.recentMusicXml.open).mockResolvedValue({
      ...recentFile,
      contents: tupletInputProgressMusicXml
    })
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(
      await screen.findByRole('button', {
        name: /tuplet-input-progress\.musicxml/
      })
    )
    const preview = await screen.findByTestId('notation-preview')
    const previewButtons = within(preview).getAllByRole('button')
    fireEvent.click(previewButtons.at(-1) as HTMLButtonElement)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.click(
      screen.getByRole('button', {
        name: /셋잇단음표 적용 또는 입력 준비/
      })
    )
    fireEvent.keyDown(window, { code: 'KeyC', key: 'c' })
    expect(preview.getAttribute('data-event-durations')).toContain('preview-')

    fireEvent.keyDown(window, {
      code: 'KeyS',
      metaKey: true,
      key: 's'
    })

    expect(window.inC.musicXml.save).not.toHaveBeenCalled()
    expect(document.querySelector('.editor-status')).toHaveTextContent(
      '셋잇단음표 입력을 완료하거나 취소한 뒤 MusicXML로 저장해 주세요.'
    )
  })

  it('import-export.new-score-save suggests a Korean title filename and valid MusicXML', async () => {
    vi.mocked(window.inC.musicXml.save).mockResolvedValue({
      filePath: '/scores/제목-없는-악보.musicxml',
      fileName: '제목-없는-악보.musicxml'
    })
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /새 악보 만들기/ }))
    fireEvent.click(
      within(screen.getByRole('dialog', { name: '새 악보 만들기' })).getByRole(
        'button',
        { name: '만들기' }
      )
    )
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))

    await waitFor(() => {
      expect(window.inC.musicXml.save).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestedName: '제목-없는-악보.musicxml'
        })
      )
    })
    const contents = vi.mocked(window.inC.musicXml.save).mock.calls[0]?.[0]
      .contents
    const savedScore = parseMusicXml(contents!)

    expect(savedScore.title).toBe('제목 없는 악보')
    expect(
      savedScore.parts[0].staves[0].measures[0].voices[0].events
    ).toHaveLength(1)
  })

  it('import-export.saved-musicxml-preserves-note-pitches-after-reopen', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    vi.mocked(window.inC.musicXml.save).mockResolvedValue({
      filePath: '/scores/release-test.musicxml',
      fileName: 'release-test.musicxml'
    })
    const { App } = await import('./App')
    render(<App />)
    const beforePitches = screen
      .getByTestId('notation-preview')
      .getAttribute('data-event-pitches')
      ?.split(',')
      .map((value) => value.replace(/^[^:]+:/, ''))

    fireEvent.keyDown(window, {
      code: 'KeyS',
      metaKey: true,
      key: 's'
    })

    await waitFor(() => {
      expect(window.inC.musicXml.save).toHaveBeenCalled()
    })
    const contents = vi.mocked(window.inC.musicXml.save).mock.calls[0]?.[0]
      .contents
    const savedScore = parseMusicXml(contents!)
    const savedPitches = savedScore.parts[0].staves[0].measures
      .flatMap((measure) => measure.voices[0].events)
      .map((event) =>
        event.type === 'note'
          ? `${event.pitch.step}${event.pitch.alter ?? ''}${event.pitch.octave}`
          : 'rest'
      )

    expect(savedPitches).toEqual(beforePitches)
  })

  it('import-export.ensemble-part-input-save-reopen preserves part-addressed notes through MusicXML', async () => {
    window.history.replaceState({}, '', '/')
    let savedContents = ''
    const savedFile = {
      filePath: '/scores/string-quartet-parts.musicxml',
      fileName: 'string-quartet-parts.musicxml',
      openedAt: '2026-09-03T00:00:00.000Z'
    }
    vi.mocked(window.inC.musicXml.save).mockImplementation(async (input) => {
      savedContents = input.contents

      return {
        filePath: savedFile.filePath,
        fileName: savedFile.fileName
      }
    })
    vi.mocked(window.inC.recentMusicXml.add).mockResolvedValue([savedFile])

    const { App } = await import('./App')
    const { unmount } = render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /새 악보 만들기/ }))
    const dialog = screen.getByRole('dialog', { name: '새 악보 만들기' })
    fireEvent.change(within(dialog).getByLabelText('악보 구성'), {
      target: { value: 'string-quartet' }
    })
    fireEvent.click(within(dialog).getByRole('button', { name: '만들기' }))

    const entries = [
      { target: 'violin-1:staff-1', code: 'KeyE', key: 'e', step: 'E' },
      { target: 'violin-2:staff-1', code: 'KeyD', key: 'd', step: 'D' },
      { target: 'viola:staff-1', code: 'KeyC', key: 'c', step: 'C' },
      { target: 'cello:staff-1', code: 'KeyG', key: 'g', step: 'G' }
    ]

    for (const entry of entries) {
      fireEvent.change(screen.getByLabelText('입력 보표'), {
        target: { value: entry.target }
      })

      await waitFor(() => {
        expect(screen.getByLabelText('입력 보표')).toHaveValue(entry.target)
      })

      fireEvent.keyDown(window, { code: 'KeyN', key: 'n' })
      fireEvent.keyDown(window, { code: entry.code, key: entry.key })
      fireEvent.keyDown(window, { code: 'Escape', key: 'Escape' })
    }

    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))

    await waitFor(() => {
      expect(window.inC.musicXml.save).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestedName: '제목-없는-악보.musicxml',
          contents: expect.stringContaining('<score-partwise')
        })
      )
    })

    const savedScore = parseMusicXml(savedContents)
    expect(savedScore.parts.map((part) => part.id)).toEqual([
      'violin-1',
      'violin-2',
      'viola',
      'cello'
    ])
    for (const entry of entries) {
      const [partId] = entry.target.split(':')
      const savedPart = savedScore.parts.find((part) => part.id === partId)
      const firstEvent = savedPart?.staves[0]?.measures[0]?.voices[0]?.events[0]

      expect(firstEvent).toMatchObject({
        type: 'note',
        pitch: expect.objectContaining({ step: entry.step })
      })
    }

    unmount()
    vi.mocked(window.inC.recentMusicXml.list).mockResolvedValue([savedFile])
    vi.mocked(window.inC.recentMusicXml.open).mockResolvedValue({
      ...savedFile,
      contents: savedContents
    })

    render(<App />)
    fireEvent.click(
      await screen.findByRole('button', {
        name: /string-quartet-parts\.musicxml/
      })
    )

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-part-structure',
        'violin-1:Violin I:1|violin-2:Violin II:1|viola:Viola:1|cello:Cello:1'
      )
      const pitchData =
        screen.getByTestId('notation-preview').getAttribute('data-all-event-pitches') ??
        ''

      for (const entry of entries) {
        const [partId] = entry.target.split(':')

        expect(
          pitchData.split(',').some(
            (pitchEntry) =>
              pitchEntry.startsWith(`${partId}:`) &&
              pitchEntry.includes(':voice-1:') &&
              new RegExp(`:${entry.step}[-#b]?[0-9]+$`).test(pitchEntry)
          )
        ).toBe(true)
      }
    })
  })

  it('lyrics.chords.save-reopen preserves edited lyrics and chord symbols through MusicXML', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    let savedContents = ''
    const savedFile = {
      filePath: '/scores/lyrics-chords.musicxml',
      fileName: 'lyrics-chords.musicxml',
      openedAt: '2026-09-02T00:00:00.000Z'
    }
    vi.mocked(window.inC.musicXml.save).mockImplementation(async (input) => {
      savedContents = input.contents

      return {
        filePath: savedFile.filePath,
        fileName: savedFile.fileName
      }
    })
    vi.mocked(window.inC.recentMusicXml.add).mockResolvedValue([savedFile])

    const { App } = await import('./App')
    const { unmount } = render(<App />)

    const harmonyInput = screen.getByLabelText('코드 심벌')
    fireEvent.change(harmonyInput, { target: { value: 'C7/G' } })
    fireEvent.blur(harmonyInput)
    expect(screen.getByText('코드 심벌을 갱신했습니다.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '가사' }))
    const lyricInput = within(
      screen.getByTestId('notation-preview')
    ).getByLabelText('선택 음표 가사')
    fireEvent.change(lyricInput, { target: { value: 'Sing' } })
    fireEvent.blur(lyricInput)
    expect(screen.getByText('가사를 갱신했습니다.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('가사 음절'), {
      target: { value: 'begin' }
    })
    fireEvent.click(screen.getByText('멜리스마'))

    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))

    await waitFor(() => {
      expect(window.inC.musicXml.save).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestedName: 'release-test.musicxml',
          contents: expect.stringContaining('<score-partwise')
        })
      )
    })

    const savedScore = parseMusicXml(savedContents)
    const savedNote = savedScore.parts[0].staves[0].measures[0].voices[0]
      .events[0]

    expect(savedNote).toMatchObject({
      type: 'note',
      lyrics: [
        {
          number: 1,
          syllabic: 'begin',
          text: 'Sing',
          extend: true
        }
      ]
    })
    expect(savedScore.harmonies).toEqual([
      expect.objectContaining({
        measureId: 'measure-1',
        tick: 0,
        text: 'C7/G'
      })
    ])

    unmount()
    vi.mocked(window.inC.recentMusicXml.list).mockResolvedValue([savedFile])
    vi.mocked(window.inC.recentMusicXml.open).mockResolvedValue({
      ...savedFile,
      contents: savedContents
    })

    window.history.replaceState({}, '', '/')
    render(<App />)
    fireEvent.click(
      await screen.findByRole('button', { name: /lyrics-chords\.musicxml/ })
    )

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-lyrics',
        expect.stringContaining('event-1:1:begin:Sing')
      )
      expect(screen.getByTestId('notation-preview')).toHaveTextContent('C7/G')
    })
  })

  it('import-export.second-save-after-save-as reuses the first saved file path', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    vi.mocked(window.inC.musicXml.save).mockResolvedValue({
      filePath: '/scores/release-test.musicxml',
      fileName: 'release-test.musicxml'
    })
    const { App } = await import('./App')
    render(<App />)

    fireEvent.keyDown(window, {
      code: 'KeyS',
      metaKey: true,
      key: 's'
    })
    await screen.findByText(
      'release-test.musicxml을 MusicXML로 내보냈습니다.'
    )

    fireEvent.keyDown(window, {
      code: 'KeyS',
      metaKey: true,
      key: 's'
    })

    await waitFor(() => {
      expect(window.inC.musicXml.save).toHaveBeenCalledTimes(2)
    })
    expect(vi.mocked(window.inC.musicXml.save).mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        filePath: '/scores/release-test.musicxml',
        suggestedName: 'release-test.musicxml',
        contents: expect.stringContaining('<score-partwise')
      })
    )
  })

  it('import-export.remembers-the-saved-path-even-if-autosave-cleanup-fails', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    vi.mocked(window.inC.musicXml.save).mockResolvedValue({
      filePath: '/scores/release-test.musicxml',
      fileName: 'release-test.musicxml'
    })
    vi.mocked(window.inC.autosave.clear).mockRejectedValueOnce(
      new Error('autosave cleanup failed')
    )
    const { App } = await import('./App')
    render(<App />)

    fireEvent.keyDown(window, {
      code: 'KeyS',
      metaKey: true,
      key: 's'
    })
    await waitFor(() => {
      expect(window.inC.musicXml.save).toHaveBeenCalledTimes(1)
    })

    fireEvent.keyDown(window, {
      code: 'KeyS',
      metaKey: true,
      key: 's'
    })

    await waitFor(() => {
      expect(window.inC.musicXml.save).toHaveBeenCalledTimes(2)
    })
    expect(vi.mocked(window.inC.musicXml.save).mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        filePath: '/scores/release-test.musicxml'
      })
    )
  })

  it('import-export.report-pdf-result shows success and failure but not cancellation', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    const { unmount } = render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    vi.mocked(window.inC.pdf.save).mockResolvedValue({
      fileName: 'review.pdf'
    })
    fireEvent.click(screen.getByRole('button', { name: 'PDF 변환' }))
    expect(
      await screen.findByText('review.pdf로 PDF를 만들었습니다.')
    ).toBeInTheDocument()

    unmount()
    installPreloadStub()
    vi.mocked(window.inC.pdf.save).mockResolvedValue(null)
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: 'PDF 변환' }))
    await waitFor(() => expect(window.inC.pdf.save).toHaveBeenCalled())
    expect(screen.queryByText(/PDF를 만들었습니다/)).not.toBeInTheDocument()

    cleanup()
    installPreloadStub()
    vi.mocked(window.inC.pdf.save).mockRejectedValue(
      new Error('PDF 저장에 실패했습니다.')
    )
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: 'PDF 변환' }))
    expect(
      await screen.findByText('PDF 저장에 실패했습니다.')
    ).toBeInTheDocument()
  }, 15000)

  it('shows status terms and the notation preview mount point', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    expect(screen.getAllByText('4분음표').length).toBeGreaterThan(0)
    expect(screen.getByText('정지')).toBeInTheDocument()
    expect(screen.queryByText(/A-G로 선택한/)).not.toBeInTheDocument()
    expect(screen.getByTestId('notation-preview')).toBeInTheDocument()
  })

  it('note-input.switch-same-staff-voice creates a same-staff voice and keeps note input targeted there', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { App } = await import('./App')
    render(<App />)

    const voiceOne = screen.getByRole('button', { name: '1성부' })
    const voiceTwo = screen.getByRole('button', { name: '2성부' })

    expect(voiceOne).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(voiceTwo)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '2성부' })).toHaveAttribute(
        'aria-pressed',
        'true'
      )
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-voice-ids',
        expect.stringContaining('measure-1:voice-1/voice-2')
      )
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-selected-event-id',
        'measure-1-voice-2-full-measure-rest'
      )
    })

    fireEvent.keyDown(window, { code: 'KeyN', key: 'n' })
    fireEvent.keyDown(window, { code: 'KeyC', key: 'c' })

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-event-pitches',
        expect.stringContaining('measure-1-voice-2-full-measure-rest:C')
      )
    })
  })

  it('note-input.switch-staff-target moves note input to the selected grand staff staff', async () => {
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /새 악보 만들기/ }))
    const dialog = screen.getByRole('dialog', { name: '새 악보 만들기' })
    fireEvent.change(within(dialog).getByLabelText('악보 구성'), {
      target: { value: 'piano-grand-staff' }
    })
    fireEvent.click(within(dialog).getByRole('button', { name: '만들기' }))

    const staffTarget = screen.getByLabelText('입력 보표')
    expect(staffTarget).toHaveValue('part-1:staff-1')

    fireEvent.change(staffTarget, {
      target: { value: 'part-1:staff-2' }
    })

    await waitFor(() => {
      expect(screen.getByLabelText('입력 보표')).toHaveValue('part-1:staff-2')
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-selected-event-id',
        'part-1-staff-2-measure-1-full-measure-rest'
      )
    })

    fireEvent.keyDown(window, { code: 'KeyN', key: 'n' })
    fireEvent.keyDown(window, { code: 'KeyC', key: 'c' })

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-all-event-pitches',
        expect.stringContaining(
          'part-1:staff-2:part-1-staff-2-measure-1:voice-1:part-1-staff-2-measure-1-full-measure-rest:C04'
        )
      )
    })
  })

  it('note-input.switch-part-target moves note input to the selected ensemble part', async () => {
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /새 악보 만들기/ }))
    const dialog = screen.getByRole('dialog', { name: '새 악보 만들기' })
    fireEvent.change(within(dialog).getByLabelText('악보 구성'), {
      target: { value: 'duet' }
    })
    fireEvent.click(within(dialog).getByRole('button', { name: '만들기' }))

    const staffTarget = screen.getByLabelText('입력 보표')
    expect(staffTarget).toHaveValue('part-1:staff-1')

    fireEvent.change(staffTarget, {
      target: { value: 'part-2:staff-1' }
    })

    await waitFor(() => {
      expect(screen.getByLabelText('입력 보표')).toHaveValue('part-2:staff-1')
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-selected-event-id',
        'part-2-staff-1-measure-1-full-measure-rest'
      )
    })

    fireEvent.keyDown(window, { code: 'KeyN', key: 'n' })
    fireEvent.keyDown(window, { code: 'KeyC', key: 'c' })

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-all-event-pitches',
        expect.stringContaining(
          'part-2:staff-1:part-2-staff-1-measure-1:voice-1:part-2-staff-1-measure-1-full-measure-rest:C04'
        )
      )
    })
  })

  it('note-input.cycle-same-staff-voice supports V cycling and command-alt digit shortcuts', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.keyDown(window, { code: 'Digit3', key: '3', metaKey: true, altKey: true })

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '3성부' })).toHaveAttribute(
        'aria-pressed',
        'true'
      )
    )

    fireEvent.keyDown(window, { code: 'KeyV', key: 'v' })

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '4성부' })).toHaveAttribute(
        'aria-pressed',
        'true'
      )
    )

    fireEvent.keyDown(window, { code: 'KeyV', key: 'V', shiftKey: true })

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '3성부' })).toHaveAttribute(
        'aria-pressed',
        'true'
      )
    )
  })

  it('range-editing.same-staff-voice-copy-paste keeps navigation in the pasted voice', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'note-c4 선택' }))
    fireEvent.click(screen.getByRole('button', { name: 'note-f-sharp-4 선택' }), {
      shiftKey: true
    })
    fireEvent.keyDown(window, { code: 'KeyC', key: 'c', metaKey: true })
    fireEvent.click(screen.getByRole('button', { name: '2성부' }))
    fireEvent.keyDown(window, { code: 'KeyV', key: 'v', metaKey: true })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '2성부' })).toHaveAttribute(
        'aria-pressed',
        'true'
      )
    })

    const pastedEventId = screen
      .getByTestId('notation-preview')
      .getAttribute('data-selected-event-id')
    const eventPitches = screen
      .getByTestId('notation-preview')
      .getAttribute('data-event-pitches')
    const pastedEventIds =
      eventPitches
        ?.match(/event-[^:]+:[A-G][^,]*/g)
        ?.map((entry) => entry.split(':')[0]) ?? []

    expect(pastedEventId).toMatch(/^event-/)
    expect(pastedEventIds.length).toBeGreaterThanOrEqual(2)

    fireEvent.click(
      screen.getByRole('button', { name: `${pastedEventIds[1]} 선택` }),
      { shiftKey: true }
    )

    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-selected-event-ids',
      pastedEventIds.slice(0, 2).join(',')
    )
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-selected-event-address',
      expect.stringContaining(':voice-2')
    )

    fireEvent.keyDown(window, { key: 'ArrowLeft' })

    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-selected-event-id',
      pastedEventId
    )
    expect(screen.getByRole('button', { name: '2성부' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('tuplets.report-input-progress reports 0/3 through completion in the live status', async () => {
    const recentFile = {
      filePath: '/scores/tuplet-input-progress.musicxml',
      fileName: 'tuplet-input-progress.musicxml',
      openedAt: '2026-07-28T00:00:00.000Z'
    }
    vi.mocked(window.inC.recentMusicXml.list).mockResolvedValue([recentFile])
    vi.mocked(window.inC.recentMusicXml.open).mockResolvedValue({
      ...recentFile,
      contents: tupletInputProgressMusicXml
    })
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(
      await screen.findByRole('button', {
        name: /tuplet-input-progress\.musicxml/
      })
    )
    const preview = await screen.findByTestId('notation-preview')
    const previewButtons = within(preview).getAllByRole('button')
    fireEvent.click(previewButtons.at(-1) as HTMLButtonElement)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.click(
      screen.getByRole('button', {
        name: /셋잇단음표 적용 또는 입력 준비/
      })
    )

    const liveStatus = document.querySelector('.editor-status')
    expect(liveStatus).toHaveAttribute('aria-live', 'polite')
    expect(liveStatus).toHaveTextContent('셋잇단음표 입력')
    expect(liveStatus).toHaveTextContent('셋잇단음표 0/3')

    fireEvent.keyDown(window, { code: 'KeyC', key: 'c' })
    expect(liveStatus).toHaveTextContent('셋잇단음표 1/3')
    expect(liveStatus).toHaveTextContent(
      '셋잇단음표 1/3개 입력됨. 2개 더 입력해 주세요.'
    )

    fireEvent.keyDown(window, { code: 'KeyD', key: 'd' })
    expect(liveStatus).toHaveTextContent('셋잇단음표 2/3')
    expect(liveStatus).toHaveTextContent(
      '셋잇단음표 2/3개 입력됨. 1개 더 입력해 주세요.'
    )

    fireEvent.keyDown(window, { code: 'KeyE', key: 'e' })
    expect(liveStatus).toHaveTextContent('셋잇단음표 입력을 완료했습니다.')
    expect(liveStatus).toHaveTextContent('입력 중')
    expect(liveStatus).not.toHaveTextContent('셋잇단음표 2/3')
  })

  it('tuplets.input-mixed-duration completes an eighth-plus-quarter triplet from the toolbar', async () => {
    const recentFile = {
      filePath: '/scores/tuplet-input-progress.musicxml',
      fileName: 'tuplet-input-progress.musicxml',
      openedAt: '2026-07-28T00:00:00.000Z'
    }
    vi.mocked(window.inC.recentMusicXml.list).mockResolvedValue([recentFile])
    vi.mocked(window.inC.recentMusicXml.open).mockResolvedValue({
      ...recentFile,
      contents: tupletInputProgressMusicXml
    })
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(
      await screen.findByRole('button', {
        name: /tuplet-input-progress\.musicxml/
      })
    )
    const preview = await screen.findByTestId('notation-preview')
    const previewButtons = within(preview).getAllByRole('button')
    fireEvent.click(previewButtons.at(-1) as HTMLButtonElement)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.click(
      screen.getByRole('button', {
        name: /셋잇단음표 적용 또는 입력 준비/
      })
    )

    fireEvent.keyDown(window, { code: 'KeyC', key: 'c' })
    const quarterButton = screen.getByRole('button', {
      name: '4분음표, 단축키 5'
    })
    expect(quarterButton).not.toBeDisabled()
    fireEvent.click(quarterButton)
    fireEvent.keyDown(window, { code: 'KeyD', key: 'd' })

    await waitFor(() => {
      expect(document.querySelector('.editor-status')).toHaveTextContent(
        '셋잇단음표 입력을 완료했습니다.'
      )
    })
  })

  it('tuplets.edit-member-duration changes a selected tuplet eighth to a quarter with Digit5', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'note-g4 선택' }))
    fireEvent.click(
      screen.getByRole('button', {
        name: /셋잇단음표 적용 또는 입력 준비/
      })
    )
    fireEvent.click(screen.getByRole('button', { name: 'note-a4 선택' }))
    fireEvent.keyDown(window, {
      code: 'Digit5',
      key: '5'
    })

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-event-durations',
        expect.stringContaining('note-a4:quarter:3:2')
      )
    })
    expect(screen.getByTestId('notation-preview')).not.toHaveAttribute(
      'data-event-durations',
      expect.stringContaining('tuplet-remainder')
    )
    expect(
      screen.queryByText('셋잇단음표 구성음의 음가는 아직 따로 바꿀 수 없습니다.')
    ).not.toBeInTheDocument()

    fireEvent.keyDown(window, {
      code: 'Digit4',
      key: '4'
    })

    await waitFor(() => {
      const durations = screen
        .getByTestId('notation-preview')
        .getAttribute('data-event-durations')

      expect(durations).toContain('note-a4:eighth:3:2')
      expect(durations).toMatch(/event-[^,]+:eighth:3:2/)
    })
    expect(
      screen.queryByText('셋잇단음표 구성음의 음가는 아직 따로 바꿀 수 없습니다.')
    ).not.toBeInTheDocument()
  })

  it('layout.rehearsal-mark adds A to the selected measure preview', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    const rehearsalMarkInput = screen.getByLabelText('연습표')
    const preview = screen.getByTestId('notation-preview')

    fireEvent.change(rehearsalMarkInput, { target: { value: '' } })
    fireEvent.blur(rehearsalMarkInput)
    expect(within(preview).queryByText('A')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('연습표'), {
      target: { value: 'A' }
    })
    fireEvent.blur(screen.getByLabelText('연습표'))

    expect(within(preview).getByText('A')).toHaveAttribute(
      'data-measure-id',
      'measure-1'
    )
  })

  it('layout.staff-text adds dolce without triggering a note shortcut', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    const staffTextInput = screen.getByLabelText('보표 글자')
    const preview = screen.getByTestId('notation-preview')
    const initialEventCount = preview.getAttribute('data-event-count')

    fireEvent.keyDown(staffTextInput, { key: 'c' })
    expect(preview).toHaveAttribute('data-event-count', initialEventCount)

    fireEvent.change(staffTextInput, { target: { value: 'dolce' } })
    fireEvent.blur(staffTextInput)

    expect(within(preview).getByText('dolce')).toHaveAttribute(
      'data-measure-id',
      'measure-1'
    )
  })

  it('layout.system-text adds a system-level text without triggering a note shortcut', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    const systemTextInput = screen.getByLabelText('시스템 텍스트')
    const preview = screen.getByTestId('notation-preview')
    const initialEventCount = preview.getAttribute('data-event-count')

    fireEvent.keyDown(systemTextInput, { key: 'c' })
    expect(preview).toHaveAttribute('data-event-count', initialEventCount)

    fireEvent.change(systemTextInput, { target: { value: 'Chorus' } })
    fireEvent.blur(systemTextInput)

    expect(within(preview).getByText('Chorus')).toHaveAttribute(
      'data-measure-id',
      'measure-1'
    )
  })

  it('layout.expression-text adds espressivo at the selected tick without triggering a note shortcut', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'm1-c4 선택' }))
    const expressionTextInput = screen.getByLabelText('표현 텍스트')
    const preview = screen.getByTestId('notation-preview')
    const initialEventCount = preview.getAttribute('data-event-count')

    fireEvent.keyDown(expressionTextInput, { key: 'c' })
    expect(preview).toHaveAttribute('data-event-count', initialEventCount)

    fireEvent.change(expressionTextInput, { target: { value: 'espressivo' } })
    fireEvent.blur(expressionTextInput)

    expect(within(preview).getByText('espressivo')).toHaveAttribute(
      'data-measure-id',
      'measure-1'
    )
    expect(within(preview).getByText('espressivo')).toHaveAttribute(
      'data-tick',
      '0'
    )
  })

  it('keyboard.navigation-first keeps plain vertical arrows from editing pitch', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'm1-c4 선택' }))
    const preview = screen.getByTestId('notation-preview')
    const initialPitches = preview.getAttribute('data-event-pitches')

    fireEvent.keyDown(window, { key: 'ArrowUp' })
    expect(preview).toHaveAttribute('data-event-pitches', initialPitches)
    expect(document.querySelector('.editor-status')).toHaveTextContent(
      '음높이 변경은 Alt/Option+↑/↓를 사용하세요.'
    )

    fireEvent.keyDown(window, { altKey: true, key: 'ArrowUp' })

    await waitFor(() => {
      expect(preview.getAttribute('data-event-pitches')).toContain('m1-c4:D04')
    })
  })

  it('keyboard.navigation-first moves plain vertical arrows between grand staff lanes', async () => {
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /새 악보 만들기/ }))
    const dialog = screen.getByRole('dialog', { name: '새 악보 만들기' })
    fireEvent.change(within(dialog).getByLabelText('악보 구성'), {
      target: { value: 'piano-grand-staff' }
    })
    fireEvent.click(within(dialog).getByRole('button', { name: '만들기' }))

    fireEvent.click(
      screen.getByRole('button', {
        name: 'part-1-staff-1-measure-1-full-measure-rest 선택'
      })
    )
    fireEvent.keyDown(window, { key: 'ArrowDown' })

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-selected-event-id',
        'part-1-staff-2-measure-1-full-measure-rest'
      )
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-selected-event-address',
        'part-1:staff-2:part-1-staff-2-measure-1:voice-1'
      )
    })
    expect(screen.getByText('아래 보표로 이동했습니다.')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'ArrowUp' })

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-selected-event-id',
        'part-1-staff-1-measure-1-full-measure-rest'
      )
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-selected-event-address',
        'part-1:staff-1:part-1-staff-1-measure-1:voice-1'
      )
    })
    expect(screen.getByText('위 보표로 이동했습니다.')).toBeInTheDocument()
  })

  it('keyboard.enharmonic-respell changes spelling without moving the selected pitch', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'm1-f-sharp-4 선택' }))
    const preview = screen.getByTestId('notation-preview')

    expect(preview.getAttribute('data-event-pitches')).toContain(
      'm1-f-sharp-4:F14'
    )

    fireEvent.keyDown(window, { code: 'KeyJ', key: 'j' })

    await waitFor(() => {
      expect(preview.getAttribute('data-event-pitches')).toContain(
        'm1-f-sharp-4:G-14'
      )
    })
    expect(screen.getByText('이명동음으로 바꿨습니다.')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'z', metaKey: true })

    await waitFor(() => {
      expect(preview.getAttribute('data-event-pitches')).toContain(
        'm1-f-sharp-4:F14'
      )
    })
  })

  it('layout.dynamics adds professional dynamics to the selected measure preview', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    expect(screen.getByRole('option', { name: 'pp' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'ff' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'sfz' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('셈여림'), {
      target: { value: 'ff' }
    })

    const dynamic = within(screen.getByTestId('notation-preview')).getByText('ff')
    expect(dynamic).toHaveAttribute('data-measure-id', 'measure-1')
    expect(dynamic).not.toHaveAttribute('data-measure-id', 'measure-2')
  })

  it('layout.hairpin-toggle adds, replaces, and removes a hairpin for the selected range', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'm1-c4 선택' }))
    fireEvent.click(screen.getByRole('button', { name: 'm1-f-sharp-4 선택' }), {
      shiftKey: true
    })

    const preview = screen.getByTestId('notation-preview')
    const crescendoButton = screen.getByRole('button', {
      name: '크레셴도 헤어핀'
    })
    const diminuendoButton = screen.getByRole('button', {
      name: '디미누엔도 헤어핀'
    })

    expect(within(preview).getByText('m1-c4–m1-f-sharp-4')).toHaveAttribute(
      'data-hairpin-type',
      'crescendo'
    )

    fireEvent.click(crescendoButton)
    expect(within(preview).queryByText('m1-c4–m1-f-sharp-4')).not.toBeInTheDocument()

    fireEvent.click(diminuendoButton)
    expect(within(preview).getByText('m1-c4–m1-f-sharp-4')).toHaveAttribute(
      'data-hairpin-type',
      'diminuendo'
    )

    fireEvent.click(diminuendoButton)
    expect(within(preview).queryByText('m1-c4–m1-f-sharp-4')).not.toBeInTheDocument()
  })

  it('layout.slur-toggle adds and removes a slur with the range command and shortcut', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'm1-c4 선택' }))
    fireEvent.click(screen.getByRole('button', { name: 'm1-f-sharp-4 선택' }), {
      shiftKey: true
    })

    const preview = screen.getByTestId('notation-preview')
    const slurLabel = 'slur:m1-c4–m1-f-sharp-4'
    const slurButton = screen.getByRole('button', {
      name: '슬러 추가 또는 해제, 단축키 S'
    })

    expect(within(preview).getByText(slurLabel)).toHaveAttribute('data-slur', 'true')

    fireEvent.click(slurButton)
    expect(within(preview).queryByText(slurLabel)).not.toBeInTheDocument()

    fireEvent.keyDown(window, { code: 'KeyS', key: 'ㄴ' })
    expect(within(preview).getByText(slurLabel)).toHaveAttribute('data-slur', 'true')
  })

  it('layout.slur-keyboard-input starts a slur range and confirms it with S', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'm1-d4 선택' }))
    fireEvent.keyDown(window, { code: 'KeyS', key: 'ㄴ' })

    expect(
      screen.getByText(
        '슬러 시작점을 선택했습니다. ←/→로 끝 음표를 고르고 S로 확정하세요.'
      )
    ).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-selected-event-id',
      'm1-e4'
    )

    fireEvent.keyDown(window, { code: 'KeyS', key: 'ㄴ' })
    expect(
      within(screen.getByTestId('notation-preview')).getByText('slur:m1-d4–m1-e4')
    ).toHaveAttribute('data-slur', 'true')
  })

  it('import-export.save-multiple-auto-numbered-slurs keeps MusicXML validation stable', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    vi.mocked(window.inC.musicXml.save).mockResolvedValue({
      filePath: '/scores/release-test.musicxml',
      fileName: 'release-test.musicxml'
    })
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'm1-d4 선택' }))
    fireEvent.keyDown(window, { code: 'KeyS', key: 'ㄴ' })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { code: 'KeyS', key: 'ㄴ' })
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))

    await waitFor(() => {
      expect(window.inC.musicXml.save).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestedName: 'release-test.musicxml',
          contents: expect.stringContaining('<score-partwise')
        })
      )
    })
    const contents = vi.mocked(window.inC.musicXml.save).mock.calls[0]?.[0]
      .contents
    const savedScore = parseMusicXml(contents!)

    expect(savedScore.slurs?.map((slur) => slur.number).sort()).toEqual([
      1,
      2,
      3
    ])
    expect(
      await screen.findByText('release-test.musicxml을 MusicXML로 내보냈습니다.')
    ).toBeInTheDocument()
  })

  it('layout.fermata toggles the selected event mark in data and preview', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    const fermataButton = screen.getByRole('button', { name: '페르마타' })
    const preview = screen.getByTestId('notation-preview')

    expect(fermataButton).toHaveAttribute('aria-pressed', 'true')
    expect(within(preview).getByText('페르마타 표시')).toHaveAttribute(
      'data-event-id',
      'm1-c4'
    )

    fireEvent.click(fermataButton)
    expect(fermataButton).toHaveAttribute('aria-pressed', 'false')
    expect(within(preview).queryByText('페르마타 표시')).not.toBeInTheDocument()

    fireEvent.click(fermataButton)
    expect(fermataButton).toHaveAttribute('aria-pressed', 'true')
    expect(within(preview).getByText('페르마타 표시')).toHaveAttribute(
      'data-event-id',
      'm1-c4'
    )
  })

  it('note-input.edit-selected-event-in-inspector note-input.apply-accidental edits duration, dots, accidental, and event type without duplicate duration controls', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    const inspector = screen.getByRole('region', { name: '음표 편집' })
    const durationPalette = screen.getByLabelText('음가')
    const eighthDuration = within(durationPalette).getByRole('button', {
      name: '8분음표, 단축키 4'
    })
    const quarterDuration = within(durationPalette).getByRole('button', {
      name: '4분음표, 단축키 5'
    })

    expect(within(inspector).queryByLabelText('선택 이벤트 음가')).not.toBeInTheDocument()

    fireEvent.click(eighthDuration)
    expect(eighthDuration).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(within(inspector).getByRole('button', { name: '+' }))
    expect(
      within(inspector).getByLabelText('선택 이벤트 점 개수')
    ).toHaveTextContent('1')

    fireEvent.click(quarterDuration)
    expect(quarterDuration).toHaveAttribute('aria-pressed', 'true')
    expect(
      within(inspector).getByLabelText('선택 이벤트 점 개수')
    ).toHaveTextContent('0')

    const sharp = within(inspector).getByRole('button', { name: '샤프' })
    fireEvent.click(sharp)
    expect(sharp).toHaveAttribute('aria-pressed', 'true')

    const convertToRest = within(inspector).getByRole('button', {
      name: '쉼표로 변환'
    })
    fireEvent.click(convertToRest)
    expect(convertToRest).toBeDisabled()
    expect(quarterDuration).toHaveAttribute('aria-pressed', 'true')

    fireEvent.keyDown(window, { code: 'KeyZ', key: 'z', metaKey: true })
    expect(convertToRest).toBeEnabled()
  }, 15000)

  it('keyboard.duration-shortcuts use the V1 notation map and leave plain 9 unbound', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    const durationPalette = screen.getByLabelText('음가')

    expect(
      within(durationPalette).getByRole('button', {
        name: '64분음표, 단축키 1'
      })
    ).toBeInTheDocument()
    expect(
      within(durationPalette).getByRole('button', {
        name: '32분음표, 단축키 2'
      })
    ).toBeInTheDocument()
    expect(
      within(durationPalette).getByRole('button', {
        name: '16분음표, 단축키 3'
      })
    ).toBeInTheDocument()
    expect(
      within(durationPalette).getByRole('button', {
        name: '8분음표, 단축키 4'
      })
    ).toBeInTheDocument()
    expect(
      within(durationPalette).getByRole('button', {
        name: '4분음표, 단축키 5'
      })
    ).toBeInTheDocument()
    expect(
      within(durationPalette).getByRole('button', {
        name: '2분음표, 단축키 6'
      })
    ).toBeInTheDocument()
    expect(
      within(durationPalette).getByRole('button', {
        name: '온음표, 단축키 7'
      })
    ).toBeInTheDocument()
    expect(
      within(durationPalette).getByRole('button', {
        name: /셋잇단음표 적용 또는 입력 준비, 단축키 ⌘\/Ctrl\+3/
      })
    ).toBeInTheDocument()

    fireEvent.keyDown(window, { code: 'Digit9', key: '9' })

    expect(document.querySelector('.editor-status')).not.toHaveTextContent(
      '셋잇단음표 입력'
    )
    expect(
      screen.queryByRole('button', {
        name: /단축키 9/
      })
    ).not.toBeInTheDocument()
  })

  it('layout.breath-marks replaces a breath mark with a caesura on the selected event', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    const preview = screen.getByTestId('notation-preview')
    const breathButton = screen.getByRole('button', { name: '숨표' })
    const caesuraButton = screen.getByRole('button', { name: '중지표' })

    fireEvent.click(breathButton)
    expect(breathButton).toHaveAttribute('aria-pressed', 'true')
    expect(within(preview).getByText('숨표 표시')).toHaveAttribute(
      'data-event-id',
      'm1-c4'
    )

    fireEvent.click(caesuraButton)
    expect(breathButton).toHaveAttribute('aria-pressed', 'false')
    expect(caesuraButton).toHaveAttribute('aria-pressed', 'true')
    expect(within(preview).queryByText('숨표 표시')).not.toBeInTheDocument()
    expect(within(preview).getByText('중지표 표시')).toHaveAttribute(
      'data-event-id',
      'm1-c4'
    )
  })

  it('tremolo.apply-selected-note stores and displays three marks on the selected note', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    const preview = screen.getByTestId('notation-preview')
    const threeMarksButton = screen.getByRole('button', { name: '3줄' })

    fireEvent.click(threeMarksButton)

    expect(threeMarksButton).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('트레몰로를 추가했습니다.')).toBeInTheDocument()
    expect(within(preview).getByText('트레몰로 3줄 표시')).toHaveAttribute(
      'data-event-id',
      'm1-c4'
    )
  })

  it('ornaments.add-selected-note stores and displays tr on the selected note', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    const preview = screen.getByTestId('notation-preview')
    const trillButton = screen.getByRole('button', { name: 'tr' })

    fireEvent.click(trillButton)

    expect(trillButton).toHaveAttribute('aria-pressed', 'true')
    expect(within(preview).getByText('tr')).toHaveAttribute(
      'data-event-id',
      'm1-c4'
    )
  })

  it('ornaments.remove-selected-note removes tr from the selected note', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    const preview = screen.getByTestId('notation-preview')
    const trillButton = screen.getByRole('button', { name: 'tr' })

    fireEvent.click(trillButton)
    fireEvent.click(trillButton)

    expect(trillButton).not.toHaveAttribute('aria-pressed')
    expect(within(preview).queryByText('tr')).not.toBeInTheDocument()
  })

  it('ornaments.keep-multiple keeps tr, mord. and turn together', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    const preview = screen.getByTestId('notation-preview')
    const trillButton = screen.getByRole('button', { name: 'tr' })
    const mordentButton = screen.getByRole('button', { name: 'mord.' })
    const turnButton = screen.getByRole('button', { name: 'turn' })

    fireEvent.click(trillButton)
    fireEvent.click(mordentButton)
    fireEvent.click(turnButton)

    expect(trillButton).toHaveAttribute('aria-pressed', 'true')
    expect(mordentButton).toHaveAttribute('aria-pressed', 'true')
    expect(turnButton).toHaveAttribute('aria-pressed', 'true')
    expect(within(preview).getByText('tr mord. turn')).toHaveAttribute(
      'data-event-id',
      'm1-c4'
    )
  })

  it('runs notation extension controls through the editor command flow', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '3도 추가' }))
    expect(screen.getByText('화음 구성음을 추가했습니다.')).toBeInTheDocument()

    const harmonyInput = screen.getByLabelText('코드 심벌')
    fireEvent.change(harmonyInput, { target: { value: 'H13' } })
    fireEvent.blur(harmonyInput)
    expect(
      screen.getByText(/지원하는 코드 심벌 형식/)
    ).toBeInTheDocument()

    fireEvent.change(harmonyInput, { target: { value: 'C7/G' } })
    fireEvent.blur(harmonyInput)
    expect(screen.getByText('코드 심벌을 갱신했습니다.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'tr' }))
    expect(screen.getByText('장식음을 갱신했습니다.')).toBeInTheDocument()
  })
})

function asciiBytes(bytes: number[], start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length))
}
