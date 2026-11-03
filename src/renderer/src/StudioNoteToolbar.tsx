import { useEffect, useState, type ReactNode, type KeyboardEvent } from 'react'
import { Button, Group, IconButton, Text, Tooltip } from '@ddirori/ui'
import { Minus, Pencil, Plus } from 'lucide-react'
import { VexFlow } from 'vexflow'
import type { DurationValue, Pitch } from '../../score-core'
import './studio-note-toolbar.css'
import { StudioDecorationGlyph } from './StudioNoteDecorations'

const { Glyphs } = VexFlow
const musicGlyphs = {
  whole: Glyphs.noteWhole, half: Glyphs.noteHalfUp, quarter: Glyphs.noteQuarterUp,
  eighth: Glyphs.note8thUp, '16th': Glyphs.note16thUp,
  '32nd': Glyphs.note32ndUp, '64th': Glyphs.note64thUp,
  tie: Glyphs.textTie, tuplet: Glyphs.tuplet3, rest: Glyphs.restQuarter,
  flat: Glyphs.accidentalFlat, natural: Glyphs.accidentalNatural, sharp: Glyphs.accidentalSharp
}

// UI-only music symbols use the existing bundled music font,never the chrome font.
// All symbols share one measured plane so whole notes do not grow to stem height.
function MusicGlyph({ kind }: { kind: keyof typeof musicGlyphs }) {
  const [frame, setFrame] = useState('-1 -30 26 34')
  useEffect(() => {
    let alive = true
    void document.fonts?.ready.then(() => {
      const context = document.createElement('canvas').getContext('2d')
      if (!context || !alive) return
      context.font = '32px Bravura'
      const bounds = Object.values(musicGlyphs).map(glyph => context.measureText(glyph))
      const left = Math.max(...bounds.map(b => b.actualBoundingBoxLeft))
      const right = Math.max(...bounds.map(b => b.actualBoundingBoxRight))
      const top = Math.max(...bounds.map(b => b.actualBoundingBoxAscent))
      const bottom = Math.max(...bounds.map(b => b.actualBoundingBoxDescent))
      if ([left, right, top, bottom].every(Number.isFinite) && top + bottom > 0)
        setFrame(`${-left - 1} ${-top - 1} ${left + right + 2} ${top + bottom + 2}`)
    })
    return () => { alive = false }
  }, [])
  return <svg aria-hidden="true" data-music-glyph={kind} className="studio-note-toolbar__glyph" width="24" height="24" viewBox={frame}>
    <text x="0" y="0" fontFamily="Bravura" fontSize="32" fill="currentColor">{musicGlyphs[kind]}</text>
  </svg>
}

interface Props {
  theme: 'light' | 'dark'
  context: string
  inputActive: boolean
  rhythmDisabled?: boolean
  duration: DurationValue
  options: readonly { value: DurationValue; label: string }[]
  dots: number
  canAddDot: boolean
  canRemoveDot: boolean
  dotsDisabled: boolean
  tieSelected: boolean
  tieEnabled: boolean
  tupletActive: boolean
  tupletLabel: string
  restEnabled: boolean
  restHint?: string
  onRest: () => void
  onInput: () => void
  onDuration: (value: DurationValue) => void
  onDots: (direction: -1 | 1) => void
  onTie: () => void
  onTuplet: () => void
  graceEnabled: boolean
  graceSelected: boolean
  onGrace: () => void
  graceConvertEnabled: boolean
  graceConvertReason?: string
  onGraceConvert: () => void
  accidental?: Pitch['alter']
  accidentalEnabled: boolean
  onAccidental: (alter: NonNullable<Pitch['alter']>) => void
  targetControls?: ReactNode
  onNavigationKeyDown?: (event: KeyboardEvent<HTMLElement>) => void
  children: ReactNode
}

export function StudioNoteToolbar(props: Props) {
  const tieLabel = props.tieSelected ? '타이 해제, 단축키 T' : '타이 추가, 단축키 T'
  return <section className="studio-note-toolbar ddirori" data-theme={props.theme} data-density="compact" aria-label="음표 입력 도구"
    onKeyDownCapture={props.onNavigationKeyDown}
    onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') event.stopPropagation() }}>
    <div className="studio-note-toolbar__commands">
      <Tooltip text="음표 입력 전환 · N">
        <IconButton label="음표 입력 전환, 단축키 N" selected={props.inputActive} onClick={props.onInput}>
          <Pencil size={18} strokeWidth={1.75} aria-hidden="true" />
        </IconButton>
      </Tooltip>
      <Group label="음가">
        {props.options.map(option => <Tooltip key={option.value} text={option.label}>
          <IconButton label={option.label} disabled={props.rhythmDisabled} selected={props.duration === option.value} onClick={() => props.onDuration(option.value)}>
            <MusicGlyph kind={option.value} />
          </IconButton>
        </Tooltip>)}
      </Group>
      <Tooltip text={props.restHint ?? (props.inputActive ? '다음 입력 위치에 쉼표 넣기 · 0' : '선택한 음표를 같은 음가의 쉼표로 변환 · 0')}>
        <IconButton label={props.inputActive ? '쉼표 넣기' : '쉼표로 변환'} disabled={!props.restEnabled}
          onClick={props.onRest}><MusicGlyph kind="rest" /></IconButton>
      </Tooltip>
      <Group label="점음표">
        <Text variant="label">점</Text>
        <Tooltip text={props.dotsDisabled ? '셋잇단음표 입력 중에는 점을 바꿀 수 없습니다.' : '점 줄이기'}>
          <IconButton label="점 줄이기" disabled={props.rhythmDisabled || props.dotsDisabled || !props.canRemoveDot} onClick={() => props.onDots(-1)}>
            <Minus size={18} strokeWidth={1.75} aria-hidden="true" />
          </IconButton>
        </Tooltip>
        <Text as="output" variant="numeric" aria-label="점 개수">{props.dots}</Text>
        <Tooltip text={props.dotsDisabled ? '셋잇단음표 입력 중에는 점을 바꿀 수 없습니다.' : '점 추가'}>
          <IconButton label="점 추가" disabled={props.rhythmDisabled || props.dotsDisabled || !props.canAddDot} onClick={() => props.onDots(1)}>
            <Plus size={18} strokeWidth={1.75} aria-hidden="true" />
          </IconButton>
        </Tooltip>
      </Group>
      <Group label="리듬 표기">
        <Tooltip text={props.tieEnabled ? tieLabel : '같은 음높이로 이어지는 음표를 선택해 주세요.'}>
          <IconButton label={tieLabel} selected={props.tieSelected} disabled={props.rhythmDisabled || !props.tieEnabled} onClick={props.onTie}><MusicGlyph kind="tie" /></IconButton>
        </Tooltip>
        <Tooltip text={props.tupletLabel}>
          <IconButton label={props.tupletLabel} disabled={props.rhythmDisabled} selected={props.tupletActive} onClick={props.onTuplet}><MusicGlyph kind="tuplet" /></IconButton>
        </Tooltip>
      </Group>
      <Tooltip text={props.graceEnabled ? '선택 음표 앞에 음가를 차지하지 않는 꾸밈음을 추가하거나 제거합니다. · Alt+G' : '꾸밈음을 붙일 음표 하나를 선택하세요. 음표 입력 중에는 Esc로 선택 모드로 돌아오세요.'}>
        <Button kind="secondary" aria-label={`${props.graceSelected ? '꾸밈음 제거' : '꾸밈음 추가'}, 단축키 Alt+G`}
          aria-keyshortcuts="Alt+G" selected={props.graceSelected} disabled={!props.graceEnabled} onClick={props.onGrace}>
          <span className="studio-note-toolbar__grace-action"><StudioDecorationGlyph kind="grace" /><span>꾸밈음</span></span>
        </Button>
      </Tooltip>
      <Tooltip text={props.graceConvertReason ?? '선택 음표를 다음 음표의 꾸밈음으로 바꾸고, 뒤 음표를 당긴 뒤 마디 끝을 쉼표로 채웁니다. · Alt+Shift+G'}>
        <Button kind="secondary" aria-label="꾸밈음으로 변환, 단축키 Alt+Shift+G" aria-keyshortcuts="Alt+Shift+G"
          disabled={!props.graceConvertEnabled} onClick={props.onGraceConvert}>꾸밈음으로 변환</Button>
      </Tooltip>
      <Group label="임시표">
        {([[-1, 'flat', '플랫'], [0, 'natural', '제자리표'], [1, 'sharp', '샤프']] as const).map(([alter, glyph, label]) =>
          <Tooltip key={alter} text={props.accidentalEnabled
            ? `${props.inputActive ? '다음 입력' : '선택한 음표·화음'} · ${label}`
            : '음표·화음 하나를 선택하거나 음표 입력으로 전환해 주세요.'}>
            <IconButton label={label} selected={props.accidental === alter} disabled={!props.accidentalEnabled}
              onClick={() => props.onAccidental(alter)}><MusicGlyph kind={glyph} /></IconButton>
          </Tooltip>)}
      </Group>
      {props.targetControls}
    </div>
    <div className="studio-note-toolbar__context">
      <div className="studio-note-toolbar__target" aria-label="도구 적용 대상">
        <Text variant="caption">도구 대상</Text>
        <Text variant="description">{props.context}</Text>
      </div>
      {props.children}
    </div>
  </section>
}
