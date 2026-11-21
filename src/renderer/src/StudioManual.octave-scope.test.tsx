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
it('explains staff-wide octave onset scope and same-range toggle without promising a generic line inspector',()=>{
 render(<StudioManual theme="light" onClose={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:'표기와 표현'}));const a=within(screen.getByRole('article',{name:'사용설명서 본문'}))
 expect(a.getByText(/같은 보표의 구간 안에서 시작하는 모든 성부 음에 적용합니다/)).toBeVisible()
 expect(a.getByText(/같은 범위에서 같은 종류를 다시 누르면 해제하고 다른 종류를 누르면 교체합니다/)).toBeVisible()
 expect(a.getByText(/구간 앞에서 시작해 이어지는 음과 다른 보표·파트는 그대로입니다/)).toBeVisible()
 expect(a.getByText(/숫자만 표시·선 숨김·대각선·선과 글자 스타일 편집기는 없습니다/)).toBeVisible()
})
it('keeps the existing octave checklist and asks the user to compare other voices and unchanged staves',()=>{
 render(<StudioManual theme="dark" onClose={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:'직접 확인하기'}));const a=within(screen.getByRole('article',{name:'사용설명서 본문'}))
 expect(a.getByText(/같은 보표의 다른 성부와 구간 밖·다른 보표의 음높이를 비교합니다/)).toBeVisible()
 expect(a.getByText(/같은 범위에서 같은 종류를 다시 누르면 해제하고 다른 종류를 누르면 교체합니다/)).toBeVisible()
})
