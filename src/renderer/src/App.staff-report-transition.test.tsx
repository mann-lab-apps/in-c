// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { parseMusicXmlWithReport } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { serializeMidi } from './midi/serialize-midi'
import { createRepeatedStaffVisibilityFixture, createStaffVisibilityFixture } from '../../testing/staff-visibility-fixture'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
const repeated=createRepeatedStaffVisibilityFixture(3)
const mixed=createStaffVisibilityFixture('hidden-second').replace('<staff-details number="2" print-object="no"></staff-details>','<staff-details number="2" print-object="no"><staff-type>cue</staff-type></staff-details>')
it.each(['compact-first','mixed-first'] as const)('preserves diagnostics and exact music across same-file report-kind transitions: %s',async order=>{
 window.history.replaceState({},'', '/?fixture=release-test')
 const sequence=order==='compact-first'?[repeated,mixed,repeated]:[mixed,repeated,mixed]
 const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일')
 let previous:HTMLElement|undefined
 for(const [index,source] of sequence.entries()) {
  const parsed=parseMusicXmlWithReport(source),compact=source===repeated
  expect(parsed.report.warnings).toHaveLength(compact?6:2)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({fileName:'same-report.musicxml',filePath:'/fixture/same-report.musicxml',contents:source})
  fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
  await waitFor(()=>expect(playbackMockState.lastScore).toEqual(parsed.score))
  const report=screen.getByRole('region',{name:'MusicXML 경고 상세'}),panel=within(report)
  if(previous)expect(previous.isConnected).toBe(false)
  if(compact) {
   const toggle=panel.getByRole('button',{name:'마디별 경고 상세 6개'})
   expect(toggle).toHaveAttribute('aria-expanded','false');expect(panel.queryByRole('button',{name:'기술 정보'})).not.toBeInTheDocument()
   fireEvent.click(toggle)
  }else {
   expect(panel.queryByRole('button',{name:/마디별 경고 상세/})).not.toBeInTheDocument()
   expect(panel.getByText(/보표의 대체·큐·편집 용도는 보존하지 못했습니다/)).toBeVisible()
   const status=document.querySelector('.studio-status__result')!
   expect(status).not.toHaveTextContent(/part\[|Unrepresented/)
   expect(status).toHaveTextContent('경고 상세');expect(status).toHaveTextContent('보표')
  }
  const rows=report.querySelectorAll('li');expect(rows).toHaveLength(parsed.report.warnings.length)
  for(const [rowIndex,row] of [...rows].entries()) {
   expect(row).toBeVisible()
   const raw=within(row),toggle=raw.getByRole('button',{name:'기술 정보'})
   expect(toggle).toHaveAttribute('aria-expanded','false');fireEvent.click(toggle)
   expect(raw.getByText(parsed.report.warnings[rowIndex].message)).toBeVisible()
   expect(raw.getByText(parsed.report.warnings[rowIndex].path!)).toBeVisible()
  }
  expect(playbackMockState.lastScore).toEqual(parsed.score)
  expect(serializeMidi(playbackMockState.lastScore!)).toEqual(serializeMidi(parsed.score))
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}))
  await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(index+1))
  await waitFor(()=>expect(screen.getByRole('button',{name:'프로젝트 저장'})).toBeEnabled())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[index][0].contents).score).toEqual(parsed.score)
  expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음')
  previous=report
 }
})
