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
import { demoScore } from './notation/demo-score'

vi.mock('./notation/NotationPreview', () => ({
  NotationPreview: ({
    score,
    inlineLyricEditor,
    onSelectEvent,
    onSelectMeasure,
    selectedEventId,
  }: {
    score: typeof demoScore
    inlineLyricEditor?: {
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
    onSelectEvent: (eventId: string, extendRange?: boolean) => void
    onSelectMeasure: (measureId: string) => void
    selectedEventId?: string
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
      data-global-tempo={score.tempo?.bpm}
      data-rhythm-feel={score.rhythmFeel?.unit ?? ''}
      data-measure-clefs={score.parts[0]?.staves[0]?.measures
        .map((measure) => `${measure.clef.sign}${measure.clef.line}`)
        .join(',')}
      data-selected-event-id={selectedEventId ?? ''}
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
            if (event.key === 'Enter') {
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
                  onClick={(clickEvent) => onSelectEvent(event.id, clickEvent.shiftKey)}
                  type="button"
                />
              ))
            )
          )
        )
      )}
      {(score.hairpins ?? []).map((hairpin) => (
        <span data-hairpin-type={hairpin.type} key={hairpin.id}>
          {hairpin.startEventId}–{hairpin.endEventId}
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
      {(score.dynamics ?? []).map((dynamic) => (
        <span data-measure-id={dynamic.measureId} key={dynamic.id}>
          {dynamic.value}
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
  useScorePlayback: () => ({
    activeEventId: undefined,
    pause: vi.fn(),
    play: vi.fn(),
    positionBeat: 0,
    setTempo: vi.fn(),
    status: 'stopped',
    stop: vi.fn(),
    tempo: 120,
    totalBeats: 16
  })
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

describe('App component shell', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.resetModules()
    window.history.replaceState({}, '', '/')
    window.confirm = vi.fn(() => true)
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
    expect(screen.getByLabelText('음자리표')).not.toBeVisible()
    expect(screen.getByLabelText('위치별 빠르기 BPM')).not.toBeVisible()

    fireEvent.click(within(toolbarTabs).getByRole('button', { name: '가사' }))
    expect(screen.getByLabelText('가사 절')).toBeVisible()
    const preview = screen.getByLabelText('악보 미리보기 테스트 더블')
    const lyricInput = within(preview).getByLabelText('선택 음표 가사')
    const initialEventCount = preview.getAttribute('data-event-count')
    expect(lyricInput).toBeVisible()
    expect(screen.getByLabelText('가사 음절')).toBeVisible()
    expect(screen.getByText('멜리스마')).toBeVisible()
    expect(screen.getByLabelText('코드 심벌')).not.toBeVisible()
    expect(fireEvent.keyDown(lyricInput, { key: 'q' })).toBe(true)
    expect(fireEvent.keyDown(lyricInput, { key: ' ' })).toBe(true)
    expect(preview).toHaveAttribute('data-event-count', initialEventCount)
    fireEvent.change(lyricInput, { target: { value: 'hello world' } })
    expect(fireEvent.keyDown(lyricInput, { key: 'Enter' })).toBe(false)
    expect(screen.getByText('가사를 갱신했습니다.')).toBeInTheDocument()
    const eventCountAfterLyricAdvance =
      screen.getByTestId('notation-preview').getAttribute('data-event-count')
    fireEvent.keyDown(window, { code: 'KeyA', key: 'a' })
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-event-count',
      eventCountAfterLyricAdvance
    )

    fireEvent.click(within(toolbarTabs).getByRole('button', { name: '악보' }))
    expect(screen.getByLabelText('조표')).toBeVisible()
    expect(screen.getByLabelText('박자표')).toBeVisible()
    expect(screen.getByLabelText('음자리표')).toBeVisible()
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
    expect(screen.getByLabelText('음자리표')).not.toBeVisible()
    expect(screen.getByLabelText('코드 심벌')).toBeInTheDocument()
    expect(screen.queryByLabelText('선택 음표 가사')).not.toBeInTheDocument()
    expect(screen.getByLabelText('위치별 빠르기 BPM')).not.toBeVisible()
  }, 15000)

  it('promotion.concert-posters renders toolbar posters from the preload API response', async () => {
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

    const promoGroup = await screen.findByRole('group', {
      name: '공연 포스터 보기'
    })
    const posterButtons = within(promoGroup).getAllByRole('button', {
      name: '테스트 공연 포스터 포스터 크게 보기'
    })

    expect(posterButtons).toHaveLength(30)
    fireEvent.click(posterButtons[0])

    expect(
      screen.getByRole('dialog', { name: '공연 포스터' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '테스트 공연 포스터' })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '공연 보기' })).toHaveAttribute(
      'href',
      'https://in-c.mannlab.app/concerts.html'
    )
  })

  it('promotion.concert-posters keeps the toolbar banner visible when the API is empty', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    vi.mocked(window.inC.promotions.getConcertPosters).mockResolvedValue({
      posters: []
    })

    const { App } = await import('./App')
    render(<App />)

    const promoGroup = await screen.findByRole('group', {
      name: '공연 포스터 보기'
    })

    expect(
      within(promoGroup).getAllByRole('button', {
        name: /포스터 크게 보기/
      })
    ).toHaveLength(30)
  })

  it('clef.change-selected-measure changes only the selected measure clef and reports the result', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '1마디 선택' }))
    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    const clefSelect = screen.getByLabelText('음자리표')
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

    expect(pdfButton).not.toBe(musicXmlButton)
    fireEvent.click(pdfButton)

    await waitFor(() => {
      expect(window.inC.pdf.save).toHaveBeenCalledWith({
        suggestedName: 'release-test.pdf'
      })
    })
    expect(window.inC.musicXml.save).not.toHaveBeenCalled()
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
      name: /4분음표/
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

  it('tuplets.edit-member-duration changes a selected tuplet eighth to a quarter with Digit3', async () => {
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
      code: 'Digit3',
      key: '3'
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

  it('layout.dynamics adds mf to the selected measure preview', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '악보' }))
    fireEvent.change(screen.getByLabelText('셈여림'), {
      target: { value: 'mf' }
    })

    const dynamic = within(screen.getByTestId('notation-preview')).getByText('mf')
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
      name: '4분음표, 단축키 3'
    })

    expect(within(inspector).queryByLabelText('선택 이벤트 음가')).not.toBeInTheDocument()

    fireEvent.click(eighthDuration)
    expect(eighthDuration).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(within(inspector).getByRole('button', { name: '+' }))
    expect(within(inspector).getByText('1')).toBeInTheDocument()

    fireEvent.click(quarterDuration)
    expect(quarterDuration).toHaveAttribute('aria-pressed', 'true')
    expect(within(inspector).getByText('0')).toBeInTheDocument()

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
