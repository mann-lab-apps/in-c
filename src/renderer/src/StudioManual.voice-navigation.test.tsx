// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {StudioManual} from './StudioManual'
beforeEach(()=>{
 Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value(this:HTMLDialogElement){this.setAttribute('open','')}})
 Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value(this:HTMLDialogElement){this.removeAttribute('open')}})
})
afterEach(()=>{cleanup();vi.restoreAllMocks()})
it('finds the actual voice navigation instructions without promising selected-note migration',()=>{
 render(<StudioManual theme="light" onClose={vi.fn()}/>);fireEvent.change(screen.getByRole('searchbox',{name:'사용설명서 검색'}),{target:{value:'성부'}})
 fireEvent.click(screen.getByRole('button',{name:/음표와 쉼표 입력·편집.*입력 보표·성부 전환/}))
 const article=within(screen.getByRole('article',{name:'사용설명서 본문'}));expect(article.getByRole('heading',{name:'입력 보표·성부 전환'})).toBeVisible()
 expect(article.getByText(/선택한 음표를 다른 성부로 옮기는 명령이 아닙니다/)).toBeVisible();expect(article.getByText(/이미 있는 성부로 전환하면 악보와 실행 취소 이력은 바뀌지 않습니다/)).toBeVisible();expect(article.getByText(/없는 성부를 처음 선택하면/)).toBeVisible()
 expect(article.queryByText(/대상 성부에 기존 내용이 있어 이동이 불가능/)).toBeNull()
})
it('keeps the voices checklist link but asks the user to verify navigation rather than note transfer',()=>{
 render(<StudioManual theme="dark" onClose={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:'직접 확인하기'}))
 const article=within(screen.getByRole('article',{name:'사용설명서 본문'}));expect(article.getByRole('heading',{name:'입력 보표·성부 전환'})).toBeVisible();expect(article.getByText(/원래 음표가 그대로 남고 입력 대상만 바뀌는지 확인합니다/)).toBeVisible()
 expect(article.queryByText(/선택 이벤트의 이동인지/)).toBeNull()
})
