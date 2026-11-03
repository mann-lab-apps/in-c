// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { StudioPartMixer } from './StudioPlayback'

afterEach(cleanup)
const parts=[{id:'p1',name:'Piano',muted:false,solo:false,volume:100,active:false},
  {id:'p2',name:'Piano',muted:false,solo:false,volume:100,active:true}]

it('distinguishes duplicate mixer controls and preserves part IDs and state when names change',()=>{
  const before=structuredClone(parts),onMute=vi.fn(),onSolo=vi.fn(),onVolume=vi.fn()
  const view=render(<StudioPartMixer theme="light" open parts={parts} onMute={onMute} onSolo={onSolo} onVolume={onVolume}/>)
  expect(screen.getByLabelText('2 · Piano 재생 상태')).toHaveTextContent('재생 중')
  expect(screen.getByLabelText('1 · Piano 재생 상태')).toHaveTextContent('대기')
  fireEvent.click(screen.getByRole('checkbox',{name:'2 · Piano 음소거'}));fireEvent.click(screen.getByRole('checkbox',{name:'2 · Piano 솔로'}))
  fireEvent.change(screen.getByRole('slider',{name:/^2 · Piano 볼륨/}),{target:{value:'65'}})
  expect(onMute).toHaveBeenCalledExactlyOnceWith('p2');expect(onSolo).toHaveBeenCalledExactlyOnceWith('p2');expect(onVolume).toHaveBeenCalledExactlyOnceWith('p2',65);expect(parts).toEqual(before)
  view.rerender(<StudioPartMixer theme="light" open parts={[parts[0],{...parts[1],name:'Solo',muted:true,solo:true,volume:65}]} onMute={onMute} onSolo={onSolo} onVolume={onVolume}/>)
  expect(screen.getByRole('checkbox',{name:'Solo 음소거'})).toBeChecked();expect(screen.getByRole('checkbox',{name:'Solo 솔로'})).toBeChecked();expect(screen.getByRole('slider',{name:/^Solo 볼륨/})).toHaveValue('65')
  expect(screen.getByRole('checkbox',{name:'Piano 음소거'})).not.toBeChecked()
})

it('preserves unique mixer names and the existing closed-panel policy',()=>{
  const callbacks={onMute:vi.fn(),onSolo:vi.fn(),onVolume:vi.fn()}
  const view=render(<StudioPartMixer theme="dark" open parts={[parts[0],{...parts[1],name:'Cello'}]} {...callbacks}/>)
  expect(screen.getByRole('checkbox',{name:'Piano 음소거'})).toBeInTheDocument();expect(screen.getByRole('slider',{name:/^Cello 볼륨/})).toHaveValue('100')
  view.rerender(<StudioPartMixer theme="dark" open={false} parts={parts} {...callbacks}/>)
  expect(screen.queryByRole('region',{name:'파트 믹서'})).toBeNull();expect(callbacks.onMute).not.toHaveBeenCalled();expect(callbacks.onSolo).not.toHaveBeenCalled();expect(callbacks.onVolume).not.toHaveBeenCalled()
})
