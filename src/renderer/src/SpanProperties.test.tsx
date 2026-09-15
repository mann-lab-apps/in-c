// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import fixture from '../../musicxml/fixtures/release-qa.musicxml?raw'
import { parseMusicXml } from '../../musicxml'
import { replaceSpanSegmentEngraving, spanSegmentKey } from '../../score-core'
import { SpanProperties } from './SpanProperties'

afterEach(cleanup)

function setup() {
  const score = parseMusicXml(fixture)
  const part = score.parts[0]!, staff = part.staves[0]!
  const notes = staff.measures.flatMap(measure => measure.voices.flatMap(voice => voice.events.filter(event => event.type === 'note')))
  const segment = { partId: part.id, staffId: staff.id, startMeasureId: staff.measures[0]!.id, endMeasureId: staff.measures[1]!.id }
  score.slurs = [{ id: 'span', startEventId: notes[0]!.id, endEventId: notes.at(-1)!.id,
    engraving: replaceSpanSegmentEngraving({ offsetY: -1 }, segment, { offsetY: 2 }) }]
  const selected = { kind: 'slur' as const, id: 'span', segment }
  const props = { score, selected, onSelect: vi.fn(), onEndpointChange: vi.fn(), onDelete: vi.fn(), onEngravingChange: vi.fn() }
  return { props, segment }
}

it('distinguishes inactive saved geometry from rendered segments and permits explicit cleanup', () => {
  const { props, segment } = setup()
  const current = { ...segment, endMeasureId: props.score.parts[0]!.staves[0]!.measures[2]!.id }
  const { rerender } = render(<SpanProperties {...props} renderedSegments={[{ ...props.selected, segment: current }]} />)
  expect(screen.getByLabelText('구간 배치 상태')).toHaveTextContent('현재 배치에 없음')
  expect(screen.getByLabelText('표기 세로 이동')).toBeDisabled()
  expect(screen.getByLabelText('표기 배치')).toBeDisabled()
  expect(screen.getByLabelText('표기 자동 배치 복원')).toBeDisabled()
  expect(screen.getByRole('option', { name: '1 - 2마디 구간 (비활성)' })).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('표기 조정 대상'), { target: { value: spanSegmentKey(current) } })
  expect(props.onSelect).toHaveBeenCalledWith({ ...props.selected, segment: current })
  fireEvent.click(screen.getByLabelText('객체 전체 배치 따르기'))
  expect(props.onEngravingChange).toHaveBeenCalledWith({ offsetY: -1 })
  expect(props.score.slurs![0]!.engraving!.segments).toHaveLength(1)
  rerender(<SpanProperties {...props} renderedSegments={[props.selected]} />)
  expect(screen.getByLabelText('구간 배치 상태')).toHaveTextContent('현재 배치에 적용')
  expect(screen.getByLabelText('표기 세로 이동')).toBeEnabled()
  expect(screen.getByLabelText('표기 세로 이동')).toHaveValue(2)
})

it('does not label an unknown renderer state inactive or leak another object segments', () => {
  const { props } = setup()
  const { rerender } = render(<SpanProperties {...props} />)
  expect(screen.queryByLabelText('구간 배치 상태')).not.toBeInTheDocument()
  expect(screen.getByLabelText('표기 세로 이동')).toBeEnabled()
  rerender(<SpanProperties {...props} renderedSegments={[{ ...props.selected, id: 'other' }]} />)
  expect(screen.getByLabelText('구간 배치 상태')).toHaveTextContent('현재 배치에 없음')
  rerender(<SpanProperties {...props} selected={undefined} renderedSegments={[props.selected]} />)
  expect(screen.queryByLabelText('표기 조정 대상')).not.toBeInTheDocument()
})
