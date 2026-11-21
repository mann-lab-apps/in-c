// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerAppTestHooks, playbackMockState } from './App.test-harness'
import { createNativeProject, encodeNativeProject } from '../../project/schema'
import type { PngExportResult } from '../../image-export/png'
import { PngPageRangeError } from './image-export/pages'
const state=vi.hoisted(()=>({raster:vi.fn()}))
vi.mock('./image-export/raster',()=>({rasterizePngPages:state.raster}))
const bytes=()=>new Uint8Array([137,80,78,71]) // Renderer adapter is mocked;real bytes are checked separately.
const output=()=>({pages:[{pageNumber:1,bytes:bytes()}],totalPages:1})
function menu(label:string){fireEvent.click(screen.getByRole('button',{name:'파일'}));fireEvent.click(screen.getByRole('menuitem',{name:label}))}
async function openTools(){menu('PNG 출력 설정');await waitFor(()=>expect(screen.getByRole('button',{name:'PNG 내보내기'})).toBeEnabled())}
async function start(){const button=screen.getByRole('button',{name:'PNG 내보내기'});act(()=>button.focus());fireEvent.click(button);await waitFor(()=>expect(state.raster).toHaveBeenCalled());return button}
function changeTitle(value:string){fireEvent.click(screen.getByRole('button',{name:'악보 정보'}));fireEvent.click(screen.getByRole('button',{name:'악보 제목 편집'}));const n=screen.getByRole('textbox',{name:'악보 제목'});fireEvent.change(n,{target:{value}});fireEvent.keyDown(n,{key:'Enter'});fireEvent.blur(n)}

describe('PNG file output ownership',()=>{
  registerAppTestHooks()
  beforeEach(()=>{state.raster.mockReset().mockResolvedValue(output())})
  async function app(){window.history.replaceState({},'','/?fixture=release-test');const {App}=await import('./App');render(<App/>);return structuredClone(playbackMockState.lastScore!)}
  it('uses common controls and keeps dirty score,selection,undo and project save separate',async()=>{
    const before=await app();changeTitle('PNG edited score');const edited=structuredClone(playbackMockState.lastScore!)
    vi.mocked(window.inC.png.save).mockResolvedValue({fileName:'score.png',filePath:'/tmp/score.png',pageCount:1,kind:'file'})
    await openTools();await start()
    await waitFor(()=>expect(document.querySelector('.editor-status')).toHaveTextContent('PNG 1장을 저장'))
    expect(state.raster.mock.calls[0][0]).toHaveClass('studio-image-snapshot')
    expect(state.raster.mock.calls[0][2]).toBe(300);expect(state.raster.mock.calls[0][3]).toBe('all')
    expect(playbackMockState.lastScore).toEqual(edited)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    expect(window.inC.project.save).not.toHaveBeenCalled();expect(window.inC.pdf.save).not.toHaveBeenCalled()
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(before)
    fireEvent.keyDown(window,{key:'y',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(edited)
  })
  it.each(['cancel','error']as const)('retains the score and retry focus after %s',async mode=>{
    const before=await app();await openTools()
    const diskError='EISDIR: owned PNG destination /fixture/destination.png'
    if(mode==='error')vi.mocked(window.inC.png.save).mockRejectedValueOnce(new Error(diskError))
    const button=await start()
    await waitFor(()=>expect(button).toBeEnabled());await waitFor(()=>expect(document.querySelector('.studio-image-snapshot')).toBeNull())
    expect(playbackMockState.lastScore).toEqual(before);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    expect(button).toHaveFocus()
    if(mode==='error'){
      const result=document.querySelector('.studio-status__result')!
      expect(result).toHaveTextContent('저장 위치와 출력 설정을 확인한 뒤 다시 시도해 주세요.')
      expect(result).not.toHaveTextContent(diskError)
      const details=within(screen.getByRole('group',{name:'PNG 출력 기술 정보'}))
      expect(details.getByText(diskError)).not.toBeVisible()
      fireEvent.click(details.getByRole('button',{name:'기술 정보'}))
      expect(details.getByText(diskError)).toBeVisible()
    }
    vi.mocked(window.inC.png.save).mockResolvedValue({fileName:'retry.png',filePath:'/tmp/retry.png',pageCount:1,kind:'file'})
    fireEvent.click(button);await waitFor(()=>expect(document.querySelector('.editor-status')).toHaveTextContent('retry.png'))
  })
  it.each(['retry', 'replace'] as const)('keeps PNG diagnostics readable after an older MIDI success until %s', async next => {
    const original = await app()
    changeTitle('Current PNG diagnostic')
    const edited = structuredClone(playbackMockState.lastScore!)
    let finishMidi!: (result: { fileName: string }) => void
    vi.mocked(window.inC.midi.save).mockImplementationOnce(() => new Promise(resolve => { finishMidi = resolve }))
    const diagnostic = 'EISDIR: owned PNG destination /fixture/current.png'
    vi.mocked(window.inC.png.save).mockRejectedValueOnce(new Error(diagnostic))

    await openTools()
    const tools = screen.getByRole('region', { name: '내보내기 작업' })
    fireEvent.click(within(tools).getByRole('button', { name: 'MIDI 내보내기' }))
    expect(window.inC.midi.save).toHaveBeenCalledTimes(1)
    const retry = await start()
    await waitFor(() => expect(retry).toBeEnabled())
    expect(screen.getAllByRole('group', { name: 'PNG 출력 기술 정보' })).toHaveLength(1)
    expect(within(tools).queryByRole('group', { name: 'PNG 출력 기술 정보' })).toBeNull()

    await act(async () => finishMidi({ fileName: 'older.mid' }))
    expect(document.querySelector('.studio-status__result')).toHaveTextContent('older.mid')
    const local = within(tools).getByRole('group', { name: 'PNG 출력 기술 정보' })
    expect(screen.getAllByRole('group', { name: 'PNG 출력 기술 정보' })).toEqual([local])
    expect(within(local).getByText(diagnostic)).not.toBeVisible()
    fireEvent.click(within(local).getByRole('button', { name: '기술 정보' }))
    expect(within(local).getByText(diagnostic)).toBeVisible()
    expect(playbackMockState.lastScore).toEqual(edited)
    expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')

    if (next === 'retry') {
      vi.mocked(window.inC.png.save).mockResolvedValueOnce({ filePath: '/tmp/retry.png', fileName: 'retry.png', pageCount: 1, kind: 'file' })
      fireEvent.click(retry)
      await waitFor(() => expect(document.querySelector('.studio-status__result')).toHaveTextContent('retry.png'))
      expect(playbackMockState.lastScore).toEqual(edited)
      expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    } else {
      const replacement = { ...original, title: 'Replacement without PNG diagnostic' }
      vi.mocked(window.inC.project.open).mockResolvedValueOnce({
        filePath: '/tmp/replacement.chromatics', fileName: 'replacement.chromatics',
        contents: encodeNativeProject(createNativeProject(replacement))
      })
      vi.spyOn(window, 'confirm').mockReturnValueOnce(true)
      menu('프로젝트 열기')
      await waitFor(() => expect(document.querySelector('.studio-document')).toHaveTextContent(replacement.title))
      await openTools()
      expect(playbackMockState.lastScore).toEqual(replacement)
    }

    expect(screen.queryByRole('group', { name: 'PNG 출력 기술 정보' })).toBeNull()
  }, 15_000)

  it.each([
    ['MIDI', 'diagnostic'], ['MIDI', 'page count'],
    ['PDF', 'diagnostic'], ['PDF', 'page count']
  ] as const)('keeps a readable PNG diagnostic when %s fails with %s focus', async (format, focusOwner) => {
    const score = await app()
    let failOther!: (error: Error) => void
    const saveOther = format === 'MIDI' ? window.inC.midi.save : window.inC.pdf.save
    vi.mocked(saveOther).mockImplementationOnce(() => new Promise<never>((_resolve, reject) => { failOther = reject }))
    const pngError = 'PNG destination unavailable'
    const otherError = `${format} destination unavailable`
    vi.mocked(window.inC.png.save).mockRejectedValueOnce(new Error(pngError))

    await openTools()
    fireEvent.click(screen.getByRole('button', { name: format === 'MIDI' ? 'MIDI 내보내기' : 'PDF 변환' }))
    await waitFor(() => expect(saveOther).toHaveBeenCalledOnce())
    const retry = await start()
    const oldGroup = within(await screen.findByRole('group', { name: 'PNG 출력 기술 정보' }))
    const oldButton = oldGroup.getByRole('button', { name: '기술 정보' })
    act(() => oldButton.focus())
    fireEvent.click(oldButton)
    expect(oldGroup.getByText(pngError)).toBeVisible()
    const pageCount = screen.getByRole('spinbutton', { name: 'PDF 목표 장수' })
    if (focusOwner === 'page count') act(() => pageCount.focus())

    await act(async () => failOther(new Error(otherError)))

    const tools = within(screen.getByRole('region', { name: '내보내기 작업' }))
    const groups = screen.getAllByRole('group', { name: 'PNG 출력 기술 정보' })
    expect(groups).toEqual([tools.getByRole('group', { name: 'PNG 출력 기술 정보' })])
    const png = within(groups[0])
    const currentButton = png.getByRole('button', { name: '기술 정보' })
    expect(currentButton).toHaveAttribute('aria-expanded', 'true')
    expect(png.getByText(pngError)).toBeVisible()
    expect(focusOwner === 'diagnostic' ? currentButton : pageCount).toHaveFocus()
    const other = within(format === 'MIDI'
      ? screen.getByRole('region', { name: 'MIDI 오류 상세' })
      : screen.getByRole('group', { name: 'PDF 출력 기술 정보' }))
    expect(other.getByText(otherError)).not.toBeVisible()
    fireEvent.click(other.getByRole('button', { name: '기술 정보' }))
    expect(other.getByText(otherError)).toBeVisible()
    expect(playbackMockState.lastScore).toEqual(score)

    vi.mocked(window.inC.png.save).mockResolvedValueOnce({ filePath: '/tmp/retry.png', fileName: 'retry.png', pageCount: 1, kind: 'file' })
    fireEvent.click(retry)
    await waitFor(() => expect(document.querySelector('.studio-status__result')).toHaveTextContent('retry.png'))
    expect(screen.queryByRole('group', { name: 'PNG 출력 기술 정보' })).toBeNull()
    if (format === 'MIDI') expect(other.getByText(otherError)).toBeVisible()
  }, 15_000)

  it.each(['PNG text', 'PDF field'] as const)('preserves the active reader when a late MIDI success moves PNG details with %s active', async owner => {
    const score = await app()
    const diagnostic = 'Could not write the selected PNG page to the destination.'
    let completeMidi!: (value: { fileName: string }) => void
    vi.mocked(window.inC.midi.save).mockImplementationOnce(() => new Promise(resolve => { completeMidi = resolve }))
    vi.mocked(window.inC.png.save).mockRejectedValueOnce(new Error(diagnostic))
    await openTools()
    fireEvent.click(screen.getByRole('button', { name: 'MIDI 내보내기' }))
    const retry = await start()
    const original = within(await screen.findByRole('group', { name: 'PNG 출력 기술 정보' }))
    fireEvent.click(original.getByRole('button', { name: '기술 정보' }))
    const originalMessage = original.getByText(diagnostic)
    expect(originalMessage).toBeVisible()
    const selection = document.getSelection()!
    act(() => {
      retry.blur()
      selection.setBaseAndExtent(originalMessage.firstChild!, 15, originalMessage.firstChild!, 4)
    })
    expect(selection.toString()).toBe(diagnostic.slice(4, 15))

    const field = screen.getByRole('spinbutton', { name: 'PDF 목표 장수' })
    if (owner === 'PDF field') act(() => field.focus())
    await act(async () => completeMidi({ fileName: 'late.mid' }))

    expect(document.querySelector('.studio-status__result')).toHaveTextContent('late.mid')
    const exportTools = within(screen.getByRole('region', { name: '내보내기 작업' }))
    const local = within(exportTools.getByRole('group', { name: 'PNG 출력 기술 정보' }))
    const replacement = local.getByText(diagnostic)
    expect(replacement).toBeVisible()
    expect(replacement).not.toBe(originalMessage)
    if (owner === 'PNG text') {
      expect(selection.toString()).toBe(diagnostic.slice(4, 15))
      expect(selection.anchorNode).toBe(replacement.firstChild)
      expect(selection.anchorOffset).toBe(15)
      expect(selection.focusNode).toBe(replacement.firstChild)
      expect(selection.focusOffset).toBe(4)
      expect(document.body).toHaveFocus()
    } else {
      expect(selection.toString()).toBe('')
      expect(field).toHaveFocus()
    }

    vi.mocked(window.inC.png.save).mockResolvedValueOnce({ filePath: '/tmp/retry.png', fileName: 'retry.png', pageCount: 1, kind: 'file' })
    fireEvent.click(retry)
    await waitFor(() => expect(document.querySelector('.studio-status__result')).toHaveTextContent('retry.png'))
    expect(selection.toString()).toBe('')
    expect(screen.queryByRole('group', { name: 'PNG 출력 기술 정보' })).toBeNull()
    expect(playbackMockState.lastScore).toEqual(score)
  }, 15_000)

  it('captures the old immutable source while retaining edits made during rasterization',async()=>{
    const before=await app();let resolve!: (value:ReturnType<typeof output>)=>void
    state.raster.mockImplementationOnce(()=>new Promise(r=>{resolve=r}))
    vi.mocked(window.inC.png.save).mockResolvedValue({fileName:'old-source.png',filePath:'/tmp/old-source.png',pageCount:1,kind:'file'})
    await openTools();await start();expect(document.querySelector('.studio-image-snapshot .metadata-display--title')).toHaveTextContent(before.title!)
    changeTitle('Changed during image output');const edited=structuredClone(playbackMockState.lastScore!)
    expect(document.querySelector('.studio-image-snapshot .metadata-display--title')).toHaveTextContent(before.title!)
    await act(async()=>resolve(output()))
    await waitFor(()=>expect(document.querySelector('.editor-status')).toHaveTextContent('수정이나 보기 변경은 포함되지 않았습니다'))
    expect(playbackMockState.lastScore).toEqual(edited);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  })
  it.each(['resolve','reject']as const)('isolates an old %s from a newer document and PNG request',async outcome=>{
    const before=await app();let resolveOld!: (value:PngExportResult|null)=>void,rejectOld!: (value:unknown)=>void,resolveNew!: (value:PngExportResult|null)=>void
    vi.mocked(window.inC.png.save).mockImplementationOnce(()=>new Promise((yes,no)=>{resolveOld=yes;rejectOld=no})).mockImplementationOnce(()=>new Promise(yes=>{resolveNew=yes}))
    await openTools();await start();await waitFor(()=>expect(window.inC.png.save).toHaveBeenCalledTimes(1))
    const replacement={...before,title:'New PNG document'}
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/tmp/new.chromatics',fileName:'new.chromatics',contents:encodeNativeProject(createNativeProject(replacement))})
    menu('프로젝트 열기');await waitFor(()=>expect(document.querySelector('.studio-document')).toHaveTextContent(replacement.title))
    await openTools();fireEvent.click(screen.getByRole('button',{name:'PNG 내보내기'}));await waitFor(()=>expect(window.inC.png.save).toHaveBeenCalledTimes(2))
    await act(async()=>outcome==='resolve'?resolveOld({fileName:'old.png',filePath:'/tmp/old.png',pageCount:1,kind:'file'}):rejectOld(new Error('old failure')))
    expect(screen.getByRole('button',{name:'PNG 내보내기'})).toBeDisabled()
    expect(document.querySelector('.editor-status')).not.toHaveTextContent('old.png');expect(playbackMockState.lastScore).toEqual(replacement)
    await act(async()=>resolveNew({fileName:'new.png',filePath:'/tmp/new.png',pageCount:1,kind:'file'}))
    await waitFor(()=>expect(document.querySelector('.editor-status')).toHaveTextContent('new.png'))
    expect(playbackMockState.lastScore).toEqual(replacement)
  },15_000)
  it('shows the measured page range before native saving and preserves the chosen number,dirty,undo and retry',async()=>{
    const before=await app();changeTitle('Range retry');const edited=structuredClone(playbackMockState.lastScore!)
    const selection=screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
    state.raster.mockRejectedValueOnce(new PngPageRangeError(3))
    await openTools();fireEvent.click(screen.getByRole('combobox',{name:'PNG 페이지'}));fireEvent.click(screen.getByRole('option',{name:'페이지 선택'}))
    const page=screen.getByRole('spinbutton',{name:'PNG 페이지 번호'});fireEvent.change(page,{target:{value:'4'}})
    const button=await start()
    await waitFor(()=>expect(document.querySelector('.studio-status__result')).toHaveTextContent('출력 시작 시점의 악보는 3쪽입니다.'))
    expect(document.querySelector('.studio-status__result')).toHaveTextContent('1–3');expect(page).toHaveValue(4)
    expect(window.inC.png.save).not.toHaveBeenCalled();expect(window.inC.project.save).not.toHaveBeenCalled()
    expect(playbackMockState.lastScore).toEqual(edited);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',selection!)
    await waitFor(()=>expect(button).toHaveFocus())
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(before)
    fireEvent.keyDown(window,{key:'y',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(edited)
    state.raster.mockResolvedValueOnce({pages:[{pageNumber:3,bytes:bytes()}],totalPages:3})
    vi.mocked(window.inC.png.save).mockResolvedValueOnce({fileName:'page-3.png',filePath:'/tmp/page-3.png',pageCount:1,kind:'file'})
    fireEvent.change(page,{target:{value:'3'}});fireEvent.click(button)
    await waitFor(()=>expect(document.querySelector('.editor-status')).toHaveTextContent('page-3.png'))
    expect(state.raster.mock.calls.at(-1)![3]).toBe(3)
    expect(vi.mocked(window.inC.png.save).mock.calls[0][0].pages[0].pageNumber).toBe(3)
    expect(playbackMockState.lastScore).toEqual(edited);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  },15_000)
  it('ignores an old measured-range failure while a newer document is saving PNG',async()=>{
    const before=await app();let rejectOld!:(reason:unknown)=>void,resolveNew!:(value:PngExportResult|null)=>void
    state.raster.mockImplementationOnce(()=>new Promise((_resolve,reject)=>{rejectOld=reject}))
    await openTools();await start()
    const replacement={...before,title:'New range owner'}
    vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/tmp/range-owner.chromatics',fileName:'range-owner.chromatics',contents:encodeNativeProject(createNativeProject(replacement))})
    menu('프로젝트 열기');await waitFor(()=>expect(document.querySelector('.studio-document')).toHaveTextContent(replacement.title))
    vi.mocked(window.inC.png.save).mockImplementationOnce(()=>new Promise(resolve=>{resolveNew=resolve}))
    await openTools();fireEvent.click(screen.getByRole('button',{name:'PNG 내보내기'}));await waitFor(()=>expect(window.inC.png.save).toHaveBeenCalledTimes(1))
    await act(async()=>rejectOld(new PngPageRangeError(3)))
    expect(screen.getByRole('button',{name:'PNG 내보내기'})).toBeDisabled()
    expect(document.querySelector('.studio-image-snapshot')).not.toBeNull();expect(document.querySelector('.editor-status')).not.toHaveTextContent('출력 시작 시점의 악보는 3쪽')
    await act(async()=>resolveNew({fileName:'new-owner.png',filePath:'/tmp/new-owner.png',pageCount:1,kind:'file'}))
    await waitFor(()=>expect(document.querySelector('.editor-status')).toHaveTextContent('new-owner.png'));expect(playbackMockState.lastScore).toEqual(replacement)
  },15_000)

  it('describes the immutable export range after edits to the same document',async()=>{
    const before=await app();let reject!:(reason:unknown)=>void
    state.raster.mockImplementationOnce(()=>new Promise((_resolve,no)=>{reject=no}))
    await openTools();await start()
    expect(document.querySelector('.studio-image-snapshot .metadata-display--title')).toHaveTextContent(before.title!)
    changeTitle('Edited while range was measured');const edited=structuredClone(playbackMockState.lastScore!)
    await act(async()=>reject(new PngPageRangeError(3)))
    await waitFor(()=>expect(document.querySelector('.studio-status__result')).toHaveTextContent('출력 시작 시점의 악보는 3쪽입니다.'))
    expect(document.querySelector('.studio-status__result')).toHaveTextContent('1–3')
    expect(playbackMockState.lastScore).toEqual(edited);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    expect(window.inC.png.save).not.toHaveBeenCalled();expect(window.inC.project.save).not.toHaveBeenCalled()
  },15_000)

})
