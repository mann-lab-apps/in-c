import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile, mkdir, mkdtemp, writeFile, stat, rename } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'

const require = createRequire(import.meta.url)
const { _electron } = await import(process.env.DDIRORI_PLAYWRIGHT_PATH ?? 'playwright')
const outputRoot = process.env.DDIRORI_PRODUCT_EVIDENCE ?? join(tmpdir(), 'chromatics-ddirori-product-evidence')
await mkdir(outputRoot, { recursive: true })
// A previous successful export must never satisfy this run's file assertions.
const output = await mkdtemp(join(outputRoot, 'run-'))
console.log(`Evidence: ${output}`)
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
delete env.ELECTRON_RENDERER_URL
const app = await _electron.launch({ executablePath: require('electron'), args: ['scripts/preview-ddirori.cjs'], env })
const checks = [], errors = [], captures = []
const check = (name, value) => { assert.ok(value, name); checks.push(name) }
try {
  const page = await app.firstWindow()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${pathToFileURL(resolve('out/renderer/index.html'))}?fixture=single-voice-mvp`)
  await page.locator('.notation-preview svg').first().waitFor()
  const size = async width => {
    await app.evaluate(({ BrowserWindow }, width) => {
      const window = BrowserWindow.getAllWindows()[0]
      window.setMinimumSize(0, 0)
      window.setContentSize(width, 950)
    }, width)
    await page.waitForTimeout(150)
  }
  const capture = async name => {
    await page.screenshot({ path: join(output, `${name}.png`) })
    captures.push(`${name}.png`)
  }
  const appearance = async (theme, density) => {
    await page.getByLabel('화면 설정', { exact: true }).click()
    await page.getByLabel('화면 테마', { exact: true }).selectOption(theme)
    await page.getByLabel('도구 간격', { exact: true }).selectOption(density)
    await page.getByLabel('도구 간격', { exact: true }).press('Escape')
    check(`appearance ${theme}/${density}`, await page.locator('html').getAttribute('data-theme') === theme)
  }
  for (const theme of ['light', 'dark']) for (const density of ['compact', 'comfortable']) {
    await appearance(theme, density)
    for (const width of [1440, 840, 390]) for (const font of [16, 32]) {
      await size(width)
      await page.evaluate(font => { document.documentElement.style.fontSize = `${font}px` }, font)
      await page.waitForTimeout(100)
      const metrics = await page.evaluate(() => ({
        width: innerWidth, scroll: document.documentElement.scrollWidth,
        glyphs: document.querySelectorAll('.notation-preview svg text').length,
        controls: [...document.querySelectorAll('.note-entry-toolbar button, .toolbar .duration-strip button')].filter(el => el.getClientRects().length).map(el => {
          const r = el.getBoundingClientRect()
          return { w: r.width, h: r.height, scroll: el.scrollWidth, client: el.clientWidth, label: el.getAttribute('aria-label') }
        })
      }))
      check(`viewport ${width}/${font}`, metrics.width === width)
      check(`page overflow ${theme}/${density}/${width}/${font}`, metrics.scroll <= metrics.width + 1)
      check(`music present ${theme}/${density}/${width}/${font}`, metrics.glyphs > 20)
      check(`controls fit ${theme}/${density}/${width}/${font}`, metrics.controls.length > 0 && metrics.controls.every(c => c.h >= 30 && c.scroll <= c.client + 1))
      check(`input control theme ${theme}/${density}/${width}/${font}`, await page.evaluate(() => {
        const probe = document.createElement('span')
        document.body.append(probe)
        const color = token => { probe.style.color = `var(${token})`; return getComputedStyle(probe).color }
        const enabled = color('--dd-text'), disabled = color('--dd-on-disabled')
        probe.remove()
        const controls = [...document.querySelectorAll('.note-entry-toolbar button, .toolbar .duration-strip button, .toolbar .accidental-control button, .dot-control output, .dot-control__label')]
          .filter(el => el.getClientRects().length)
        return controls.length > 0 && controls.every(el => getComputedStyle(el).color === (el.disabled ? disabled : enabled))
      }))
      if (density === 'compact' && ((width === 1440 && font === 16) || (width === 390 && font === 32))) await capture(`${theme}-${width}-${font}`)
      if (width === 390 && font === 32) {
        const status = page.locator('.editor-status')
        const lastStatus = status.locator(':scope > :last-child')
        await lastStatus.scrollIntoViewIfNeeded()
        check(`status reachable ${theme}/${density}`, await lastStatus.evaluate(el => {
          const rect = el.getBoundingClientRect()
          const viewport = el.parentElement.getBoundingClientRect()
          return rect.top >= Math.max(0, viewport.top) &&
            rect.bottom <= Math.min(innerHeight, viewport.bottom) + 1 &&
            rect.left >= 0 && rect.right <= innerWidth + 1 &&
            el.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2))
        }))
        const lastInput = page.locator('.note-entry-toolbar button, .toolbar .duration-strip button').last()
        await lastInput.scrollIntoViewIfNeeded()
        check(`last input tool reachable ${theme}/${density}`, await lastInput.evaluate(el => {
          const rect = el.getBoundingClientRect()
          return rect.top >= 0 && rect.bottom <= innerHeight &&
            el.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2))
        }))
        await page.evaluate(() => window.scrollTo(0, 0))
      }
    }
  }
  await size(1440)
  await page.evaluate(() => { document.documentElement.style.fontSize = '16px' })
  await appearance('light', 'compact')
  const menuDriven = await page.getByRole('menubar').count() > 0
  for (const [label, panel] of [['팔레트 표시', '.docked-palette'], ['속성 표시', '.docked-properties']]) {
    const toggle = page.getByRole('button', { name: label, exact: true })
    if (await toggle.getAttribute('aria-pressed') === 'false') await toggle.click()
    await toggle.click()
    check(`${label} hides its dock`, !await page.locator(panel).isVisible())
    if (menuDriven) await toggle.press('Enter')
    else await toggle.click()
    check(`${label} restores its dock with ${menuDriven ? 'keyboard' : 'pointer (legacy UI)'}`, await page.locator(panel).isVisible())
  }
  if (menuDriven) {
    const sharedResize = page.getByRole('separator', { name: '도크 폭 조절', exact: true })
    const resize = await sharedResize.count() ? sharedResize : page.getByRole('separator', { name: '팔레트 폭 조절', exact: true })
    const widthBefore = Number(await resize.getAttribute('aria-valuenow'))
    await resize.focus()
    await resize.press('ArrowRight')
    check('dock resize uses product keyboard command', Number(await resize.getAttribute('aria-valuenow')) > widthBefore)
    await resize.press('ArrowLeft')
    check('dock resize restores original width', Number(await resize.getAttribute('aria-valuenow')) === widthBefore)
  }
  const menu = async (group, command, fallback) => {
    const trigger = page.getByRole('menubar').getByRole('menuitem', { name: group, exact: true })
    if (await trigger.count()) {
      await trigger.click()
      await page.getByRole('menu').getByRole('menuitem', { name: command, exact: true }).click()
    } else {
      if (group === '편집') await page.getByRole('button', { name: '파일', exact: true }).click()
      await page.getByRole('button', { name: fallback, exact: true }).click()
    }
  }
  const selected = page.locator('.notation-preview [data-event-id]').first()
  await selected.click()
  const propertiesTab = page.getByRole('tab', { name: '속성', exact: true })
  if (await propertiesTab.count()) await propertiesTab.click()
  check('actual selection inspector is visible', await page.locator('.docked-properties').isVisible())
  await capture('selection-inspector')
  const inputToggle = page.getByRole('button', { name: '음표 입력', exact: true })
  if (await inputToggle.count()) await inputToggle.click()
  else await page.keyboard.press('n')
  const eighth = page.getByRole('button', { name: '8분음표', exact: true }).first()
  check('duration uses the shared Button', (await eighth.getAttribute('class')).includes('dd-button'))
  await eighth.click()
  await eighth.click()
  check('repeated duration selection stays selected', await eighth.getAttribute('aria-pressed') === 'true')
  const voiceOne = page.getByRole('button', { name: '1성부', exact: true })
  check('voice uses the shared Button', (await voiceOne.getAttribute('class')).includes('dd-button'))
  await voiceOne.click()
  check('repeated voice selection stays selected', await voiceOne.getAttribute('aria-pressed') === 'true')
  await page.locator('.notation-preview').first().click({ position: { x: 4, y: 4 } })
  await page.keyboard.press('c')
  const revision = async () => Number((await page.locator('.editor-status').innerText()).match(/(\d+)회 수정/)?.[1])
  const editedRevision = await revision()
  check('input command executed', editedRevision > 0)
  await page.keyboard.press('Escape')
  await menu('편집', '실행 취소', '실행 취소')
  check('undo changes actual history', await revision() === editedRevision - 1)
  await menu('편집', '다시 실행', '다시 실행')
  check('redo restores actual history', await revision() === editedRevision)
  await menu('추가', '표기 도구 열기', '표기 객체')
  const hairpin = page.getByRole('button', { name: '크레셴도 헤어핀', exact: true })
  check('range command uses the shared Button', (await hairpin.getAttribute('class')).includes('dd-button'))
  check('range command remains disabled for a single event', await hairpin.isDisabled())
  const beforeDisabledCommand = await revision()
  await hairpin.evaluate(element => element.click())
  check('disabled range command cannot change history', await revision() === beforeDisabledCommand)
  await page.getByRole('searchbox', { name: '기호 검색', exact: true }).fill('no-such-symbol-qa')
  check('search query retained', await page.getByRole('searchbox', { name: '기호 검색', exact: true }).inputValue() === 'no-such-symbol-qa')
  check('palette exposes its actual empty result', await page.getByText('일치하는 표기 객체가 없습니다.', { exact: true }).isVisible())
  await page.getByRole('button', { name: '표기 객체 검색 지우기', exact: true }).click()
  check('clearing the query restores the actual palette', await hairpin.isVisible())
  await capture('palette')
  await menu('형식', '악보 및 마디 설정 열기', '악보')
  await capture('score-settings')
  await menu('도구', '믹서 열기', '재생')
  check('actual mixer inputs', await page.locator('.part-mixer input').count() > 0)
  await capture('mixer')
  await page.getByRole('button', { name: '명령 검색', exact: true }).click()
  check('command dialog opens', await page.getByRole('dialog').isVisible())
  await page.getByRole('searchbox', { name: '명령 검색어', exact: true }).press('Shift+Tab')
  check('command dialog retains reverse Tab focus', await page.getByRole('dialog').evaluate(el => el.contains(document.activeElement)))
  await page.keyboard.press('Tab')
  check('command dialog wraps forward Tab to search', await page.getByRole('searchbox', { name: '명령 검색어', exact: true }).evaluate(el => el === document.activeElement))
  await page.getByRole('searchbox', { name: '명령 검색어', exact: true }).evaluate(el => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }))
  })
  check('composing Escape leaves command search open', await page.getByRole('dialog').isVisible())
  await capture('commands')
  await page.keyboard.press('Escape')
  check('command close restores its trigger', await page.getByRole('button', { name: '명령 검색', exact: true }).evaluate(el => el === document.activeElement))
  const helpTrigger = page.getByRole('button', { name: '단축키 도움말', exact: true }).first()
  await helpTrigger.click()
  const help = page.getByRole('dialog', { name: '단축키 도움말', exact: true })
  check('help focuses its close command', await help.getByRole('button', { name: '닫기', exact: true }).evaluate(el => el === document.activeElement))
  await page.keyboard.press('Tab')
  await page.keyboard.press('Shift+Tab')
  check('help retains keyboard focus', await help.evaluate(el => el.contains(document.activeElement)))
  await page.keyboard.press('Escape')
  check('help close restores its trigger', await helpTrigger.evaluate(el => el === document.activeElement))
  const savePath = join(output, 'roundtrip.chromatics')
  await app.evaluate(({ dialog }, path) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: path }) }, savePath)
  await menu('파일', '프로젝트 저장', '파일')
  if (await page.getByRole('button', { name: '프로젝트 저장', exact: true }).isVisible()) await page.getByRole('button', { name: '프로젝트 저장', exact: true }).click()
  const waitFile = async path => {
    for (let i = 0; i < 100; i++) {
      if (await stat(path).then(s => s.size > 0, () => false)) return
      await page.waitForTimeout(100)
    }
    throw new Error(`File not written: ${path}`)
  }
  await waitFile(savePath)
  const saved = await readFile(savePath, 'utf8')
  check('native project written', saved.includes('Single Voice MVP'))
  await page.getByText('roundtrip.chromatics에 저장했습니다.', { exact: true }).waitFor()
  await app.evaluate(({ dialog }, path) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] }) }, savePath)
  await menu('파일', '프로젝트 열기', '파일')
  if (await page.getByRole('button', { name: '프로젝트 열기', exact: true }).isVisible()) await page.getByRole('button', { name: '프로젝트 열기', exact: true }).click()
  await page.getByText('roundtrip.chromatics을 열었습니다.', { exact: true }).waitFor()
  check('reopened project keeps music', await page.locator('.notation-preview svg text').count() > 20)
  const resavedPath = join(output, 'reopened.chromatics')
  await app.evaluate(({ dialog }, path) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: path }) }, resavedPath)
  await menu('파일', '다른 이름으로 저장', '파일')
  const saveAs = page.getByRole('button', { name: '프로젝트 다른 이름으로 저장', exact: true })
  if (await saveAs.isVisible()) await saveAs.click()
  await waitFile(resavedPath)
  await page.getByText('reopened.chromatics에 저장했습니다.', { exact: true }).waitFor()
  assert.deepEqual(JSON.parse(await readFile(resavedPath, 'utf8')), JSON.parse(saved), 'native round-trip preserves every score, layout, view and settings field')
  checks.push('native round-trip preserves every score, layout, view and settings field')
  await menu('파일', '새 악보 만들기', '새 악보 만들기')
  await size(390)
  await page.evaluate(() => { document.documentElement.style.fontSize = '32px' })
  const wizard = page.getByRole('dialog', { name: '새 악보 만들기', exact: true })
  check('new score dialog fits enlarged narrow view', await wizard.evaluate(el => el.scrollWidth <= el.clientWidth + 1))
  check('new score dialog retains viewport margins', await wizard.evaluate(el => {
    const rect = el.getBoundingClientRect()
    return rect.left >= 11 && rect.right <= innerWidth - 11 && rect.top >= 11 && rect.bottom <= innerHeight - 11
  }))
  check('appearance does not overlap modal', await page.evaluate(() => {
    const rect = document.querySelector('.appearance-settings summary').getBoundingClientRect()
    return !document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.closest('.appearance-bar')
  }))
  await capture('new-score-narrow')
  await wizard.evaluate(el => el.querySelector('button:not(:disabled), input:not(:disabled)').focus())
  await page.keyboard.press('Shift+Tab')
  check('new score retains reverse Tab focus', await wizard.evaluate(el => el.contains(document.activeElement)))
  await page.keyboard.press('Tab')
  check('new score retains forward Tab focus', await wizard.evaluate(el => el.contains(document.activeElement)))
  await page.keyboard.press('Escape')
  check('new score Escape closes draft only', await wizard.count() === 0 && await page.locator('.notation-preview svg text').count() > 20)
  check('new score restores a connected opener', await page.evaluate(() => document.activeElement !== document.body && !document.activeElement.closest('.modal-backdrop')))
  await size(1440)
  await page.evaluate(() => { document.documentElement.style.fontSize = '16px' })
  const pdfPath = join(output, 'score.pdf')
  await app.evaluate(({ dialog }, path) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: path }) }, pdfPath)
  await menu('파일', '내보내기 작업 열기', '내보내기')
  await page.getByRole('button', { name: 'PDF 변환', exact: true }).click()
  await waitFile(pdfPath)
  check('native PDF export writes PDF', (await readFile(pdfPath)).subarray(0, 5).toString() === '%PDF-')
  await appearance('dark', 'comfortable')
  await page.reload()
  await page.locator('.notation-preview svg').first().waitFor()
  check('appearance survives reopen', await page.locator('html').getAttribute('data-theme') === 'dark' && await page.locator('html').getAttribute('data-density') === 'comfortable')
  await page.emulateMedia({ media: 'print' })
  check('appearance controls excluded from print', !await page.locator('.appearance-bar').isVisible())
  await page.emulateMedia({ media: 'screen' })
  // Exercise the real backup store's list failure, not a success-shaped bridge mock.
  const profile = await app.evaluate(({ app }) => app.getPath('userData'))
  check('backup fault injection is limited to isolated profile', profile.includes('chromatics-ddirori-preview-'))
  const backupsPath = join(profile, 'native-project-backups')
  await writeFile(backupsPath, 'not a directory', { flag: 'wx' })
  await page.getByRole('button', { name: '파일', exact: true }).click()
  await page.getByRole('button', { name: '프로젝트 백업', exact: true }).click()
  const backups = page.getByRole('dialog', { name: '프로젝트 백업', exact: true })
  await backups.getByRole('alert').waitFor()
  await backups.evaluate(element => element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true })))
  check('backup composing Escape does not dismiss', await backups.isVisible())
  await backups.getByRole('button', { name: '닫기', exact: true }).focus()
  await page.keyboard.press('Tab')
  check('backup Tab wraps to the first available command', await backups.getByRole('button', { name: '백업 목록 다시 불러오기' }).evaluate(element => element === document.activeElement))
  await page.keyboard.press('Shift+Tab')
  check('backup reverse Tab returns to close', await backups.getByRole('button', { name: '닫기', exact: true }).evaluate(element => element === document.activeElement))
  check('backup list failure remains an error', await backups.getByRole('alert').innerText() !== '')
  await size(390)
  await page.evaluate(() => { document.documentElement.style.fontSize = '32px' })
  await capture('backup-error-narrow')
  check('backup dialog fits narrow enlarged view', await backups.evaluate(el => {
    const rect = el.getBoundingClientRect()
    return el.scrollWidth <= el.clientWidth + 1 && rect.left >= 11 && rect.right <= innerWidth - 11
  }))
  await rename(backupsPath, join(profile, 'backup-list-fault.txt'))
  await backups.getByRole('button', { name: '백업 목록 다시 불러오기' }).click()
  await backups.getByText('백업 없음', { exact: true }).waitFor()
  check('backup retry recovers without restoring a score', await backups.getByRole('alert').count() === 0)
  await backups.getByRole('button', { name: '닫기', exact: true }).click()
  check('backup close restores focus', await page.getByRole('button', { name: '프로젝트 백업', exact: true }).evaluate(el => el === document.activeElement))
  const recoveryProject = JSON.parse(saved)
  await page.evaluate(project => window.inC.autosave.write({ score: project.score, project, title: project.score.title }), recoveryProject)
  const recoveryBefore = await page.evaluate(() => window.inC.autosave.read())
  const recoveryTrigger = page.getByRole('button', { name: '자동저장 복구', exact: true })
  await recoveryTrigger.click()
  const recovery = page.getByRole('dialog', { name: '자동저장 복구', exact: true })
  await recovery.waitFor()
  check('recovery initially focuses non-destructive postpone', await recovery.getByRole('button', { name: '나중에', exact: true }).evaluate(el => el === document.activeElement))
  await recovery.getByRole('button', { name: '삭제', exact: true }).focus()
  await page.keyboard.press('Shift+Tab')
  check('recovery retains reverse Tab focus', await recovery.evaluate(el => el.contains(document.activeElement)))
  await page.keyboard.press('Escape')
  check('recovery Escape postpones without clearing data', await recovery.count() === 0)
  assert.deepEqual(await page.evaluate(() => window.inC.autosave.read()), recoveryBefore)
  checks.push('postponed native recovery snapshot is unchanged')
  check('recovery restores its trigger', await recoveryTrigger.evaluate(el => el === document.activeElement))
  await recoveryTrigger.click()
  await recovery.waitFor()
  // Delay a failing clear request in this disposable Electron process only.
  await app.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler('autosave:clear')
    ipcMain.handle('autosave:clear', () => new Promise((_, reject) => { globalThis.ddiroriRejectClear = reject }))
  })
  await recovery.getByRole('button', { name: '삭제', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.recovery-dialog button')?.disabled === true)
  await page.keyboard.press('Escape')
  check('pending recovery deletion cannot be dismissed', await recovery.isVisible())
  await app.evaluate(() => globalThis.ddiroriRejectClear(new Error('DDIRORI_QA_CLEAR_FAILED')))
  await page.waitForFunction(() => document.querySelector('.recovery-dialog button')?.disabled === false)
  check('failed recovery deletion stays retryable', await recovery.getByRole('button', { name: '삭제', exact: true }).isEnabled())
  assert.deepEqual(await page.evaluate(() => window.inC.autosave.read()), recoveryBefore)
  checks.push('failed recovery deletion preserves native snapshot')
  await recovery.getByRole('button', { name: '나중에', exact: true }).click()
  check('renderer has no uncaught errors', errors.length === 0)
  const sourceHashes = {}
  for (const file of ['src/renderer/src/App.tsx', 'src/renderer/src/styles.css', 'src/renderer/src/ddirori-product.css', 'src/renderer/src/AppearanceSettings.tsx', 'src/renderer/src/NativeBackupsDialog.tsx', 'src/renderer/src/ModalBackdrop.tsx', 'src/renderer/src/SpanProperties.tsx', 'packages/ddirori_web/src/controls.tsx', 'scripts/verify-ddirori-product.mjs']) sourceHashes[file] = createHash('sha256').update(await readFile(file)).digest('hex')
  await writeFile(join(output, 'report.json'), JSON.stringify({ timestamp: new Date().toISOString(), scope: 'Actual Electron renderer and native preload; isolated profile; no release packaging', productVariant: menuDriven ? 'menu-driven product' : 'legacy category UI; dock restoration checked with pointer, not Enter; keyboard resize absent', checks, errors, captures, sourceHashes }, null, 2))
  console.log(`${checks.length} checks passed; ${captures.length} screenshots: ${output}`)
} finally { await app.close() }
