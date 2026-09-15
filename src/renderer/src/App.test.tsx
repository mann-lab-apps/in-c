// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import {
  act,
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
import richPartExportMusicXml from '../../musicxml/fixtures/expanded-v1-part-export.musicxml?raw'
import restHairpinMusicXml from '../../musicxml/fixtures/rest-hairpin-input.musicxml?raw'
import releaseQaMusicXml from '../../musicxml/fixtures/release-qa.musicxml?raw'
import { parseMusicXml } from '../../musicxml'
import { TICKS_PER_QUARTER } from '../../score-core'
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
      data-page-breaks={(score.layout?.pageBreakBeforeMeasureIds ?? []).join(',')}
      data-system-breaks={(score.layout?.systemBreakBeforeMeasureIds ?? []).join(',')}
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
    project: { open: vi.fn().mockResolvedValue(null), save: vi.fn().mockResolvedValue(null), listBackups: vi.fn().mockResolvedValue([]), readBackup: vi.fn() },
    autosave: {
      clear: vi.fn().mockResolvedValue(undefined),
      read: vi.fn().mockResolvedValue(undefined),
      write: vi.fn().mockResolvedValue(undefined)
    },
    musicXml: {
      open: vi.fn().mockResolvedValue(undefined),
      exportCopy: vi.fn().mockResolvedValue(undefined),
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
  // Isolate each test from jsdom origins and Node's partial global Storage stub.
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
    expect(screen.getByLabelText('최근 악보 파일')).toBeInTheDocument()
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
    expect(await screen.findByRole('button', { name: /복구본 없음/ })).toBeDisabled()
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

    fireEvent.click(screen.getByRole('button', { name: '표기 객체' }))
    fireEvent.change(screen.getByRole('textbox', { name: '보표 글자' }), {
      target: { value: 'dolce lower' }
    })
    fireEvent.blur(screen.getByRole('textbox', { name: '보표 글자' }))
    fireEvent.change(screen.getByRole('textbox', { name: '표현 텍스트' }), {
      target: { value: 'sotto voce' }
    })
    fireEvent.blur(screen.getByRole('textbox', { name: '표현 텍스트' }))
    fireEvent.change(screen.getByRole('combobox', { name: '셈여림' }), {
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

  it('score-setup.built-in-template-picker creates an ensemble from the template surface', async () => {
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /새 악보 만들기/ }))
    const dialog = screen.getByRole('dialog', { name: '새 악보 만들기' })
    const templateRegion = within(dialog).getByRole('region', {
      name: '내장 템플릿'
    })

    expect(
      within(templateRegion).getByRole('button', {
        name: '솔로 멜로디 템플릿'
      })
    ).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(
      within(templateRegion).getByRole('button', {
        name: '현악 4중주 템플릿'
      })
    )

    expect(within(dialog).getByLabelText('악보 구성')).toHaveValue(
      'string-quartet'
    )
    expect(
      within(templateRegion).getByRole('button', {
        name: '현악 4중주 템플릿'
      })
    ).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(within(dialog).getByRole('button', { name: '만들기' }))

    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-part-structure',
      'violin-1:Violin I:1|violin-2:Violin II:1|viola:Viola:1|cello:Cello:1'
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
    vi.mocked(window.inC.midi.save).mockResolvedValue({
      fileName: 'in-c-viola.mid'
    })
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
    fireEvent.click(screen.getByRole('button', { name: '내보내기' }))
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

    fireEvent.click(screen.getByRole('button', { name: '내보내기' }))
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

    fireEvent.click(screen.getByRole('button', { name: 'MIDI 내보내기' }))
    await waitFor(() => {
      expect(window.inC.midi.save).toHaveBeenCalledWith({
        suggestedName: '제목-없는-악보-viola.mid',
        contents: expect.any(Array)
      })
    })
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
      'P1-staff-1-measure-1'
    )
    expect(primaryPreview.getByText('maj7')).toHaveAttribute(
      'data-measure-id',
      'P1-staff-1-measure-1'
    )
    expect(primaryPreview.getByText('mf')).toHaveAttribute(
      'data-measure-id',
      'P1-staff-1-measure-1'
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

    fireEvent.click(screen.getByRole('button', { name: '내보내기' }))
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

  it('part XML export preserves the full-score save path and dirty state, with selected-part annotations only', async () => {
    vi.mocked(window.inC.musicXml.open).mockResolvedValue({
      filePath: '/scores/full.musicxml', fileName: 'full.musicxml',
      contents: twoPartMusicXmlWithPrimaryAnnotations
    })
    vi.mocked(window.inC.musicXml.exportCopy).mockResolvedValue({
      filePath: '/scores/cello.musicxml', fileName: 'cello.musicxml'
    })
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /MusicXML 가져오기/ }))
    await screen.findByText('Imported Duo')
    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    fireEvent.change(screen.getByLabelText('악보 보기'), { target: { value: 'part' } })
    fireEvent.change(screen.getByLabelText('파트보 선택'), { target: { value: 'P2' } })
    fireEvent.click(screen.getByRole('button', { name: '내보내기' }))
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML 내보내기' }))
    await waitFor(() => expect(window.inC.musicXml.exportCopy).toHaveBeenCalledTimes(1))
    const request = vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0]![0]
    expect(request.suggestedName).toBe('imported-duo-cello.musicxml')
    expect(request).not.toHaveProperty('filePath')
    const reopened = parseMusicXml(request.contents)
    expect(reopened.parts.map(part => part.name)).toEqual(['Cello'])
    expect(reopened.parts[0]!.staves[0]!.measures[0]!.voices[0]!.events[0]).toMatchObject({
      type: 'note', pitch: { step: 'C', octave: 3 }
    })
    expect(reopened.rehearsalMarks?.map(mark => mark.text)).toContain('Reh-One')
    expect(reopened.harmonies ?? []).toEqual([])
    expect(reopened.dynamics ?? []).toEqual([])
    expect(request.contents).not.toContain('PrimaryOnlyText')
    expect(window.inC.autosave.clear).not.toHaveBeenCalled()
    expect(window.inC.recentMusicXml.add).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))
    await waitFor(() => expect(window.inC.musicXml.save).toHaveBeenCalledWith(
      expect.objectContaining({ filePath: '/scores/full.musicxml' })
    ))
    expect(parseMusicXml(vi.mocked(window.inC.musicXml.save).mock.calls[0]![0].contents).parts).toHaveLength(2)
  })

  it('native project opens portable part settings and saves/resaves separately from XML', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    project.view = { mode: 'part', partId: 'P2' }
    const breakId = project.score.parts[1]!.staves[1]!.measures[1]!.id
    const primaryBreakId = project.score.parts[1]!.staves[0]!.measures[1]!.id
    project.partLayouts = [{ partId: 'P2', title: 'Piano part', layout: { pageBreakBeforeMeasureIds: [breakId], pageSetup: { pageSize: 'letter', orientation: 'landscape' } } }]
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/project.chromatics', fileName: 'project.chromatics', contents: encodeNativeProject(project) })
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/scores/project.chromatics', fileName: 'project.chromatics' })
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Expanded Part Export')
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-part-structure', 'P2:Piano:2')
    expect(screen.getByLabelText('파트보 제목')).toHaveTextContent('Piano part')
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-page-breaks', primaryBreakId)
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    await screen.findByText('project.chromatics에 저장했습니다.')
    const request = vi.mocked(window.inC.project.save).mock.calls[0]![0]
    expect(request.filePath).toBe('/scores/project.chromatics')
    const saved = decodeNativeProject(request.contents)
    expect(saved.score.parts).toHaveLength(2)
    expect(saved.view).toEqual({ mode: 'part', partId: 'P2' })
    expect(saved.partLayouts[0]).toMatchObject({ title: 'Piano part', layout: { pageSetup: { pageSize: 'letter', orientation: 'landscape' } } })
    fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true, shiftKey: true })
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2))
    expect(vi.mocked(window.inC.project.save).mock.calls[1]![0]).not.toHaveProperty('filePath')
    expect(window.inC.musicXml.save).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByRole('button', { name: '프로젝트 저장' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: '새 악보 만들기' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: '새 악보 만들기' })).getByRole('button', { name: '만들기' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(3))
    const freshRequest = vi.mocked(window.inC.project.save).mock.calls[2]![0]
    expect(freshRequest).not.toHaveProperty('filePath')
    expect(decodeNativeProject(freshRequest.contents)).toMatchObject({ view: { mode: 'score' }, partLayouts: [] })
  })

  it('independent part title supports edit undo redo reset save and reopen without renaming the score or instrument', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    project.view = { mode: 'part', partId: 'P2' }
    project.partLayouts = [{ partId: 'P2', title: 'Original part title', layout: { systemBreakBeforeMeasureIds: [project.score.parts[1]!.staves[0]!.measures[1]!.id] } }]
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/parts.chromatics', fileName: 'parts.chromatics', contents: encodeNativeProject(project) })
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/scores/parts.chromatics', fileName: 'parts.chromatics' })
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Expanded Part Export')
    fireEvent.click(screen.getByRole('button', { name: '파트보 제목 수정' }))
    fireEvent.change(screen.getByRole('textbox', { name: '파트보 제목 입력' }), { target: { value: 'Piano rehearsal edition' } })
    fireEvent.keyDown(screen.getByRole('textbox', { name: '파트보 제목 입력' }), { key: 'Enter' })
    expect(screen.getByLabelText('파트보 제목')).toHaveTextContent('Piano rehearsal edition')
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect(screen.getByLabelText('파트보 제목')).toHaveTextContent('Original part title')
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true, shiftKey: true })
    expect(screen.getByLabelText('파트보 제목')).toHaveTextContent('Piano rehearsal edition')
    fireEvent.click(screen.getByRole('button', { name: '파트보 제목 수정' }))
    fireEvent.change(screen.getByRole('textbox', { name: '파트보 제목 입력' }), { target: { value: '' } })
    fireEvent.keyDown(screen.getByRole('textbox', { name: '파트보 제목 입력' }), { key: 'Enter' })
    expect(screen.getByLabelText('파트보 제목')).toHaveTextContent('Piano')
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    fireEvent.click(screen.getByRole('button', { name: '파트보 제목 수정' }))
    fireEvent.change(screen.getByRole('textbox', { name: '파트보 제목 입력' }), { target: { value: 'Cancelled title' } })
    fireEvent.keyDown(screen.getByRole('textbox', { name: '파트보 제목 입력' }), { key: 'Escape' })
    expect(screen.getByLabelText('파트보 제목')).toHaveTextContent('Piano rehearsal edition')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await screen.findByText('parts.chromatics에 저장했습니다.')
    const savedContents = vi.mocked(window.inC.project.save).mock.calls[0]![0].contents
    const saved = decodeNativeProject(savedContents)
    expect(saved.score).toEqual(project.score)
    expect(saved.partLayouts).toEqual([{ ...project.partLayouts[0], title: 'Piano rehearsal edition' }])
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/reopened.chromatics', fileName: 'reopened.chromatics', contents: savedContents })
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('reopened.chromatics을 열었습니다.')
    expect(screen.getByLabelText('파트보 제목')).toHaveTextContent('Piano rehearsal edition')
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-part-structure', 'P2:Piano:2')
    fireEvent.click(screen.getByRole('button', { name: '내보내기' }))
    fireEvent.click(screen.getByRole('button', { name: 'PDF 변환' }))
    await waitFor(() => expect(window.inC.pdf.save).toHaveBeenCalled())
    expect(vi.mocked(window.inC.pdf.save).mock.calls[0]![0].suggestedName).toContain('piano-rehearsal-edition')
  })

  it.each([
    ['페이지', 'pageBreakBeforeMeasureIds', 'data-page-breaks'],
    ['시스템', 'systemBreakBeforeMeasureIds', 'data-system-breaks']
  ] as const)('independent %s breaks edit from lower staff with undo redo and portable reopen', async (label, key, attribute) => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    project.view = { mode: 'part', partId: 'P2' }
    project.partLayouts = [{ partId: 'P2', title: 'Piano part', layout: {} }]
    const part = project.score.parts[1]!
    const targetMeasure = part.staves[0]!.measures[1]!
    const lowerEvent = part.staves[1]!.measures[1]!.voices[0]!.events[0]!
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/parts.chromatics', fileName: 'parts.chromatics', contents: encodeNativeProject(project) })
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/scores/parts.chromatics', fileName: 'parts.chromatics' })
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Expanded Part Export')
    fireEvent.click(screen.getByRole('button', { name: `${lowerEvent.id} 선택` }))
    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    expect(screen.getByRole('button', { name: `${label} 나누기 추가` })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: `${label} 나누기 추가` }))
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(attribute, targetMeasure.id)
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(attribute, '')
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true, shiftKey: true })
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(attribute, targetMeasure.id)
    fireEvent.click(screen.getByRole('button', { name: `${label} 나누기 해제` }))
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(attribute, '')
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(attribute, targetMeasure.id)
    fireEvent.change(screen.getByLabelText('악보 보기'), { target: { value: 'score' } })
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(attribute, '')
    fireEvent.change(screen.getByLabelText('악보 보기'), { target: { value: 'part' } })
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(attribute, targetMeasure.id)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await screen.findByText('parts.chromatics에 저장했습니다.')
    const contents = vi.mocked(window.inC.project.save).mock.calls[0]![0].contents
    const saved = decodeNativeProject(contents)
    expect(saved.score).toEqual(project.score)
    expect(saved.partLayouts[0]).toMatchObject({ partId: 'P2', title: 'Piano part', layout: { [key]: [targetMeasure.id] } })
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/reopened.chromatics', fileName: 'reopened.chromatics', contents })
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('reopened.chromatics을 열었습니다.')
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(attribute, targetMeasure.id)
  })

  it('part page settings and layout reset support undo redo and portable save without changing the score', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    project.score.layout = { pageSetup: { pageMarginMm: 12 } }
    project.view = { mode: 'part', partId: 'P2' }
    const measureId = project.score.parts[1]!.staves[0]!.measures[1]!.id
    project.partLayouts = [{ partId: 'P2', title: 'Custom piano', layout: { pageBreakBeforeMeasureIds: [measureId], pageSetup: { pageMarginMm: 6 } } }]
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/parts.chromatics', fileName: 'parts.chromatics', contents: encodeNativeProject(project) })
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/scores/parts.chromatics', fileName: 'parts.chromatics' })
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Expanded Part Export')
    fireEvent.click(screen.getByRole('button', { name: '내보내기' }))
    fireEvent.change(screen.getByLabelText('PDF 여백 mm'), { target: { value: '17' } })
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect(screen.getByLabelText('PDF 여백 mm')).toHaveValue(6)
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true, shiftKey: true })
    expect(screen.getByLabelText('PDF 여백 mm')).toHaveValue(17)
    fireEvent.click(screen.getByRole('button', { name: '파트보 조판 초기화' }))
    expect(screen.getByLabelText('PDF 여백 mm')).toHaveValue(12)
    expect(screen.getByLabelText('파트보 제목')).toHaveTextContent('Piano')
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-page-breaks', '')
    expect(screen.getByRole('button', { name: '파트보 조판 초기화' })).toBeDisabled()
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect(screen.getByLabelText('PDF 여백 mm')).toHaveValue(17)
    expect(screen.getByLabelText('파트보 제목')).toHaveTextContent('Custom piano')
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-page-breaks', measureId)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await screen.findByText('parts.chromatics에 저장했습니다.')
    const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
    expect(saved.score).toEqual(project.score)
    expect(saved.partLayouts[0]).toMatchObject({ title: 'Custom piano', layout: { pageSetup: { pageMarginMm: 17 }, pageBreakBeforeMeasureIds: [measureId] } })
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true, shiftKey: true })
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1]![0].contents).partLayouts).toEqual([])
  })

  it('native save prunes deleted part-break anchors while undo restores the original layout', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const { createNewScore } = await import('./editor/new-score')
    const project = createNativeProject(createNewScore({ title: 'Structural layout', measureCount: 3, keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 } }))
    const part = project.score.parts[0]!
    const measures = part.staves[0]!.measures
    const deleted = measures[1]!
    const retained = measures[2]!
    project.view = { mode: 'part', partId: part.id }
    project.partLayouts = [{ partId: part.id, title: 'Solo layout', layout: { pageBreakBeforeMeasureIds: [deleted.id, retained.id], systemBreakBeforeMeasureIds: [deleted.id] } }]
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/layout.chromatics', fileName: 'layout.chromatics', contents: encodeNativeProject(project) })
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/scores/layout.chromatics', fileName: 'layout.chromatics' })
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Structural layout')
    fireEvent.click(screen.getByRole('button', { name: `${deleted.voices[0]!.events[0]!.id} 선택` }))
    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    fireEvent.click(screen.getByRole('button', { name: '마디 삭제' }))
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-page-breaks', retained.id)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    expect(document.querySelector('.editor-status .is-error')?.textContent ?? '').toBe('')
    await screen.findByText('layout.chromatics에 저장했습니다.')
    const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
    expect(saved.partLayouts[0]?.layout).toEqual({ pageBreakBeforeMeasureIds: [retained.id], systemBreakBeforeMeasureIds: [] })
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-page-breaks', `${deleted.id},${retained.id}`)
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1]![0].contents).partLayouts).toEqual(project.partLayouts)
  })

  it('quartet part-view measure insert delete and undo keep all parts aligned in the native file', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const { createNewScore } = await import('./editor/new-score')
    const project = createNativeProject(createNewScore({ title: 'Aligned quartet', templateId: 'string-quartet', measureCount: 3, keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 } }))
    const part = project.score.parts[3]!
    const staff = part.staves[0]!
    const target = staff.measures[1]!
    project.view = { mode: 'part', partId: part.id }
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/quartet.chromatics', fileName: 'quartet.chromatics', contents: encodeNativeProject(project) })
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/scores/quartet.chromatics', fileName: 'quartet.chromatics' })
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Aligned quartet')
    fireEvent.click(screen.getByRole('button', { name: `${target.voices[0]!.events[0]!.id} 선택` }))
    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    fireEvent.click(screen.getByRole('button', { name: '마디 추가' }))
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-measure-count', '4')
    expect(screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')).toContain(`${part.id}:${staff.id}:`)
    fireEvent.click(screen.getByRole('button', { name: '마디 삭제' }))
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-measure-count', '3')
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-measure-count', '4')
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await screen.findByText('quartet.chromatics에 저장했습니다.')
    const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
    expect(saved.score.parts.map(part => part.staves[0]!.measures.length)).toEqual([4, 4, 4, 4])
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1]![0].contents).score).toEqual(project.score)
  })

  it('removing a staff preserves independent breaks and restores their original anchors on undo', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    const piano = project.score.parts[1]!
    const upper = piano.staves[0]!
    const lower = piano.staves[1]!
    project.view = { mode: 'part', partId: piano.id }
    project.score.layout = { pageBreakBeforeMeasureIds: [lower.measures[1]!.id] }
    project.partLayouts = [{ partId: piano.id, title: 'Piano rehearsal', layout: { pageBreakBeforeMeasureIds: [lower.measures[1]!.id], systemBreakBeforeMeasureIds: [lower.measures[1]!.id] } }]
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/staff.chromatics', fileName: 'staff.chromatics', contents: encodeNativeProject(project) })
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/scores/staff.chromatics', fileName: 'staff.chromatics' })
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Expanded Part Export')
    fireEvent.click(screen.getByRole('button', { name: `${lower.measures[0]!.voices[0]!.events[0]!.id} 선택` }))
    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    fireEvent.click(screen.getByRole('button', { name: '보표 삭제' }))
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
    expect(saved.score.parts[1]!.staves).toHaveLength(1)
    expect(saved.partLayouts[0]!.layout).toMatchObject({ pageBreakBeforeMeasureIds: [upper.measures[1]!.id], systemBreakBeforeMeasureIds: [upper.measures[1]!.id] })
    expect(saved.score.layout?.pageBreakBeforeMeasureIds).toEqual([upper.measures[1]!.id])
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2))
    const undone = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1]![0].contents)
    expect(undone.score).toEqual(project.score)
    expect(undone.partLayouts).toEqual(project.partLayouts)
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true, shiftKey: true })
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(3))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[2]![0].contents).partLayouts).toEqual(saved.partLayouts)
  })

  it('part XML export preserves the standalone title and breaks while reporting unsupported page settings', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    project.view = { mode: 'part', partId: 'P2' }
    project.partLayouts = [{ partId: 'P2', title: 'Independent heading', layout: { pageBreakBeforeMeasureIds: [project.score.parts[1]!.staves[0]!.measures[1]!.id], pageSetup: { staffSizePercent: 90 } } }]
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/part.chromatics', fileName: 'part.chromatics', contents: encodeNativeProject(project) })
    vi.mocked(window.inC.musicXml.exportCopy).mockResolvedValue({ filePath: '/scores/piano.musicxml', fileName: 'piano.musicxml' })
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Expanded Part Export')
    fireEvent.click(screen.getByRole('button', { name: '내보내기' }))
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML 내보내기' }))
    const report = await screen.findByRole('region', { name: 'MusicXML 경고 상세' })
    expect(within(report).queryByText('score.layout.pageBreakBeforeMeasureIds[0]')).not.toBeInTheDocument()
    expect(within(report).getByText('score.layout.pageSetup')).toBeInTheDocument()
    expect(within(report).queryByText('project.partLayouts[0].title')).not.toBeInTheDocument()
    const exported = parseMusicXml(vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0]![0].contents)
    expect(exported.parts).toHaveLength(1)
    expect(exported.layout?.pageBreakBeforeMeasureIds).toEqual([exported.parts[0]!.staves[0]!.measures[1]!.id])
    expect(exported.title).toBe('Independent heading')
    expect(exported.parts[0]!.name).toBe(project.score.parts[1]!.name)
    expect(exported.composer).toBe(project.score.composer)
    expect(screen.getByText(project.score.title)).toBeInTheDocument()
    expect(window.inC.project.save).not.toHaveBeenCalled()
    expect(window.inC.autosave.clear).not.toHaveBeenCalled()
  })

  it('native save response does not overwrite a newer independent part title', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    project.view = { mode: 'part', partId: 'P2' }
    project.partLayouts = [{ partId: 'P2', title: 'Original', layout: {} }]
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/parts.chromatics', fileName: 'parts.chromatics', contents: encodeNativeProject(project) })
    let finishSave!: (file: { filePath: string; fileName: string }) => void
    vi.mocked(window.inC.project.save).mockImplementationOnce(() => new Promise(resolve => { finishSave = resolve }))
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Expanded Part Export')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
    fireEvent.click(screen.getByRole('button', { name: '파트보 제목 수정' }))
    fireEvent.change(screen.getByRole('textbox', { name: '파트보 제목 입력' }), { target: { value: 'Edited while saving' } })
    fireEvent.keyDown(screen.getByRole('textbox', { name: '파트보 제목 입력' }), { key: 'Enter' })
    await act(async () => { finishSave({ filePath: '/scores/parts.chromatics', fileName: 'parts.chromatics' }) })
    expect(screen.getByLabelText('파트보 제목')).toHaveTextContent('Edited while saving')
    expect(window.inC.autosave.clear).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1]![0].contents).partLayouts[0]?.title).toBe('Edited while saving')
  })

  it('native open reconfirms part-page edits made while the file chooser is pending', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    project.view = { mode: 'part', partId: 'P2' }
    vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/scores/current.chromatics', fileName: 'current.chromatics', contents: encodeNativeProject(project) })
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Expanded Part Export')
    let finishOpen!: (file: { filePath: string; fileName: string; contents: string }) => void
    vi.mocked(window.inC.project.open).mockImplementationOnce(() => new Promise(resolve => { finishOpen = resolve }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await waitFor(() => expect(window.inC.project.open).toHaveBeenCalledTimes(2))
    fireEvent.click(screen.getByRole('button', { name: '내보내기' }))
    fireEvent.change(screen.getByLabelText('PDF 여백 mm'), { target: { value: '17' } })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    project.score.title = 'Incoming project'
    await act(async () => { finishOpen({ filePath: '/scores/incoming.chromatics', fileName: 'incoming.chromatics', contents: encodeNativeProject(project) }) })
    expect(confirm).toHaveBeenCalledWith('파일 선택 중 편집한 내용을 버리고 프로젝트를 열까요?')
    expect(screen.queryByText('Incoming project')).not.toBeInTheDocument()
    expect(screen.getByLabelText('PDF 여백 mm')).toHaveValue(17)
    expect(screen.getByText('Expanded Part Export')).toBeInTheDocument()
  })

  it('native recent entry reopens through the native decoder and keeps the XML reader separate', async () => {
    const { createNativeProject, encodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    const recent = { filePath: '/scores/recent.chromatics', fileName: 'recent.chromatics', format: 'native' as const, openedAt: '2026-09-13T00:00:00Z' }
    vi.mocked(window.inC.recentMusicXml.list).mockResolvedValue([recent])
    vi.mocked(window.inC.recentMusicXml.open).mockResolvedValue({ ...recent, contents: encodeNativeProject(project) })
    const { App } = await import('./App')
    render(<App />)
    expect(screen.getByRole('button', { name: '프로젝트 열기' })).toBeEnabled()
    fireEvent.click(await screen.findByRole('button', { name: /recent.chromatics/ }))
    await screen.findByText('Expanded Part Export')
    expect(window.inC.recentMusicXml.add).toHaveBeenCalledWith({ filePath: recent.filePath, fileName: recent.fileName, format: 'native' })
    expect(window.inC.musicXml.open).not.toHaveBeenCalled()
    expect(window.inC.project.open).not.toHaveBeenCalled()
  })

  it.each(['success', 'failure'] as const)('ignores late startup recovery %s after opening another document', async outcome => {
    window.history.replaceState({}, '', '/')
    const { createNativeProject, encodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    let finish!: (snapshot: Awaited<ReturnType<typeof window.inC.autosave.read>>) => void
    let fail!: (error: Error) => void
    vi.mocked(window.inC.autosave.read).mockReturnValue(new Promise((resolve, reject) => { finish = resolve; fail = reject }))
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/new.chromatics', fileName: 'new.chromatics', contents: encodeNativeProject(project) })
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Expanded Part Export')
    await act(async () => {
      if (outcome === 'success') finish({ score: project.score, project, metadata: { title: 'Previous session', updatedAt: '2026-09-13T00:00:00Z', version: 'test' } })
      else fail(new Error('Stale recovery read'))
    })
    expect(screen.queryByRole('dialog', { name: '자동저장 복구' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Stale recovery read/)).not.toBeInTheDocument()
    expect(window.inC.autosave.clear).not.toHaveBeenCalled()
    expect(screen.getByText('Expanded Part Export')).toBeInTheDocument()
  })

  it('retries failed recovery reading and saves a migrated v1 project without clearing it early', async () => {
    window.history.replaceState({}, '', '/')
    const { createNativeProject, validateNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    project.view = { mode: 'part', partId: 'P2' }
    project.partLayouts = [{ partId: 'P2', title: 'Legacy recovery piano', layout: { pageSetup: { staffSizePercent: 90 } } }]
    const migrated = validateNativeProject({ ...project, version: 1 })
    vi.mocked(window.inC.autosave.read).mockRejectedValueOnce(new Error('Temporary read failure')).mockResolvedValue({ score: migrated.score, project: migrated, metadata: { title: migrated.score.title, updatedAt: '2026-09-13', version: 'test' } })
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /복구본 다시 확인/ }))
    fireEvent.click(await screen.findByRole('button', { name: /복구본 열기/ }))
    await screen.findByText('프로젝트 복구본을 열었습니다. 새 파일로 저장해 주세요.')
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-part-structure', 'P2:Piano:2')
    expect(window.inC.autosave.clear).not.toHaveBeenCalled()
    fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
    const request = vi.mocked(window.inC.project.save).mock.calls[0]![0]
    expect(request).not.toHaveProperty('filePath')
    expect(decodeNativeProject(request.contents)).toMatchObject(JSON.parse(JSON.stringify({ version: 4, score: migrated.score, view: migrated.view, partLayouts: migrated.partLayouts })))
    expect(window.inC.autosave.clear).not.toHaveBeenCalled()
  })

  it('reports invalid recovery and leaves its data untouched for retry', async () => {
    window.history.replaceState({}, '', '/')
    vi.mocked(window.inC.autosave.read).mockResolvedValue({ score: demoScore, project: { version: 999 } as never, metadata: { title: 'Future project', updatedAt: '2026-09-13', version: 'test' } })
    const { App } = await import('./App')
    render(<App />)
    expect(await screen.findByRole('button', { name: /복구본 다시 확인/ })).toBeEnabled()
    expect(screen.queryByRole('button', { name: /복구본 열기/ })).not.toBeInTheDocument()
    expect(window.inC.autosave.clear).not.toHaveBeenCalled()
    expect(window.inC.autosave.write).not.toHaveBeenCalled()
  })

  it.each(['success', 'failure'] as const)('ignores late recovery discard %s after a document switch', async outcome => {
    window.history.replaceState({}, '', '/')
    const { createNativeProject, encodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    vi.mocked(window.inC.autosave.read).mockResolvedValueOnce(null).mockResolvedValue({ score: project.score, project, metadata: { title: project.score.title, updatedAt: '2026-09-13', version: 'test' } })
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/current.chromatics', fileName: 'current.chromatics', contents: encodeNativeProject(project) })
    let finish!: () => void
    let fail!: (error: Error) => void
    vi.mocked(window.inC.autosave.clear).mockImplementationOnce(() => new Promise((resolve, reject) => { finish = resolve; fail = reject }))
    const { App } = await import('./App')
    render(<App />)
    await waitFor(() => expect(window.inC.autosave.read).toHaveBeenCalledOnce())
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('current.chromatics을 열었습니다.')
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '자동저장 복구' }))
    const dialog = await screen.findByRole('dialog', { name: '자동저장 복구' })
    fireEvent.click(within(dialog).getByRole('button', { name: '삭제' }))
    expect(within(dialog).getByRole('button', { name: '복구' })).toBeDisabled()
    project.score.title = 'Switched document'
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/switched.chromatics', fileName: 'switched.chromatics', contents: encodeNativeProject(project) })
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('switched.chromatics을 열었습니다.')
    await act(async () => outcome === 'success' ? finish() : fail(new Error('Stale discard failure')))
    expect(screen.getByText('switched.chromatics을 열었습니다.')).toBeInTheDocument()
    expect(screen.queryByText(/복구본을 삭제했습니다|Stale discard failure/)).not.toBeInTheDocument()
  })

  it.each(['native', 'xml'] as const)('keeps unclaimed recovery through another document %s save until explicit discard', async format => {
    window.history.replaceState({}, '', '/')
    const { createNativeProject } = await import('../../project/schema')
    const oldProject = createNativeProject(parseMusicXml(richPartExportMusicXml))
    vi.mocked(window.inC.autosave.read).mockResolvedValue({ score: oldProject.score, project: oldProject, metadata: { title: oldProject.score.title, updatedAt: '2026-09-13', version: 'test' } })
    vi.mocked(window.inC.musicXml.open).mockResolvedValue({ fileName: 'new.musicxml', filePath: '/scores/new.musicxml', contents: recentMusicXml })
    vi.mocked(window.inC.project.save).mockResolvedValue({ fileName: 'new.chromatics', filePath: '/scores/new.chromatics' })
    vi.mocked(window.inC.musicXml.save).mockResolvedValue({ fileName: 'new.musicxml', filePath: '/scores/new.musicxml' })
    const { App } = await import('./App')
    render(<App />)
    await screen.findByRole('button', { name: /복구본 열기/ })
    fireEvent.click(screen.getByRole('button', { name: /MusicXML 가져오기/ }))
    await screen.findByText('new.musicxml을 가져왔습니다.')
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: format === 'native' ? '프로젝트 저장' : 'MusicXML로 저장' }))
    await screen.findByText(format === 'native' ? 'new.chromatics에 저장했습니다.' : /^new.musicxml을 MusicXML로 내보냈습니다\./)
    expect(window.inC.autosave.clear).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '자동저장 복구' }))
    const dialog = await screen.findByRole('dialog', { name: '자동저장 복구' })
    fireEvent.click(within(dialog).getByRole('button', { name: '삭제' }))
    await screen.findByText('복구본을 삭제했습니다.')
    expect(window.inC.autosave.clear).toHaveBeenCalledOnce()
  })

  it.each(['open', 'recovery'] as const)('part-view %s targets the visible part when deleting the initial event', async entry => {
    window.history.replaceState({}, '', '/')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    project.view = { mode: 'part', partId: 'P2' }
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/part.chromatics', fileName: 'part.chromatics', contents: encodeNativeProject(project) })
    if (entry === 'recovery') vi.mocked(window.inC.autosave.read).mockResolvedValue({ score: project.score, project, metadata: { title: project.score.title, updatedAt: '2026-09-13', version: 'test' } })
    const { App } = await import('./App')
    render(<App />)
    if (entry === 'open') fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    else fireEvent.click(await screen.findByRole('button', { name: /복구본 열기/ }))
    await waitFor(() => expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-part-structure', 'P2:Piano:2'))
    expect(screen.getByLabelText('현재 작업 컨텍스트')).toHaveTextContent('Piano')
    expect(screen.getByLabelText('현재 작업 컨텍스트')).not.toHaveTextContent('Clarinet')
    fireEvent.keyDown(window, { code: 'Delete', key: 'Delete' })
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save, document.querySelector('.editor-status')?.textContent ?? '').toHaveBeenCalledOnce())
    const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
    expect(saved.score.parts[0]).toEqual(JSON.parse(JSON.stringify(project.score.parts[0])))
    expect(saved.score.parts[1]!.staves[0]!.measures[0]!.voices[0]!.events[0]!.type).toBe('rest')
    fireEvent.click(screen.getByRole('button', { name: '실행 취소' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1]![0].contents).score).toEqual(JSON.parse(JSON.stringify(project.score)))
    fireEvent.click(screen.getByRole('button', { name: '다시 실행' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(3))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[2]![0].contents).score).toEqual(saved.score)
  })

  it('native recovery restores portable settings and autosaves the whole envelope', async () => {
    window.history.replaceState({}, '', '/')
    const { createNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    project.view = { mode: 'part', partId: 'P2' }
    project.partLayouts = [{ partId: 'P2', title: 'Recovery piano', layout: { pageSetup: { staffSizePercent: 90 } } }]
    vi.mocked(window.inC.autosave.read).mockResolvedValue({ score: project.score, project, metadata: { title: project.score.title, updatedAt: '2026-09-13T00:00:00Z', version: 'test' } })
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /복구본 열기/ }))
    await screen.findByText('프로젝트 복구본을 열었습니다. 새 파일로 저장해 주세요.')
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-part-structure', 'P2:Piano:2')
    await waitFor(() => expect(window.inC.autosave.write).toHaveBeenCalled(), { timeout: 3000 })
    expect(vi.mocked(window.inC.autosave.write).mock.calls.at(-1)![0].project).toMatchObject({ view: project.view, partLayouts: [{ partId: 'P2', title: 'Recovery piano' }] })
    fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    expect(vi.mocked(window.inC.project.save).mock.calls[0]![0]).not.toHaveProperty('filePath')
    expect(window.inC.musicXml.save).not.toHaveBeenCalled()
  })

  it('native backup recovery preserves portable state and requires a new save path', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    project.view = { mode: 'part', partId: 'P2' }
    project.partLayouts = [{ partId: 'P2', title: 'Recovered piano', layout: { pageSetup: { pageSize: 'letter' } } }]
    vi.mocked(window.inC.project.listBackups).mockResolvedValue([
      { id: 'good.chromatics', fileName: 'good.chromatics', title: 'Backup piano', updatedAt: '2026-09-13T00:00:00Z' },
      { id: 'bad.chromatics', fileName: 'bad.chromatics', error: 'Invalid JSON', updatedAt: '' }
    ])
    vi.mocked(window.inC.project.readBackup).mockResolvedValue({ contents: encodeNativeProject(project) })
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 백업' }))
    const dialog = screen.getByRole('dialog', { name: '프로젝트 백업' })
    expect(await within(dialog).findByRole('button', { name: 'bad.chromatics 복구' })).toBeDisabled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Backup piano 복구' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '프로젝트 백업' })).not.toBeInTheDocument())
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-part-structure', 'P2:Piano:2')
    fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    const input = vi.mocked(window.inC.project.save).mock.calls[0]![0]
    expect(input).not.toHaveProperty('filePath')
    expect(decodeNativeProject(input.contents)).toMatchObject({ view: project.view, partLayouts: [{ partId: 'P2', title: 'Recovered piano' }] })
    expect(window.inC.recentMusicXml.add).not.toHaveBeenCalled()
  })

  it('closing backup selection cancels a pending restore without replacing the score', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    vi.mocked(window.inC.project.listBackups).mockResolvedValue([{ id: 'backup', fileName: 'backup.chromatics', title: 'Old backup', updatedAt: '' }])
    let finish!: (result: { contents: string }) => void
    vi.mocked(window.inC.project.readBackup).mockReturnValue(new Promise(resolve => { finish = resolve }))
    const { createNativeProject, encodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    screen.getByRole('button', { name: '프로젝트 백업' }).focus()
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 백업' }))
    const dialog = screen.getByRole('dialog', { name: '프로젝트 백업' })
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Old backup 복구' }))
    await waitFor(() => expect(window.inC.project.readBackup).toHaveBeenCalledOnce())
    fireEvent.keyDown(dialog, { key: 'Escape' })
    await act(async () => { finish({ contents: encodeNativeProject(project) }) })
    expect(screen.queryByText('Expanded Part Export')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: '프로젝트 백업' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '프로젝트 백업' })).toHaveFocus()
  })

  it('ignores a late autosave failure after a newer edit has been saved', async () => {
    window.history.replaceState({}, '', '/')
    const { createNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    vi.mocked(window.inC.autosave.read).mockResolvedValue({ score: project.score, project, metadata: { title: project.score.title, updatedAt: '2026-09-13T00:00:00Z', version: 'test' } })
    let fail!: (error: Error) => void
    vi.mocked(window.inC.autosave.write).mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject }))
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /복구본 열기/ }))
    await waitFor(() => expect(window.inC.autosave.write).toHaveBeenCalledTimes(1), { timeout: 3000 })
    fireEvent.click(screen.getByRole('button', { name: '악보 제목 수정' }))
    fireEvent.change(screen.getByLabelText('악보 제목'), { target: { value: 'Newer autosave' } })
    fireEvent.keyDown(screen.getByLabelText('악보 제목'), { key: 'Enter' })
    await waitFor(() => expect(window.inC.autosave.write).toHaveBeenCalledTimes(2), { timeout: 3000 })
    await act(async () => { fail(new Error('Old autosave failed')) })
    expect(screen.queryByText(/Old autosave failed/)).not.toBeInTheDocument()
    expect(vi.mocked(window.inC.autosave.write).mock.calls[1]![0].project?.score.title).toBe('Newer autosave')
  })

  it.each([
    ['native', false], ['native', true], ['xml', false], ['xml', true]
  ] as const)('%s cleanup preserves only dirty recovery after switching documents (dirty=%s)', async (format, dirty) => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    project.partLayouts = [{ partId: 'P2', title: 'Portable piano', layout: {} }]
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/new.chromatics', fileName: 'new.chromatics', contents: encodeNativeProject(project) })
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/scores/old.chromatics', fileName: 'old.chromatics' })
    vi.mocked(window.inC.musicXml.save).mockResolvedValue({ filePath: '/scores/old.musicxml', fileName: 'old.musicxml' })
    let finishClear!: () => void
    vi.mocked(window.inC.autosave.clear).mockImplementationOnce(() => new Promise(resolve => { finishClear = resolve }))
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    const save = screen.getByRole('button', { name: format === 'native' ? '프로젝트 저장' : 'MusicXML로 저장' })
    fireEvent.click(save)
    await waitFor(() => expect(window.inC.autosave.clear).toHaveBeenCalledOnce())
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Expanded Part Export')
    if (dirty) {
      fireEvent.click(screen.getByRole('button', { name: '악보 제목 수정' }))
      fireEvent.change(screen.getByLabelText('악보 제목'), { target: { value: 'New document edit' } })
      fireEvent.keyDown(screen.getByLabelText('악보 제목'), { key: 'Enter' })
    }
    await act(async () => { finishClear() })
    await waitFor(() => expect(save).toBeEnabled())
    if (dirty) {
      expect(vi.mocked(window.inC.autosave.write).mock.calls.at(-1)?.[0]).toMatchObject({
        score: { title: 'New document edit' },
        project: { score: { title: 'New document edit' }, partLayouts: project.partLayouts }
      })
    } else {
      expect(window.inC.autosave.write).not.toHaveBeenCalled()
    }
    expect(screen.queryByText(/old\.(chromatics|musicxml)에 저장했습니다/)).not.toBeInTheDocument()
  })

  it('native save preserves edits made while awaiting disk and prevents duplicate submissions', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    let finish!: (value: { filePath: string; fileName: string }) => void
    vi.mocked(window.inC.project.save).mockReturnValue(new Promise(resolve => { finish = resolve }))
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    const button = screen.getByRole('button', { name: '프로젝트 저장' })
    fireEvent.click(button)
    fireEvent.click(button)
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('button', { name: '악보 제목 수정' }))
    fireEvent.change(screen.getByLabelText('악보 제목'), { target: { value: 'Native unsaved edit' } })
    fireEvent.keyDown(screen.getByLabelText('악보 제목'), { key: 'Enter' })
    finish({ filePath: '/scores/project.chromatics', fileName: 'project.chromatics' })
    await waitFor(() => expect(button).toBeEnabled())
    expect(screen.getByText('Native unsaved edit')).toBeInTheDocument()
    expect(window.inC.autosave.clear).not.toHaveBeenCalled()
    expect(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents).not.toContain('Native unsaved edit')
  })

  it('part XML export preserves grand staff voices, markings, ties, tuplets and score-wide repeats', async () => {
    vi.mocked(window.inC.musicXml.open).mockResolvedValue({
      filePath: '/scores/rich.musicxml', fileName: 'rich.musicxml', contents: richPartExportMusicXml
    })
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /MusicXML 가져오기/ }))
    await screen.findByText('Expanded Part Export')
    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    fireEvent.change(screen.getByLabelText('악보 보기'), { target: { value: 'part' } })
    fireEvent.change(screen.getByLabelText('파트보 선택'), { target: { value: 'P2' } })
    fireEvent.click(screen.getByRole('button', { name: '내보내기' }))
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML 내보내기' }))
    await waitFor(() => {
      expect(document.querySelector('.editor-status .is-error')?.textContent ?? '').toBe('')
      expect(window.inC.musicXml.exportCopy).toHaveBeenCalledTimes(1)
    })
    const { contents } = vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0]![0]
    const piano = parseMusicXml(contents)
    expect(piano.parts.map(part => part.name)).toEqual(['Piano'])
    const staves = piano.parts[0]!.staves
    expect(staves).toHaveLength(2)
    expect(staves[0]!.measures[0]!.voices).toHaveLength(2)
    expect(staves[0]!.measures[0]!.voices[1]!.events[0]).toMatchObject({ type: 'rest', fullMeasure: true })
    expect(staves[0]!.measures[0]!.voices[0]!.events[0]).toMatchObject({
      type: 'note', pitches: [{ step: 'C', octave: 4 }, { step: 'E', octave: 4 }],
      articulations: ['tenuto'], lyrics: [{ text: 'Sing' }]
    })
    expect(staves[0]!.measures[1]!.voices[0]!.tuplets).toHaveLength(1)
    expect(staves[1]!.measures[0]!.voices[0]!.events[0]).toMatchObject({ ties: { start: true } })
    expect(piano.hairpins).toHaveLength(1)
    expect(piano.slurs).toHaveLength(1)
    expect(piano.harmonies).toHaveLength(1)
    expect(piano.dynamics?.map(mark => mark.value)).toEqual(['p', 'mp'])
    expect(piano.staffTexts?.find(mark => mark.text === 'Left hand')?.measureId).toBe(staves[1]!.measures[0]!.id)
    expect(piano.tempoEvents?.some(event => event.bpm === 108)).toBe(true)
    expect(contents).not.toContain('Clarinet only')
    expect(piano.rehearsalMarks?.map(mark => mark.text)).toContain('A')
    expect(staves[0]!.measures[0]!.repeat?.start).toBe(true)
    expect(staves[0]!.measures[1]!.repeat).toMatchObject({ end: true, times: 2 })
    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    fireEvent.change(screen.getByLabelText('파트보 선택'), { target: { value: 'P1' } })
    fireEvent.click(screen.getByRole('button', { name: '내보내기' }))
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML 내보내기' }))
    await waitFor(() => expect(window.inC.musicXml.exportCopy).toHaveBeenCalledTimes(2))
    const clarinet = parseMusicXml(vi.mocked(window.inC.musicXml.exportCopy).mock.calls[1]![0].contents)
    expect(clarinet.parts[0]!.staves[0]!.measures[0]!.transposition).toMatchObject({ diatonic: -1, chromatic: -2 })
  })

  it.each(['success', 'cancel', 'failure'] as const)('part XML export preserves edits while pending (%s)', async outcome => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    let finish!: (result: { filePath: string; fileName: string } | null) => void
    let fail!: (error: Error) => void
    vi.mocked(window.inC.musicXml.exportCopy).mockReturnValue(new Promise((resolve, reject) => {
      finish = resolve
      fail = reject
    }))
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '내보내기' }))
    const button = screen.getByRole('button', { name: 'MusicXML 내보내기' })
    fireEvent.click(button)
    fireEvent.click(button)
    await waitFor(() => expect(window.inC.musicXml.exportCopy).toHaveBeenCalledTimes(1))
    expect(button).toBeDisabled()
    const snapshot = vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0]![0].contents
    fireEvent.click(screen.getByRole('button', { name: '악보 제목 수정' }))
    fireEvent.change(screen.getByLabelText('악보 제목'), { target: { value: 'Edited during export' } })
    fireEvent.keyDown(screen.getByLabelText('악보 제목'), { key: 'Enter' })
    expect(snapshot).not.toContain('Edited during export')
    if (outcome === 'failure') fail(new Error('export disk failure'))
    else finish(outcome === 'cancel' ? null : { filePath: '/export/part.xml', fileName: 'part.xml' })
    await waitFor(() => expect(button).toBeEnabled())
    expect(screen.getByText('Edited during export')).toBeInTheDocument()
    expect(window.inC.autosave.clear).not.toHaveBeenCalled()
    expect(window.inC.recentMusicXml.add).not.toHaveBeenCalled()
    if (outcome === 'failure') expect(screen.getByText('export disk failure')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))
    await waitFor(() => expect(window.inC.musicXml.save).toHaveBeenCalled())
    const primary = vi.mocked(window.inC.musicXml.save).mock.calls[0]![0]
    expect(primary).not.toHaveProperty('filePath')
    expect(primary.contents).toContain('Edited during export')
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

    fireEvent.click(screen.getByRole('button', { name: '내보내기' }))
    fireEvent.change(screen.getByLabelText('PDF 설정 프리셋'), {
      target: { value: 'compact-parts' }
    })
    expect(
      screen.getByText('Cello 파트보 PDF 페이지 설정을 갱신했습니다.')
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))

    await waitFor(() => {
      expect(window.inC.musicXml.save).toHaveBeenCalled()
      expect(savedContents).toContain('<score-partwise')
    })
    expect(
      window.localStorage.getItem('chromatics.musicxml-view-state.v1')
    ).toContain('"partId":"cello"')
    expect(
      window.localStorage.getItem('chromatics.part-page-setup.v1')
    ).toContain('"cello":{"pageSize":"a4","orientation":"portrait","pageMarginMm":6')

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

    fireEvent.click(screen.getByRole('button', { name: '내보내기' }))
    expect(screen.getByLabelText('PDF 설정 프리셋')).toHaveValue(
      'compact-parts'
    )
    expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
      'data-pdf-page-margin-mm',
      '6'
    )
    expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
      'data-pdf-staff-size-percent',
      '90'
    )
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

  it.each([
    ['reorder', 'ordinal'], ['remove', 'ordinal'], ['reorder', 'concrete'], ['remove', 'concrete']
  ] as const)('native independent part layout and global directions survive %s with %s anchors', async (action, reference) => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    if (reference === 'concrete') {
      project.score.tempoEvents = project.score.tempoEvents?.map(mark => ({ ...mark, measureId: project.score.parts[0]!.staves[0]!.measures[1]!.id }))
      project.score.rehearsalMarks = project.score.rehearsalMarks?.map(mark => ({ ...mark, measureId: project.score.parts[0]!.staves[0]!.measures[0]!.id }))
    }
    project.view = { mode: 'part', partId: 'P2' }
    project.partLayouts = [{ partId: 'P2', title: 'Piano rehearsal', layout: { pageBreakBeforeMeasureIds: [project.score.parts[1]!.staves[0]!.measures[1]!.id], pageSetup: { pageMarginMm: 17 } } }]
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/linked.chromatics', fileName: 'linked.chromatics', contents: encodeNativeProject(project) })
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/scores/linked.chromatics', fileName: 'linked.chromatics' })
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Expanded Part Export')
    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    fireEvent.change(screen.getByLabelText('입력 보표'), { target: { value: action === 'reorder' ? 'P2:P2-staff-1' : 'P1:P1-staff-1' } })
    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    fireEvent.click(screen.getByRole('button', { name: action === 'reorder' ? '파트 위로 이동' : '파트 삭제' }))
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
    const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
    expect(saved.score.parts.map(part => part.id)).toEqual(action === 'reorder' ? ['P2', 'P1'] : ['P2'])
    expect(saved.partLayouts[0]).toMatchObject(project.partLayouts[0]!)
    expect(saved.score.tempoEvents).toEqual(project.score.tempoEvents?.map(mark => ({ ...mark, measureId: action === 'remove' && reference === 'concrete' ? 'measure-2' : mark.measureId })))
    expect(saved.score.rehearsalMarks).toEqual(action === 'remove' && reference === 'concrete'
      ? undefined : project.score.rehearsalMarks)
    const { createPlaybackTimeline } = await import('./playback/timeline')
    expect(createPlaybackTimeline(saved.score).totalBeats).toBe(createPlaybackTimeline(project.score).totalBeats)
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2))
    const restored = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1]![0].contents)
    expect(restored.score).toEqual(project.score)
    expect(restored.partLayouts[0]).toMatchObject(project.partLayouts[0]!)
  })

  it('score-setup.part-order reorders without losing part identity, notes or undo', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    expect(screen.getByRole('button', { name: '파트 위로 이동' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('추가할 악기'), { target: { value: 'clarinet' } })
    fireEvent.click(screen.getByRole('button', { name: '파트 추가' }))
    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    expect(screen.getByRole('button', { name: '파트 아래로 이동' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '파트 위로 이동' }))
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-part-structure', 'clarinet:클라리넷:1|piano:피아노:1')
    expect(screen.getByLabelText('현재 파트 이조')).toHaveValue('bb')
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '실행 취소' }))
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-part-structure', 'piano:피아노:1|clarinet:클라리넷:1')
    fireEvent.click(screen.getByRole('button', { name: '다시 실행' }))
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))
    await waitFor(() => expect(window.inC.musicXml.save).toHaveBeenCalled())
    const reopened = parseMusicXml(vi.mocked(window.inC.musicXml.save).mock.calls.at(-1)![0].contents)
    expect(reopened.parts.map((part) => part.name)).toEqual(['클라리넷', '피아노'])
    expect(reopened.parts[1].staves[0].measures[0].voices[0].events.map((event) => event.type)).toEqual(demoScore.parts[0].staves[0].measures[0].voices[0].events.map((event) => event.type))
  })

  it('adding the same instrument after removal does not inherit the deleted part layout', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const { createNewScore } = await import('./editor/new-score')
    const project = createNativeProject(createNewScore({ title: 'Part identity', templateId: 'string-quartet', measureCount: 3, keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 } }))
    const cello = project.score.parts[3]!
    project.view = { mode: 'part', partId: cello.id }
    project.partLayouts = [{ partId: cello.id, title: 'Deleted cello layout', layout: { pageSetup: { pageMarginMm: 17 } } }]
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/identity.chromatics', fileName: 'identity.chromatics', contents: encodeNativeProject(project) })
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/scores/identity.chromatics', fileName: 'identity.chromatics' })
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Part identity')
    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    fireEvent.change(screen.getByLabelText('입력 보표'), { target: { value: `${cello.id}:${cello.staves[0]!.id}` } })
    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    fireEvent.click(screen.getByRole('button', { name: '파트 삭제' }))
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents).partLayouts).toEqual([])
    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    fireEvent.change(screen.getByLabelText('추가할 악기'), { target: { value: 'cello' } })
    fireEvent.click(screen.getByRole('button', { name: '파트 추가' }))
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2))
    const added = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1]![0].contents)
    expect(added.score.parts.at(-1)?.id).not.toBe(cello.id)
    expect(added.partLayouts).toEqual([])
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(3))
    const undone = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[2]![0].contents)
    expect(undone.score).toEqual(project.score)
    expect(undone.partLayouts[0]).toMatchObject(project.partLayouts[0]!)
  })

  it('score-setup.transposing-instrument preserves written notes and saves selected part transposition', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    fireEvent.change(screen.getByLabelText('추가할 악기'), { target: { value: 'clarinet' } })
    fireEvent.click(screen.getByRole('button', { name: '파트 추가' }))
    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    expect(screen.getByLabelText('현재 파트 이조')).toHaveValue('bb')
    fireEvent.change(screen.getByLabelText('현재 파트 이조'), { target: { value: 'f' } })
    expect(screen.getByLabelText('현재 파트 이조')).toHaveValue('f')
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))
    await waitFor(() => expect(window.inC.musicXml.save).toHaveBeenCalled())
    const args = vi.mocked(window.inC.musicXml.save).mock.calls.at(-1)![0]
    const reopened = parseMusicXml(args.contents)
    expect(reopened.parts[0].staves[0].measures[0].transposition).toBeUndefined()
    expect(reopened.parts[1].staves[0].measures.every((measure) => measure.transposition?.chromatic === -7)).toBe(true)
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
    const dockedPalette = within(workspace).getByRole('complementary', {
      name: '고정 팔레트'
    })
    const propertiesDock = within(workspace).getByRole('complementary', {
      name: '속성 도크'
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
    ).toEqual(['파일', '악보', '음표', '표기 객체', '가사', '내보내기', '재생'])
    expect(
      within(dockedPalette).getByRole('button', { name: '음표 팔레트 열기' })
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      within(dockedPalette).getByRole('button', {
        name: '표기 객체 팔레트 열기'
      })
    ).toBeInTheDocument()
    expect(
      within(propertiesDock).getByRole('region', { name: '선택 요약' })
    ).toBeInTheDocument()
    const contextStrip = screen.getByRole('region', {
      name: '현재 작업 컨텍스트'
    })
    expect(within(contextStrip).getByText('작업')).toBeInTheDocument()
    expect(within(contextStrip).getByText('입력')).toBeInTheDocument()
    expect(within(contextStrip).getByText('대상')).toBeInTheDocument()
    expect(within(contextStrip).getByText('음가')).toBeInTheDocument()
    expect(within(contextStrip).getByText('재생')).toBeInTheDocument()
    expect(within(contextStrip).getByText('음표')).toBeInTheDocument()
    expect(within(contextStrip).getByText('선택')).toBeInTheDocument()
    expect(within(contextStrip).getByText(/보표 1 · 성부 1/)).toBeInTheDocument()
    expect(within(contextStrip).getByText('4분음표')).toBeInTheDocument()
    expect(within(contextStrip).getByText('정지')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '파일' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '표기 객체' })).toBeInTheDocument()
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
    expect(screen.getByLabelText('코드 심벌')).not.toBeVisible()
    expect(screen.queryByLabelText('선택 음표 가사')).not.toBeInTheDocument()
    expect(screen.getByLabelText('선택 마디 음자리표')).not.toBeVisible()
    expect(screen.getByLabelText('위치별 빠르기 BPM')).not.toBeVisible()

    fireEvent.click(within(toolbarTabs).getByRole('button', { name: '가사' }))
    expect(within(contextStrip).getByText('가사')).toBeInTheDocument()
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
    expect(screen.getByRole('region', { name: '코드 심벌 속성' })).toBeVisible()
    expect(screen.getByLabelText('코드 심벌')).toBeVisible()
    expect(screen.getByLabelText('코드 심벌 적용 위치')).toHaveTextContent(
      '선택 이벤트 tick 0'
    )
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
    expect(within(contextStrip).getByText('악보')).toBeInTheDocument()
    expect(screen.getByLabelText('조표')).toBeVisible()
    expect(screen.getByLabelText('박자표')).toBeVisible()
    expect(screen.getByLabelText('선택 마디 음자리표')).not.toBeVisible()
    expect(screen.getByLabelText('위치별 빠르기 BPM')).toBeVisible()
    expect(screen.getByLabelText('PDF 설정 프리셋')).not.toBeVisible()
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

    fireEvent.click(
      within(dockedPalette).getByRole('button', {
        name: '표기 객체 팔레트 열기'
      })
    )
    expect(within(contextStrip).getByText('표기 객체')).toBeInTheDocument()
    expect(
      within(dockedPalette).getByRole('button', {
        name: '표기 객체 팔레트 열기'
      })
    ).toHaveAttribute('aria-pressed', 'true')
    const notationObjects = screen.getByRole('region', { name: '표기 객체' })
    expect(within(notationObjects).getByLabelText('연습표')).toBeVisible()
    expect(within(notationObjects).getByLabelText('보표 글자')).toBeVisible()
    expect(within(notationObjects).getByLabelText('표현 텍스트')).toBeVisible()
    const dockedDynamics = within(dockedPalette).getByRole('region', {
      name: '셈여림 팔레트'
    })
    fireEvent.click(
      within(dockedDynamics).getByRole('button', { name: 'mf 셈여림 적용' })
    )
    expect(within(notationObjects).getByLabelText('셈여림')).toHaveValue('mf')
    expect(within(preview).getByText('mf')).toBeInTheDocument()
    expect(
      within(notationObjects).getByLabelText('선택 마디 음자리표')
    ).toBeVisible()

    fireEvent.click(within(toolbarTabs).getByRole('button', { name: '파일' }))
    expect(within(contextStrip).getByText('파일')).toBeInTheDocument()
    expect(within(workspace).getByLabelText('새 악보 만들기')).toBeInTheDocument()
    expect(within(workspace).getByLabelText('MusicXML 가져오기')).toBeInTheDocument()
    const selectionFilter = within(workspace).getByLabelText('선택 필터')
    expect(selectionFilter).toBeVisible()
    expect(selectionFilter).toHaveValue('notes-and-rests')
    fireEvent.change(selectionFilter, { target: { value: 'rests' } })
    expect(within(contextStrip).getByText('쉼표만')).toBeInTheDocument()
    expect(within(workspace).getByLabelText('음표 지우기')).toBeDisabled()
    fireEvent.change(selectionFilter, { target: { value: 'notes' } })
    expect(within(contextStrip).getByText('음표만')).toBeInTheDocument()
    expect(within(workspace).getByLabelText('음표 지우기')).not.toBeDisabled()
    expect(
      within(workspace).queryByRole('button', { name: 'PDF 변환' })
    ).not.toBeInTheDocument()
    expect(
      within(workspace).queryByRole('button', { name: 'MIDI 내보내기' })
    ).not.toBeInTheDocument()

    fireEvent.click(within(workspace).getByLabelText('새 악보 만들기'))
    const newScoreDialog = screen.getByRole('dialog', {
      name: '새 악보 만들기'
    })
    expect(newScoreDialog).toBeInTheDocument()
    expect(window.confirm).not.toHaveBeenCalled()
    fireEvent.click(within(newScoreDialog).getByRole('button', { name: '취소' }))

    fireEvent.click(within(toolbarTabs).getByRole('button', { name: '내보내기' }))
    expect(within(contextStrip).getByText('내보내기')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '내보내기 설정' })).toBeVisible()
    expect(within(workspace).getByLabelText('PDF 변환')).toBeVisible()
    expect(within(workspace).getByLabelText('MIDI 내보내기')).toBeVisible()
    expect(within(workspace).getByLabelText('PDF 목표 장수')).toBeVisible()
    expect(screen.getByLabelText('PDF 설정 프리셋')).toBeVisible()

    fireEvent.click(within(toolbarTabs).getByRole('button', { name: '재생' }))
    expect(within(contextStrip).getAllByText('재생').length).toBeGreaterThan(0)
    expect(within(workspace).getByRole('button', { name: '재생' })).toBeVisible()
    screen
      .getAllByLabelText('빠르기')
      .forEach((element) => expect(element).not.toBeVisible())

    fireEvent.click(within(toolbarTabs).getByRole('button', { name: '음표' }))
    expect(within(contextStrip).getByText('음표')).toBeInTheDocument()
    expect(
      within(workspace).queryByRole('button', { name: '재생' })
    ).not.toBeInTheDocument()
    screen
      .getAllByLabelText('빠르기')
      .forEach((element) => expect(element).not.toBeVisible())
    expect(screen.getByLabelText('선택 마디 음자리표')).not.toBeVisible()
    expect(screen.getByLabelText('코드 심벌')).not.toBeVisible()
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
    expect(
      JSON.parse(
        window.localStorage.getItem('chromatics.part-mixer.v1') ?? '{}'
      )['part-1']
    ).toMatchObject({
      muted: true,
      solo: true,
      volume: 0.65
    })

    cleanup()
    playbackMockState.lastPartMixer = {}
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '재생' }))

    const restoredMixer = screen.getByLabelText('파트 믹서')
    expect(within(restoredMixer).getByLabelText('Melody 음소거')).toBeChecked()
    expect(within(restoredMixer).getByLabelText('Melody 솔로')).toBeChecked()
    expect(within(restoredMixer).getByLabelText('Melody 볼륨')).toHaveValue('65')
    expect(playbackMockState.lastPartMixer['part-1']).toMatchObject({
      muted: true,
      solo: true,
      volume: 0.65
    })
  })

  it('playback.part-mixer keeps independent controls for a 4-part ensemble', async () => {
    const { App } = await import('./App')
    const view = render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /새 악보 만들기/ }))
    const dialog = screen.getByRole('dialog', { name: '새 악보 만들기' })
    fireEvent.change(within(dialog).getByLabelText('악보 구성'), {
      target: { value: 'string-quartet' }
    })
    fireEvent.click(within(dialog).getByRole('button', { name: '만들기' }))
    playbackMockState.value = {
      ...playbackMockState.value,
      activeEvent: {
        eventId: 'cello-staff-1-measure-1-full-measure-rest',
        partId: 'cello',
        staffId: 'staff-1',
        measureId: 'cello-staff-1-measure-1',
        voiceId: 'voice-1'
      },
      activeEventId: 'cello-staff-1-measure-1-full-measure-rest',
      status: 'playing'
    }
    view.rerender(<App />)
    fireEvent.click(screen.getByRole('button', { name: '재생' }))

    const mixer = screen.getByLabelText('파트 믹서')
    const violinMute = within(mixer).getByLabelText('Violin I 음소거')
    const celloSolo = within(mixer).getByLabelText('Cello 솔로')
    const violaVolume = within(mixer).getByLabelText('Viola 볼륨')

    expect(within(mixer).getByText('Violin I')).toBeInTheDocument()
    expect(within(mixer).getByText('Violin II')).toBeInTheDocument()
    expect(within(mixer).getByText('Viola')).toBeInTheDocument()
    expect(within(mixer).getByText('Cello')).toBeInTheDocument()
    expect(within(mixer).getByLabelText('Cello 재생 상태')).toHaveTextContent(
      '재생 중'
    )
    expect(within(mixer).getByLabelText('Viola 재생 상태')).toHaveTextContent(
      '대기'
    )
    expect(
      within(mixer).getByLabelText('Cello 재생 상태').closest('.part-mixer__row')
    ).toHaveAttribute('data-playback-active', 'true')
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
    const musicXmlButton = within(fileActions).getByRole('button', {
      name: 'MusicXML로 저장'
    })
    expect(
      within(fileActions).queryByRole('button', { name: 'PDF 변환' })
    ).not.toBeInTheDocument()
    expect(
      within(fileActions).queryByRole('button', { name: 'MIDI 내보내기' })
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '내보내기' }))
    const exportActions = screen.getByLabelText('내보내기 작업')
    const pdfButton = within(exportActions).getByRole('button', {
      name: 'PDF 변환'
    })
    const pageTarget = within(exportActions).getByLabelText('PDF 목표 장수')

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

    fireEvent.click(screen.getByRole('button', { name: '내보내기' }))
    const exportActions = screen.getByLabelText('내보내기 작업')
    const midiButton = within(exportActions).getByRole('button', {
      name: 'MIDI 내보내기'
    })

    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    const fileActions = screen.getByLabelText('파일 작업')
    expect(
      within(fileActions).queryByRole('button', { name: 'MIDI 내보내기' })
    ).not.toBeInTheDocument()
    expect(
      within(fileActions).queryByRole('button', { name: 'PDF 변환' })
    ).not.toBeInTheDocument()
    expect(midiButton).not.toBe(
      within(fileActions).getByRole('button', { name: 'MusicXML로 저장' })
    )
    fireEvent.click(screen.getByRole('button', { name: '내보내기' }))
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

    fireEvent.click(screen.getByRole('button', { name: '내보내기' }))
    const exportActions = screen.getByLabelText('내보내기 작업')
    fireEvent.click(
      within(exportActions).getByRole('button', { name: 'MIDI 내보내기' })
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

    fireEvent.click(screen.getByRole('button', { name: '내보내기' }))
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

    fireEvent.click(screen.getByRole('button', { name: '내보내기' }))
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
  }, 10000)

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

    fireEvent.click(screen.getByRole('button', { name: '내보내기' }))
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

  it('layout.page-setup previews page margin guides without printing them', async () => {
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

    const scorePage = screen.getByLabelText('악보 페이지')

    expect(scorePage).toHaveAttribute('data-show-page-margins', 'false')

    fireEvent.click(screen.getByRole('button', { name: '내보내기' }))
    const marginGuideToggle = screen.getByLabelText('PDF 여백 가이드 표시')

    expect(marginGuideToggle).not.toBeChecked()

    fireEvent.click(marginGuideToggle)
    fireEvent.change(screen.getByLabelText('PDF 여백 mm'), {
      target: { value: '12' }
    })

    expect(marginGuideToggle).toBeChecked()
    expect(scorePage).toHaveAttribute('data-show-page-margins', 'true')
    expect(scorePage).toHaveStyle({
      '--score-page-margin-guide-inset': '12mm'
    })

    fireEvent.click(screen.getByRole('button', { name: 'PDF 변환' }))

    await waitFor(() => expect(window.inC.pdf.save).toHaveBeenCalled())
    expect(scorePage).toHaveAttribute('data-show-page-margins', 'false')

    finishPdfSave?.({ fileName: 'margin-guide.pdf' })
    await screen.findByText('margin-guide.pdf로 PDF를 만들었습니다.')
    expect(scorePage).toHaveAttribute('data-show-page-margins', 'true')
  })

  it('ui.properties-panel summarizes the selected event and measure context', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'm1-c4 선택' }))

    const properties = screen.getByRole('region', { name: '선택 요약' })
    expect(properties).toHaveAttribute('data-selection-kind', 'event')
    expect(within(properties).getByText('속성')).toBeInTheDocument()
    expect(within(properties).getByText('대상')).toBeInTheDocument()
    expect(within(properties).getByText('음표')).toBeInTheDocument()
    expect(within(properties).getByText('음가')).toBeInTheDocument()
    expect(within(properties).getByText('4분음표')).toBeInTheDocument()
    expect(within(properties).getByText('성부')).toBeInTheDocument()
    expect(within(properties).getAllByText('1').length).toBeGreaterThan(0)

    fireEvent.change(within(properties).getByLabelText('선택 요약 셈여림'), {
      target: { value: 'ff' }
    })

    const dynamic = within(screen.getByTestId('notation-preview')).getByText('ff')
    expect(dynamic).toHaveAttribute('data-measure-id', 'measure-1')

    fireEvent.click(screen.getByRole('button', { name: '2마디 선택' }))

    expect(properties).toHaveAttribute('data-selection-kind', 'measure')
    expect(within(properties).getAllByText('마디').length).toBeGreaterThan(0)
    expect(within(properties).getByText('음자리표')).toBeInTheDocument()
    expect(within(properties).getByText('박자')).toBeInTheDocument()
    expect(within(properties).getByText('4/4')).toBeInTheDocument()
  })

  it('ui.properties-edit applies text and harmony to the selected location, supports undo and disables range edits', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'm1-d4 선택' }))
    const properties = screen.getByRole('region', { name: '선택 요약' })
    const edit = (label: string, value: string) => {
      const input = within(properties).getByLabelText(label)
      fireEvent.change(input, { target: { value } })
      fireEvent.blur(input)
    }
    edit('선택 요약 코드', 'C/G')
    edit('선택 요약 보표 글자', 'cantabile')
    const cancelled = within(properties).getByLabelText('선택 요약 연습표')
    cancelled.focus()
    fireEvent.change(cancelled, { target: { value: 'Cancel me' } })
    fireEvent.keyDown(cancelled, { key: 'Escape' })
    expect(cancelled).not.toHaveValue('Cancel me')
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '실행 취소' }))
    expect(within(properties).getByLabelText('선택 요약 보표 글자')).toHaveValue('dolce')
    fireEvent.click(screen.getByRole('button', { name: '다시 실행' }))
    expect(within(properties).getByLabelText('선택 요약 보표 글자')).toHaveValue('cantabile')
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))
    await waitFor(() => expect(window.inC.musicXml.save).toHaveBeenCalled())
    const reopened = parseMusicXml(vi.mocked(window.inC.musicXml.save).mock.calls.at(-1)![0].contents)
    expect(reopened.harmonies).toEqual(expect.arrayContaining([expect.objectContaining({ text: 'C/G', measureId: 'measure-1', tick: TICKS_PER_QUARTER })]))
    expect(reopened.staffTexts).toEqual(expect.arrayContaining([expect.objectContaining({ text: 'cantabile', measureId: 'measure-1' })]))
    fireEvent.click(screen.getByRole('button', { name: '2마디 선택' }))
    expect(within(properties).getByLabelText('선택 요약 보표 글자')).not.toHaveValue('cantabile')
    fireEvent.click(screen.getByRole('button', { name: 'm1-c4 선택' }))
    fireEvent.click(screen.getByRole('button', { name: 'm1-d4 선택' }), { shiftKey: true })
    expect(properties).toHaveAttribute('data-selection-kind', 'range')
    for (const control of within(properties).getAllByRole('textbox')) expect(control).toBeDisabled()
    expect(within(properties).getByLabelText('선택 요약 셈여림')).toBeDisabled()
  })

  it('save.async keeps edits made while a save is pending and suppresses duplicate save requests', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    let finish!: (value: { filePath: string; fileName: string }) => void
    vi.mocked(window.inC.musicXml.save).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))
    expect(window.inC.musicXml.save).toHaveBeenCalledTimes(1)
    const input = screen.getByRole('textbox', { name: '선택 요약 보표 글자' })
    fireEvent.change(input, { target: { value: 'after-save-start' } })
    fireEvent.blur(input)
    finish({ filePath: '/scores/async.musicxml', fileName: 'async.musicxml' })
    await screen.findByText(/저장 중 추가한 변경사항은 아직 저장되지 않았습니다/)
    expect(window.inC.autosave.clear).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))
    await waitFor(() => expect(window.inC.musicXml.save).toHaveBeenCalledTimes(2))
    expect(vi.mocked(window.inC.musicXml.save).mock.calls[1][0]).toMatchObject({ filePath: '/scores/async.musicxml', contents: expect.stringContaining('after-save-start') })
  })

  it.each(['success', 'failure'])('save.async ignores stale %s after switching documents', async (outcome) => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    let finish!: (value: { filePath: string; fileName: string }) => void
    let fail!: (reason: Error) => void
    vi.mocked(window.inC.musicXml.save).mockImplementationOnce(() => new Promise((resolve, reject) => { finish = resolve; fail = reject }))
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))
    fireEvent.click(screen.getByRole('button', { name: '새 악보 만들기' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: '새 악보 만들기' })).getByRole('button', { name: '만들기' }))
    if (outcome === 'success') finish({ filePath: '/scores/old.musicxml', fileName: 'old.musicxml' })
    else fail(new Error('stale save failure'))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.queryByText('stale save failure')).not.toBeInTheDocument()
    expect(window.inC.autosave.clear).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))
    await waitFor(() => expect(window.inC.musicXml.save).toHaveBeenCalledTimes(2))
    expect(vi.mocked(window.inC.musicXml.save).mock.calls[1][0]).not.toHaveProperty('filePath')
  })

  it('save.async restores recovery data for edits made during autosave cleanup', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    vi.mocked(window.inC.musicXml.save).mockResolvedValueOnce({ filePath: '/scores/cleanup.musicxml', fileName: 'cleanup.musicxml' })
    let finishClear!: () => void
    vi.mocked(window.inC.autosave.clear).mockImplementationOnce(() => new Promise((resolve) => { finishClear = resolve }))
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    const save = screen.getByRole('button', { name: 'MusicXML로 저장' })
    fireEvent.click(save)
    await waitFor(() => expect(window.inC.autosave.clear).toHaveBeenCalledOnce())
    expect(save).toBeDisabled()
    expect(save).toHaveAttribute('aria-busy', 'true')
    const input = screen.getByRole('textbox', { name: '선택 요약 보표 글자' })
    fireEvent.change(input, { target: { value: 'during-cleanup' } })
    fireEvent.blur(input)
    finishClear()
    await screen.findByText(/저장 중 추가한 변경사항은 아직 저장되지 않았습니다/)
    const recovery = vi.mocked(window.inC.autosave.write).mock.calls.at(-1)![0]
    expect(recovery.score).toEqual(expect.objectContaining({ staffTexts: expect.arrayContaining([expect.objectContaining({ text: 'during-cleanup' })]) }))
    expect(save).toBeEnabled()
  })

  it('save.async retains unsaved edits after failure and allows retry', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    vi.mocked(window.inC.musicXml.save).mockRejectedValueOnce(new Error('disk unavailable'))
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    const input = screen.getByRole('textbox', { name: '선택 요약 보표 글자' })
    fireEvent.change(input, { target: { value: 'retain-on-failure' } })
    fireEvent.blur(input)
    const save = screen.getByRole('button', { name: 'MusicXML로 저장' })
    fireEvent.click(save)
    await screen.findByText('disk unavailable')
    expect(window.inC.autosave.clear).not.toHaveBeenCalled()
    expect(save).toBeEnabled()
    fireEvent.click(save)
    await waitFor(() => expect(window.inC.musicXml.save).toHaveBeenCalledTimes(2))
    expect(vi.mocked(window.inC.musicXml.save).mock.calls[1][0].contents).toContain('retain-on-failure')
  })

  it('ui.shortcut-help exposes the V1 command reference from File mode', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '단축키 도움말' }))

    const dialog = screen.getByRole('dialog', { name: '단축키 도움말' })
    expect(within(dialog).getByText('음표 입력')).toBeInTheDocument()
    expect(within(dialog).getByText('음가 선택')).toBeInTheDocument()
    expect(within(dialog).getByText('1-7')).toBeInTheDocument()
    expect(within(dialog).getByText('셋잇단음표')).toBeInTheDocument()
    expect(within(dialog).getByText('⌘/Ctrl+3')).toBeInTheDocument()
    expect(within(dialog).getByText('성부 직접 선택')).toBeInTheDocument()
    expect(within(dialog).getByText('Cmd/Ctrl+Alt+1-4')).toBeInTheDocument()
    expect(within(dialog).queryByText('9')).not.toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole('button', { name: '닫기' }))
    expect(screen.queryByRole('dialog', { name: '단축키 도움말' })).not.toBeInTheDocument()
  })

  it('ui.dock-visibility persists independent panels without changing the selected score', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    const app = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'm1-d4 선택' }))
    const property = screen.getByRole('textbox', { name: '선택 요약 보표 글자' })
    fireEvent.change(property, { target: { value: 'dock-edit' } })
    fireEvent.blur(property)
    fireEvent.click(screen.getByRole('button', { name: '팔레트 표시' }))
    expect(screen.queryByRole('complementary', { name: '고정 팔레트' })).not.toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: '속성 도크' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '속성 표시' }))
    expect(screen.queryByRole('complementary', { name: '속성 도크' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '속성 표시' }))
    expect(screen.getByRole('textbox', { name: '선택 요약 보표 글자' })).toHaveValue('dock-edit')
    expect(screen.getByRole('region', { name: '선택 요약' })).toHaveAttribute('data-selection-kind', 'event')
    app.unmount()
    render(<App />)
    expect(screen.getByRole('button', { name: '팔레트 표시' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: '속성 표시' })).toHaveAttribute('aria-pressed', 'true')
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

    fireEvent.click(screen.getByRole('button', { name: '내보내기' }))
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

    fireEvent.click(screen.getByRole('button', { name: '내보내기' }))
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

    fireEvent.click(screen.getByRole('button', { name: '내보내기' }))
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
    const recoveryButton = await within(startActions).findByRole('button', {
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

    fireEvent.click(screen.getByRole('button', { name: '가사' }))
    const harmonyInput = screen.getByLabelText('코드 심벌')
    fireEvent.change(harmonyInput, { target: { value: 'C7/G' } })
    fireEvent.blur(harmonyInput)
    expect(screen.getByText('코드 심벌을 갱신했습니다.')).toBeInTheDocument()

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

    fireEvent.click(screen.getByRole('button', { name: '내보내기' }))
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
    fireEvent.click(screen.getByRole('button', { name: '내보내기' }))
    fireEvent.click(screen.getByRole('button', { name: 'PDF 변환' }))
    await waitFor(() => expect(window.inC.pdf.save).toHaveBeenCalled())
    expect(screen.queryByText(/PDF를 만들었습니다/)).not.toBeInTheDocument()

    cleanup()
    installPreloadStub()
    vi.mocked(window.inC.pdf.save).mockRejectedValue(
      new Error('PDF 저장에 실패했습니다.')
    )
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '내보내기' }))
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
    expect(screen.getAllByText('정지').length).toBeGreaterThan(0)
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

  it('range paste keeps target selection and markings through native save undo and reopen', async () => {
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(releaseQaMusicXml))
    const part = project.score.parts[0]!, staff = part.staves[0]!, measure = staff.measures[0]!
    const [source, , target, end] = measure.voices[0]!.events
    if (source?.type !== 'note' || !target || !end) throw new Error('Invalid clipboard fixture')
    source.lyrics = [{ number: 1, text: 'copy', syllabic: 'single' }]
    source.articulations = ['accent']
    project.score.slurs = [{ id: 'replaced', startEventId: target.id, endEventId: end.id }]
    project.partLayouts = [{ partId: part.id, layout: {}, spanEngravings: [{ kind: 'slur', spanId: 'replaced', engraving: { offsetY: 3 } }] }]
    let contents = encodeNativeProject(project)
    vi.mocked(window.inC.project.open).mockImplementation(async () => ({ filePath: '/scores/paste.chromatics', fileName: 'paste.chromatics', contents }))
    vi.mocked(window.inC.project.save).mockImplementation(async request => { contents = request.contents; return { filePath: '/scores/paste.chromatics', fileName: 'paste.chromatics' } })
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Release QA Scenario')
    fireEvent.click(screen.getByRole('button', { name: `${source.id} 선택` }))
    fireEvent.keyDown(window, { code: 'KeyC', ctrlKey: true })
    fireEvent.click(screen.getByRole('button', { name: `${target.id} 선택` }))
    fireEvent.keyDown(window, { code: 'KeyV', ctrlKey: true })
    const preview = screen.getByTestId('notation-preview')
    const pastedId = preview.getAttribute('data-selected-event-id')!
    expect(pastedId).toMatch(/^event-/)
    expect(preview.getAttribute('data-selected-event-address')).toBe(`${part.id}:${staff.id}:${measure.id}:${measure.voices[0]!.id}`)
    const save = async () => {
      vi.mocked(window.inC.project.save).mockClear()
      fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
      await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
      await screen.findByText('paste.chromatics에 저장했습니다.')
      return decodeNativeProject(contents)
    }
    const saved = await save()
    expect(saved.score.slurs).toEqual([])
    expect(saved.partLayouts[0]!.spanEngravings).toEqual([])
    const pasted = saved.score.parts[0]!.staves[0]!.measures[0]!.voices[0]!.events.find(event => event.id === pastedId)!
    expect(pasted).toMatchObject({ lyrics: source.lyrics, articulations: source.articulations })
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    const undone = await save()
    expect(undone.score).toEqual(project.score)
    expect(undone.partLayouts).toEqual(project.partLayouts)
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true, shiftKey: true })
    expect((await save()).score).toEqual(saved.score)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('paste.chromatics을 열었습니다.')
    expect((await save()).score).toEqual(saved.score)
  })

  it.each([
    ['slur', 'object'], ['slur', 'automatic'], ['slur', 'inherit'],
    ['hairpin', 'object'], ['hairpin', 'automatic'], ['hairpin', 'inherit']
  ] as const)('range clipboard snapshots %s %s part geometry and reports omissions through native history', async (kind, policy) => {
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(releaseQaMusicXml))
    const part = project.score.parts[0]!, staff = part.staves[0]!, measure = staff.measures[0]!
    const [first, second, third, fourth] = measure.voices[0]!.events
    if (!first || !second || !third || !fourth) throw new Error('Invalid range fixture')
    const segment = { partId: part.id, staffId: staff.id, startMeasureId: measure.id, endMeasureId: measure.id, geometry: { offsetY: 2 } }
    const outsideSegment = { ...segment, endMeasureId: staff.measures[1]!.id }
    const engraving = { offsetY: -1, segments: [segment, outsideSegment] }
    const contained = { id: 'contained', startEventId: first.id, endEventId: second.id, engraving }
    project.score.slurs = kind === 'slur' ? [contained] : []
    project.score.hairpins = kind === 'hairpin' ? [{ ...contained, type: 'crescendo' }] : []
    project.score.hairpins.push({ id: 'partial', type: 'crescendo', startEventId: second.id, endEventId: third.id })
    project.score.octaveShifts = [{ id: 'contained-octave', startEventId: first.id, endEventId: second.id, type: '8va' }]
    project.view = { mode: 'part', partId: part.id }
    const partSegment = { ...segment, geometry: { offsetY: 4 } }
    const override = policy === 'object' ? { ...engraving, offsetY: 3, segments: [partSegment, outsideSegment] } : null
    project.partLayouts = [{ partId: part.id, layout: {}, ...(policy === 'inherit' ? {} : {
      spanEngravings: [{ kind, spanId: 'contained', engraving: override }]
    }) }]
    let contents = encodeNativeProject(project)
    vi.mocked(window.inC.project.open).mockImplementation(async () => ({ filePath: '/scores/range.chromatics', fileName: 'range.chromatics', contents }))
    vi.mocked(window.inC.project.save).mockImplementation(async request => {
      contents = request.contents
      return { filePath: '/scores/range.chromatics', fileName: 'range.chromatics' }
    })
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Release QA Scenario')
    fireEvent.click(screen.getByRole('button', { name: `${first.id} 선택` }))
    fireEvent.click(screen.getByRole('button', { name: `${second.id} 선택` }), { shiftKey: true })
    fireEvent.keyDown(window, { code: 'KeyC', ctrlKey: true })
    expect(screen.getByText(/부분 포함 표기 1개 제외/)).toBeInTheDocument()
    if (policy !== 'automatic') expect(screen.getByText(/범위 밖 구간 배치 1개 제외/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    fireEvent.change(screen.getByLabelText('악보 보기'), { target: { value: 'score' } })
    fireEvent.click(screen.getByRole('button', { name: `${third.id} 선택` }))
    fireEvent.click(screen.getByRole('button', { name: `${fourth.id} 선택` }), { shiftKey: true })
    fireEvent.keyDown(window, { code: 'KeyV', ctrlKey: true })
    expect(screen.getByText(/붙여넣었습니다.*부분 포함 표기 1개 제외/)).toBeInTheDocument()
    const save = async () => {
      vi.mocked(window.inC.project.save).mockClear()
      fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
      await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
      await screen.findByText('range.chromatics에 저장했습니다.')
      return decodeNativeProject(contents)
    }
    const saved = await save()
    const spans = kind === 'slur' ? saved.score.slurs! : saved.score.hairpins!
    expect(spans[0]).toEqual(kind === 'slur' ? project.score.slurs[0] : project.score.hairpins[0])
    expect(saved.partLayouts).toEqual(project.partLayouts)
    const copied = spans[1]!
    expect(saved.score.octaveShifts).toHaveLength(2)
    expect(saved.score.octaveShifts![1]).toMatchObject({ type: '8va', startEventId: copied.startEventId, endEventId: copied.endEventId })
    expect(copied.engraving).toEqual(policy === 'automatic' ? undefined : {
      offsetY: policy === 'object' ? 3 : -1, segments: [policy === 'object' ? partSegment : segment]
    })
    expect(copied.startEventId).not.toBe(first.id)
    expect(copied.endEventId).not.toBe(second.id)
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect((await save()).score).toEqual(JSON.parse(JSON.stringify(project.score)))
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true, shiftKey: true })
    expect((await save()).score).toEqual(saved.score)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('range.chromatics을 열었습니다.')
    expect((await save()).score).toEqual(saved.score)
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

  it('selection-filter.copy uses the filtered event set for same-measure ranges', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { App } = await import('./App')
    render(<App />)

    const toolbarTabs = screen.getByRole('navigation', {
      name: '편집 도구 카테고리'
    })

    fireEvent.click(screen.getByRole('button', { name: 'note-g4 선택' }))
    fireEvent.click(screen.getByRole('button', { name: 'rest-half 선택' }), {
      shiftKey: true
    })
    fireEvent.click(within(toolbarTabs).getByRole('button', { name: '파일' }))
    fireEvent.change(screen.getByLabelText('선택 필터'), {
      target: { value: 'notes' }
    })
    fireEvent.click(screen.getByRole('button', { name: '선택 범위 복사' }))

    expect(
      screen.getByText('4개 필터된 이벤트를 복사했습니다.')
    ).toBeInTheDocument()
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

    fireEvent.click(screen.getByRole('button', { name: '표기 객체' }))
    const rehearsalMarkInput = screen.getByRole('textbox', { name: '연습표' })
    const preview = screen.getByTestId('notation-preview')

    fireEvent.change(rehearsalMarkInput, { target: { value: '' } })
    fireEvent.blur(rehearsalMarkInput)
    expect(within(preview).queryByText('A')).not.toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: '연습표' }), {
      target: { value: 'A' }
    })
    fireEvent.blur(screen.getByRole('textbox', { name: '연습표' }))

    expect(within(preview).getByText('A')).toHaveAttribute(
      'data-measure-id',
      'measure-1'
    )
  })

  it('layout.staff-text adds dolce without triggering a note shortcut', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '표기 객체' }))
    const staffTextInput = screen.getByRole('textbox', { name: '보표 글자' })
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

    fireEvent.click(screen.getByRole('button', { name: '표기 객체' }))
    const systemTextInput = screen.getByRole('textbox', { name: '시스템 텍스트' })
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
    fireEvent.click(screen.getByRole('button', { name: '표기 객체' }))
    const expressionTextInput = screen.getByRole('textbox', { name: '표현 텍스트' })
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

    fireEvent.click(screen.getByRole('button', { name: '표기 객체' }))
    const dynamics = screen.getByRole('combobox', { name: '셈여림' })
    expect(within(dynamics).getByRole('option', { name: 'pp' })).toBeInTheDocument()
    expect(within(dynamics).getByRole('option', { name: 'ff' })).toBeInTheDocument()
    expect(within(dynamics).getByRole('option', { name: 'sfz' })).toBeInTheDocument()

    fireEvent.change(dynamics, {
      target: { value: 'ff' }
    })

    const dynamic = within(screen.getByTestId('notation-preview')).getByText('ff')
    expect(dynamic).toHaveAttribute('data-measure-id', 'measure-1')
    expect(dynamic).not.toHaveAttribute('data-measure-id', 'measure-2')
  })

  it('palette.measure-level-notation keeps score setup structural and edits measure markings from notation objects', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '음표' }))
    expect(
      within(screen.getByRole('region', { name: '음표 편집' })).queryByLabelText(
        '셈여림'
      )
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    const scoreSetupPanel = screen.getByRole('region', { name: '악보 편집' })
    expect(scoreSetupPanel).toBeVisible()
    expect(within(scoreSetupPanel).queryByLabelText('셈여림')).not.toBeInTheDocument()
    expect(within(scoreSetupPanel).queryByLabelText('연습표')).not.toBeInTheDocument()
    expect(within(scoreSetupPanel).queryByLabelText('보표 글자')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '표기 객체' }))
    const notationObjects = screen.getByRole('region', { name: '표기 객체' })
    expect(notationObjects).toBeVisible()
    expect(screen.getByRole('region', { name: '마디 표기' })).toBeVisible()
    expect(screen.getByRole('region', { name: '반복과 볼타' })).toBeVisible()

    fireEvent.change(within(notationObjects).getByLabelText('연습표'), {
      target: { value: 'B' }
    })
    fireEvent.blur(within(notationObjects).getByLabelText('연습표'))
    fireEvent.change(within(notationObjects).getByLabelText('셈여림'), {
      target: { value: 'sfz' }
    })

    const preview = screen.getByTestId('notation-preview')
    expect(within(preview).getByText('B')).toHaveAttribute(
      'data-measure-id',
      'measure-1'
    )
    expect(within(preview).getByText('sfz')).toHaveAttribute(
      'data-measure-id',
      'measure-1'
    )
  })

  it('palette.notation-applicability disables measure text and dynamics for range selection', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'm1-c4 선택' }))
    fireEvent.click(screen.getByRole('button', { name: 'm1-d4 선택' }), {
      shiftKey: true
    })
    fireEvent.click(screen.getByRole('button', { name: '표기 객체' }))

    const measureNotation = screen.getByRole('region', { name: '마디 표기' })
    expect(measureNotation).toHaveAttribute(
      'data-applicability',
      'range-disabled'
    )
    expect(within(measureNotation).getByLabelText('연습표')).toBeDisabled()
    expect(within(measureNotation).getByLabelText('보표 글자')).toBeDisabled()
    expect(within(measureNotation).getByLabelText('시스템 텍스트')).toBeDisabled()
    expect(within(measureNotation).getByLabelText('표현 텍스트')).toBeDisabled()
    expect(within(measureNotation).getByLabelText('셈여림')).toBeDisabled()
    const dockedDynamics = screen.getByRole('region', { name: '셈여림 팔레트' })
    for (const button of within(dockedDynamics).getAllByRole('button')) {
      expect(button).toBeDisabled()
    }
  })

  it('palette.lyrics-chords separates lyric and chord groups and anchors measure-selected chords at tick 0', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '음표' }))
    expect(screen.getByLabelText('코드 심벌')).not.toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: '표기 객체' }))
    expect(screen.getByLabelText('코드 심벌')).not.toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: '가사' }))
    expect(screen.getByRole('region', { name: '가사 속성' })).toBeVisible()
    expect(screen.getByRole('region', { name: '코드 심벌 속성' })).toBeVisible()
    expect(screen.getByLabelText('가사 절')).toBeVisible()
    expect(screen.getByLabelText('코드 심벌')).toBeVisible()

    fireEvent.change(
      within(screen.getByTestId('notation-preview')).getByLabelText(
        '선택 음표 가사'
      ),
      { target: { value: 'Sing' } }
    )
    fireEvent.blur(
      within(screen.getByTestId('notation-preview')).getByLabelText(
        '선택 음표 가사'
      )
    )
    fireEvent.change(screen.getByLabelText('코드 심벌'), {
      target: { value: 'C7/G' }
    })
    fireEvent.blur(screen.getByLabelText('코드 심벌'))

    const preview = screen.getByTestId('notation-preview')
    expect(preview).toHaveAttribute(
      'data-lyrics',
      expect.stringContaining('m1-c4:1:single:Sing')
    )
    expect(within(preview).getByText('C7/G')).toHaveAttribute(
      'data-measure-id',
      'measure-1'
    )
    expect(within(preview).getByText('C7/G')).toHaveAttribute('data-tick', '0')

    fireEvent.click(screen.getByRole('button', { name: '2마디 선택' }))
    fireEvent.click(screen.getByRole('button', { name: '가사' }))
    expect(screen.queryByLabelText('선택 음표 가사')).not.toBeInTheDocument()
    expect(screen.getByText('음표를 선택하면 가사 입력 항목이 표시됩니다.'))
      .toBeVisible()
    expect(screen.getByLabelText('코드 심벌 적용 위치')).toHaveTextContent(
      '선택 마디 시작 tick 0'
    )

    fireEvent.change(screen.getByLabelText('코드 심벌'), {
      target: { value: 'Fmaj7' }
    })
    fireEvent.blur(screen.getByLabelText('코드 심벌'))
    expect(within(preview).getByText('Fmaj7')).toHaveAttribute(
      'data-measure-id',
      'measure-2'
    )
    expect(within(preview).getByText('Fmaj7')).toHaveAttribute('data-tick', '0')

    fireEvent.click(screen.getByRole('button', { name: '표기 객체' }))
    fireEvent.change(
      within(screen.getByRole('region', { name: '표기 객체' })).getByLabelText(
        '셈여림'
      ),
      { target: { value: 'ff' } }
    )
    expect(within(preview).getByText('ff')).toHaveAttribute(
      'data-measure-id',
      'measure-2'
    )

    fireEvent.click(screen.getByRole('button', { name: '1마디 선택' }))
    fireEvent.click(screen.getByRole('button', { name: '표기 객체' }))
    fireEvent.change(
      within(screen.getByRole('region', { name: '표기 객체' })).getByLabelText(
        '셈여림'
      ),
      { target: { value: 'mf' } }
    )
    expect(within(preview).getByText('mf')).toHaveAttribute(
      'data-measure-id',
      'measure-1'
    )

    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    const objectFilter = screen.getByLabelText('표기 필터')
    fireEvent.change(objectFilter, { target: { value: 'harmonies' } })
    expect(objectFilter).toHaveValue('harmonies')
    fireEvent.click(screen.getByLabelText('선택 범위 복사'))
    fireEvent.click(screen.getByRole('button', { name: '2마디 선택' }))
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByLabelText('선택 범위에 붙여넣기'))
    expect(within(preview).queryByText('Fmaj7')).not.toBeInTheDocument()
    expect(
      within(preview)
        .getAllByText('C7/G')
        .some((element) => element.getAttribute('data-measure-id') === 'measure-2')
    ).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: '1마디 선택' }))
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.change(screen.getByLabelText('표기 필터'), {
      target: { value: 'dynamics' }
    })
    fireEvent.click(screen.getByLabelText('선택 범위 복사'))
    fireEvent.click(screen.getByRole('button', { name: '2마디 선택' }))
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByLabelText('선택 범위에 붙여넣기'))
    expect(within(preview).queryByText('ff')).not.toBeInTheDocument()
    expect(
      within(preview)
        .getAllByText('mf')
        .some((element) => element.getAttribute('data-measure-id') === 'measure-2')
    ).toBe(true)

    fireEvent.change(screen.getByLabelText('표기 필터'), {
      target: { value: 'harmonies' }
    })
    fireEvent.click(screen.getByLabelText('선택 마디 코드 지우기'))
    expect(
      within(preview)
        .getAllByText('C7/G')
        .every((element) => element.getAttribute('data-measure-id') !== 'measure-2')
    ).toBe(true)

    fireEvent.change(screen.getByLabelText('표기 필터'), {
      target: { value: 'dynamics' }
    })
    fireEvent.click(screen.getByLabelText('선택 마디 셈여림 지우기'))
    expect(
      within(preview)
        .getAllByText('mf')
        .every((element) => element.getAttribute('data-measure-id') !== 'measure-2')
    ).toBe(true)
  })

  it.each([
    ['staffTexts', '보표 글자'], ['systemTexts', '시스템 텍스트'],
    ['rehearsalMarks', '연습표'], ['expressionTexts', '표현 텍스트']
  ] as const)('text marking filter %s copies only the chosen type through native history', async (type, label) => {
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(releaseQaMusicXml))
    const [first, second] = project.score.parts[0].staves[0].measures
    const texts = [{ id: 'text-source', measureId: first.id, text: 'dolce source' },
      { id: 'text-target', measureId: second.id, text: 'old target' }]
    if (type === 'expressionTexts') project.score.expressionTexts = texts.map(text => ({ ...text, tick: 0 }))
    else project.score[type] = texts
    const original = JSON.parse(JSON.stringify(project.score))
    const contents = encodeNativeProject(project)
    window.inC.project = {
      listBackups: vi.fn().mockResolvedValue([]), readBackup: vi.fn().mockResolvedValue(null),
      open: vi.fn().mockResolvedValue({ filePath: '/qa/text.chromatics', fileName: 'text.chromatics', contents }),
      save: vi.fn().mockResolvedValue({ filePath: '/qa/text.chromatics', fileName: 'text.chromatics' })
    }
    const { App } = await import('./App'); render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('text.chromatics을 열었습니다.')
    fireEvent.click(screen.getByRole('button', { name: '1마디 선택' }))
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    expect(within(screen.getByLabelText('표기 필터')).getByRole('option', { name: label })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('표기 필터'), { target: { value: type } })
    fireEvent.keyDown(window, { code: 'KeyC', ctrlKey: true })
    fireEvent.click(screen.getByRole('button', { name: '2마디 선택' }))
    fireEvent.keyDown(window, { code: 'KeyV', ctrlKey: true })
    const save = async () => {
      vi.mocked(window.inC.project!.save).mockClear()
      fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
      await waitFor(() => expect(window.inC.project!.save).toHaveBeenCalled())
      return decodeNativeProject(vi.mocked(window.inC.project!.save).mock.calls[0][0].contents)
    }
    const pasted = await save()
    expect(pasted.score.parts).toEqual(original.parts)
    expect(pasted.score[type]).toHaveLength(2)
    expect(pasted.score[type]![1]).toMatchObject({ measureId: second.id, text: 'dolce source' })
    expect(pasted.score[type]![1].id).not.toBe('text-source')
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect((await save()).score).toEqual(original)
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true, shiftKey: true })
    expect((await save()).score).toEqual(pasted.score)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: `선택 마디 ${label} 지우기` }))
    expect((await save()).score[type]).toHaveLength(1)
    vi.mocked(window.inC.project!.open).mockResolvedValue({ filePath: '/qa/text-reopened.chromatics', fileName: 'text-reopened.chromatics', contents: encodeNativeProject(pasted) })
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('text-reopened.chromatics을 열었습니다.')
    expect((await save()).score).toEqual(pasted.score)
  })

  it.each([false, true])('global rehearsal editing preserves scope and local objects (part=%s)', async partView => {
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    if (partView) project.view = { mode: 'part', partId: 'P2' }
    const measureId = project.score.parts[partView ? 1 : 0].staves[0].measures[0].id
    project.score.rehearsalMarks = [
      { id: 'global-mark', measureId: 'measure-1', text: 'A' },
      { id: 'local-mark', measureId, text: 'A' }
    ]
    let contents = encodeNativeProject(project)
    vi.mocked(window.inC.project.open).mockImplementation(async () => ({ filePath: '/qa/global.chromatics', fileName: 'global.chromatics', contents }))
    vi.mocked(window.inC.project.save).mockImplementation(async request => {
      contents = request.contents
      return { filePath: '/qa/global.chromatics', fileName: 'global.chromatics' }
    })
    const { App } = await import('./App'); render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('global.chromatics을 열었습니다.')
    fireEvent.click(screen.getAllByRole('button', { name: '1마디 선택' })[0])
    fireEvent.click(screen.getByRole('button', { name: '표기 객체' }))
    const chooser = screen.getByLabelText('연습표 객체 선택')
    expect(within(chooser).getByRole('option', { name: /전체.*A/ })).toHaveValue('global-mark')
    expect(within(chooser).getByRole('option', { name: /보표.*A/ })).toHaveValue('local-mark')
    fireEvent.change(chooser, { target: { value: 'global-mark' } })
    const field = screen.getByRole('textbox', { name: '연습표' })
    fireEvent.change(field, { target: { value: 'B' } }); fireEvent.blur(field)
    const save = async () => {
      vi.mocked(window.inC.project.save).mockClear()
      fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
      await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
      return decodeNativeProject(contents)
    }
    const edited = (await save()).score
    expect(edited.rehearsalMarks).toEqual([
      { ...project.score.rehearsalMarks[0], text: 'B' }, project.score.rehearsalMarks[1]
    ])
    const { serializeMusicXml } = await import('../../musicxml')
    expect(parseMusicXml(serializeMusicXml(edited)).rehearsalMarks?.map(({ measureId, text }) => ({ measureId, text })))
      .toEqual(edited.rehearsalMarks?.map(({ measureId, text }) => ({ measureId, text })))
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect((await save()).score).toEqual(project.score)
    fireEvent.change(screen.getByRole('textbox', { name: '연습표' }), { target: { value: '' } })
    fireEvent.blur(screen.getByRole('textbox', { name: '연습표' }))
    expect((await save()).score.rehearsalMarks).toEqual([project.score.rehearsalMarks[1]])
  })

  it.each([false, true])('editing a selected rehearsal mark preserves other objects (second=%s)', async (selectSecond) => {
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(releaseQaMusicXml))
    const measureId = project.score.parts[0].staves[0].measures[0].id
    project.score.rehearsalMarks = [{ id: 'edit-one', measureId, text: 'A' }, { id: 'keep-two', measureId, text: 'B' }]
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/qa/marks.chromatics', fileName: 'marks.chromatics', contents: encodeNativeProject(project) })
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/qa/marks.chromatics', fileName: 'marks.chromatics' })
    const { App } = await import('./App'); render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('marks.chromatics을 열었습니다.')
    fireEvent.click(screen.getByRole('button', { name: '1마디 선택' }))
    fireEvent.click(screen.getByRole('button', { name: '표기 객체' }))
    if (selectSecond) fireEvent.change(screen.getByLabelText('연습표 객체 선택'), { target: { value: 'keep-two' } })
    const field = screen.getByRole('textbox', { name: '연습표' })
    fireEvent.change(field, { target: { value: 'C' } }); fireEvent.blur(field)
    fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
    const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents)
    expect(saved.score.rehearsalMarks).toEqual([{ id: 'edit-one', measureId, text: selectSecond ? 'A' : 'C' }, { id: 'keep-two', measureId, text: selectSecond ? 'C' : 'B' }])
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1][0].contents).score).toEqual(project.score)
    if (selectSecond) {
      const edit = screen.getByRole('textbox', { name: '연습표' })
      fireEvent.change(edit, { target: { value: '' } }); fireEvent.blur(edit)
      fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
      await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(3))
      expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[2][0].contents).score.rehearsalMarks)
        .toEqual([project.score.rehearsalMarks![0]])
      fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
      fireEvent.change(screen.getByLabelText('연습표 객체 선택'), { target: { value: '' } })
      const draft = screen.getByRole('textbox', { name: '연습표' })
      fireEvent.change(draft, { target: { value: 'D' } }); fireEvent.blur(draft)
      fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
      await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(4))
      const added = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[3][0].contents)
      expect(added.score.rehearsalMarks?.map(mark => mark.text)).toEqual(['A', 'B', 'D'])
      expect(added.score.parts).toEqual(project.score.parts)
      fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
      expect(screen.getByLabelText('연습표 객체 선택')).toHaveValue('')
      const afterUndo = screen.getByRole('textbox', { name: '연습표' })
      fireEvent.change(afterUndo, { target: { value: 'E' } }); fireEvent.blur(afterUndo)
      fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
      await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(5))
      expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[4][0].contents).score.rehearsalMarks?.map(mark => mark.text)).toEqual(['A', 'B', 'E'])
      vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/qa/other.chromatics', fileName: 'other.chromatics', contents: encodeNativeProject(project) })
      fireEvent.click(screen.getByRole('button', { name: '파일' }))
      fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
      await screen.findByText('other.chromatics을 열었습니다.')
      fireEvent.click(screen.getByRole('button', { name: '1마디 선택' }))
      fireEvent.click(screen.getByRole('button', { name: '표기 객체' }))
      expect(screen.getByLabelText('연습표 객체 선택')).toHaveValue('edit-one')
      expect(screen.getByRole('textbox', { name: '연습표' })).toHaveValue('A')
    }
  })

  it('palette.range-notation keeps visible commands in notation mode as selection changes', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '표기 객체' }))
    const palette = screen.getByRole('region', { name: '범위 기호' })
    expect(within(palette).getByRole('button', { name: '크레셴도 헤어핀' })).toBeDisabled()
    expect(within(palette).getByRole('button', { name: '8va' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'm1-c4 선택' }))
    expect(palette).toBeVisible()
    expect(within(palette).getByRole('button', { name: /슬러 추가/ })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'm1-f-sharp-4 선택' }), { shiftKey: true })
    expect(palette).toBeVisible()
    expect(within(palette).getByRole('button', { name: '크레셴도 헤어핀' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(within(palette).getByRole('button', { name: '디미누엔도 헤어핀' }))
    expect(within(palette).getByRole('button', { name: '디미누엔도 헤어핀' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect(within(palette).getByRole('button', { name: '크레셴도 헤어핀' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: '음표' }))
    expect(screen.queryByRole('region', { name: '범위 기호' })).not.toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: '음표 편집' })).queryByLabelText('크레셴도 헤어핀')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '표기 객체' }))
    expect(within(palette).getByRole('button', { name: '크레셴도 헤어핀' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: '1마디 선택' }))
    expect(palette).toBeVisible()
    for (const button of within(palette).getAllByRole('button')) expect(button).toBeDisabled()
  })

  it.each(['slur', 'hairpin'] as const)('independent %s object clipboard keeps destination notes and supports native history', async kind => {
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(releaseQaMusicXml))
    const staff = project.score.parts[0].staves[0], source = staff.measures[0].voices[0].events
    const target = source.slice(2)
    const span = { id: 'independent-source', startEventId: source[0].id, endEventId: source[1].id, engraving: { offsetY: 2 } }
    project.score.slurs = kind === 'slur' ? [span] : []
    project.score.hairpins = kind === 'hairpin' ? [{ ...span, type: 'crescendo' }] : []
    let contents = encodeNativeProject(project)
    vi.mocked(window.inC.project.open).mockImplementation(async () => ({ filePath: '/scores/object.chromatics', fileName: 'object.chromatics', contents }))
    vi.mocked(window.inC.project.save).mockImplementation(async request => {
      contents = request.contents
      return { filePath: '/scores/object.chromatics', fileName: 'object.chromatics' }
    })
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Release QA Scenario')
    fireEvent.click(screen.getByRole('button', { name: '표기 객체' }))
    fireEvent.change(screen.getByLabelText('표기 객체 선택'), { target: { value: `${kind}:${span.id}` } })
    fireEvent.keyDown(window, { code: 'KeyC', ctrlKey: true })
    expect(screen.getByText(/표기 객체를 복사했습니다/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: `${staff.measures[1].voices[0].events[0].id} 선택` }))
    fireEvent.keyDown(window, { code: 'KeyV', ctrlKey: true })
    expect(screen.getByText(/같은 성부에서 원본과 같은 틱 간격의 끝점이 필요합니다/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: `${target[0].id} 선택` }))
    fireEvent.keyDown(window, { code: 'KeyV', ctrlKey: true })
    expect(screen.getByText(/표기 객체를 붙여넣었습니다/)).toBeInTheDocument()
    const save = async () => {
      vi.mocked(window.inC.project.save).mockClear()
      fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
      await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
      await screen.findByText('object.chromatics에 저장했습니다.')
      return decodeNativeProject(contents)
    }
    const saved = await save(), spans = kind === 'slur' ? saved.score.slurs! : saved.score.hairpins!
    expect(saved.score.parts).toEqual(project.score.parts)
    expect(spans).toHaveLength(2)
    expect(spans[1]).toMatchObject({ startEventId: target[0].id, endEventId: target[1].id, engraving: { offsetY: 2 } })
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect((await save()).score).toEqual(JSON.parse(JSON.stringify(project.score)))
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true, shiftKey: true })
    expect((await save()).score).toEqual(saved.score)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('object.chromatics을 열었습니다.')
    expect((await save()).score).toEqual(saved.score)
  })

  it.each(['slur', 'hairpin'] as const)('explicit %s paste targets a chord across voices through native history', async kind => {
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(restHairpinMusicXml))
    const voices = project.score.parts[0].staves[0].measures[0].voices
    const upper = voices[0].events[0], events = voices[1].events, end = events[2]
    if (upper.type !== 'note' || end.type !== 'note') throw new Error('Expected notes')
    upper.pitches = [upper.pitch, { step: 'B', octave: 5 }]
    end.pitches = [end.pitch, { step: 'F', octave: 4 }]
    const source = { id: 'copy-source', startEventId: events[1].id, endEventId: end.id }
    project.score.slurs = kind === 'slur' ? [source] : []
    project.score.hairpins = kind === 'hairpin' ? [{ ...source, type: 'crescendo' }] : []
    let contents = encodeNativeProject(project)
    vi.mocked(window.inC.project.open).mockImplementation(async () => ({ filePath: '/scores/targets.chromatics', fileName: 'targets.chromatics', contents }))
    vi.mocked(window.inC.project.save).mockImplementation(async request => {
      contents = request.contents
      return { filePath: '/scores/targets.chromatics', fileName: 'targets.chromatics' }
    })
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Rest Hairpin Input')
    fireEvent.click(screen.getByRole('button', { name: '표기 객체' }))
    fireEvent.change(screen.getByLabelText('표기 객체 선택'), { target: { value: `${kind}:${source.id}` } })
    fireEvent.keyDown(window, { code: 'KeyC', ctrlKey: true })
    fireEvent.click(screen.getByRole('button', { name: `${upper.id} 선택` }))
    expect(screen.getByLabelText('붙여넣기 시작점')).toHaveValue(upper.id)
    expect(screen.getByRole('button', { name: '표기 대상에 붙여넣기' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('붙여넣기 끝점'), { target: { value: end.id } })
    expect(screen.getByRole('button', { name: '표기 대상에 붙여넣기' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: '표기 대상에 붙여넣기' }))
    const save = async () => {
      vi.mocked(window.inC.project.save).mockClear()
      fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
      await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
      await screen.findByText('targets.chromatics에 저장했습니다.')
      return decodeNativeProject(contents)
    }
    const saved = await save(), spans = kind === 'slur' ? saved.score.slurs! : saved.score.hairpins!
    expect(saved.score.parts).toEqual(project.score.parts)
    expect(spans).toHaveLength(2)
    expect(spans[1]).toMatchObject({ startEventId: upper.id, endEventId: end.id })
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect((await save()).score).toEqual(JSON.parse(JSON.stringify(project.score)))
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true, shiftKey: true })
    expect((await save()).score).toEqual(saved.score)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('targets.chromatics을 열었습니다.')
    expect((await save()).score).toEqual(saved.score)
  })

  it('span properties edits rest endpoints without changing background notes and survives history and native save', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(restHairpinMusicXml))
    const events = project.score.parts[0]!.staves[0]!.measures[0]!.voices[1]!.events
    project.score.hairpins = [{ id: 'test-hairpin', type: 'crescendo', startEventId: events[0]!.id, endEventId: events[3]!.id }]
    project.score.slurs = [{ id: 'test-slur', startEventId: events[1]!.id, endEventId: events[2]!.id }]
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/span.chromatics', fileName: 'span.chromatics', contents: encodeNativeProject(project) })
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/scores/span.chromatics', fileName: 'span.chromatics' })
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Rest Hairpin Input')
    fireEvent.click(screen.getByRole('button', { name: `${events[1]!.id} 선택` }))
    fireEvent.click(screen.getByRole('button', { name: '표기 객체' }))
    fireEvent.change(screen.getByLabelText('표기 객체 선택'), { target: { value: 'hairpin:test-hairpin' } })
    expect(screen.getByLabelText('표기 시작점')).toHaveValue(events[0]!.id)
    expect(screen.getByLabelText('표기 끝점')).toHaveValue(events[3]!.id)
    fireEvent.change(screen.getByLabelText('표기 끝점'), { target: { value: events[2]!.id } })
    expect(screen.getByLabelText('표기 끝점')).toHaveValue(events[2]!.id)
    fireEvent.change(screen.getByLabelText('표기 시작점'), { target: { value: events[3]!.id } })
    expect(screen.getByLabelText('표기 시작점')).toHaveValue(events[0]!.id)
    fireEvent.keyDown(window, { key: '5', code: 'Digit5' })
    fireEvent.keyDown(window, { key: 'ArrowUp', code: 'ArrowUp', altKey: true })
    fireEvent.keyDown(window, { key: 'Delete', code: 'Delete' })
    fireEvent.keyDown(window, { key: 'Delete', code: 'Delete' })
    expect(screen.queryByLabelText('표기 끝점')).not.toBeInTheDocument()
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect(screen.getByLabelText('표기 끝점')).toHaveValue(events[2]!.id)
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect(screen.getByLabelText('표기 끝점')).toHaveValue(events[3]!.id)
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true, shiftKey: true })
    expect(screen.getByLabelText('표기 끝점')).toHaveValue(events[2]!.id)
    fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
    const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
    expect(saved.score.parts).toEqual(project.score.parts)
    expect(saved.score.slurs).toEqual(project.score.slurs)
    expect(saved.score.hairpins?.[0]).toMatchObject({ endEventId: events[2]!.id })
    fireEvent.change(screen.getByLabelText('표기 객체 선택'), { target: { value: 'slur:test-slur' } })
    expect(within(screen.getByLabelText('표기 시작점')).queryByRole('option', { name: /쉼표/ })).not.toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByLabelText('표기 끝점')).not.toBeInTheDocument()
  })

  it.each(['slur', 'hairpin'] as const)('independent part %s geometry supports history reset inheritance and native reopen', async kind => {
    window.history.replaceState({}, '', '/')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    project.view = { mode: 'part', partId: 'P2' }
    const span = (kind === 'slur' ? project.score.slurs : project.score.hairpins)![0]!
    span.engraving = { offsetY: -1 }
    let contents = encodeNativeProject(project)
    vi.mocked(window.inC.project.open).mockImplementation(async () => ({ filePath: '/scores/independent.chromatics', fileName: 'independent.chromatics', contents }))
    vi.mocked(window.inC.project.save).mockImplementation(async request => {
      contents = request.contents
      return { filePath: '/scores/independent.chromatics', fileName: 'independent.chromatics' }
    })
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await waitFor(() => expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-part-structure', 'P2:Piano:2'))
    const select = () => {
      fireEvent.click(screen.getByRole('button', { name: '표기 객체' }))
      fireEvent.change(screen.getByLabelText('표기 객체 선택'), { target: { value: `${kind}:${span.id}` } })
    }
    const save = async () => {
      vi.mocked(window.inC.project.save).mockClear()
      fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
      await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
      await screen.findByText('independent.chromatics에 저장했습니다.')
      return decodeNativeProject(contents)
    }
    select()
    fireEvent.click(screen.getByText('배치 · 형상'))
    const offset = screen.getByLabelText('표기 세로 이동')
    expect(offset).toHaveValue(-1)
    fireEvent.change(offset, { target: { value: '2' } })
    fireEvent.blur(offset)
    expect(screen.getByText('독립 파트보')).toBeInTheDocument()
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect(offset).toHaveValue(-1)
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true, shiftKey: true })
    expect(offset).toHaveValue(2)
    const saved = await save()
    expect(saved.score).toEqual(JSON.parse(JSON.stringify(project.score)))
    expect(saved.partLayouts[0]!.spanEngravings).toEqual([{ kind, spanId: span.id, engraving: { offsetY: 2 } }])
    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    fireEvent.change(screen.getByLabelText('악보 보기'), { target: { value: 'score' } })
    select()
    expect(screen.getByLabelText('표기 세로 이동')).toHaveValue(-1)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await waitFor(() => expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-part-structure', 'P2:Piano:2'))
    select()
    expect(screen.getByLabelText('표기 세로 이동')).toHaveValue(2)
    fireEvent.click(screen.getByRole('button', { name: '표기 자동 배치 복원' }))
    expect(screen.getByLabelText('표기 세로 이동')).toHaveValue(null)
    expect((await save()).partLayouts[0]!.spanEngravings![0]!.engraving).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '총보 배치 따르기' }))
    expect(screen.getByLabelText('표기 세로 이동')).toHaveValue(-1)
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect(screen.getByLabelText('표기 세로 이동')).toHaveValue(null)
    fireEvent.click(screen.getByRole('button', { name: '선택 표기 삭제' }))
    expect((await save()).partLayouts[0]!.spanEngravings).toEqual([])
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect((await save()).partLayouts[0]!.spanEngravings![0]!.engraving).toBeNull()
    vi.mocked(window.inC.musicXml.save).mockResolvedValue({ filePath: '/scores/interchange.musicxml', fileName: 'interchange.musicxml' })
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))
    await waitFor(() => expect(window.inC.musicXml.save).toHaveBeenCalledOnce())
    expect(within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' })).getByText(/Independent part span placement/)).toBeInTheDocument()
  })

  it.each(['slur', 'hairpin'] as const)('part %s segment editing preserves whole-score geometry through history native reopen and reset', async kind => {
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const { spanSegmentKey } = await import('../../score-core')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    project.view = { mode: 'part', partId: 'P2' }
    const span = (kind === 'slur' ? project.score.slurs : project.score.hairpins)![0]!
    const staff = project.score.parts[1]!.staves[0]!
    const segment = { partId: 'P2', staffId: staff.id, startMeasureId: staff.measures[0]!.id, endMeasureId: staff.measures[0]!.id }
    span.engraving = { offsetY: -1, segments: [{ ...segment, geometry: { offsetY: 1 } }] }
    let contents = encodeNativeProject(project)
    vi.mocked(window.inC.project.open).mockImplementation(async () => ({ filePath: '/scores/segments.chromatics', fileName: 'segments.chromatics', contents }))
    vi.mocked(window.inC.project.save).mockImplementation(async request => {
      contents = request.contents
      return { filePath: '/scores/segments.chromatics', fileName: 'segments.chromatics' }
    })
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByTestId('notation-preview')
    const select = () => {
      fireEvent.click(screen.getByRole('button', { name: '표기 객체' }))
      fireEvent.change(screen.getByLabelText('표기 객체 선택'), { target: { value: `${kind}:${span.id}` } })
      fireEvent.change(screen.getByLabelText('표기 조정 대상'), { target: { value: spanSegmentKey(segment) } })
    }
    const save = async () => {
      vi.mocked(window.inC.project.save).mockClear()
      fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
      await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
      await screen.findByText('segments.chromatics에 저장했습니다.')
      return decodeNativeProject(contents)
    }
    select()
    const input = screen.getByLabelText('표기 세로 이동')
    expect(input).toHaveValue(1)
    fireEvent.change(input, { target: { value: '3' } }); fireEvent.blur(input)
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect(input).toHaveValue(1)
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true, shiftKey: true })
    expect(input).toHaveValue(3)
    const saved = await save()
    expect(saved.score).toEqual(JSON.parse(JSON.stringify(project.score)))
    expect(saved.partLayouts[0]!.spanEngravings![0]!.engraving).toEqual({ offsetY: -1, segments: [{ ...segment, geometry: { offsetY: 3 } }] })
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('segments.chromatics을 열었습니다.')
    select()
    expect(screen.getByLabelText('표기 세로 이동')).toHaveValue(3)
    fireEvent.click(screen.getByRole('button', { name: '표기 자동 배치 복원' }))
    expect((await save()).partLayouts[0]!.spanEngravings![0]!.engraving?.segments![0]!.geometry).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '객체 전체 배치 따르기' }))
    expect(screen.getByLabelText('표기 세로 이동')).toHaveValue(-1)
    expect((await save()).partLayouts[0]!.spanEngravings![0]!.engraving?.segments).toBeUndefined()
  })

  it.each(['slur', 'hairpin'] as const)('deleting a segment boundary prunes saved %s overrides but saving does not erase undo geometry', async kind => {
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(releaseQaMusicXml))
    const part = project.score.parts[0]!, staff = part.staves[0]!
    const notes = staff.measures.flatMap(measure => measure.voices.flatMap(voice => voice.events.filter(event => event.type === 'note')))
    const deleted = staff.measures[1]!, retained = staff.measures[2]!
    const address = (measureId: string) => ({ partId: part.id, staffId: staff.id, startMeasureId: measureId, endMeasureId: measureId })
    const engraving = { offsetY: -1, segments: [
      { ...address(deleted.id), geometry: { offsetY: 2 } }, { ...address(retained.id), geometry: { offsetY: 3 } }
    ] }
    const span = { id: 'structural-span', startEventId: notes[0]!.id, endEventId: notes.at(-1)!.id, engraving }
    if (kind === 'slur') project.score.slurs = [span]
    else project.score.hairpins = [{ ...span, type: 'crescendo' }]
    project.partLayouts = [{ partId: part.id, layout: {}, spanEngravings: [{ kind, spanId: span.id,
      engraving: { ...engraving, segments: engraving.segments.map(item => ({ ...item, geometry: { offsetY: 4 } })) } }] }]
    project.view = { mode: 'part', partId: part.id }
    let contents = encodeNativeProject(project)
    vi.mocked(window.inC.project.open).mockImplementation(async () => ({ filePath: '/scores/structural.chromatics', fileName: 'structural.chromatics', contents }))
    vi.mocked(window.inC.project.save).mockImplementation(async request => { contents = request.contents; return { filePath: '/scores/structural.chromatics', fileName: 'structural.chromatics' } })
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Release QA Scenario')
    fireEvent.click(screen.getByRole('button', { name: `${deleted.voices[0]!.events[0]!.id} 선택` }))
    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    fireEvent.click(screen.getByRole('button', { name: '마디 삭제' }))
    const save = async () => {
      vi.mocked(window.inC.project.save).mockClear()
      fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
      await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
      await screen.findByText('structural.chromatics에 저장했습니다.')
      return decodeNativeProject(contents)
    }
    const pruned = await save()
    const spans = (score: typeof project.score) => kind === 'slur' ? score.slurs! : score.hairpins!
    expect(spans(pruned.score)[0]!.engraving!.segments).toEqual([engraving.segments[1]])
    expect(pruned.partLayouts[0]!.spanEngravings![0]!.engraving!.segments).toEqual([project.partLayouts[0]!.spanEngravings![0]!.engraving!.segments![1]])
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    const restored = await save()
    expect(spans(restored.score)).toEqual(spans(project.score))
    expect(restored.partLayouts).toEqual(project.partLayouts)
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true, shiftKey: true })
    expect((await save()).partLayouts).toEqual(pruned.partLayouts)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('structural.chromatics을 열었습니다.')
    expect((await save()).score).toEqual(pruned.score)
  })

  it('span geometry commits numeric drafts, cancels invalid edits and resets through native history', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { decodeNativeProject } = await import('../../project/schema')
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/scores/geometry.chromatics', fileName: 'geometry.chromatics' })
    vi.mocked(window.inC.musicXml.save).mockResolvedValue({ filePath: '/scores/geometry.musicxml', fileName: 'geometry.musicxml' })
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '표기 객체' }))
    const objects = screen.getByLabelText('표기 객체 선택') as HTMLSelectElement
    const reference = [...objects.options].find(option => option.value.startsWith('hairpin:'))!.value
    fireEvent.change(objects, { target: { value: reference } })
    fireEvent.click(screen.getByText('배치 · 형상'))
    fireEvent.change(screen.getByLabelText('표기 배치'), { target: { value: 'above' } })
    const offset = screen.getByLabelText('표기 세로 이동')
    fireEvent.change(offset, { target: { value: '-1.5' } })
    fireEvent.blur(offset)
    fireEvent.change(offset, { target: { value: '99' } })
    fireEvent.blur(offset)
    expect(offset).toHaveValue(-1.5)
    fireEvent.change(offset, { target: { value: '2' } })
    fireEvent.keyDown(offset, { key: 'Escape' })
    expect(offset).toHaveValue(-1.5)
    fireEvent.click(screen.getByRole('button', { name: '표기 자동 배치 복원' }))
    expect(offset).toHaveValue(null)
    expect(screen.getByLabelText('표기 배치')).toHaveValue('auto')
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect(offset).toHaveValue(-1.5)
    fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
    const native = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
    expect(native.version).toBe(4)
    expect(native.score.hairpins?.find(span => `hairpin:${span.id}` === reference)?.engraving).toEqual({ placement: 'above', offsetY: -1.5 })
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))
    await waitFor(() => expect(window.inC.musicXml.save).toHaveBeenCalledOnce())
    expect(within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' })).getByText(/Manual span placement and shape/)).toBeInTheDocument()
  })

  it('octave range authoring preserves displayed notes through undo native and standard XML save', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(restHairpinMusicXml))
    const events = project.score.parts[0]!.staves[0]!.measures[0]!.voices[1]!.events
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/octave.chromatics', fileName: 'octave.chromatics', contents: encodeNativeProject(project) })
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/scores/octave.chromatics', fileName: 'octave.chromatics' })
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Rest Hairpin Input')
    const originalPitches = screen.getByTestId('notation-preview').getAttribute('data-event-pitches')
    fireEvent.click(screen.getByRole('button', { name: `${events[1]!.id} 선택` }))
    fireEvent.click(screen.getByRole('button', { name: `${events[2]!.id} 선택` }), { shiftKey: true })
    fireEvent.click(screen.getByRole('button', { name: '표기 객체' }))
    fireEvent.click(screen.getByRole('button', { name: '8va' }))
    expect(screen.getByRole('button', { name: '8va' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents).score.octaveShifts ?? []).toEqual([])
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true, shiftKey: true })
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1]![0].contents).score.octaveShifts?.[0]).toMatchObject({ type: '8va', startEventId: events[1]!.id, endEventId: events[2]!.id })
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))
    await waitFor(() => expect(window.inC.musicXml.save).toHaveBeenCalledOnce())
    const xml = vi.mocked(window.inC.musicXml.save).mock.calls[0]![0].contents
    expect(xml).toContain('<octave-shift type="down" size="8"/>')
    const reopened = parseMusicXml(xml)
    expect(reopened.parts[0]!.staves[0]!.measures[0]!.voices[1]!.events[1]).toMatchObject({ pitch: { step: 'C', octave: 4 } })
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-event-pitches', originalPitches)
  })

  it('rest-anchored hairpin input supports undo redo native save and XML reopen', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(restHairpinMusicXml))
    const events = project.score.parts[0]!.staves[0]!.measures[0]!.voices[1]!.events
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/rest.chromatics', fileName: 'rest.chromatics', contents: encodeNativeProject(project) })
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/scores/rest.chromatics', fileName: 'rest.chromatics' })
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Rest Hairpin Input')
    fireEvent.click(screen.getByRole('button', { name: `${events[0]!.id} 선택` }))
    fireEvent.click(screen.getByRole('button', { name: `${events[3]!.id} 선택` }), { shiftKey: true })
    fireEvent.click(screen.getByRole('button', { name: '표기 객체' }))
    expect(screen.getByRole('button', { name: /슬러 추가/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: '8va' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '크레셴도 헤어핀' }))
    const preview = screen.getByTestId('notation-preview')
    const anchors = `${events[0]!.id}–${events[3]!.id}`
    expect(within(preview).getByText(anchors)).toHaveAttribute('data-hairpin-type', 'crescendo')
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect(within(preview).queryByText(anchors)).not.toBeInTheDocument()
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true, shiftKey: true })
    expect(within(preview).getByText(anchors)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
    const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
    expect(saved.score.hairpins?.[0]).toMatchObject({ startEventId: events[0]!.id, endEventId: events[3]!.id })
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))
    await waitFor(() => expect(window.inC.musicXml.save).toHaveBeenCalledOnce())
    const reopened = parseMusicXml(vi.mocked(window.inC.musicXml.save).mock.calls[0]![0].contents)
    const reopenedVoice = reopened.parts[0]!.staves[0]!.measures[0]!.voices[1]!
    expect(reopened.hairpins?.[0]).toMatchObject({ startEventId: reopenedVoice.events[0]!.id, endEventId: reopenedVoice.events[3]!.id })
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
    fireEvent.click(screen.getByRole('button', { name: '표기 객체' }))
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
    fireEvent.click(screen.getByRole('button', { name: '표기 객체' }))
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
        name: '4분음표, 단축키 5'
      })
    ).toHaveTextContent('4')
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

    fireEvent.click(screen.getByRole('button', { name: '가사' }))
    const harmonyInput = screen.getByLabelText('코드 심벌')
    fireEvent.change(harmonyInput, { target: { value: 'H13' } })
    fireEvent.blur(harmonyInput)
    expect(
      screen.getByText(/지원하는 코드 심벌 형식/)
    ).toBeInTheDocument()

    fireEvent.change(harmonyInput, { target: { value: 'C7/G' } })
    fireEvent.blur(harmonyInput)
    expect(screen.getByText('코드 심벌을 갱신했습니다.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '음표' }))
    fireEvent.click(screen.getByRole('button', { name: 'tr' }))
    expect(screen.getByText('장식음을 갱신했습니다.')).toBeInTheDocument()
  })
})

function asciiBytes(bytes: number[], start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length))
}
