// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {StudioMeasureTools} from './StudioMeasureTools'
beforeEach(()=>{
 Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value(this:HTMLDialogElement){this.setAttribute('open','')}})
 Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value(this:HTMLDialogElement){this.removeAttribute('open')}})
})
afterEach(cleanup)
it('dismisses stale target drafts before they can apply to a different bar',()=>{
 const apply=vi.fn(()=>true)
 const host=(owner:string,beats:number)=><StudioMeasureTools theme="light" enabled actions={[]} signatures={[]} meterScope={owner} customMeter={{owner,value:{beats,beatType:4},onApply:apply}}/>
 const{rerender}=render(host('first',4));fireEvent.click(screen.getByRole('button',{name:'사용자 지정 박자표…'}));fireEvent.change(screen.getByRole('spinbutton',{name:'박자 분자'}),{target:{value:'5'}})
 rerender(host('second',3));expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(apply).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'사용자 지정 박자표…'}));expect(screen.getByRole('spinbutton',{name:'박자 분자'})).toHaveValue(3)
 expect(screen.getByRole('button',{name:'적용'})).toBeDisabled()
})
