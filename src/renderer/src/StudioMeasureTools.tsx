import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Button, Dialog, Group, IconButton, Input, Select, Text, Tooltip } from '@ddirori/ui'
import type { TimeSignature } from '../../score-core'
import { customMeterDenominators, parseCustomTimeSignature } from './editor/custom-time-signature'
import { isDocumentSaveShortcut } from './editor/draft-save'
import './studio-measure-tools.css'

interface Action {
  label: string
  selected?: boolean
  disabled: boolean
  icon: ReactNode
  onSelect: () => void
}
interface Signature {
  label: string
  value: string
  options: readonly { value: string; label: string; disabled?: boolean }[]
  onChange: (value: string) => void
}

// App retains measure targeting, command enablement and exact undo semantics.
export function StudioMeasureTools({theme, actions, signatures, enabled, meterScope, customMeter}: {
  theme: 'light' | 'dark'
  actions: readonly Action[]
  signatures: readonly Signature[]
  enabled: boolean
  meterScope?: string
  customMeter?: {
    value: TimeSignature
    owner: string
    onApply: (value: TimeSignature) => boolean | string
    onApplyToScore?: (value: TimeSignature) => string | undefined
  }
}) {
  const [open,setOpen]=useState(false),[owner,setOwner]=useState('')
  const [applyToScore, setApplyToScore] = useState(false)
  const [beats,setBeats]=useState('4'),[beatType,setBeatType]=useState('4')
  const [error,setError]=useState<string>(),[invalidBeats,setInvalidBeats]=useState(false)
  const composing=useRef(false)
  const close=()=>{composing.current=false;setOpen(false);setError(undefined);setInvalidBeats(false)}
  useEffect(()=>{if(open&&owner!==customMeter?.owner)close()},[open,owner,customMeter?.owner])
  const parsed=parseCustomTimeSignature(beats,beatType)
  const unchanged=!applyToScore&&parsed&&parsed.beats===customMeter?.value.beats&&parsed.beatType===customMeter.value.beatType
  const dialogTitle = applyToScore ? '총보 박자표' : '사용자 지정 박자표'
  const openMeter = (wholeScore: boolean) => {
    if (!customMeter) return
    setApplyToScore(wholeScore)
    setOwner(customMeter.owner)
    setBeats(String(customMeter.value.beats))
    setBeatType(String(customMeter.value.beatType))
    setError(undefined)
    setInvalidBeats(false)
    setOpen(true)
  }
  return <section className="studio-measure-tools ddirori" data-theme={theme} data-density="compact" aria-label="마디 구조와 조표·박자표"
    onKeyDown={event => {
      if (event.nativeEvent.isComposing || event.keyCode === 229) { event.stopPropagation(); return }
      if (!event.metaKey && !event.ctrlKey && !event.altKey &&
        ((event.target as HTMLElement).closest('[role="combobox"]') || event.key === 'Enter' || event.key === ' ')) event.stopPropagation()
    }}>
    <Group label="마디 구조">{actions.map(action => <Tooltip key={action.label} text={action.label}>
      <IconButton label={action.label} selected={action.selected} disabled={action.disabled} onClick={action.onSelect}>{action.icon}</IconButton>
    </Tooltip>)}</Group>
    <div className="studio-measure-tools__signatures">
      {signatures.map(signature => <div key={signature.label} className="studio-measure-tools__signature" data-signature={signature.label}>
        <Select key={JSON.stringify([customMeter?.owner,signature.label])} label={signature.label} value={signature.value} options={signature.options} onChange={signature.onChange} disabled={!enabled}/>
      </div>)}
      {customMeter ? <Button kind="secondary" disabled={!enabled} onClick={() => openMeter(false)}>사용자 지정 박자표…</Button> : null}
      {customMeter?.onApplyToScore ? <Button kind="secondary" disabled={!enabled} onClick={() => openMeter(true)}>이 마디의 총보 박자표…</Button> : null}
      <Text variant="description">조표: 선택한 마디부터 적용 · 박자표 적용: {meterScope ?? '선택 보표의 이 마디만'}</Text>
    </div>
    {open&&customMeter&&owner===customMeter.owner ? <div className="studio-measure-tools__custom-meter"
      onCompositionStartCapture={()=>{composing.current=true}} onCompositionEndCapture={()=>{composing.current=false}}
      onKeyDown={event=>{
        event.stopPropagation()
        if(composing.current||event.nativeEvent.isComposing||event.keyCode===229){if(event.key==='Enter'||event.key==='Escape')event.preventDefault();return}
        if(isDocumentSaveShortcut(event)){event.preventDefault();setError('박자표를 적용하거나 취소한 뒤 프로젝트를 저장하세요.');return}
        if(event.key==='Escape'){event.preventDefault();close()}
      }}>
      <Dialog open title={dialogTitle} onClose={close}>
        <form aria-label={dialogTitle} noValidate onSubmit={event=>{
          event.preventDefault();event.stopPropagation()
          if(composing.current||owner!==customMeter.owner)return
          if(!parsed){setInvalidBeats(true);setError('분자는1–128 사이의 정수, 분모는1·2·4·8·16·32·64 중에서 지정하세요.');return}
          if(unchanged)return
          if (applyToScore && customMeter.onApplyToScore) {
            const issue = customMeter.onApplyToScore(parsed)
            if (issue) setError(issue)
            else close()
            return
          }
          const result = applyToScore ? false : customMeter.onApply(parsed)
          if (result === true) close()
          else setError(typeof result === 'string' ? result : '이 마디의 음표·표기가 새 박자표에 맞지 않습니다. 기존 내용을 확인하거나 다른 박자표를 지정하세요.')
        }}>
          <Text as="p" variant="description">{applyToScore
            ? '총보 · 모든 보표의 이 마디에 적용합니다. 이후 마디의 박자표는 유지합니다.'
            : `적용 범위: ${meterScope ?? '선택 보표의 이 마디만'}. 다른 보표와 이후 마디는 바뀌지 않습니다.`}</Text>
          <div className="studio-measure-tools__custom-fields">
            <Input label="박자 분자" type="number" min={1} max={128} step={1} value={beats}
              error={invalidBeats?'1–128 사이의 정수를 입력하세요.':undefined} help="한 마디의 박 수"
              onChange={event=>{setBeats(event.currentTarget.value);setError(undefined);setInvalidBeats(false)}}/>
            <Select label="박자 분모" value={beatType} options={customMeterDenominators.map(value=>({value:String(value),label:String(value)}))}
              onChange={value=>{setBeatType(value);setError(undefined)}}/>
          </div>
          {error ? <Text as="p" role="alert">{error}</Text> : null}
          <div className="studio-measure-tools__custom-actions"><Button kind="quiet" type="button" onClick={close}>취소</Button><Button type="submit" onClick={()=>{}} disabled={Boolean(unchanged)}>적용</Button></div>
        </form>
      </Dialog>
    </div> : null}
  </section>
}
