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
it('explains the score-wide scope and structural renumbering without promising MuseScore bulk commands',()=>{
 render(<StudioManual theme="light" onClose={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:'악보 구성'}));const article=within(screen.getByRole('article',{name:'사용설명서 본문'}))
 expect(article.getByText(/모든 파트·보표의 같은 위치에 한 마디씩 추가하거나 제거합니다/)).toBeVisible();expect(article.getByText(/구조를 바꾸면 마디 번호를 1부터 순서대로 다시 매깁니다/)).toBeVisible();expect(article.getByText(/마디를 선택하고 Delete 또는 Backspace를 누르면 선택한 보표의 내용만 지웁니다/)).toBeVisible()
})
it('asks the user to inspect all staves and renumbered measures in the existing checklist task',()=>{
 render(<StudioManual theme="dark" onClose={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:'직접 확인하기'}));const article=within(screen.getByRole('article',{name:'사용설명서 본문'}))
 expect(article.getByText(/총보의 각 보표와 다시 매긴 번호·주변 연결 표기를 확인합니다/)).toBeVisible();expect(article.getByText(/모든 파트·보표의 같은 위치에 한 마디씩 추가하거나 제거합니다/)).toBeVisible()
})
