// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {StudioPiano} from './StudioPiano'
afterEach(cleanup)
const callbacks={onSustain:vi.fn(),onNatural:vi.fn(),onPreview:vi.fn()}
it('identifies loop scheduling diagnostics as playback rather than a metronome source error',()=>{
 render(<StudioPiano theme="light" state="error" progress={0} error="연습 구간의 소리를 예약하지 못해 재생을 멈췄습니다." errorDetails={{message:'Owned practice scheduler failure',source:'playback'}} sustain={false} natural={false} preparing={false} playing={false} {...callbacks}/>)
 expect(screen.getByRole('group',{name:'재생 기술 정보'})).toHaveTextContent('기술 정보');expect(screen.queryByRole('group',{name:'메트로놈 기술 정보'})).not.toBeInTheDocument()
})
it('prioritizes Korean recovery guidance, retains the raw click diagnostic and isolates technical keyboard activation',async()=>{
 const raw='Owned createOscillator failed /local/audio',global=vi.fn(),error='메트로놈 소리를 준비하지 못해 재생을 멈췄습니다.'
 const view=render(<div onKeyDown={global}><StudioPiano theme="light" state="error" progress={0} error={error} errorDetails={{message:raw}} sustain={false} natural={false} preparing={false} playing={false} {...callbacks}/></div>)
 expect(screen.getByRole('alert')).toHaveTextContent(error);expect(screen.getByRole('alert')).not.toHaveTextContent(raw)
 const group=within(screen.getByRole('group',{name:'메트로놈 기술 정보'})),button=group.getByRole('button',{name:'기술 정보'})
 expect(button).toHaveAttribute('aria-expanded','false');fireEvent.click(button);await waitFor(()=>expect(button).toHaveAttribute('aria-expanded','true'));expect(group.getByText(raw)).toBeVisible()
 fireEvent.keyDown(button,{key:'Enter'});fireEvent.keyDown(button,{key:' ',code:'Space'});fireEvent.keyDown(button,{key:'Enter',isComposing:true,keyCode:229});expect(global).not.toHaveBeenCalled()
 view.rerender(<div onKeyDown={global}><StudioPiano theme="dark" state="ready" progress={0} error="" sustain={false} natural={false} preparing={false} playing={false} {...callbacks}/></div>)
 expect(screen.queryByRole('group',{name:'메트로놈 기술 정보'})).not.toBeInTheDocument();expect(screen.queryByText(raw)).not.toBeInTheDocument()
})
