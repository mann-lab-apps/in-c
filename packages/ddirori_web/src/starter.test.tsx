// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, expect, it} from 'vitest';
import {Starter} from '../catalog/starter';
afterEach(cleanup);
it('onboarding example preserves draft through a failure, retries and filters', async () => {
  render(<Starter/>);
  fireEvent.change(screen.getByLabelText('추가할 제목'),{target:{value:'한국어 새 기록'}});
  fireEvent.click(screen.getByRole('button',{name:'예제 추가'}));
  await screen.findByText(/예제 오류/);
  expect(screen.getByLabelText('추가할 제목')).toHaveValue('한국어 새 기록');
  fireEvent.click(screen.getByRole('button',{name:'다시 시도'}));
  await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2));
  fireEvent.change(screen.getByRole('searchbox'),{target:{value:'없는 검색어'}});
  expect(screen.getByText('검색 결과 없음')).toBeInTheDocument();
});
