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
    expect(within(workspace).getByLabelText('새 악보 만들기')).toBeInTheDocument()
    expect(within(workspace).getByLabelText('MusicXML 가져오기')).toBeInTheDocument()
    expect(within(workspace).getByLabelText('재생')).toBeInTheDocument()
    expect(within(workspace).getByLabelText('빠르기')).toHaveValue('75')
    expect(within(workspace).getByLabelText('빠르기 기준 음가')).toBeInTheDocument()
    expect(within(workspace).getByLabelText('빠르기말')).toBeInTheDocument()
    expect(screen.getByLabelText('음자리표')).toBeInTheDocument()
    expect(screen.getByLabelText('코드 심벌')).toBeInTheDocument()
    expect(screen.getByLabelText('선택 음표 가사')).toBeInTheDocument()
    expect(screen.getByLabelText('위치별 빠르기 BPM')).toBeInTheDocument()
  })

  it('shows status terms and the notation preview mount point', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    expect(screen.getByText(/선택 모드/)).toBeInTheDocument()
    expect(screen.getAllByText('4분음표').length).toBeGreaterThan(0)
    expect(screen.getByText('정지')).toBeInTheDocument()
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
