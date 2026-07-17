// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./notation/NotationPreview', () => ({
  NotationPreview: () => (
    <div aria-label="악보 미리보기 테스트 더블" data-testid="notation-preview" />
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

  it('renders the start screen with Korean entry actions', async () => {
    const { App } = await import('./App')
    render(<App />)

    expect(
      screen.getByRole('heading', { name: '무엇을 시작할까요?' })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /새 악보 만들기/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /MusicXML 가져오기/ })).toBeInTheDocument()
    expect(screen.getByLabelText('최근 MusicXML 파일')).toBeInTheDocument()
  })

  it('renders the editor toolbar in fixture mode', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    const workspace = screen.getByRole('region', { name: '악보 편집기' })
    const toolbarTabs = screen.getByRole('navigation', {
      name: '편집 도구 카테고리'
    })
    expect(screen.getByRole('button', { name: '파일' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '음표' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(within(workspace).getByLabelText('재생')).toBeInTheDocument()
    expect(screen.getByLabelText('빠르기')).not.toBeVisible()
    expect(
      within(toolbarTabs).queryByRole('button', { name: '선택' })
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '가사' })).toBeInTheDocument()
    expect(screen.getByLabelText('코드 심벌')).toBeInTheDocument()
    expect(screen.getByLabelText('선택 음표 가사')).not.toBeVisible()
    expect(screen.getByLabelText('음자리표')).not.toBeVisible()
    expect(screen.getByLabelText('위치별 빠르기 BPM')).not.toBeVisible()

    fireEvent.click(within(toolbarTabs).getByRole('button', { name: '가사' }))
    expect(screen.getByLabelText('가사 절')).toBeVisible()
    const lyricInput = screen.getByLabelText('선택 음표 가사')
    expect(lyricInput).toBeVisible()
    expect(screen.getByLabelText('가사 음절')).toBeVisible()
    expect(screen.getByText('멜리스마')).toBeVisible()
    expect(screen.getByLabelText('코드 심벌')).not.toBeVisible()
    expect(fireEvent.keyDown(lyricInput, { key: ' ' })).toBe(true)
    fireEvent.change(lyricInput, { target: { value: 'hello world' } })
    expect(fireEvent.keyDown(lyricInput, { key: 'Enter' })).toBe(false)
    expect(screen.getByText('가사를 갱신했습니다.')).toBeInTheDocument()

    fireEvent.click(within(toolbarTabs).getByRole('button', { name: '마디' }))
    expect(screen.getByLabelText('조표')).toBeVisible()
    expect(screen.getByLabelText('박자표')).toBeVisible()
    expect(screen.getByLabelText('음자리표')).toBeVisible()
    expect(screen.getByLabelText('위치별 빠르기 BPM')).toBeVisible()

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
    expect(within(workspace).getByLabelText('재생')).toBeInTheDocument()
    expect(within(workspace).getByLabelText('빠르기')).toHaveValue('75')
    expect(within(workspace).getByLabelText('빠르기 기준 음가')).toBeInTheDocument()
    const tempoTextInput = within(workspace).getByLabelText('빠르기말')
    expect(tempoTextInput).toHaveValue('♩ = 75')
    fireEvent.change(tempoTextInput, { target: { value: '♪ = 90' } })
    fireEvent.blur(tempoTextInput)
    expect(within(workspace).getByLabelText('빠르기')).toHaveValue('90')
    const transparentTempoToggle =
      within(workspace).getByLabelText('빠르기말 투명')
    expect(transparentTempoToggle).not.toBeChecked()
    fireEvent.click(transparentTempoToggle)
    expect(transparentTempoToggle).toBeChecked()

    fireEvent.click(within(toolbarTabs).getByRole('button', { name: '음표' }))
    expect(within(workspace).getByLabelText('재생')).toBeInTheDocument()
    expect(screen.getByLabelText('빠르기')).not.toBeVisible()
    expect(screen.getByLabelText('음자리표')).not.toBeVisible()
    expect(screen.getByLabelText('코드 심벌')).toBeInTheDocument()
    expect(screen.getByLabelText('선택 음표 가사')).not.toBeVisible()
    expect(screen.getByLabelText('위치별 빠르기 BPM')).not.toBeVisible()
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
