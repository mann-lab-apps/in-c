module.paths.unshift(
  require('node:path').resolve(__dirname, '../node_modules')
)

const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

async function loadFixture(window, fixture = 'single-voice-mvp', dockLayout = 'split') {
  if (process.env.CHROMATICS_QA_URL) {
    const url = new URL(process.env.CHROMATICS_QA_URL)
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
      throw new Error('CHROMATICS_QA_URL must point to a local development server.')
    }
    url.searchParams.set('fixture', fixture)
    await window.loadURL(url.toString())
  } else {
    await window.loadFile(
      path.resolve(__dirname, '../out/renderer/index.html'),
      {
        query: {
          fixture
        }
      }
    )
  }
  await new Promise((resolve) => setTimeout(resolve, 800))
  await window.webContents.executeJavaScript(`
    window.__qaOpenEditingSurface = async (label) => {
      const commands = {
        '악보': ['형식', '악보 및 마디 설정 열기'],
        '음표': ['도구', '음표 입력 도구 열기'],
        '표기 객체': ['추가', '표기 도구 열기'],
        '가사': ['추가', '가사 입력']
      }
      const wait = () => new Promise(resolve => setTimeout(resolve, 80))
      const entry = commands[label]
      if (entry) {
        const trigger = [...document.querySelectorAll('[role="menubar"] [role="menuitem"]')]
          .find(button => button.textContent.trim() === entry[0])
        if (!trigger) throw new Error('Menu trigger missing: ' + entry[0])
        trigger.click()
        await wait()
        const command = [...document.querySelectorAll('[role="menu"] [role="menuitem"]')]
          .find(button => button.textContent.trim() === entry[1])
        if (!command) throw new Error('Menu command missing: ' + entry[1])
        command.click()
      } else {
        const action = [...document.querySelectorAll('.toolbar-tabs button')]
          .find(button => button.getAttribute('aria-label') === label)
        if (!action) throw new Error('Quick action missing: ' + label)
        action.click()
      }
      await wait()
    }
    window.__qaReadEditingSurface = () => {
      for (const [label, region] of [['악보', '악보 편집'], ['표기 객체', '표기 객체'], ['가사', '가사 속성'], ['음표', '음표 편집']]) {
        const element = document.querySelector('[aria-label="' + region + '"]')
        if (element && element.getClientRects().length) return label
      }
      return null
    }
    window.__qaOpenTextProperties = async (label) => {
      const wait = () => new Promise(resolve => setTimeout(resolve, 100))
      const trigger = [...document.querySelectorAll('[role="menubar"] [role="menuitem"]')]
        .find(item => item.textContent.trim() === '추가')
      trigger.click()
      await wait()
      const command = [...document.querySelectorAll('[role="menu"] [role="menuitem"]')]
        .find(item => item.textContent.trim() === label + ' 입력')
      if (!command) throw new Error('Text entry missing: ' + label)
      command.click()
      await wait()
    }
    void 0
  `)
  // Existing two-panel workflows exercise the supported split layout explicitly.
  // Shared-layout cases opt out and verify the real default independently.
  if (dockLayout === 'split') {
    await window.webContents.executeJavaScript(`(async () => {
      if (!matchMedia('(min-width: 1201px)').matches) return
      const trigger = document.querySelector('[aria-controls="application-menu-popup-view"]')
      trigger.click()
      await new Promise(resolve => setTimeout(resolve, 80))
      const toggle = [...document.querySelectorAll('[role="menuitemcheckbox"]')]
        .find(button => button.textContent.trim() === '팔레트와 속성 함께 배치')
      if (!toggle) throw new Error('Split dock layout command missing')
      if (toggle.getAttribute('aria-checked') === 'true') toggle.click()
      trigger.click()
      await new Promise(resolve => setTimeout(resolve, 80))
    })()`)
  }
}

async function runStep(name, action) {
  try {
    return await action()
  } catch (error) {
    const detail = error instanceof Error ? error.stack || error.message : String(error)
    throw new Error(`${name} failed: ${detail}`)
  }
}

async function verifyMenuDrivenSurfaces(window) {
  const results = []
  for (const width of [960, 1400]) {
    window.setSize(width, 900)
    await loadFixture(window, 'release-test')
    const states = []
    for (const [label, focus] of [['악보', '선택 마디부터 조표'], ['표기 객체', '기호 검색'], ['가사', '선택 음표 가사'], ['음표', '음표 입력']]) {
      await window.webContents.executeJavaScript(`window.__qaOpenEditingSurface(${JSON.stringify(label)})`)
      const state = await window.webContents.executeJavaScript(`(() => {
        const menu = document.querySelector('.application-menu')
        const quick = document.querySelector('nav[aria-label="빠른 도구"]')
        const bar = document.querySelector('[role="menubar"]')
        const transport = document.querySelector('[aria-label="재생 컨트롤"]')
        const boxes = [bar, quick, transport].map(element => element.getBoundingClientRect())
        const signatures = [...document.querySelectorAll('select[aria-label="마디 시작 음자리표"], select[aria-label="선택 마디부터 조표"], select[aria-label="선택 마디 박자표"]')]
        return {
          active: window.__qaReadEditingSurface(),
          focus: document.activeElement.getAttribute('aria-label'),
          noCategories: !document.querySelector('[data-toolbar-category]'),
          unifiedRow: quick.parentElement === menu && boxes.every(box => Math.abs(box.top - boxes[0].top) < 8),
          contained: boxes.every(box => box.left >= 0 && box.right <= innerWidth + 1),
          noOverlap: boxes.every((box, index) => index === 0 || box.left >= boxes[index - 1].right - 1),
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          menuClosed: !document.querySelector('[role="menu"]'),
          signaturesInProperties: signatures.length === 3 && signatures.every(control => control.closest('#dock-panel-properties') && control.getClientRects().length),
          edits: document.querySelector('.editor-status')?.textContent.match(/\\d+회 수정/)?.[0]
        }
      })()`)
      if (state.active !== label || state.focus !== focus || !state.noCategories || !state.unifiedRow || !state.contained || !state.noOverlap || state.overflow || !state.menuClosed || state.edits !== '0회 수정') {
        throw new Error('Menu-driven surface: ' + JSON.stringify({ width, label, state }))
      }
      if (label === '악보') {
        if (!state.signaturesInProperties) throw new Error('Measure signatures are duplicated or outside properties')
        fs.writeFileSync(path.join(app.getPath('temp'), `chromatics-measure-properties-${width}.png`), (await window.webContents.capturePage()).toPNG())
      }
      states.push({ label, ...state })
    }
    const screenshot = path.join(app.getPath('temp'), `chromatics-menu-driven-${width}.png`)
    fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG())
    const measureEntry = await window.webContents.executeJavaScript(`(async () => {
      const wait = () => new Promise(resolve => setTimeout(resolve, 100))
      document.querySelector('button[aria-label="작업 도구 접기"]').click()
      await wait()
      const beforeTop = document.querySelector('.score-canvas').getBoundingClientRect().top
      const trigger = [...document.querySelectorAll('[role="menubar"] [role="menuitem"]')]
        .find(button => button.textContent.trim() === '추가')
      trigger.click()
      await wait()
      const item = [...document.querySelectorAll('[role="menu"] [role="menuitem"]')]
        .find(button => button.textContent.trim() === '마디 설정 열기')
      item.click()
      await wait()
      const card = document.querySelector('[aria-label="선택 마디 속성"]')
      const fields = [...card.querySelectorAll('select')]
      const expectedFields = ['마디 시작 음자리표', '선택 마디부터 조표', '선택 마디 박자표', '볼타 선 끝 마디', '볼타 끝 모양']
      const box = card.getBoundingClientRect()
      return {
        collapsed: !!document.querySelector('button[aria-label="작업 도구 펼치기"]'),
        noToolbarGrowth: Math.abs(document.querySelector('.score-canvas').getBoundingClientRect().top - beforeTop) <= 1,
        focus: document.activeElement.getAttribute('aria-label'),
        fieldLabels: fields.map(field => field.getAttribute('aria-label')),
        fieldsContained: fields.length === expectedFields.length && fields.every((field, index) => {
          const rect = field.getBoundingClientRect()
          return field.getAttribute('aria-label') === expectedFields[index] &&
            rect.width > 0 && rect.left >= box.left && rect.right <= box.right + 1
        }),
        overflow: document.documentElement.scrollWidth > innerWidth + 1
      }
    })()`)
    if (!measureEntry.collapsed || !measureEntry.noToolbarGrowth || !measureEntry.fieldsContained || measureEntry.focus !== '선택 마디부터 조표' || measureEntry.overflow) {
      throw new Error('Properties-only measure entry: ' + JSON.stringify({ width, measureEntry }))
    }
    fs.writeFileSync(path.join(app.getPath('temp'), `chromatics-measure-entry-${width}.png`), (await window.webContents.capturePage()).toPNG())
    const harmonyEntry = await window.webContents.executeJavaScript(`(async () => {
      const wait = () => new Promise(resolve => setTimeout(resolve, 100))
      if (innerWidth > 1200) {
        const view = [...document.querySelectorAll('[role="menubar"] [role="menuitem"]')]
          .find(button => button.textContent.trim() === '보기')
        view.click()
        await wait()
        const shared = [...document.querySelectorAll('[role="menuitemcheckbox"]')]
          .find(button => button.textContent.trim() === '팔레트와 속성 함께 배치')
        if (shared.getAttribute('aria-checked') !== 'true') shared.click()
        else view.click()
        await wait()
      }
      const beforeTop = document.querySelector('.score-canvas').getBoundingClientRect().top
      const trigger = [...document.querySelectorAll('[role="menubar"] [role="menuitem"]')]
        .find(button => button.textContent.trim() === '추가')
      trigger.click()
      await wait()
      const item = [...document.querySelectorAll('[role="menu"] [role="menuitem"]')]
        .find(button => button.textContent.trim() === '코드 심벌 입력')
      item.click()
      await wait()
      const fields = [...document.querySelectorAll('input[aria-label="코드 심벌"]')]
      const panel = document.querySelector('#dock-panel-properties').getBoundingClientRect()
      const field = fields[0]
      const box = field?.getBoundingClientRect()
      const card = field.closest('[aria-label="코드 심벌 속성"]')
      return {
        canonical: fields.length === 1 && !!field.closest('#dock-panel-properties') && !document.querySelector('input[aria-label="선택 요약 코드"]'),
        shared: document.querySelector('.docked-workspace').dataset.shared === 'true',
        dockLayout: getComputedStyle(field.closest('label')).display === 'grid' && getComputedStyle(card, '::after').display === 'none',
        focus: document.activeElement === field,
        contained: box.width > 0 && box.left >= panel.left && box.right <= panel.right + 1,
        collapsed: !!document.querySelector('button[aria-label="작업 도구 펼치기"]'),
        noToolbarGrowth: Math.abs(document.querySelector('.score-canvas').getBoundingClientRect().top - beforeTop) <= 1,
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        edits: document.querySelector('.editor-status')?.textContent.match(/\\d+회 수정/)?.[0]
      }
    })()`)
    if (!harmonyEntry.canonical || !harmonyEntry.shared || !harmonyEntry.dockLayout || !harmonyEntry.focus || !harmonyEntry.contained || !harmonyEntry.collapsed || !harmonyEntry.noToolbarGrowth || harmonyEntry.overflow || harmonyEntry.edits !== '0회 수정') {
      throw new Error('Canonical harmony properties: ' + JSON.stringify({ width, harmonyEntry }))
    }
    fs.writeFileSync(path.join(app.getPath('temp'), `chromatics-harmony-properties-${width}.png`), (await window.webContents.capturePage()).toPNG())
    const harmonyTarget = await window.webContents.executeJavaScript(`(async () => {
      const wait = () => new Promise(resolve => setTimeout(resolve, 100))
      const selectNote = id => document.querySelector('.notation-event[data-event-id="' + id + '"]')
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
      const edit = async value => {
        const field = document.querySelector('input[aria-label="코드 심벌"]')
        field.focus()
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(field, value)
        field.dispatchEvent(new Event('input', { bubbles: true }))
        field.blur()
        field.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
        await wait()
      }
      selectNote('m1-d4')
      await wait()
      await window.__qaOpenTextProperties('코드 심벌')
      const cursorScope = document.querySelector('[aria-label="코드 심벌 적용 위치"]').textContent
      await edit('G7')
      const mark = document.querySelector('.notation-harmony-mark')
      if (!mark) throw new Error('Chord creation failed: ' + document.querySelector('.editor-status').textContent)
      const id = mark.dataset.objectId
      selectNote('m1-c4')
      await wait()
      document.querySelector('.notation-harmony-mark[data-object-id="' + id + '"]')
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await wait()
      const value = document.querySelector('input[aria-label="코드 심벌"]').value
      const scope = document.querySelector('[aria-label="코드 심벌 적용 위치"]').textContent
      const focused = document.activeElement.getAttribute('aria-label') === '코드 심벌'
      await edit('Dm7')
      const updated = [...document.querySelectorAll('.notation-harmony-mark')]
      return {
        value, scope, cursorScope, focused,
        sameObject: updated.length === 1 && updated[0].dataset.objectId === id && updated[0].textContent === 'Dm7',
        nonzero: !cursorScope.trim().endsWith('tick 0'),
        matchingTick: scope.trim().replace('선택 코드', '선택 이벤트') === cursorScope.trim(),
        overflow: document.documentElement.scrollWidth > innerWidth + 1
      }
    })()`)
    if (harmonyTarget.value !== 'G7' || !harmonyTarget.focused || !harmonyTarget.sameObject || !harmonyTarget.nonzero || !harmonyTarget.matchingTick || harmonyTarget.overflow) {
      throw new Error('Harmony object target: ' + JSON.stringify({ width, harmonyTarget }))
    }
    const rehearsalEntry = await window.webContents.executeJavaScript(`(async () => {
      const wait = () => new Promise(resolve => setTimeout(resolve, 100))
      const beforeTop = document.querySelector('.score-canvas').getBoundingClientRect().top
      const mark = document.querySelector('.notation-rehearsal-mark')
      mark.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await wait()
      const field = document.querySelector('input[aria-label="연습표"]')
      const card = field.closest('[aria-label="연습표 속성"]')
      const chooser = document.querySelector('select[aria-label="연습표 객체 선택"]')
      const objectFocus = document.activeElement === field && field.value === 'A' && chooser.value === mark.dataset.objectId
      document.querySelector('button[aria-label="연습표 속성 접기"]').click()
      await wait()
      const closed = !field.getClientRects().length
      document.querySelector('#dock-tab-palette').click()
      await wait()
      document.querySelector('button[aria-label="마디 표기 팔레트 펼치기"]')?.click()
      await wait()
      document.querySelector('button[aria-label="연습표 입력 열기"]').click()
      await wait()
      const paletteFocus = document.activeElement === field
      document.querySelector('button[aria-label="연습표 속성 접기"]').click()
      await wait()
      const add = [...document.querySelectorAll('[role="menubar"] [role="menuitem"]')].find(item => item.textContent.trim() === '추가')
      add.click()
      await wait()
      const item = [...document.querySelectorAll('[role="menu"] [role="menuitem"]')].find(item => item.textContent.trim() === '연습표 입력')
      item.click()
      await wait()
      const panel = document.querySelector('#dock-panel-properties').getBoundingClientRect()
      const fields = [...card.querySelectorAll('input, select')]
      return {
        objectFocus, closed, paletteFocus,
        menuFocus: document.activeElement === field,
        canonical: document.querySelectorAll('input[aria-label="연습표"]').length === 1 && !!field.closest('#dock-panel-properties') && !document.querySelector('[aria-label="선택 요약 연습표"]'),
        maxLength: field.maxLength,
        contained: fields.every(control => {
          const box = control.getBoundingClientRect()
          return box.width > 0 && box.left >= panel.left && box.right <= panel.right + 1
        }),
        dockLayout: getComputedStyle(field.closest('label')).display === 'grid' && getComputedStyle(card, '::after').display === 'none',
        collapsed: !!document.querySelector('button[aria-label="작업 도구 펼치기"]'),
        noToolbarGrowth: Math.abs(document.querySelector('.score-canvas').getBoundingClientRect().top - beforeTop) <= 1,
        overflow: document.documentElement.scrollWidth > innerWidth + 1
      }
    })()`)
    if (!rehearsalEntry.objectFocus || !rehearsalEntry.closed || !rehearsalEntry.paletteFocus || !rehearsalEntry.menuFocus || !rehearsalEntry.canonical || rehearsalEntry.maxLength !== 12 || !rehearsalEntry.contained || !rehearsalEntry.dockLayout || !rehearsalEntry.collapsed || !rehearsalEntry.noToolbarGrowth || rehearsalEntry.overflow) {
      throw new Error('Canonical rehearsal properties: ' + JSON.stringify({ width, rehearsalEntry }))
    }
    fs.writeFileSync(path.join(app.getPath('temp'), `chromatics-rehearsal-properties-${width}.png`), (await window.webContents.capturePage()).toPNG())
    const textEntries = await window.webContents.executeJavaScript(`(async () => {
      const wait = () => new Promise(resolve => setTimeout(resolve, 100))
      const beforeTop = document.querySelector('.score-canvas').getBoundingClientRect().top
      const results = []
      for (const [label, selector] of [['보표 글자', '.notation-staff-text'], ['시스템 텍스트', '.notation-system-text'], ['표현 텍스트', '.notation-expression-text']]) {
        await window.__qaOpenTextProperties(label)
        let field = document.querySelector('input[aria-label="' + label + '"]')
        const menuFocus = document.activeElement === field
        document.querySelector('button[aria-label="' + label + ' 속성 접기"]').click()
        await wait()
        const closed = !field.getClientRects().length
        document.querySelector('#dock-tab-palette').click()
        await wait()
        document.querySelector('button[aria-label="마디 표기 팔레트 펼치기"]')?.click()
        await wait()
        document.querySelector('button[aria-label="' + label + ' 입력 열기"]').click()
        await wait()
        const paletteFocus = document.activeElement === field
        field.focus()
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(field, label + ' QA')
        field.dispatchEvent(new Event('input', { bubbles: true }))
        field.blur()
        field.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
        await wait()
        const mark = [...document.querySelectorAll(selector)].find(item => item.textContent === label + ' QA')
        if (!mark) throw new Error('Rendered text missing: ' + JSON.stringify({ label, disabled: field.disabled, value: field.value, rendered: [...document.querySelectorAll(selector)].map(item => item.textContent) }))
        mark.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        await wait()
        field = document.querySelector('input[aria-label="' + label + '"]')
        const chooser = document.querySelector('select[aria-label="' + label + ' 객체 선택"]')
        const card = field.closest('[aria-label="텍스트 속성"]')
        const panel = document.querySelector('#dock-panel-properties').getBoundingClientRect()
        results.push({
          label, menuFocus, closed, paletteFocus,
          objectFocus: document.activeElement === field && field.value === label + ' QA' && chooser.value === mark.dataset.objectId,
          canonical: card.querySelectorAll('input').length === 1 && !!field.closest('#dock-panel-properties') && !document.querySelector('[aria-label="선택 요약 ' + label + '"]'),
          maxLength: field.maxLength,
          scope: !!card.querySelector('[aria-label="텍스트 적용 위치"]').textContent,
          contained: [...card.querySelectorAll('input, select')].every(control => {
            const box = control.getBoundingClientRect()
            return box.width > 0 && box.left >= panel.left && box.right <= panel.right + 1
          }),
          collapsed: !!document.querySelector('button[aria-label="작업 도구 펼치기"]'),
          noToolbarGrowth: Math.abs(document.querySelector('.score-canvas').getBoundingClientRect().top - beforeTop) <= 1,
          overflow: document.documentElement.scrollWidth > innerWidth + 1
        })
      }
      return results
    })()`)
    for (const result of textEntries) {
      if (!result.menuFocus || !result.closed || !result.paletteFocus || !result.objectFocus || !result.canonical || result.maxLength !== 80 || !result.scope || !result.contained || !result.collapsed || !result.noToolbarGrowth || result.overflow) {
        throw new Error('Canonical text properties: ' + JSON.stringify({ width, result }))
      }
    }
    fs.writeFileSync(path.join(app.getPath('temp'), `chromatics-text-properties-${width}.png`), (await window.webContents.capturePage()).toPNG())
    const spanEntries = await window.webContents.executeJavaScript(`(async () => {
      const wait = () => new Promise(resolve => setTimeout(resolve, 100))
      const results = []
      const editCount = () => [...document.querySelectorAll('.editor-status span')].find(item => /회 수정$/.test(item.textContent))?.textContent
      const beforeEdits = editCount()
      const beforeTop = document.querySelector('.score-canvas').getBoundingClientRect().top
      for (const kind of ['slur', 'hairpin']) {
        for (const [command, label] of [['마디 설정 열기', '선택 마디부터 조표'], ['코드 심벌 입력', '코드 심벌'], ['연습표 입력', '연습표'], ['셈여림 입력', '셈여림'], ['보표 글자 입력', '보표 글자'], ['시스템 텍스트 입력', '시스템 텍스트'], ['표현 텍스트 입력', '표현 텍스트']]) {
          document.querySelector('.notation-span-target[data-span-kind="' + kind + '"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
          await wait()
          if (!document.querySelector('select[aria-label="표기 시작점"]')) throw new Error('Span was not selected: ' + kind)
          const trigger = [...document.querySelectorAll('[role="menubar"] [role="menuitem"]')].find(item => item.textContent.trim() === '추가')
          trigger.click()
          await wait()
          const entry = [...document.querySelectorAll('[role="menu"] [role="menuitem"]')].find(item => item.textContent.trim() === command)
          entry.click()
          await wait()
          const field = document.querySelector('input[aria-label="' + label + '"], select[aria-label="' + label + '"]')
          results.push({ kind, command,
            focused: document.activeElement === field,
            visible: !!field?.getClientRects().length,
            enabled: !field?.disabled,
            isolated: ['[aria-label="선택 마디 속성"]', '.harmony-properties', '.dynamic-properties', '.rehearsal-properties', '.text-properties', '.lyric-properties']
              .map(selector => document.querySelector(selector)).filter(panel => panel?.getClientRects().length).length === 1 &&
              !document.querySelector('.event-properties'),
            spanDeselected: !document.querySelector('select[aria-label="표기 시작점"]'),
            collapsed: !!document.querySelector('button[aria-label="작업 도구 펼치기"]'),
            sameHistory: !!beforeEdits && editCount() === beforeEdits,
            sameTop: Math.abs(document.querySelector('.score-canvas').getBoundingClientRect().top - beforeTop) <= 1,
            overflow: document.documentElement.scrollWidth > innerWidth + 1
          })
        }
      }
      return results
    })()`)
    if (spanEntries.some(result => !result.focused || !result.visible || !result.enabled || !result.isolated || !result.spanDeselected || !result.collapsed || !result.sameHistory || !result.sameTop || result.overflow)) {
      throw new Error('Explicit property entry from span selection: ' + JSON.stringify({ width, spanEntries }))
    }
    const lyricEntry = await window.webContents.executeJavaScript(`(async () => {
      const wait = () => new Promise(resolve => setTimeout(resolve, 100))
      document.querySelector('.notation-event[data-event-id="m1-d4"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await wait()
      document.querySelector('.notation-span-target[data-span-kind="slur"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await wait()
      const beforeTop = document.querySelector('.score-canvas').getBoundingClientRect().top
      await window.__qaOpenEditingSurface('가사')
      const properties = document.querySelector('[aria-label="가사 속성"]')
      const verse = properties.querySelector('select[aria-label="가사 절"]')
      const firstInput = document.querySelector('.notation-lyric-editor input')
      const inlineFocus = document.activeElement === firstInput
      verse.value = '2'
      verse.dispatchEvent(new Event('change', { bubbles: true }))
      await wait()
      const input = document.querySelector('.notation-lyric-editor input')
      input.focus()
      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Lyric QA')
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true }))
      await wait()
      const compositionHeld = document.querySelector('.notation-event.is-selected')?.dataset.eventId === 'm1-d4' &&
        ![...document.querySelectorAll('.notation-lyric[data-lyric-number="2"]')].some(item => item.textContent === 'Lyric QA')
      input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await wait()
      const movedNext = document.querySelector('.notation-event.is-selected')?.dataset.eventId === 'm1-e4'
      const mark = [...document.querySelectorAll('.notation-lyric[data-lyric-number="2"]')].find(item => item.textContent === 'Lyric QA')
      if (!mark) throw new Error('Edited second-verse lyric missing')
      document.querySelector('button[aria-label="속성 표시"]').click()
      await wait()
      const currentMark = [...document.querySelectorAll('.notation-lyric[data-lyric-number="2"]')].find(item => item.textContent === 'Lyric QA')
      currentMark.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await wait()
      const panel = document.querySelector('#dock-panel-properties').getBoundingClientRect()
      const controls = [...properties.querySelectorAll('select, input')]
      return {
        inlineFocus, movedNext, compositionHeld,
        isolated: document.querySelector('#dock-panel-properties').dataset.propertiesContext === 'lyrics' &&
          !document.querySelector('.event-properties') &&
          !document.querySelector('select[aria-label="표기 시작점"]') &&
          !document.querySelector('[aria-label="코드 심벌 속성"]').getClientRects().length,
        canonical: !!properties.closest('#dock-panel-properties') && !properties.closest('.selection-toolbar') && !properties.querySelector('input[type="text"]'),
        reopened: !!properties.getClientRects().length && verse.value === '2' && document.querySelector('.notation-lyric-editor input')?.value === 'Lyric QA',
        contained: controls.length === 3 && controls.every(control => {
          const box = control.getBoundingClientRect()
          return box.width > 0 && box.left >= panel.left && box.right <= panel.right + 1
        }),
        collapsed: !!document.querySelector('button[aria-label="작업 도구 펼치기"]'),
        sameTop: Math.abs(document.querySelector('.score-canvas').getBoundingClientRect().top - beforeTop) <= 1,
        overflow: document.documentElement.scrollWidth > innerWidth + 1
      }
    })()`)
    if (!lyricEntry.inlineFocus || !lyricEntry.movedNext || !lyricEntry.compositionHeld || !lyricEntry.isolated || !lyricEntry.canonical || !lyricEntry.reopened || !lyricEntry.contained || !lyricEntry.collapsed || !lyricEntry.sameTop || lyricEntry.overflow) {
      throw new Error('Canonical lyric details: ' + JSON.stringify({ width, lyricEntry }))
    }
    fs.writeFileSync(path.join(app.getPath('temp'), `chromatics-lyric-properties-${width}.png`), (await window.webContents.capturePage()).toPNG())
    const contextualSelection = await window.webContents.executeJavaScript(`(async () => {
      const wait = () => new Promise(resolve => setTimeout(resolve, 100))
      const dock = document.querySelector('#dock-panel-properties')
      await window.__qaOpenTextProperties('코드 심벌')
      const chordOnly = dock.dataset.propertiesContext === 'harmony' &&
        !document.querySelector('.notation-lyric-editor') && !document.querySelector('.lyric-properties').getClientRects().length
      const before = document.querySelector('.editor-status').textContent.match(/\\d+회 수정/)?.[0]
      await window.__qaOpenEditingSurface('음표')
      document.querySelector('.notation-event[data-event-id="m1-c4"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await wait()
      const noteOnly = dock.dataset.propertiesContext === 'selection' && !!document.querySelector('.event-properties')?.getClientRects().length &&
        ['.harmony-properties', '.dynamic-properties', '.rehearsal-properties', '.text-properties', '[aria-label="선택 마디 속성"]', '.lyric-properties']
          .every(selector => !document.querySelector(selector).getClientRects().length)
      document.querySelector('.notation-measure[data-measure-id="measure-2"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await wait()
      const measureOnly = dock.dataset.propertiesContext === 'measure' &&
        !!document.querySelector('select[aria-label="선택 마디 박자표"]').getClientRects().length && !document.querySelector('.event-properties')
      return { chordOnly, noteOnly, measureOnly,
        noMutation: document.querySelector('.editor-status').textContent.match(/\\d+회 수정/)?.[0] === before,
        overflow: document.documentElement.scrollWidth > innerWidth + 1 }
    })()`)
    if (!contextualSelection.chordOnly || !contextualSelection.noteOnly || !contextualSelection.measureOnly || !contextualSelection.noMutation || contextualSelection.overflow) {
      throw new Error('Contextual property selection: ' + JSON.stringify({ width, contextualSelection }))
    }
    const dynamicEntry = await window.webContents.executeJavaScript(`(async () => {
      const wait = () => new Promise(resolve => setTimeout(resolve, 100))
      const change = async (field, value) => {
        field.value = value
        field.dispatchEvent(new Event('change', { bubbles: true }))
        await wait()
      }
      document.querySelector('.notation-event[data-event-id="m1-d4"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await wait()
      await window.__qaOpenEditingSurface('표기 객체')
      const search = document.querySelector('input[aria-label="기호 검색"]')
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(search, '셈여림')
      search.dispatchEvent(new Event('input', { bubbles: true }))
      await wait()
      const entry = [...document.querySelectorAll('button')].find(button => button.textContent.trim() === '셈여림 속성 열기')
      if (!entry) throw new Error('Dynamic property entry missing after notation search')
      entry.click()
      await wait()
      const field = document.querySelector('select[aria-label="셈여림"]')
      const sourceFocus = document.activeElement === field
      document.querySelector('button[aria-label="작업 도구 접기"]').click()
      await wait()
      const top = document.querySelector('.score-canvas').getBoundingClientRect().top
      await window.__qaOpenTextProperties('셈여림')
      const menuFocus = document.activeElement === field
      const card = document.querySelector('[aria-label="셈여림 속성"]')
      const chooser = card.querySelector('select[aria-label="셈여림 객체 선택"]')
      const readMarks = () => [...document.querySelectorAll('.notation-dynamic-mark[data-measure-id="measure-1"]')]
        .map(mark => ({ id: mark.dataset.objectId, text: mark.textContent }))
      const before = readMarks()
      await change(chooser, '')
      await change(field, 'ppp')
      const id = chooser.value
      const created = readMarks().some(mark => mark.id === id && mark.text === 'ppp')
      document.querySelector('button[aria-label="속성 표시"]').click()
      await wait()
      document.querySelector('.notation-dynamic-mark[data-object-id="' + id + '"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await wait()
      const directFocus = document.activeElement === field && !!card.getClientRects().length && chooser.value === id && field.value === 'ppp'
      await change(field, 'ff')
      const marks = readMarks()
      const box = card.closest('#dock-panel-properties').getBoundingClientRect()
      return {
        sourceFocus, menuFocus, created, directFocus,
        canonical: document.querySelectorAll('select[aria-label="셈여림"]').length === 1 &&
          !document.querySelector('[aria-label="선택 요약 셈여림"]') && !card.closest('.selection-toolbar'),
        preservedNeighbors: before.length > 0 && marks.length === before.length + 1 &&
          before.every(original => marks.some(mark => mark.id === original.id && mark.text === original.text)) &&
          marks.some(mark => mark.id === id && mark.text === 'ff'),
        scope: card.querySelector('[aria-label="셈여림 적용 범위"]').textContent.includes('1마디'),
        contained: [...card.querySelectorAll('select, output')].every(control => {
          const rect = control.getBoundingClientRect()
          return rect.width > 0 && rect.left >= box.left && rect.right <= box.right + 1
        }),
        collapsed: !!document.querySelector('button[aria-label="작업 도구 펼치기"]'),
        sameTop: Math.abs(document.querySelector('.score-canvas').getBoundingClientRect().top - top) <= 1,
        overflow: document.documentElement.scrollWidth > innerWidth + 1
      }
    })()`)
    if (!dynamicEntry.sourceFocus || !dynamicEntry.menuFocus || !dynamicEntry.created || !dynamicEntry.directFocus || !dynamicEntry.canonical || !dynamicEntry.preservedNeighbors || !dynamicEntry.scope || !dynamicEntry.contained || !dynamicEntry.collapsed || !dynamicEntry.sameTop || dynamicEntry.overflow) {
      throw new Error('Canonical dynamic properties: ' + JSON.stringify({ width, dynamicEntry }))
    }
    fs.writeFileSync(path.join(app.getPath('temp'), `chromatics-dynamic-properties-${width}.png`), (await window.webContents.capturePage()).toPNG())
    results.push({ width, states, screenshot, measureEntry, harmonyEntry, harmonyTarget, rehearsalEntry, textEntries, spanEntries, lyricEntry, contextualSelection, dynamicEntry })
  }
  return results
}

async function verifySharedDesktopDock(window) {
  window.setSize(1400, 900)
  await loadFixture(window, 'release-test', 'preserve')
  await window.webContents.executeJavaScript(`{
    for (const key of ['chromatics.shared-dock.v1', 'chromatics.dock-widths.v1', 'chromatics.dock-visibility.v1', 'chromatics.compact-dock.v1']) localStorage.removeItem(key)
  }`)
  await loadFixture(window, 'release-test', 'preserve')
  const read = () => window.webContents.executeJavaScript(`(() => {
    const workspace = document.querySelector('.docked-workspace')
    const palette = document.querySelector('#dock-panel-palette')
    const properties = document.querySelector('#dock-panel-properties')
    const visible = [palette, properties].filter(panel => panel.getClientRects().length)
    const panel = visible[0]
    const box = panel?.getBoundingClientRect()
    const canvas = document.querySelector('.score-canvas').getBoundingClientRect()
    const tabs = document.querySelector('[aria-label="작업 영역 도크"]')
    const grip = document.querySelector('[aria-label="도크 폭 조절"]')
    return {
      shared: workspace.dataset.shared === 'true', count: visible.length,
      selected: tabs?.querySelector('[aria-selected="true"]')?.textContent.trim(),
      width: box?.width, height: box?.height, canvasHeight: canvas.height,
      adjacent: !!box && Math.abs(box.right - canvas.left) <= 1,
      grip: !!grip?.getClientRects().length,
      contained: !!box && box.bottom <= innerHeight && canvas.right <= innerWidth + 1,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      legacy: localStorage.getItem('chromatics.dock-widths.v1'),
      edits: document.querySelector('.editor-status')?.textContent.match(/\\d+회 수정/)?.[0]
    }
  })()`)
  const initial = await read()
  if (!initial.shared || initial.count !== 1 || initial.selected !== '팔레트' || initial.width !== 236 || !initial.grip) throw new Error('Shared dock default: ' + JSON.stringify(initial))
  await window.webContents.executeJavaScript(`(() => {
    document.querySelector('#dock-tab-properties').click()
    const grip = document.querySelector('[aria-label="도크 폭 조절"]')
    grip.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 9, clientX: 236 }))
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 9, clientX: 296 }))
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 9 }))
  })()`)
  await new Promise(resolve => setTimeout(resolve, 120))
  const resized = await read()
  if (resized.width !== 296 || resized.selected !== '속성' || resized.legacy !== initial.legacy) throw new Error('Shared dock resize: ' + JSON.stringify(resized))
  await loadFixture(window, 'release-test', 'preserve')
  const reopened = await read()
  if (reopened.width !== 296 || reopened.selected !== '속성') throw new Error('Shared dock reopen: ' + JSON.stringify(reopened))
  const captures = []
  for (const width of [960, 1400]) {
    window.setSize(width, 900)
    await new Promise(resolve => setTimeout(resolve, 150))
    const state = await read()
    if (!state.shared || state.count !== 1 || !state.adjacent || !state.contained || state.overflow || state.height < 300 || state.canvasHeight < 300 || state.edits !== '0회 수정' || state.width !== (width === 960 ? 236 : 296) || state.grip !== (width === 1400)) throw new Error('Shared dock geometry: ' + JSON.stringify({ width, state }))
    const screenshot = path.join(app.getPath('temp'), `chromatics-shared-dock-${width}.png`)
    fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG())
    captures.push({ width, state, screenshot })
  }
  const limits = []
  for (const [delta, expected] of [[-1000, 180], [1000, 360]]) {
    await window.webContents.executeJavaScript(`(() => {
      const grip = document.querySelector('[aria-label="도크 폭 조절"]')
      grip.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 11, clientX: 300 }))
      window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 11, clientX: 300 + ${delta} }))
      window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 11 }))
      window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 11, clientX: 500 }))
    })()`)
    await new Promise(resolve => setTimeout(resolve, 100))
    const state = await read()
    const controlsContained = await window.webContents.executeJavaScript(`(() => {
      const panel = document.querySelector('#dock-panel-properties')
      const outer = panel.getBoundingClientRect()
      return [...panel.querySelectorAll('button, input, select')].filter(control => control.getClientRects().length)
        .every(control => { const box = control.getBoundingClientRect(); return box.left >= outer.left && box.right <= outer.right + 1 })
    })()`)
    if (state.width !== expected || !controlsContained || state.overflow) throw new Error('Shared dock limits: ' + JSON.stringify({ expected, state, controlsContained }))
    limits.push({ expected, controlsContained })
  }
  await loadFixture(window, 'release-test')
  const split = await read()
  if (split.shared || split.count !== 2 || split.legacy !== initial.legacy) throw new Error('Split dock compatibility: ' + JSON.stringify(split))
  return { initial, resized, reopened, captures, limits, split }
}

async function verifyKeyboardRouting(window) {
  const initialEventCount = await window.webContents.executeJavaScript(`
    document.querySelectorAll('.notation-event').length
  `)

  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'KeyA',
        key: 'ㅁ'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const selectMode = await window.webContents.executeJavaScript(`
    ({
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith('회 수정'))
        ?.textContent,
      eventCount: document.querySelectorAll('.notation-event').length,
      hasInputCursor: Boolean(
        document.querySelector('.notation-input-cursor')
      ),
      status: document.querySelector('.editor-status span')?.textContent
    })
  `)

  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m8-half-rest"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: 'ArrowRight'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const endCursor = await window.webContents.executeJavaScript(`
    ({
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith('회 수정'))
        ?.textContent,
      hasInputCursor: Boolean(
        document.querySelector('.notation-input-cursor')
      ),
      status: document.querySelector('.editor-status span')?.textContent
    })
  `)

  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'KeyB',
        key: 'ㅠ'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const cursorNoteInput = await window.webContents.executeJavaScript(`
    (async () => {
      const inspectorValues = [
        ...document.querySelectorAll('.inspector dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith('회 수정'))
          ?.textContent,
        eventCount: document.querySelectorAll('.notation-event').length,
        hasInputCursor: Boolean(
          document.querySelector('.notation-input-cursor')
        ),
        status: document.querySelector('.editor-status span')?.textContent,
        type: inspectorValues[0]
      }
    })()
  `)

  await loadFixture(window)
  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m8-half-rest"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: 'ArrowRight'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: 'r'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const cursorRestInput = await window.webContents.executeJavaScript(`
    (() => {
      const inspectorValues = [
        ...document.querySelectorAll('.inspector dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith('회 수정'))
          ?.textContent,
        eventCount: document.querySelectorAll('.notation-event').length,
        hasInputCursor: Boolean(
          document.querySelector('.notation-input-cursor')
        ),
        status: document.querySelector('.editor-status span')?.textContent,
        type: inspectorValues[0]
      }
    })()
  `)

  await loadFixture(window)
  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m8-half-rest"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: 'ArrowRight'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'KeyR',
        key: 'ㄱ'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const koreanCursorRestInput = await window.webContents.executeJavaScript(`
    (() => {
      const inspectorValues = [
        ...document.querySelectorAll('.inspector dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith('회 수정'))
          ?.textContent,
        eventCount: document.querySelectorAll('.notation-event').length,
        hasInputCursor: Boolean(
          document.querySelector('.notation-input-cursor')
        ),
        status: document.querySelector('.editor-status span')?.textContent,
        type: inspectorValues[0]
      }
    })()
  `)

  await window.webContents.executeJavaScript(`
    document.querySelector('input[aria-label="빠르기"]')?.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'KeyC',
        key: 'ㅊ'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))
  await window.webContents.executeJavaScript(`
    document.querySelector('input[aria-label="빠르기"]')?.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: '2'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))
  await window.webContents.executeJavaScript(`
    document.querySelector('input[aria-label="빠르기"]')?.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'KeyR',
        key: 'ㄱ',
        isComposing: true
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))

  const textInputShortcuts = await window.webContents.executeJavaScript(`
    ({
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith('회 수정'))
        ?.textContent,
      pressedDuration: document.querySelector(
        '.duration-strip button[aria-pressed="true"]'
      )?.getAttribute('aria-label')?.split(',')[0]?.trim()
    })
  `)

  await loadFixture(window)
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: 'r'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const restShortcutConvertsSelection = await window.webContents.executeJavaScript(`
    (() => {
      const inspectorValues = [
        ...document.querySelectorAll('.inspector dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith('회 수정'))
          ?.textContent,
        eventCount: document.querySelectorAll('.notation-event').length,
        hasInputCursor: Boolean(
          document.querySelector('.notation-input-cursor')
        ),
        status: document.querySelector('.editor-status span')?.textContent,
        type: inspectorValues[0]
      }
    })()
  `)

  await loadFixture(window)
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'KeyR',
        key: 'ㄱ'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const koreanRestShortcutConvertsSelection = await window.webContents.executeJavaScript(`
    (() => {
      const inspectorValues = [
        ...document.querySelectorAll('.inspector dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith('회 수정'))
          ?.textContent,
        eventCount: document.querySelectorAll('.notation-event').length,
        hasInputCursor: Boolean(
          document.querySelector('.notation-input-cursor')
        ),
        status: document.querySelector('.editor-status span')?.textContent,
        type: inspectorValues[0]
      }
    })()
  `)

  await loadFixture(window)
  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m3-half-rest"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'KeyC',
        key: 'ㅊ'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const restToNote = await window.webContents.executeJavaScript(`
    (() => {
      const inspectorValues = [
        ...document.querySelectorAll('.inspector dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith('회 수정'))
          ?.textContent,
        event: document
          .querySelector('.notation-event.is-selected')
          ?.getAttribute('data-event-id'),
        eventCount: document.querySelectorAll('.notation-event').length,
        hasInputCursor: Boolean(
          document.querySelector('.notation-input-cursor')
        ),
        status: document.querySelector('.editor-status span')?.textContent,
        type: inspectorValues[0]
      }
    })()
  `)

  await loadFixture(window)
  for (const eventId of ['m1-c4', 'm1-d4', 'm1-e4', 'm1-f-sharp-4']) {
    await window.webContents.executeJavaScript(`
      document.querySelector(
        '.notation-event[data-event-id="${eventId}"]'
      )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    `)
    await new Promise((resolve) => setTimeout(resolve, 100))
    await window.webContents.executeJavaScript(`
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          key: 'Backspace'
        })
      )
    `)
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: 'ArrowLeft'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'KeyD',
        key: 'ㅇ'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const fullRestToNote = await window.webContents.executeJavaScript(`
    (() => {
      const inspectorValues = [
        ...document.querySelectorAll('.inspector dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith('회 수정'))
          ?.textContent,
        event: document
          .querySelector('.notation-event.is-selected')
          ?.getAttribute('data-event-id'),
        eventCount: document.querySelectorAll('.notation-event').length,
        hasInputCursor: Boolean(
          document.querySelector('.notation-input-cursor')
        ),
        status: document.querySelector('.editor-status span')?.textContent,
        type: inspectorValues[0]
      }
    })()
  `)

  await loadFixture(window)
  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m3-d5"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: '4'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const durationShortcutChange = await window.webContents.executeJavaScript(`
    ({
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith('회 수정'))
        ?.textContent,
      eventCount: document.querySelectorAll('.notation-event').length,
      pressedDuration: document.querySelector(
        '.duration-strip button[aria-pressed="true"]'
      )?.getAttribute('aria-label')?.split(',')[0]?.trim(),
      statusMessage: [...document.querySelectorAll('.editor-status span')]
        .at(-1)?.textContent
    })
  `)

  await loadFixture(window)
  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m8-half-rest"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: 'ArrowRight'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'Digit2',
        key: '2'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const durationShortcutCursor = await window.webContents.executeJavaScript(`
    ({
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith('회 수정'))
        ?.textContent,
      hasInputCursor: Boolean(
        document.querySelector('.notation-input-cursor')
      ),
      pressedDuration: document.querySelector(
        '.duration-strip button[aria-pressed="true"]'
      )?.getAttribute('aria-label')?.split(',')[0]?.trim(),
      status: document.querySelector('.editor-status span')?.textContent
    })
  `)

  await loadFixture(window)
  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m1-c4"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'Digit2',
        key: '2'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const durationShortcutFailure = await window.webContents.executeJavaScript(`
    ({
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith('회 수정'))
        ?.textContent,
      errorMessage: document.querySelector('.editor-status .is-error')
        ?.textContent,
      eventCount: document.querySelectorAll('.notation-event').length,
      pressedDuration: document.querySelector(
        '.duration-strip button[aria-pressed="true"]'
      )?.getAttribute('aria-label')?.split(',')[0]?.trim()
    })
  `)

  await loadFixture(window)
  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m6-e5"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'Digit3',
        key: '3'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const durationShortcutConsumesRest = await window.webContents.executeJavaScript(`
    (() => {
      const inspectorValues = [
        ...document.querySelectorAll('.inspector dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith('회 수정'))
          ?.textContent,
        eventCount: document.querySelectorAll('.notation-event').length,
        pressedDuration: document.querySelector(
          '.duration-strip button[aria-pressed="true"]'
        )?.getAttribute('aria-label')?.split(',')[0]?.trim(),
        selectedEvent: document
          .querySelector('.notation-event.is-selected')
          ?.getAttribute('data-event-id'),
        status: [...document.querySelectorAll('.editor-status span')]
          .at(-1)?.textContent,
        type: inspectorValues[0]
      }
    })()
  `)

  await loadFixture(window)
  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m5-half-rest"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'Digit3',
        key: '3'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const restDurationShrink = await window.webContents.executeJavaScript(`
    (() => {
      const inspectorValues = [
        ...document.querySelectorAll('.inspector dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith('회 수정'))
          ?.textContent,
        eventCount: document.querySelectorAll('.notation-event').length,
        pressedDuration: document.querySelector(
          '.duration-strip button[aria-pressed="true"]'
        )?.getAttribute('aria-label')?.split(',')[0]?.trim(),
        selectedEvent: document
          .querySelector('.notation-event.is-selected')
          ?.getAttribute('data-event-id'),
        status: [...document.querySelectorAll('.editor-status span')]
          .at(-1)?.textContent,
        type: inspectorValues[0]
      }
    })()
  `)

  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: 'Backspace'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const restDeleteAfterShrink = await window.webContents.executeJavaScript(`
    (() => {
      const inspectorValues = [
        ...document.querySelectorAll('.inspector dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith('회 수정'))
          ?.textContent,
        eventCount: document.querySelectorAll('.notation-event').length,
        selectedEvent: document
          .querySelector('.notation-event.is-selected')
          ?.getAttribute('data-event-id'),
        status: [...document.querySelectorAll('.editor-status span')]
          .at(-1)?.textContent,
        type: inspectorValues[0]
      }
    })()
  `)

  await loadFixture(window)
  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m4-g4"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: 'Backspace'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const noteDeleteAbsorbsPrevious = await window.webContents.executeJavaScript(`
    (() => {
      const inspectorValues = [
        ...document.querySelectorAll('.inspector dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith('회 수정'))
          ?.textContent,
        eventCount: document.querySelectorAll('.notation-event').length,
        selectedEvent: document
          .querySelector('.notation-event.is-selected')
          ?.getAttribute('data-event-id'),
        status: [...document.querySelectorAll('.editor-status span')]
          .at(-1)?.textContent,
        type: inspectorValues[0]
      }
    })()
  `)

  await loadFixture(window)
  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m4-f-natural-1"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))
  await window.webContents.executeJavaScript(`
    document.querySelector('.tuplet-button')?.click()
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const tripletButton = await window.webContents.executeJavaScript(`
    (() => {
      const button = document.querySelector('.tuplet-button')

      return {
        ariaLabel: button?.getAttribute('aria-label'),
        eventCount: document.querySelectorAll('.notation-event').length,
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith('회 수정'))
          ?.textContent,
        hasProgress: Boolean(document.querySelector('.tuplet-progress')),
        title: button?.getAttribute('title'),
        status: [...document.querySelectorAll('.editor-status span')]
          .at(-1)?.textContent,
        tupletCount: document.querySelectorAll('.vf-tuplet').length
      }
    })()
  `)
  await window.webContents.executeJavaScript(`
    document.querySelector('.tuplet-button')?.click()
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const tripletButtonToggleOff = await window.webContents.executeJavaScript(`
    ({
      eventCount: document.querySelectorAll('.notation-event').length,
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith('회 수정'))
        ?.textContent,
      hasProgress: Boolean(document.querySelector('.tuplet-progress')),
      status: [...document.querySelectorAll('.editor-status span')]
        .at(-1)?.textContent,
      tupletCount: document.querySelectorAll('.vf-tuplet').length
    })
  `)

  await loadFixture(window)
  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m8-half-rest"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: 'ArrowRight'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'Digit3',
        ctrlKey: true,
        key: '3'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const tripletShortcutStart = await window.webContents.executeJavaScript(`
    ({
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith('회 수정'))
        ?.textContent,
      progress: document.querySelector('.tuplet-progress')?.textContent,
      status: document.querySelector('.editor-status span')?.textContent,
      tick: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.includes('틱'))
        ?.textContent
    })
  `)

  for (const key of [
    { code: 'KeyC', key: 'c' },
    { key: 'r' }
  ]) {
    await window.webContents.executeJavaScript(`
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          ${key.code ? `code: ${JSON.stringify(key.code)},` : ''}
          key: ${JSON.stringify(key.key)}
        })
      )
    `)
    await new Promise((resolve) => setTimeout(resolve, 150))
  }

  const tripletShortcutPreview = await window.webContents.executeJavaScript(`
    ({
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith('회 수정'))
        ?.textContent,
      previewEventCount: document.querySelectorAll(
        '.notation-event.is-preview'
      ).length,
      progress: document.querySelector('.tuplet-progress')?.textContent,
      status: [...document.querySelectorAll('.editor-status span')]
        .at(-1)?.textContent
    })
  `)

  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'KeyE',
        key: 'e'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const tripletShortcutComplete = await window.webContents.executeJavaScript(`
    (() => {
      const inspectorValues = [
        ...document.querySelectorAll('.inspector dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith('회 수정'))
          ?.textContent,
        eventCount: document.querySelectorAll('.notation-event').length,
        hasProgress: Boolean(document.querySelector('.tuplet-progress')),
        selectedEvent: document
          .querySelector('.notation-event.is-selected')
          ?.getAttribute('data-event-id'),
        status: [...document.querySelectorAll('.editor-status span')]
          .at(-1)?.textContent,
        tupletCount: document.querySelectorAll('.vf-tuplet').length
      }
    })()
  `)

  await loadFixture(window)
  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m4-g4"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'Digit3',
        ctrlKey: true,
        key: '3'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const tripletAvailableSpan = await window.webContents.executeJavaScript(`
    ({
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith('회 수정'))
        ?.textContent,
      eventCount: document.querySelectorAll('.notation-event').length,
      hasProgress: Boolean(document.querySelector('.tuplet-progress')),
      status: [...document.querySelectorAll('.editor-status span')]
        .at(-1)?.textContent,
      tupletCount: document.querySelectorAll('.vf-tuplet').length
    })
  `)
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'Digit3',
        ctrlKey: true,
        key: '3'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const tripletAvailableSpanToggleOff = await window.webContents.executeJavaScript(`
    ({
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith('회 수정'))
        ?.textContent,
      eventCount: document.querySelectorAll('.notation-event').length,
      hasProgress: Boolean(document.querySelector('.tuplet-progress')),
      status: [...document.querySelectorAll('.editor-status span')]
        .at(-1)?.textContent,
      tupletCount: document.querySelectorAll('.vf-tuplet').length
    })
  `)

  await loadFixture(window)
  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m7-dotted-half-rest"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: 't'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const tripletDottedRestStart = await window.webContents.executeJavaScript(`
    ({
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith('회 수정'))
        ?.textContent,
      pressedDuration: document.querySelector(
        '.duration-strip button[aria-pressed="true"]'
      )?.getAttribute('aria-label')?.split(',')[0]?.trim(),
      progress: document.querySelector('.tuplet-progress')?.textContent,
      status: document.querySelector('.editor-status span')?.textContent
    })
  `)

  await loadFixture(window)
  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m7-triplet-c5"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: 'Backspace'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const tripletBackspaceClear = await window.webContents.executeJavaScript(`
    (() => {
      const inspectorValues = [
        ...document.querySelectorAll('.inspector dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith('회 수정'))
          ?.textContent,
        selectedEvent: document
          .querySelector('.notation-event.is-selected')
          ?.getAttribute('data-event-id'),
        status: [...document.querySelectorAll('.editor-status span')]
          .at(-1)?.textContent,
        tupletCount: document.querySelectorAll('.vf-tuplet').length,
        type: inspectorValues[0]
      }
    })()
  `)

  await loadFixture(window)
  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m1-c4"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))

  for (let count = 0; count < 2; count += 1) {
    await window.webContents.executeJavaScript(`
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          key: 'ArrowRight',
          shiftKey: true
        })
      )
    `)
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  const rangeSelection = await window.webContents.executeJavaScript(`
    (() => {
      const inspectorValues = [
        ...document.querySelectorAll('.inspector dd')
      ].map((value) => value.textContent?.trim())

      return {
        eventCount: document.querySelectorAll('.notation-event').length,
        selectedCount: document.querySelectorAll(
          '.notation-event.is-selected'
        ).length
      }
    })()
  `)

  if (
    selectMode.eventCount !== initialEventCount ||
    selectMode.hasInputCursor ||
    selectMode.editCount !== '1회 수정' ||
    selectMode.status !== '4분음표' ||
    endCursor.hasInputCursor ||
    endCursor.editCount !== '2회 수정' ||
    endCursor.status !== '온음표' ||
    cursorNoteInput.hasInputCursor ||
    cursorNoteInput.editCount !== '3회 수정' ||
    cursorNoteInput.eventCount !== initialEventCount + 1 ||
    cursorNoteInput.status !== '온음표' ||
    cursorRestInput.hasInputCursor ||
    cursorRestInput.editCount !== '1회 수정' ||
    cursorRestInput.eventCount !== initialEventCount + 1 ||
    cursorRestInput.status !== '온음표' ||
    koreanCursorRestInput.hasInputCursor ||
    koreanCursorRestInput.editCount !== '1회 수정' ||
    koreanCursorRestInput.eventCount !== initialEventCount + 1 ||
    koreanCursorRestInput.status !== '온음표' ||
    textInputShortcuts.editCount !== cursorRestInput.editCount ||
    textInputShortcuts.pressedDuration !== '온음표' ||
    restShortcutConvertsSelection.eventCount !== initialEventCount ||
    restShortcutConvertsSelection.editCount !== '1회 수정' ||
    restShortcutConvertsSelection.hasInputCursor ||
    restShortcutConvertsSelection.status !== '4분음표' ||
    koreanRestShortcutConvertsSelection.eventCount !== initialEventCount ||
    koreanRestShortcutConvertsSelection.editCount !== '1회 수정' ||
    koreanRestShortcutConvertsSelection.hasInputCursor ||
    koreanRestShortcutConvertsSelection.status !== '4분음표' ||
    restToNote.eventCount !== initialEventCount ||
    restToNote.hasInputCursor ||
    restToNote.editCount !== '1회 수정' ||
    restToNote.status !== '2분음표' ||
    restToNote.event !== 'm3-half-rest' ||
    fullRestToNote.hasInputCursor ||
    fullRestToNote.status !== '온음표' ||
    fullRestToNote.event === 'm2-1' ||
    durationShortcutChange.editCount !== '1회 수정' ||
    durationShortcutChange.eventCount !== initialEventCount + 2 ||
    durationShortcutChange.pressedDuration !== '8분음표' ||
    durationShortcutChange.statusMessage !== '음가를 8분음표로 바꿨습니다.' ||
    durationShortcutCursor.editCount !== '2회 수정' ||
    durationShortcutCursor.hasInputCursor ||
    durationShortcutCursor.pressedDuration !== '2분음표' ||
    durationShortcutCursor.status !== '2분음표' ||
    durationShortcutFailure.editCount !== '0회 수정' ||
    durationShortcutFailure.eventCount !== initialEventCount ||
    durationShortcutFailure.pressedDuration !== '4분음표' ||
    durationShortcutFailure.errorMessage !==
      '음표 m1-d4 때문에 음가를 늘릴 수 없습니다.' ||
    durationShortcutConsumesRest.editCount !== '1회 수정' ||
    durationShortcutConsumesRest.eventCount !== initialEventCount ||
    durationShortcutConsumesRest.pressedDuration !== '4분음표' ||
    durationShortcutConsumesRest.selectedEvent !== 'm6-e5' ||
    durationShortcutConsumesRest.status !==
      '음가를 4분음표로 바꾸고 뒤의 쉼표를 사용했습니다.' ||
    restDurationShrink.editCount !== '1회 수정' ||
    restDurationShrink.eventCount !== initialEventCount + 1 ||
    restDurationShrink.pressedDuration !== '4분음표' ||
    restDurationShrink.selectedEvent !== 'm5-half-rest' ||
    restDurationShrink.status !== '쉼표 음가를 4분음표로 바꿨습니다.' ||
    restDeleteAfterShrink.editCount !== '2회 수정' ||
    ![initialEventCount, initialEventCount + 1].includes(
      restDeleteAfterShrink.eventCount
    ) ||
    restDeleteAfterShrink.selectedEvent !== 'm5-g4' ||
    restDeleteAfterShrink.status !== '쉼표를 지웠습니다.' ||
    noteDeleteAbsorbsPrevious.editCount !== '1회 수정' ||
    noteDeleteAbsorbsPrevious.eventCount !== initialEventCount ||
    noteDeleteAbsorbsPrevious.selectedEvent !== 'm4-a4' ||
    noteDeleteAbsorbsPrevious.status !== '음표를 지웠습니다.' ||
    tripletButton.ariaLabel !== '셋잇단음표 적용 또는 입력 준비' ||
    tripletButton.title !== '셋잇단음표 적용 또는 입력 준비 — 단축키 ⌘/Ctrl+3' ||
    tripletButton.editCount !== '1회 수정' ||
    tripletButton.eventCount !== initialEventCount + 1 ||
    tripletButton.hasProgress ||
    tripletButton.tupletCount !== 2 ||
    tripletButton.status !== '선택한 구간에 셋잇단음표를 적용했습니다.' ||
    tripletButtonToggleOff.editCount !== '2회 수정' ||
    tripletButtonToggleOff.eventCount !== initialEventCount ||
    tripletButtonToggleOff.hasProgress ||
    tripletButtonToggleOff.tupletCount !== 1 ||
    tripletButtonToggleOff.status !== '선택한 셋잇단음표를 해제했습니다.' ||
    tripletShortcutStart.editCount !== '1회 수정' ||
    !tripletShortcutStart.status?.startsWith('셋잇단음표 입력') ||
    tripletShortcutStart.progress !== '셋잇단음표 0/3' ||
    !tripletShortcutStart.tick?.startsWith('M9 · ') ||
    tripletShortcutPreview.previewEventCount < 3 ||
    tripletShortcutPreview.progress !== '셋잇단음표 2/3' ||
    tripletShortcutPreview.status !== '셋잇단음표 2/3개 입력됨. 1개 더 입력해 주세요.' ||
    tripletShortcutComplete.editCount !== '2회 수정' ||
    tripletShortcutComplete.eventCount !== initialEventCount + 5 ||
    tripletShortcutComplete.hasProgress ||
    tripletShortcutComplete.tupletCount !== 2 ||
    tripletShortcutComplete.status !== '셋잇단음표 입력을 완료했습니다.' ||
    tripletAvailableSpan.editCount !== '1회 수정' ||
    tripletAvailableSpan.eventCount !== initialEventCount + 1 ||
    tripletAvailableSpan.hasProgress ||
    tripletAvailableSpan.status !== '선택한 구간에 셋잇단음표를 적용했습니다.' ||
    tripletAvailableSpan.tupletCount !== 2 ||
    tripletAvailableSpanToggleOff.editCount !== '2회 수정' ||
    tripletAvailableSpanToggleOff.eventCount !== initialEventCount ||
    tripletAvailableSpanToggleOff.hasProgress ||
    tripletAvailableSpanToggleOff.status !==
      '선택한 셋잇단음표를 해제했습니다.' ||
    tripletAvailableSpanToggleOff.tupletCount !== 1 ||
    tripletDottedRestStart.editCount !== '0회 수정' ||
    tripletDottedRestStart.progress ||
    tripletDottedRestStart.status !== '2분음표' ||
    tripletBackspaceClear.editCount !== '0회 수정' ||
    tripletBackspaceClear.selectedEvent !== 'm7-triplet-c5' ||
    tripletBackspaceClear.status !==
      '잇단음표 구성음은 아직 따로 지울 수 없습니다.' ||
    tripletBackspaceClear.tupletCount !== 1 ||
    rangeSelection.eventCount !== initialEventCount ||
    rangeSelection.selectedCount !== 3
  ) {
    throw new Error(
      `Keyboard routing verification failed: ${JSON.stringify({
        durationShortcutChange,
        durationShortcutConsumesRest,
        durationShortcutCursor,
        durationShortcutFailure,
        initialEventCount,
        koreanCursorRestInput,
        koreanRestShortcutConvertsSelection,
        noteDeleteAbsorbsPrevious,
        restDeleteAfterShrink,
        restDurationShrink,
        selectMode,
        cursorNoteInput,
        cursorRestInput,
        endCursor,
        fullRestToNote,
        restShortcutConvertsSelection,
        restToNote,
        textInputShortcuts,
        tripletButton,
        tripletButtonToggleOff,
        tripletAvailableSpan,
        tripletAvailableSpanToggleOff,
        tripletDottedRestStart,
        tripletBackspaceClear,
        rangeSelection,
        tripletShortcutComplete,
        tripletShortcutPreview,
        tripletShortcutStart
      })}`
    )
  }

  return {
    selectMode,
    cursorNoteInput,
    cursorRestInput,
    endCursor,
    durationShortcutChange,
    durationShortcutConsumesRest,
    durationShortcutCursor,
    durationShortcutFailure,
    fullRestToNote,
    koreanCursorRestInput,
    koreanRestShortcutConvertsSelection,
    noteDeleteAbsorbsPrevious,
    restDeleteAfterShrink,
    restDurationShrink,
    restShortcutConvertsSelection,
    restToNote,
    textInputShortcuts,
    tripletButton,
    tripletButtonToggleOff,
    tripletAvailableSpan,
    tripletAvailableSpanToggleOff,
    tripletDottedRestStart,
    tripletBackspaceClear,
    rangeSelection,
    tripletShortcutComplete,
    tripletShortcutPreview,
    tripletShortcutStart
  }
}

async function verifyOutOfStaffNotes(window) {
  const cases = [
    {
      buttonLabel: '한 옥타브 올리기',
      clicks: 3,
      eventId: 'm2-7',
      name: 'high'
    },
    {
      buttonLabel: '한 옥타브 내리기',
      clicks: 4,
      eventId: 'm2-7',
      name: 'low'
    }
  ]
  const results = []

  for (const testCase of cases) {
    await loadFixture(window)
    await window.webContents.executeJavaScript(`
      document.querySelector(
        '.notation-event[data-event-id="${testCase.eventId}"]'
      )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    `)

    for (let click = 0; click < testCase.clicks; click += 1) {
      await window.webContents.executeJavaScript(`
        document.querySelector(
          'button[aria-label="${testCase.buttonLabel}"]'
        )?.click()
      `)
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    const result = await window.webContents.executeJavaScript(`
      (() => {
        const svg = document.querySelector('.notation-preview svg')
        const event = document.querySelector(
          '.notation-event[data-event-id="${testCase.eventId}"]'
        )
        const eventBox = event?.getBBox()
        const svgWidth = Number(svg?.getAttribute('width'))
        const svgHeight = Number(svg?.getAttribute('height'))

        return {
          eventBox: eventBox
            ? {
                x: eventBox.x,
                y: eventBox.y,
                width: eventBox.width,
                height: eventBox.height
              }
            : undefined,
          svgHeight,
          svgWidth
        }
      })()
    `)
    const image = await window.webContents.capturePage()
    fs.writeFileSync(
      path.join(
        app.getPath('temp'),
        `in-c-mvp-out-of-staff-${testCase.name}.png`
      ),
      image.toPNG()
    )
    const box = result.eventBox
    const isInside =
      box &&
      box.x >= 0 &&
      box.y >= 0 &&
      box.x + box.width <= result.svgWidth &&
      box.y + box.height <= result.svgHeight

    if (!isInside) {
      throw new Error(
        `Out-of-staff ${testCase.name} note verification failed: ${JSON.stringify(result)}`
      )
    }

    results.push({
      name: testCase.name,
      ...result
    })
  }

  return results
}

async function verifyReleaseScenarioBounds(window) {
  await loadFixture(window, 'release-test')

  const desktop = await readReleaseScenarioBounds(window, 1400)
  const minimum = await readReleaseScenarioBounds(window, 1100)
  const compact = await readReleaseScenarioBounds(window, 960)
  const result = {
    compact,
    desktop,
    minimum
  }

  for (const metrics of [desktop, minimum, compact]) {
    if (
      !metrics.hasFermata ||
      !metrics.hasTempo ||
      metrics.clippedElements.length > 0 ||
      metrics.dynamicMeasureStartOverlap.length > 0 ||
      metrics.systemRightOverflow.length > 0 ||
      metrics.horizontalViewportOverflow.length > 0
    ) {
      throw new Error(
        `Release scenario bounds verification failed: ${JSON.stringify(result)}`
      )
    }
  }

  return result
}

async function readReleaseScenarioBounds(window, width) {
  window.setSize(width, 1000)
  await new Promise((resolve) => setTimeout(resolve, 600))

  return window.webContents.executeJavaScript(`
    (() => {
      const svg = document.querySelector('.notation-preview svg')
      const svgBox = svg?.getBoundingClientRect()
      const clippedSelectors = [
        '.notation-measure',
        '.notation-fermata',
        '.notation-articulation',
        '.notation-dynamic-mark',
        '.notation-tempo-marking',
        '.notation-input-cursor',
        '.notation-slur'
      ]
      const horizontalSelectors = [
        '.notation-event',
        ...clippedSelectors
      ]
      const tolerance = 0.75
      const clippedCandidates = clippedSelectors.flatMap((selector) =>
        [...document.querySelectorAll(selector)].map((element, index) => ({
          element,
          id:
            element.getAttribute('data-event-id') ??
            element.getAttribute('data-measure-id') ??
            element.textContent?.trim() ??
            selector,
          index,
          selector
        }))
      )
      const horizontalCandidates = horizontalSelectors.flatMap((selector) =>
        [...document.querySelectorAll(selector)].map((element, index) => ({
          element,
          id:
            element.getAttribute('data-event-id') ??
            element.getAttribute('data-measure-id') ??
            element.textContent?.trim() ??
            selector,
          index,
          selector
        }))
      )
      const clippedElements = !svgBox
        ? [{ selector: 'svg', id: 'missing', index: 0 }]
        : clippedCandidates
            .map(({ element, id, index, selector }) => {
              const box = element.getBoundingClientRect()
              const clipped =
                box.left < svgBox.left - tolerance ||
                box.top < svgBox.top - tolerance ||
                box.right > svgBox.right + tolerance ||
                box.bottom > svgBox.bottom + tolerance

              return clipped
                ? {
                    selector,
                    id,
                    index,
                    box: {
                      bottom: box.bottom,
                      left: box.left,
                      right: box.right,
                      top: box.top
                    },
                    svgBox: {
                      bottom: svgBox.bottom,
                      left: svgBox.left,
                      right: svgBox.right,
                      top: svgBox.top
                    }
                  }
                : undefined
            })
            .filter(Boolean)
      const measures = [...document.querySelectorAll('.notation-measure')]
      const svgWidth = Number(svg?.getAttribute('width'))
      const systemRightOverflow = [
        ...new Set(measures.map((measure) => measure.getAttribute('data-system-index')))
      ]
        .map((systemIndex) => {
          const systemMeasures = measures.filter(
            (measure) => measure.getAttribute('data-system-index') === systemIndex
          )
          const last = systemMeasures.at(-1)
          const rightEdge =
            Number(last?.getAttribute('x')) + Number(last?.getAttribute('width'))
          return {
            rightEdge,
            systemIndex
          }
        })
        .filter(({ rightEdge }) => rightEdge > svgWidth - 7.5)
      const horizontalViewportOverflow = horizontalCandidates
        .map(({ element, id, index, selector }) => {
          const box = element.getBoundingClientRect()
          const overflow =
            box.left < -tolerance ||
            box.right > window.innerWidth + tolerance

          return overflow
            ? {
                selector,
                id,
                index,
                box: {
                  bottom: box.bottom,
                  left: box.left,
                  right: box.right,
                  top: box.top
                }
              }
            : undefined
        })
        .filter(Boolean)
      const dynamicMeasureStartOverlap = [
        ...document.querySelectorAll('.notation-dynamic-mark')
      ]
        .map((dynamic) => {
          const measureId = dynamic.getAttribute('data-measure-id')
          const measure = measureId
            ? document.querySelector(
                \`.notation-measure[data-measure-id="\${measureId}"]\`
              )
            : undefined
          const x = Number(dynamic.getAttribute('x'))
          const measureX = Number(measure?.getAttribute('x'))
          const overlapsStartArea =
            Number.isFinite(x) &&
            Number.isFinite(measureX) &&
            x < measureX + 72

          return overlapsStartArea
            ? {
                measureId,
                measureX,
                x
              }
            : undefined
        })
        .filter(Boolean)

      return {
        clippedElements,
        dynamicMeasureStartOverlap,
        hasFermata: Boolean(document.querySelector('.notation-fermata')),
        hasTempo: Boolean(document.querySelector('.notation-tempo-marking')),
        svgHeight: Number(svg?.getAttribute('height')),
        svgWidth,
        systemRightOverflow,
        horizontalViewportOverflow,
        width: window.innerWidth
      }
    })()
  `)
}

async function verifyBeamRendering(window) {
  await loadFixture(window)

  const before = await readBeamMetrics(window)

  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m2-7"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const after = await readBeamMetrics(window)
  const maxSlope = Math.max(
    ...before.beamFaces.map((beam) => Math.abs(beam.slope)),
    ...after.beamFaces.map((beam) => Math.abs(beam.slope))
  )
  const result = {
    after,
    before,
    maxSlope
  }

  if (
    before.beamFaces.length < 4 ||
    after.beamFaces.length !== before.beamFaces.length ||
    maxSlope > 0.13 ||
    JSON.stringify(after.signatures) !== JSON.stringify(before.signatures)
  ) {
    throw new Error(`Beam rendering verification failed: ${JSON.stringify(result)}`)
  }

  return result
}

async function verifyTieEditing(window) {
  await loadFixture(window)

  const before = await readTieMetrics(window)

  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m4-f-natural-1"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'KeyT',
        key: 'ㅅ'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 200))

  const added = await readTieMetrics(window)

  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m4-f-natural-2"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'KeyT',
        key: 'ㅅ'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 200))

  const removed = await readTieMetrics(window)
  const result = {
    added,
    before,
    removed
  }

  if (
    added.tieCount !== before.tieCount + 1 ||
    added.status !== '타이를 추가했습니다.' ||
    removed.tieCount !== before.tieCount ||
    removed.status !== '타이를 해제했습니다.'
  ) {
    throw new Error(`Tie editing verification failed: ${JSON.stringify(result)}`)
  }

  return result
}

async function readTieMetrics(window) {
  return window.webContents.executeJavaScript(`
    (() => ({
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith('회 수정'))
        ?.textContent,
      status: [...document.querySelectorAll('.editor-status span')]
        .map((span) => span.textContent?.trim())
        .find((text) => text === '타이를 추가했습니다.' || text === '타이를 해제했습니다.'),
      tieCount: document.querySelectorAll('.vf-stavetie').length
    }))()
  `)
}

async function readBeamMetrics(window) {
  return window.webContents.executeJavaScript(`
    (() => {
      const beamFaces = [...document.querySelectorAll('.vf-beam path')]
        .map((path) => {
          const box = path.getBBox()

          if (box.width < 8 || box.height > 24) {
            return undefined
          }

          const d = path.getAttribute('d') ?? ''
          const values = [...d.matchAll(/-?\\d+(?:\\.\\d+)?/g)]
            .map((match) => Number(match[0]))

          if (values.length < 4) {
            return undefined
          }

          const points = []

          for (let index = 0; index < values.length - 1; index += 2) {
            points.push({
              x: values[index],
              y: values[index + 1]
            })
          }

          const minX = Math.min(...points.map((point) => point.x))
          const maxX = Math.max(...points.map((point) => point.x))
          const leftY = average(
            points
              .filter((point) => point.x === minX)
              .map((point) => point.y)
          )
          const rightY = average(
            points
              .filter((point) => point.x === maxX)
              .map((point) => point.y)
          )
          const width = maxX - minX
          const slope = width === 0 ? 0 : (rightY - leftY) / width

          return {
            box: {
              height: box.height,
              width: box.width,
              x: box.x,
              y: box.y
            },
            d,
            slope
          }
        })
        .filter(Boolean)

      return {
        beamFaces,
        signatures: beamFaces.map((beam) => beam.d)
      }

      function average(values) {
        return values.reduce((sum, value) => sum + value, 0) / values.length
      }
    })()
  `)
}

async function verifyMetadataEditing(window) {
  await loadFixture(window)

  await editMetadataField(window, 'title', '새 악보 제목', 'Enter')
  await editMetadataField(window, 'composer', '김작곡', 'Enter')

  const edited = await window.webContents.executeJavaScript(`
    ({
      composer: document.querySelector(
        'button[aria-label="작곡가 수정"]'
      )?.textContent?.trim(),
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith('회 수정'))
        ?.textContent,
      title: document.querySelector(
        'button[aria-label="악보 제목 수정"]'
      )?.textContent?.trim()
    })
  `)

  await window.webContents.executeJavaScript(`
    document.querySelector('button[aria-label="실행 취소"]')?.click()
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const undoneComposer = await window.webContents.executeJavaScript(`
    ({
      composer: document.querySelector(
        'button[aria-label="작곡가 수정"]'
      )?.textContent?.trim(),
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith('회 수정'))
        ?.textContent,
      title: document.querySelector(
        'button[aria-label="악보 제목 수정"]'
      )?.textContent?.trim()
    })
  `)

  await window.webContents.executeJavaScript(`
    document.querySelector('button[aria-label="다시 실행"]')?.click()
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const redoneComposer = await window.webContents.executeJavaScript(`
    ({
      composer: document.querySelector(
        'button[aria-label="작곡가 수정"]'
      )?.textContent?.trim(),
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith('회 수정'))
        ?.textContent,
      title: document.querySelector(
        'button[aria-label="악보 제목 수정"]'
      )?.textContent?.trim()
    })
  `)

  await editMetadataField(window, 'title', '취소할 제목', 'Escape')

  const cancelled = await window.webContents.executeJavaScript(`
    ({
      title: document.querySelector(
        'button[aria-label="악보 제목 수정"]'
      )?.textContent?.trim()
    })
  `)

  await openMetadataField(window, 'composer')
  await window.webContents.executeJavaScript(`
    window.setInputValue(
      document.querySelector('input[aria-label="작곡가"]'),
      '입력 중'
    )
    document
      .querySelector('input[aria-label="작곡가"]')
      .dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        code: 'KeyA',
        key: 'ㅁ'
      })
    )
    document
      .querySelector('input[aria-label="작곡가"]')
      .dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: '2'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const textInputProtection = await window.webContents.executeJavaScript(`
    ({
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith('회 수정'))
        ?.textContent,
      inputOpen: Boolean(
        document.querySelector('input[aria-label="작곡가"]')
      ),
      pressedDuration: document.querySelector(
        '.duration-strip button[aria-pressed="true"]'
      )?.getAttribute('aria-label')?.split(',')[0]?.trim()
    })
  `)

  const result = {
    cancelled,
    edited,
    redoneComposer,
    textInputProtection,
    undoneComposer
  }

  if (
    edited.title !== '새 악보 제목' ||
    edited.composer !== '김작곡' ||
    edited.editCount !== '2회 수정' ||
    undoneComposer.title !== '새 악보 제목' ||
    undoneComposer.composer !== 'in-C' ||
    undoneComposer.editCount !== '1회 수정' ||
    redoneComposer.title !== '새 악보 제목' ||
    redoneComposer.composer !== '김작곡' ||
    redoneComposer.editCount !== '2회 수정' ||
    cancelled.title !== '새 악보 제목' ||
    !textInputProtection.inputOpen ||
    textInputProtection.editCount !== '2회 수정' ||
    textInputProtection.pressedDuration !== '4분음표'
  ) {
    throw new Error(
      `Metadata editing verification failed: ${JSON.stringify(result)}`
    )
  }

  return result
}

async function verifyFileActions(window) {
  await loadFixture(window)

  const result = await window.webContents.executeJavaScript(`
    (async () => {
      const readButtons = (selector) => [
        ...document.querySelectorAll(selector)
      ].map((button) => ({
        ariaLabel: button.getAttribute('aria-label'),
        label: button.querySelector('span')?.textContent?.trim()
      }))
      const fileQuickAction = [...document.querySelectorAll('.toolbar-tabs button')]
        .find((button) => button.getAttribute('aria-label') === '파일')
      fileQuickAction?.click()
      await new Promise((resolve) => setTimeout(resolve, 50))
      const fileButtons = readButtons('.file-actions button')
      const selectionFilter = document.querySelector('.selection-filter-control select')

      const exportTab = [...document.querySelectorAll('.toolbar-tabs button')]
        .find((button) => button.getAttribute('aria-label') === '내보내기')
      exportTab?.click()
      await new Promise((resolve) => setTimeout(resolve, 50))
      const exportButtons = readButtons('.export-actions button')

      return {
        fileAriaLabel: document
          .querySelector('.file-actions')
          ?.getAttribute('aria-label'),
        exportAriaLabel: document
          .querySelector('.export-actions')
          ?.getAttribute('aria-label'),
        fileQuickExpanded: fileQuickAction?.getAttribute('aria-expanded'),
        exportQuickExpanded: exportTab?.getAttribute('aria-expanded'),
        fileButtons,
        exportButtons,
        fileLabels: fileButtons.map((button) => button.label),
        exportLabels: exportButtons.map((button) => button.label),
        selectionFilter: selectionFilter
          ? {
              ariaLabel: selectionFilter.getAttribute('aria-label'),
              value: selectionFilter.value,
              options: [...selectionFilter.querySelectorAll('option')].map(
                (option) => option.textContent.trim()
              )
            }
          : null
      }
    })()
  `)
  const fileButtonLabels = result.fileButtons.map((button) => button.label)
  const fileButtonAriaLabels = result.fileButtons.map((button) => button.ariaLabel)
  const exportButtonLabels = result.exportButtons.map((button) => button.label)
  const exportButtonAriaLabels = result.exportButtons.map((button) => button.ariaLabel)

  if (
    result.fileAriaLabel !== '파일 작업' ||
    result.exportAriaLabel !== '내보내기 작업' ||
    result.fileQuickExpanded !== 'false' ||
    result.exportQuickExpanded !== 'true' ||
    fileButtonLabels.includes('Export') ||
    fileButtonLabels.includes('저장하기') ||
    fileButtonLabels.includes('PDF 변환') ||
    fileButtonLabels.includes('MIDI') ||
    !fileButtonLabels.includes('새 악보') ||
    !fileButtonLabels.includes('MusicXML 가져오기') ||
    !fileButtonLabels.includes('저장') ||
    !fileButtonAriaLabels.includes('새 악보 만들기') ||
    !fileButtonAriaLabels.includes('MusicXML 가져오기') ||
    !fileButtonAriaLabels.includes('MusicXML로 저장') ||
    !result.selectionFilter ||
    result.selectionFilter.ariaLabel !== '선택 필터' ||
    result.selectionFilter.value !== 'notes-and-rests' ||
    result.selectionFilter.options.join('|') !== '전체|음표만|쉼표만' ||
    !exportButtonLabels.includes('PDF 변환') ||
    !exportButtonLabels.includes('MIDI') ||
    !exportButtonAriaLabels.includes('PDF 변환') ||
    !exportButtonAriaLabels.includes('MIDI 내보내기')
  ) {
    throw new Error(`파일 작업 verification failed: ${JSON.stringify(result)}`)
  }

  return result
}

async function verifyCompactToolbarModes(window) {
  await loadFixture(window, 'release-test')
  window.setSize(960, 1000)
  await new Promise((resolve) => setTimeout(resolve, 600))

  const result = await window.webContents.executeJavaScript(`
    (async () => {
      const wait = () => new Promise((resolve) => setTimeout(resolve, 80))
      const modeLabels = [
        '악보',
        '음표',
        '표기 객체',
        '가사'
      ]
      const readVisibleText = (selector) =>
        [...document.querySelectorAll(selector)]
          .filter((element) => {
            const style = window.getComputedStyle(element)
            const box = element.getBoundingClientRect()
            return (
              style.display !== 'none' &&
              style.visibility !== 'hidden' &&
              box.width > 0 &&
              box.height > 0
            )
          })
          .map((element) => ({
            ariaLabel: element.getAttribute('aria-label'),
            className:
              typeof element.className === 'string'
                ? element.className
                : element.getAttribute('class'),
            text: element.textContent.trim()
          }))
      const readVisibleAriaLabels = () =>
        [
          ...document.querySelectorAll(
            'button, input, select, textarea, output, div[aria-label], section[aria-label], nav[aria-label], header[aria-label]'
          )
        ]
          .filter((element) => {
            const style = window.getComputedStyle(element)
            const box = element.getBoundingClientRect()
            return (
              style.display !== 'none' &&
              style.visibility !== 'hidden' &&
              box.width > 0 &&
              box.height > 0
            )
          })
          .map((element) => element.getAttribute('aria-label'))
          .filter(Boolean)
      const readOverflow = () => {
        const toolbar = document.querySelector('.toolbar')
        const tabs = document.querySelector('.toolbar-tabs')
        const context = document.querySelector('.workspace-tools')
        const visibleControls = [
          ...document.querySelectorAll(
            '.toolbar button, .toolbar select, .toolbar input, .toolbar output, .toolbar label'
          )
        ].filter((element) => {
          const style = window.getComputedStyle(element)
          const box = element.getBoundingClientRect()
          return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            box.width > 0 &&
            box.height > 0
          )
        })
        const textOverflow = visibleControls
          .map((element) => {
            const box = element.getBoundingClientRect()
            return {
              ariaLabel: element.getAttribute('aria-label'),
              className:
                typeof element.className === 'string'
                  ? element.className
                  : element.getAttribute('class'),
              tagName: element.tagName,
              text: element.textContent.trim(),
              clientWidth: element.clientWidth,
              scrollWidth: element.scrollWidth,
              box: {
                left: box.left,
                right: box.right,
                width: box.width
              }
            }
          })
          .filter(
            (entry) =>
              entry.text &&
              entry.scrollWidth > entry.clientWidth + 1 &&
              entry.box.width > 0
          )

        return {
          documentOverflow:
            document.documentElement.scrollWidth > window.innerWidth + 1,
          toolbarOverflow:
            toolbar ? toolbar.scrollWidth > toolbar.clientWidth + 1 : false,
          tabsOverflow:
            tabs ? tabs.scrollWidth > tabs.clientWidth + 1 : false,
          contextOverflow:
            context ? context.scrollWidth > context.clientWidth + 1 : false,
          textOverflow
        }
      }
      const modes = []

      for (const label of modeLabels) {
        await window.__qaOpenEditingSurface(label)
        await wait()

        modes.push({
          label,
          active:
            window.__qaReadEditingSurface(),
          visibleAriaLabels: readVisibleAriaLabels(),
          buttons: readVisibleText('.toolbar button'),
          controls: readVisibleText('.toolbar input, .toolbar select, .toolbar output'),
          overflow: readOverflow()
        })
      }

      const openQuickAction = async (label) => {
        const action = [...document.querySelectorAll('.toolbar-tabs button, .transport-controls button')]
          .find((button) => button.getAttribute('aria-label') === label)
        if (!action) return { label, missing: true }
        action.click()
        await wait()
        return {
          label,
          expanded: action.getAttribute('aria-expanded'),
          visibleAriaLabels: readVisibleAriaLabels(),
          buttons: readVisibleText('.toolbar button'),
          overflow: readOverflow()
        }
      }

      const fileQuick = await openQuickAction('파일')
      const exportQuick = await openQuickAction('내보내기')
      const playbackQuick = await openQuickAction('믹서 표시')

      return {
        modeLabels,
        modes,
        fileQuick,
        exportQuick,
        playbackQuick,
        width: window.innerWidth
      }
    })()
  `)

  const byLabel = new Map(result.modes.map((mode) => [mode.label, mode]))
  const note = byLabel.get('음표')
  const notation = byLabel.get('표기 객체')
  const lyrics = byLabel.get('가사')
  const visibleButtonLabels = (mode) => mode?.buttons.map((button) => button.text) ?? []
  const visibleAriaLabels = (mode) => mode?.visibleAriaLabels ?? []
  const modeFailures = result.modes.filter(
    (mode) =>
      mode.missing ||
      mode.active !== mode.label ||
      mode.overflow.documentOverflow ||
      mode.overflow.contextOverflow ||
      mode.overflow.textOverflow.length > 0
  )

  if (
    result.width !== 960 ||
    modeFailures.length > 0 ||
    result.fileQuick.missing ||
    result.fileQuick.expanded !== 'true' ||
    result.fileQuick.overflow.documentOverflow ||
    result.fileQuick.overflow.contextOverflow ||
    result.fileQuick.overflow.textOverflow.length > 0 ||
    result.exportQuick.missing ||
    result.exportQuick.expanded !== 'true' ||
    result.exportQuick.overflow.documentOverflow ||
    result.exportQuick.overflow.contextOverflow ||
    result.exportQuick.overflow.textOverflow.length > 0 ||
    result.playbackQuick.missing ||
    result.playbackQuick.expanded !== 'true' ||
    result.playbackQuick.overflow.documentOverflow ||
    result.playbackQuick.overflow.contextOverflow ||
    result.playbackQuick.overflow.textOverflow.length > 0 ||
    visibleAriaLabels(note).includes('코드 심벌') ||
    visibleAriaLabels(notation).includes('코드 심벌') ||
    visibleAriaLabels(lyrics).includes('코드 심벌') ||
    !visibleAriaLabels(lyrics).includes('가사 절') ||
    !visibleAriaLabels(notation).includes('마디 표기') ||
    !visibleButtonLabels(result.exportQuick).includes('PDF 변환') ||
    !visibleButtonLabels(result.exportQuick).includes('MIDI') ||
    !visibleAriaLabels(result.playbackQuick).includes('재생 컨트롤')
  ) {
    throw new Error(
      `Compact toolbar mode verification failed: ${JSON.stringify(result)}`
    )
  }

  return result
}

async function verifyCommercialHeadlessViewports(window) {
  await loadFixture(window, 'release-test')

  const viewports = [
    { name: 'compact-short', width: 960, height: 720 },
    { name: 'compact-tall', width: 960, height: 1000 },
    { name: 'desktop-short', width: 1400, height: 760 }
  ]
  const result = []

  for (const viewport of viewports) {
    window.setSize(viewport.width, viewport.height)
    await new Promise((resolve) => setTimeout(resolve, 500))

    result.push(
      await window.webContents.executeJavaScript(`
        (async () => {
          const wait = () => new Promise((resolve) => setTimeout(resolve, 70))
          const modeLabels = [
            '악보',
            '음표',
            '표기 객체',
            '가사'
          ]
          const isVisible = (element) => {
            const style = window.getComputedStyle(element)
            const box = element.getBoundingClientRect()
            return (
              style.display !== 'none' &&
              style.visibility !== 'hidden' &&
              box.width > 0 &&
              box.height > 0
            )
          }
          const readMode = (label) => {
            const toolbar = document.querySelector('.toolbar')
            const context = document.querySelector('.workspace-tools')
            const page = document.querySelector('.score-page')
            const pageBox = page?.getBoundingClientRect()
            const controls = [
              ...document.querySelectorAll(
                '.toolbar button, .toolbar select, .toolbar input, .toolbar output, .toolbar label'
              )
            ].filter(isVisible)
            const textOverflow = controls
              .map((element) => ({
                ariaLabel: element.getAttribute('aria-label'),
                tagName: element.tagName,
                text: element.textContent.trim(),
                clientWidth: element.clientWidth,
                scrollWidth: element.scrollWidth
              }))
              .filter(
                (entry) =>
                  entry.text &&
                  entry.scrollWidth > entry.clientWidth + 1
              )
            const ariaLabels = [
              ...document.querySelectorAll(
                'button, input, select, textarea, output, div[aria-label], section[aria-label], nav[aria-label], header[aria-label]'
              )
            ]
              .filter(isVisible)
              .map((element) => element.getAttribute('aria-label'))
              .filter(Boolean)

            return {
              label,
              active:
                window.__qaReadEditingSurface(),
              ariaLabels,
              documentOverflow:
                document.documentElement.scrollWidth > window.innerWidth + 1,
              toolbarOverflow:
                toolbar ? toolbar.scrollWidth > toolbar.clientWidth + 1 : false,
              contextOverflow:
                context ? context.scrollWidth > context.clientWidth + 1 : false,
              textOverflow,
              pageVisible:
                Boolean(pageBox) &&
                pageBox.bottom > 0 &&
                pageBox.top < window.innerHeight
            }
          }
          const applicationMenuBar = document.querySelector(
            '[role="menubar"][aria-label="주 메뉴"]'
          )
          const applicationMenuLabels = applicationMenuBar
            ? [...applicationMenuBar.querySelectorAll('[role="menuitem"]')].map(
                (item) => item.textContent.trim()
              )
            : []
          const applicationMenuRelationships = applicationMenuBar
            ? [...applicationMenuBar.querySelectorAll('[role="menuitem"]')].map(
                (item) => ({
                  controls: item.getAttribute('aria-controls'),
                  label: item.textContent.trim()
                })
              )
            : []
          const addTrigger = [
            ...(applicationMenuBar?.querySelectorAll('[role="menuitem"]') ?? [])
          ].find((item) => item.textContent.trim() === '추가')
          addTrigger?.click()
          await wait()
          const addMenu = document.querySelector(
            '[role="menu"][aria-label="추가 메뉴"]'
          )
          const addTriggerBox = addTrigger?.getBoundingClientRect()
          const addMenuBox = addMenu?.getBoundingClientRect()
          const applicationMenu = {
            labels: applicationMenuLabels,
            relationships: applicationMenuRelationships,
            overflow: applicationMenuBar
              ? applicationMenuBar.scrollWidth > applicationMenuBar.clientWidth + 1
              : true,
            popupContained: Boolean(
              addMenuBox &&
                addMenuBox.left >= -1 &&
                addMenuBox.right <= window.innerWidth + 1
            ),
            popupAnchored: Boolean(
              addTriggerBox &&
                addMenuBox &&
                Math.abs(addMenuBox.left - addTriggerBox.left) <= 1
            ),
            popupRelationship:
              addTrigger?.getAttribute('aria-controls') === addMenu?.id
          }
          document.body.dispatchEvent(
            new PointerEvent('pointerdown', { bubbles: true })
          )
          await wait()
          applicationMenu.dismissed = !document.querySelector(
            '[role="menu"][aria-label="추가 메뉴"]'
          )
          const fileTrigger = [
            ...(applicationMenuBar?.querySelectorAll('[role="menuitem"]') ?? [])
          ].find((item) => item.textContent.trim() === '파일')
          fileTrigger?.click()
          await wait()
          const fileMenu = document.querySelector(
            '[role="menu"][aria-label="파일 메뉴"]'
          )
          applicationMenu.fileGroups = [
            ...(fileMenu?.querySelectorAll('.application-menu__group-label') ?? [])
          ].map((label) => label.textContent.trim())
          document.body.dispatchEvent(
            new PointerEvent('pointerdown', { bubbles: true })
          )
          await wait()
          const editTrigger = [
            ...(applicationMenuBar?.querySelectorAll('[role="menuitem"]') ?? [])
          ].find((item) => item.textContent.trim() === '편집')
          editTrigger?.click()
          await wait()
          const editMenu = document.querySelector(
            '[role="menu"][aria-label="편집 메뉴"]'
          )
          applicationMenu.editGroups = [
            ...(editMenu?.querySelectorAll('.application-menu__group-label') ?? [])
          ].map((label) => label.textContent.trim())
          document.body.dispatchEvent(
            new PointerEvent('pointerdown', { bubbles: true })
          )
          await wait()
          const viewTrigger = [
            ...(applicationMenuBar?.querySelectorAll('[role="menuitem"]') ?? [])
          ].find((item) => item.textContent.trim() === '보기')
          viewTrigger?.click()
          await wait()
          const viewMenu = document.querySelector(
            '[role="menu"][aria-label="보기 메뉴"]'
          )
          const viewMenuGroups = [
            ...(viewMenu?.querySelectorAll('.application-menu__group-label') ?? [])
          ].map((label) => label.textContent.trim())
          const viewModeStates = [...(viewMenu?.querySelectorAll('[role="menuitemradio"]') ?? [])]
            .filter((item) => ['총보 보기', '파트보 보기'].includes(item.textContent.trim()))
            .map((item) => ({
              checked: item.getAttribute('aria-checked'),
              label: item.textContent.trim()
            }))
          const toolbarSeparatorControls = [...(viewMenu?.querySelectorAll('[role="menuitemradio"]') ?? [])]
            .filter((item) => item.getAttribute('aria-label')?.startsWith('도구 구분선'))
            .map((item) => ({
              checked: item.getAttribute('aria-checked'),
              label: item.getAttribute('aria-label')
            }))
          const longToolbarSeparator = [...(viewMenu?.querySelectorAll('[role="menuitemradio"]') ?? [])]
            .find((item) => item.getAttribute('aria-label') === '도구 구분선 길게')
          longToolbarSeparator?.click()
          await wait()
          const toolbarSeparatorHeightBeforeReset = document
            .querySelector('.editor-toolbar-stack')
            ?.style.getPropertyValue('--toolbar-section-separator-height')
          const paletteToggle = [...(viewMenu?.querySelectorAll('[role="menuitemcheckbox"]') ?? [])]
            .find((item) => item.textContent.trim() === '팔레트')
          const workspaceResetAction = [...(viewMenu?.querySelectorAll('[role="menuitem"]') ?? [])]
            .find((item) => item.textContent.trim() === '작업공간 기본값으로 재설정')
          paletteToggle?.click()
          workspaceResetAction?.click()
          await wait()
          const workspaceReset = {
            actionAvailable: Boolean(workspaceResetAction),
            paletteVisible: document.querySelector('button[aria-label="팔레트 표시"]')?.getAttribute('aria-pressed') === 'true',
            groups: viewMenuGroups,
            popupRelationship:
              viewTrigger?.getAttribute('aria-controls') === viewMenu?.id,
            toolbarSeparatorControls,
            toolbarSeparatorHeightAfterReset: document
              .querySelector('.editor-toolbar-stack')
              ?.style.getPropertyValue('--toolbar-section-separator-height'),
            toolbarSeparatorHeightBeforeReset,
            toolbarSeparatorStorageAfterReset: window.localStorage.getItem(
              'chromatics.toolbar-separator-height.v1'
            ),
            viewModeStates
          }
          viewTrigger?.click()
          await wait()
          const reopenedViewMenu = document.querySelector(
            '[role="menu"][aria-label="보기 메뉴"]'
          )
          const selectionFilterAction = [...(reopenedViewMenu?.querySelectorAll('[role="menuitem"]') ?? [])]
            .find((item) => item.textContent.trim() === '선택 필터 열기')
          const viewMenuBox = reopenedViewMenu?.getBoundingClientRect()
          selectionFilterAction?.click()
          await wait()
          const selectionFilter = document.querySelector(
            'select[aria-label="선택 필터"]'
          )
          const selectionFilterWorkspace = {
            actionAvailable: Boolean(selectionFilterAction),
            focused: document.activeElement === selectionFilter,
            popupContained: Boolean(
              viewMenuBox &&
                viewMenuBox.left >= -1 &&
                viewMenuBox.right <= window.innerWidth + 1
            ),
            visible: Boolean(
              selectionFilter &&
                selectionFilter.getBoundingClientRect().width > 0 &&
                selectionFilter.getBoundingClientRect().height > 0
            )
          }
          const modes = []

          for (const label of modeLabels) {
            await window.__qaOpenEditingSurface(label)
            await wait()
            modes.push(readMode(label))
          }

          const openQuickAction = async (label) => {
            const action = [...document.querySelectorAll('.toolbar-tabs button, .transport-controls button')]
              .find((button) => button.getAttribute('aria-label') === label)
            if (!action) return { label, missing: true }
            action.click()
            await wait()
            return {
              ...readMode(label),
              expanded: action.getAttribute('aria-expanded')
            }
          }
          const quickActions = [
            await openQuickAction('파일'),
            await openQuickAction('내보내기'),
            await openQuickAction('믹서 표시')
          ]

          return {
            height: window.innerHeight,
            applicationMenu,
            workspaceReset,
            selectionFilterWorkspace,
            modes,
            quickActions,
            name: ${JSON.stringify(viewport.name)},
            width: window.innerWidth
          }
        })()
      `)
    )
  }

  const failures = result.flatMap((viewport) =>
    viewport.modes
      .filter(
        (mode) =>
          mode.missing ||
          mode.active !== mode.label ||
          mode.documentOverflow ||
          mode.contextOverflow ||
          mode.textOverflow.length > 0 ||
          !mode.pageVisible
      )
      .map((mode) => ({
        viewport: viewport.name,
        mode
      }))
  )
  const applicationMenuFailures = result.filter(
    (viewport) =>
      viewport.applicationMenu.labels.join('|') !==
        '파일|편집|보기|추가|형식|도구|도움말' ||
      viewport.applicationMenu.overflow ||
      !viewport.applicationMenu.popupContained ||
      !viewport.applicationMenu.popupAnchored ||
      !viewport.applicationMenu.popupRelationship ||
      !viewport.applicationMenu.dismissed ||
      viewport.applicationMenu.relationships.map((item) => item.controls).join('|') !==
        'application-menu-popup-file|application-menu-popup-edit|application-menu-popup-view|application-menu-popup-add|application-menu-popup-format|application-menu-popup-tools|application-menu-popup-help' ||
      viewport.applicationMenu.fileGroups.join('|') !== '악보|저장|교환|내보내기' ||
      viewport.applicationMenu.editGroups.join('|') !== '실행 기록|선택 편집' ||
      !viewport.workspaceReset.actionAvailable ||
      !viewport.workspaceReset.paletteVisible ||
      !viewport.workspaceReset.popupRelationship ||
      viewport.workspaceReset.groups.join('|') !== '작업 영역|도구 구분선|도크 크기|작업공간|선택|보기 모드' ||
      viewport.workspaceReset.toolbarSeparatorControls.map((item) => `${item.label}:${item.checked}`).join('|') !==
        '도구 구분선 짧게:false|도구 구분선 기본:true|도구 구분선 길게:false' ||
      viewport.workspaceReset.toolbarSeparatorHeightBeforeReset !== '40px' ||
      viewport.workspaceReset.toolbarSeparatorHeightAfterReset !== '30px' ||
      viewport.workspaceReset.toolbarSeparatorStorageAfterReset !== '30' ||
      viewport.workspaceReset.viewModeStates.map((item) => `${item.label}:${item.checked}`).join('|') !==
        '총보 보기:true|파트보 보기:false' ||
      !viewport.selectionFilterWorkspace.actionAvailable ||
      !viewport.selectionFilterWorkspace.popupContained ||
      !viewport.selectionFilterWorkspace.visible ||
      !viewport.selectionFilterWorkspace.focused
  )
  const desktop = result.find((viewport) => viewport.name === 'desktop-short')
  const quickFailures = result.flatMap((viewport) =>
    viewport.quickActions
      .filter(
        (action) =>
          action.missing ||
          action.expanded !== 'true' ||
          action.documentOverflow ||
          action.contextOverflow ||
          action.textOverflow.length > 0 ||
          !action.pageVisible
      )
      .map((action) => ({ viewport: viewport.name, action }))
  )
  const desktopFile = desktop?.quickActions.find((action) => action.label === '파일')
  const desktopExport = desktop?.quickActions.find(
    (action) => action.label === '내보내기'
  )
  const desktopPlayback = desktop?.quickActions.find(
    (action) => action.label === '믹서 표시'
  )

  if (
    failures.length > 0 ||
    quickFailures.length > 0 ||
    applicationMenuFailures.length > 0 ||
    desktopFile?.ariaLabels.includes('PDF 변환') ||
    desktopFile?.ariaLabels.includes('MIDI 내보내기') ||
    !desktopExport?.ariaLabels.includes('PDF 변환') ||
    !desktopExport?.ariaLabels.includes('MIDI 내보내기') ||
    !desktopPlayback?.ariaLabels.includes('재생 컨트롤')
  ) {
    throw new Error(
      `Commercial headless viewport verification failed: ${JSON.stringify({
        applicationMenuFailures,
        failures,
        quickFailures,
        result
      })}`
    )
  }

  return result
}

async function verifyPropertiesDockEditing(window) {
  await loadFixture(window, 'release-test')
  await window.webContents.executeJavaScript(`
    localStorage.removeItem('chromatics.dock-widths.v1')
    localStorage.removeItem('chromatics.event-properties-sections.v1')
  `)
  await loadFixture(window, 'release-test')
  const captures = []
  for (const [width, minimumDock] of [[1400, false], [1400, true], [960, false]]) {
    window.setSize(width, 900)
    await new Promise((resolve) => setTimeout(resolve, 250))
    if (minimumDock) {
      await window.webContents.executeJavaScript(`
        (async () => {
          for (let step = 0; step < 4; step += 1) {
            document.querySelector('button[aria-label="속성 폭 줄이기"]').click()
            await new Promise((resolve) => setTimeout(resolve, 50))
          }
        })()
      `)
    }
    const result = await window.webContents.executeJavaScript(`
      (async () => {
        const wait = () => new Promise((resolve) => setTimeout(resolve, 100))
        document.querySelector('.notation-event[data-event-id="m1-d4"]')
          ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        document.querySelector('#dock-tab-properties')?.click()
        await wait()
        const eventProperties = document.querySelector('.docked-properties .event-properties')
        const duration = eventProperties?.querySelector('select[aria-label="선택 이벤트 음가"]')
        if (!duration || duration.value !== 'quarter' || eventProperties.dataset.collapsed !== 'false') {
          throw new Error('Selected note properties must open in the dock')
        }
        const propertyBox = eventProperties.getBoundingClientRect()
        const propertyControlOverflow = [...eventProperties.querySelectorAll('button, input, select')]
          .filter((control) => control.getClientRects().length)
          .some((control) => {
            const box = control.getBoundingClientRect()
            return box.left < propertyBox.left - 1 || box.right > propertyBox.right + 1
          })
        const lastProperty = [...eventProperties.querySelectorAll('button, input, select')].at(-1)
        lastProperty.scrollIntoView({ block: 'center' })
        await wait()
        const lastBox = lastProperty.getBoundingClientRect()
        const lastPropertyReachable = lastBox.top >= 0 && lastBox.bottom <= document.querySelector('.editor-status').getBoundingClientRect().top
        window.scrollTo(0, 0)
        for (const [label, value] of [['코드 심벌', 'Dm7'], ['보표 글자', 'cantabile']]) {
          await window.__qaOpenTextProperties(label)
          const input = document.querySelector('input[aria-label="' + label + '"]')
          if (!input || input.disabled || !input.getClientRects().length) throw new Error('Missing editable property: ' + label)
          input.scrollIntoView({ block: 'center' })
          input.focus()
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value)
          input.dispatchEvent(new Event('input', { bubbles: true }))
          input.blur()
          input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
          await wait()
        }
        const dock = document.querySelector('.docked-properties')
        const box = dock.getBoundingClientRect()
        const preview = document.querySelector('.notation-preview')
        const tempo = preview.querySelector('.notation-tempo-marking').getBoundingClientRect()
        const rehearsal = preview.querySelector('.notation-rehearsal-mark').getBoundingClientRect()
        const rehearsalFrame = preview.querySelector('.notation-rehearsal-mark rect').getBoundingClientRect()
        const harmony = preview.querySelector('.notation-harmony-mark').getBoundingClientRect()
        const beforeWidth = document.querySelector('.score-canvas').getBoundingClientRect().width
        document.querySelector('button[aria-label="팔레트 표시"]').click()
        document.querySelector('button[aria-label="속성 표시"]').click()
        await wait()
        const expandedWidth = document.querySelector('.score-canvas').getBoundingClientRect().width
        const panelsHidden = ['.docked-palette', '.docked-properties'].every((selector) => getComputedStyle(document.querySelector(selector)).display === 'none')
        document.querySelector('button[aria-label="팔레트 표시"]').click()
        document.querySelector('button[aria-label="속성 표시"]').click()
        await wait()
        return {
          propertyControlOverflow,
          lastPropertyReachable,
          eventPropertiesHeight: propertyBox.height,
          eventPropertiesInToolbar: !!document.querySelector('section[aria-label="음표 편집"] .event-properties'),
          panelsHidden,
          canvasExpands: expandedWidth > beforeWidth,
          chord: document.querySelector('input[aria-label="코드 심벌"]').value,
          staffText: document.querySelector('input[aria-label="보표 글자"]').value,
          renderedText: document.querySelector('.notation-preview').textContent,
          overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
          dockWidth: box.width,
          scoreOverflow: preview.scrollWidth > preview.clientWidth + 1,
          tempoRehearsalOverlap: tempo.left < rehearsal.right && tempo.right > rehearsal.left && tempo.top < rehearsal.bottom && tempo.bottom > rehearsal.top,
          rehearsalHarmonyOverlap: rehearsalFrame.left < harmony.right && rehearsalFrame.right > harmony.left && rehearsalFrame.top < harmony.bottom && rehearsalFrame.bottom > harmony.top,
          inputOverflow: [...dock.querySelectorAll('input, select')].some((input) => input.getBoundingClientRect().right > box.right + 1)
        }
      })()
    `)
    if (result.chord !== 'Dm7' || result.staffText !== 'cantabile' ||
        result.propertyControlOverflow || !result.lastPropertyReachable || result.eventPropertiesInToolbar ||
        result.dockWidth !== (minimumDock ? 180 : 236) ||
        !result.renderedText.includes('cantabile') || !result.panelsHidden || !result.canvasExpands || result.overflow || result.inputOverflow || result.scoreOverflow || result.tempoRehearsalOverlap || result.rehearsalHarmonyOverlap) {
      throw new Error(`Properties dock workflow failed: ${JSON.stringify(result)}`)
    }
    const screenshot = path.join(app.getPath('temp'), `chromatics-v1-properties-${width}${minimumDock ? '-minimum' : ''}.png`)
    fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG())
    const spans = []
    for (const kind of ['slur', 'hairpin']) {
      const state = await window.webContents.executeJavaScript(`
        (async () => {
          const wait = () => new Promise((resolve) => setTimeout(resolve, 75))
          await window.__qaOpenEditingSurface('표기 객체')
          await wait()
          const objects = document.querySelector('select[aria-label="표기 객체 선택"]')
          const reference = [...objects.options].find(option => option.value.startsWith('${kind}:')).value
          objects.value = reference
          objects.dispatchEvent(new Event('change', { bubbles: true }))
          await wait()
          const workspaces = []
          for (const category of ['measure', 'note']) {
            await window.__qaOpenEditingSurface({ measure: '악보', note: '음표', lyrics: '가사' }[category])
            await wait()
            workspaces.push({ category,
              selected: document.querySelector('select[aria-label="표기 객체 선택"]')?.value === reference,
              endpoints: !!document.querySelector('select[aria-label="표기 시작점"]'),
              eventPanelHidden: !document.querySelector('.event-properties')
            })
          }
          const close = document.querySelector('button[aria-label="표기 선택 해제"]')
          close.scrollIntoView({ block: 'center' })
          close.focus()
          await wait()
          const dockBox = document.querySelector('.docked-properties').getBoundingClientRect()
          const controlsContained = [...document.querySelectorAll('.span-properties button, .span-properties select')]
            .filter(control => control.getClientRects().length)
            .every(control => {
              const box = control.getBoundingClientRect()
              return box.left >= dockBox.left && box.right <= dockBox.right
            })
          return { workspaces, controlsContained }
        })()
      `)
      const key = kind === 'slur'
        ? { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' }
        : { key: ' ', code: 'Space', windowsVirtualKeyCode: 32, text: ' ' }
      const spanScreenshot = path.join(app.getPath('temp'), `chromatics-v1-properties-${width}${minimumDock ? '-minimum' : ''}-${kind}.png`)
      fs.writeFileSync(spanScreenshot, (await window.webContents.capturePage()).toPNG())
      window.webContents.debugger.attach('1.3')
      try {
        await window.webContents.debugger.sendCommand('Input.dispatchKeyEvent', { type: 'keyDown', ...key })
        await window.webContents.debugger.sendCommand('Input.dispatchKeyEvent', { type: 'keyUp', key: key.key, code: key.code, windowsVirtualKeyCode: key.windowsVirtualKeyCode })
      } finally {
        window.webContents.debugger.detach()
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
      const keyboardDeselects = await window.webContents.executeJavaScript(`
        !document.querySelector('select[aria-label="표기 시작점"]') && !!document.querySelector('.event-properties')
      `)
      if (!keyboardDeselects || !state.controlsContained || state.workspaces.some(item => !item.selected || !item.endpoints || !item.eventPanelHidden)) {
        throw new Error('Selected span dock workflow failed: ' + JSON.stringify({ width, minimumDock, kind, keyboardDeselects, state }))
      }
      spans.push({ kind, screenshot: spanScreenshot, keyboardDeselects, ...state })
    }
    captures.push({ width, minimumDock, screenshot, ...result, spans, renderedText: undefined })
  }
  return captures
}

async function verifyCompactDockTabs(window) {
  await loadFixture(window, 'release-test')
  await window.webContents.executeJavaScript(`
    localStorage.removeItem('chromatics.compact-dock.v1')
    localStorage.removeItem('chromatics.dock-visibility.v1')
  `)
  await loadFixture(window, 'release-test')
  window.setSize(960, 720)
  await new Promise(resolve => setTimeout(resolve, 150))
  const read = () => window.webContents.executeJavaScript(`(() => {
    const dock = [...document.querySelectorAll('.docked-palette,.docked-properties')].filter(item => !item.hidden)
    const canvas = document.querySelector('.score-canvas').getBoundingClientRect()
    const bar = document.querySelector('.compact-dock-bar')?.getBoundingClientRect()
    return {
      visible: dock.map(item => item.id),
      selected: document.querySelector('.compact-dock-bar [aria-selected="true"]')?.id,
      focused: document.activeElement.id,
      fullHeight: dock.length === 1 && Math.abs(dock[0].getBoundingClientRect().bottom - canvas.bottom) <= 1 &&
        Math.abs(dock[0].getBoundingClientRect().top - bar.bottom) <= 1,
      overflow: document.documentElement.scrollWidth > innerWidth + 1 || document.documentElement.scrollHeight > innerHeight + 1,
      selectedEvent: document.querySelector('.notation-event.is-selected')?.dataset.eventId
    }
  })()`)
  const initial = await read()
  if (initial.selected !== 'dock-tab-palette' || !initial.fullHeight || initial.overflow) throw new Error('Compact initial dock: ' + JSON.stringify(initial))
  await window.webContents.executeJavaScript(`document.querySelector('#dock-tab-palette').focus()`)
  window.webContents.debugger.attach('1.3')
  try {
    await window.webContents.debugger.sendCommand('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 })
    await window.webContents.debugger.sendCommand('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 })
  } finally { window.webContents.debugger.detach() }
  await new Promise(resolve => setTimeout(resolve, 100))
  const properties = await read()
  if (properties.selected !== 'dock-tab-properties' || properties.focused !== 'dock-tab-properties' || !properties.fullHeight || properties.overflow || properties.selectedEvent !== initial.selectedEvent) throw new Error('Compact keyboard dock: ' + JSON.stringify(properties))
  const screenshot = path.join(app.getPath('temp'), 'chromatics-v1-compact-dock-tabs.png')
  fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG())
  await loadFixture(window, 'release-test')
  const reopened = await read()
  if (reopened.selected !== 'dock-tab-properties') throw new Error('Compact dock preference lost')
  await window.webContents.executeJavaScript(`document.querySelector('.compact-dock-bar > button').focus()`)
  window.webContents.debugger.attach('1.3')
  try {
    await window.webContents.debugger.sendCommand('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' })
    await window.webContents.debugger.sendCommand('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
  } finally { window.webContents.debugger.detach() }
  await new Promise(resolve => setTimeout(resolve, 100))
  const closed = await read()
  if (closed.selected !== 'dock-tab-palette' || closed.focused !== 'dock-tab-palette' || closed.selectedEvent !== reopened.selectedEvent) throw new Error('Compact keyboard close: ' + JSON.stringify(closed))
  await window.webContents.executeJavaScript(`document.querySelector('button[aria-label="속성 표시"]').click()`)
  await new Promise(resolve => setTimeout(resolve, 100))
  await window.webContents.executeJavaScript(`document.querySelector('#dock-tab-properties').focus()`)
  window.setSize(1400, 720)
  await new Promise(resolve => setTimeout(resolve, 150))
  const wide = await window.webContents.executeJavaScript(`({
    bothVisible: [...document.querySelectorAll('.docked-palette,.docked-properties')].every(item => !item.hidden && item.getBoundingClientRect().width > 0),
    noTabs: !document.querySelector('.compact-dock-bar'),
    focusRestored: document.activeElement.id === 'dock-panel-properties'
  })`)
  if (!wide.bothVisible || !wide.noTabs || !wide.focusRestored) throw new Error('Wide dock restoration: ' + JSON.stringify(wide))
  window.setSize(960, 720)
  await new Promise(resolve => setTimeout(resolve, 150))
  window.webContents.debugger.attach('1.3')
  let hiddenInPrint
  try {
    await window.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { media: 'print' })
    hiddenInPrint = await window.webContents.executeJavaScript(`getComputedStyle(document.querySelector('.compact-dock-bar')).display === 'none'`)
    await window.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { media: 'screen' })
  } finally { window.webContents.debugger.detach() }
  if (!hiddenInPrint) throw new Error('Compact dock tab bar leaked into print')
  return { initial, properties, reopened, closed, wide, hiddenInPrint, screenshot }
}

async function verifyWorkspaceScrollIsolation(window) {
  const captures = []
  for (const width of [960, 1400]) {
    await loadFixture(window, 'release-test')
    window.setSize(width, 720)
    await new Promise((resolve) => setTimeout(resolve, 150))
    const result = await window.webContents.executeJavaScript(`
      (async () => {
        const wait = () => new Promise((resolve) => setTimeout(resolve, 100))
        document.querySelector('.notation-event[data-event-id="m1-d4"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
        document.querySelector('#dock-tab-properties')?.click()
        await wait()
        const canvas = document.querySelector('.score-canvas')
        const palette = document.querySelector('.docked-palette')
        const properties = document.querySelector('.docked-properties')
        const status = document.querySelector('.editor-status')
        const scoreBox = canvas.getBoundingClientRect()
        const first = document.querySelector('.notation-event').getBoundingClientRect().top
        properties.scrollTop = properties.scrollHeight
        await wait()
        const propertiesScroll = properties.scrollTop
        const isolated = Math.abs(document.querySelector('.notation-event').getBoundingClientRect().top - first) < 1 && window.scrollY === 0
        const lastControl = [...properties.querySelectorAll('button, input, select, summary')].filter(control => control.getClientRects().length).at(-1)
        const lastControlBox = lastControl.getBoundingClientRect()
        const propertyBox = properties.getBoundingClientRect()
        const propertyEndReachable = lastControlBox.top >= propertyBox.top && lastControlBox.bottom <= propertyBox.bottom + 1
        document.querySelector('#dock-tab-palette')?.click()
        await wait()
        palette.scrollTop = palette.scrollHeight
        const paletteScroll = palette.scrollTop
        document.querySelector('#dock-tab-properties')?.click()
        await wait()
        canvas.scrollTop = canvas.scrollHeight
        await wait()
        const lastNote = [...document.querySelectorAll('.notation-event')].at(-1).getBoundingClientRect()
        const scoreEndReachable = lastNote.top >= scoreBox.top && lastNote.bottom <= scoreBox.bottom + 1
        return {
          width: window.innerWidth, height: window.innerHeight,
          documentContained: document.documentElement.scrollHeight <= window.innerHeight + 1,
          horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
          isolated, propertiesScroll, paletteScroll, scoreScroll: canvas.scrollTop,
          propertyEndReachable, scoreEndReachable,
          dockHeadersVisible: [palette, properties].filter(dock => !dock.hidden).every(dock => {
            if (document.querySelector('.compact-dock-bar')) {
              const tabs = document.querySelector('.compact-dock-bar').getBoundingClientRect()
              return tabs.top >= scoreBox.top - 1 && tabs.bottom <= dock.getBoundingClientRect().top + 1
            }
            const header = dock.querySelector('.docked-sidebar__header').getBoundingClientRect()
            const box = dock.getBoundingClientRect()
            return header.top >= box.top - 1 && header.bottom <= box.bottom + 1
          }),
          scoreBottom: scoreBox.bottom, statusTop: status.getBoundingClientRect().top,
          docksContained: [palette, properties].filter(dock => !dock.hidden).every(dock => {
            const box = dock.getBoundingClientRect()
            return box.top >= scoreBox.top - 1 && box.bottom <= scoreBox.bottom + 1
          })
        }
      })()
    `)
    if (!result.documentContained || result.horizontalOverflow || !result.isolated ||
        result.propertiesScroll <= 0 || result.scoreScroll <= 0 || !result.propertyEndReachable ||
        !result.scoreEndReachable || !result.docksContained || !result.dockHeadersVisible || result.scoreBottom > result.statusTop + 1) {
      throw new Error('Workspace scroll isolation failed: ' + JSON.stringify(result))
    }
    const screenshot = path.join(app.getPath('temp'), `chromatics-v1-workspace-scroll-${width}.png`)
    fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG())
    await window.webContents.executeJavaScript(`
      document.querySelector('.docked-properties').scrollTop = 0
      document.querySelector('.event-properties button').focus({ preventScroll: true })
    `)
    window.webContents.debugger.attach('1.3')
    try {
      await window.webContents.debugger.sendCommand('Input.dispatchKeyEvent', {
        type: 'keyDown', key: 'PageDown', code: 'PageDown', windowsVirtualKeyCode: 34
      })
      await window.webContents.debugger.sendCommand('Input.dispatchKeyEvent', {
        type: 'keyUp', key: 'PageDown', code: 'PageDown', windowsVirtualKeyCode: 34
      })
    } finally {
      window.webContents.debugger.detach()
    }
    await new Promise((resolve) => setTimeout(resolve, 350))
    const keyboard = await window.webContents.executeJavaScript(`
      ({
        propertiesScroll: document.querySelector('.docked-properties').scrollTop,
        scoreScroll: document.querySelector('.score-canvas').scrollTop,
        documentScroll: window.scrollY,
        selected: document.querySelector('.notation-event.is-selected')?.getAttribute('data-event-id')
      })
    `)
    if (keyboard.propertiesScroll <= 0 || keyboard.scoreScroll !== result.scoreScroll ||
        keyboard.documentScroll !== 0 || keyboard.selected !== 'm1-d4') {
      throw new Error('Dock keyboard scroll failed: ' + JSON.stringify({ width, keyboard, result }))
    }
    captures.push({ ...result, screenshot, keyboard })
  }
  return captures
}

async function verifyEditorStatusBar(window) {
  const captures = []
  for (const width of [960, 1400]) {
    await loadFixture(window, 'release-test')
    window.setSize(width, 720)
    await new Promise((resolve) => setTimeout(resolve, 250))
    const result = await window.webContents.executeJavaScript(`
      (async () => {
        const wait = () => new Promise((resolve) => setTimeout(resolve, 100))
        const status = document.querySelector('.editor-status')
        if (!status) throw new Error('Editor status bar is missing')
        const bounds = () => {
          const box = status.getBoundingClientRect()
          return {
            top: box.top, bottom: box.bottom, height: box.height,
            viewportHeight: window.innerHeight,
            horizontalOverflow: status.scrollWidth > status.clientWidth + 1,
            documentOverflow: document.documentElement.scrollWidth > window.innerWidth + 1
          }
        }
        window.scrollTo(0, 0)
        await wait()
        const initial = bounds()
        const canvas = document.querySelector('.score-canvas')
        canvas.scrollTop = canvas.scrollHeight
        await wait()
        const scrolled = bounds()
        const scoreScrolledIndependently = canvas.scrollTop > 0 && window.scrollY === 0
        const lastNote = [...document.querySelectorAll('.notation-event')].at(-1)
        const lastNoteAboveStatus = Boolean(lastNote && lastNote.getBoundingClientRect().bottom <= scrolled.top + 1)
        canvas.scrollTop = 0
        await wait()
        const originalBridge = window.inC
        const message = '프로젝트를 저장할 수 없습니다. ' +
          '선택한 폴더의 접근 권한과 남은 디스크 공간을 확인한 뒤 다른 위치에 저장해 주세요. '.repeat(4)
        try {
          window.inC = { ...originalBridge, project: { save: async () => { throw new Error(message) } } }
          document.querySelector('.toolbar-tabs button[aria-label="파일"]').click()
          await wait()
          const save = document.querySelector('button[aria-label="프로젝트 저장"]')
          if (!save || save.disabled) throw new Error('Native-save fixture bridge is unavailable')
          save.click()
          await wait()
          const error = status.querySelector('.is-error')
          const errorBox = error?.getBoundingClientRect()
          const failed = bounds()
          const selectedNote = document.querySelector('.notation-event[data-event-id="m1-d4"]')
          if (!selectedNote) throw new Error('Status keyboard fixture note is missing')
          selectedNote.dispatchEvent(new MouseEvent('click', { bubbles: true }))
          await wait()
          status.focus({ preventScroll: true })
          const beforeKeyboard = status.textContent
          const keyboardDefaultsPreserved = ['ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown', 'Tab']
            .every((key) => status.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key })))
          await wait()
          return {
            initial, scrolled, lastNoteAboveStatus, scoreScrolledIndependently, failed,
            errorPreserved: error?.textContent === message,
            errorWraps: Boolean(errorBox && errorBox.height > 20),
            errorWithinScrollSurface: Boolean(error && error.scrollWidth <= error.clientWidth + 1),
            keyboardAccessible: document.activeElement === status && status.tabIndex === 0,
            keyboardDefaultsPreserved,
            keyboardDoesNotEdit: status.textContent === beforeKeyboard
          }
        } finally {
          window.inC = originalBridge
        }
      })()
    `)
    const atBottom = (box) => Math.abs(box.bottom - box.viewportHeight) <= 1 &&
      box.top >= 0 && !box.horizontalOverflow && !box.documentOverflow
    if (!atBottom(result.initial) || !atBottom(result.scrolled) || !atBottom(result.failed) ||
        !result.lastNoteAboveStatus || !result.scoreScrolledIndependently || !result.errorPreserved || !result.errorWraps ||
        !result.errorWithinScrollSurface || !result.keyboardAccessible ||
        !result.keyboardDefaultsPreserved || !result.keyboardDoesNotEdit) {
      throw new Error('Editor status bar verification failed: ' + JSON.stringify({ width, ...result }))
    }
    const screenshot = path.join(app.getPath('temp'), 'chromatics-status-bar-' + width + '.png')
    fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG())
    window.webContents.debugger.attach('1.3')
    let hiddenInPrint
    try {
      await window.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { media: 'print' })
      hiddenInPrint = await window.webContents.executeJavaScript(
        `getComputedStyle(document.querySelector('.editor-status')).display === 'none'`
      )
    } finally {
      await window.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { media: '' })
      window.webContents.debugger.detach()
    }
    if (!hiddenInPrint) throw new Error('Editor status bar leaked into print layout')
    captures.push({ width, screenshot, hiddenInPrint, ...result })
  }
  return captures
}

async function verifyNotationPaletteWorkspace(window) {
  await loadFixture(window, 'release-test')
  const captures = []

  for (const width of [960, 1100, 1400]) {
    await window.webContents.executeJavaScript(`
      localStorage.removeItem('chromatics.notation-palette-workspace.v1')
      localStorage.removeItem('chromatics.notation-palette-one-at-a-time.v1')
      localStorage.removeItem('chromatics.notation-palette-panel-order.v1')
      localStorage.removeItem('chromatics.notation-palette-recent-items.v1')
      localStorage.removeItem('chromatics.notation-palette-favorite-items.v1')
      localStorage.removeItem('chromatics.docked-palette-sections.v1')
      localStorage.removeItem('chromatics.dock-widths.v1')
      localStorage.removeItem('chromatics.score-toolbar-sections.v1')
      localStorage.removeItem('chromatics.compact-dock.v1')
    `)
    await loadFixture(window, 'release-test')
    window.setSize(width, 900)
    await new Promise((resolve) => setTimeout(resolve, 250))

    const initialTempo = await window.webContents.executeJavaScript(`
      (async () => {
        const wait = () => new Promise((resolve) => setTimeout(resolve, 100))
        await window.__qaOpenEditingSurface('악보')
        await wait()
        const toolbar = document.querySelector('section[aria-label="악보 편집"]')
        const tempo = toolbar.querySelector('section[aria-label="빠르기"]')
        const slider = tempo.querySelector('input[aria-label="빠르기"]')
        const initialCollapsed = tempo.dataset.collapsed === 'true'
        const initialSliderHidden = slider.getBoundingClientRect().height === 0
        const collapsedHeight = toolbar.getBoundingClientRect().height
        tempo.querySelector('button[aria-label="빠르기 펼치기"]').click()
        await wait()
        const expandedHeight = toolbar.getBoundingClientRect().height
        const expandedSliderVisible = slider.getBoundingClientRect().height > 0
        tempo.querySelector('button[aria-label="빠르기 접기"]').click()
        await wait()
        const paletteTab = document.querySelector('#dock-tab-palette')
        if (paletteTab && paletteTab.getAttribute('aria-selected') !== 'true') {
          paletteTab.click()
          await wait()
        }
        const paletteBox = document.querySelector('.docked-palette').getBoundingClientRect()
        const clefTiles = [...document.querySelectorAll('.docked-palette__clef-grid button')].map((button) => {
          const glyph = button.querySelector('.vf-clef text')
          const tile = button.getBoundingClientRect()
          const svg = button.querySelector('svg')?.getBoundingClientRect()
          const font = glyph && getComputedStyle(glyph)
          const context = document.createElement('canvas').getContext('2d')
          if (font) context.font = font.font
          const ink = glyph && context.measureText(glyph.textContent)
          const box = ink && {
            x: Number(glyph.getAttribute('x')) - ink.actualBoundingBoxLeft,
            y: Number(glyph.getAttribute('y')) - ink.actualBoundingBoxAscent,
            width: ink.actualBoundingBoxLeft + ink.actualBoundingBoxRight,
            height: ink.actualBoundingBoxAscent + ink.actualBoundingBoxDescent
          }
          return {
            name: button.getAttribute('aria-label'),
            glyphBox: box && { x: box.x, y: box.y, width: box.width, height: box.height },
            tileBox: { width: tile.width, height: tile.height },
            svgBox: svg && { width: svg.width, height: svg.height },
            hasGlyph: Boolean(box && box.width > 5 && box.height > 10),
            glyphContained: Boolean(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= 80 && box.y + box.height <= 100),
            tileContained: Boolean(svg && svg.left >= tile.left && svg.right <= tile.right && svg.top >= tile.top && svg.bottom <= tile.bottom),
            fontReady: Boolean(font && document.fonts.check(font.fontSize + ' ' + font.fontFamily, glyph.textContent))
          }
        })
        const quickRow = document.querySelector('.toolbar-tabs')
        const quickBox = quickRow.getBoundingClientRect()
        const tools = quickRow.querySelector('.workspace-tools')
        const toolBoxes = [...tools.querySelectorAll('button')].map((button) => button.getBoundingClientRect())
        const integratedWorkspaceTools = toolBoxes.length === 5 && toolBoxes.every((box) =>
          box.width >= 30 && box.left >= quickBox.left && box.right <= quickBox.right &&
          box.top >= quickBox.top && box.bottom <= quickBox.bottom) && quickBox.height <= 48 &&
          !document.querySelector('.editor-context-strip') &&
          Boolean(document.querySelector('.editor-status [aria-label="현재 작업 컨텍스트"]'))
        const propertiesBox = document.querySelector('.docked-properties').getBoundingClientRect()
        const canvasBox = document.querySelector('.score-canvas').getBoundingClientRect()
        const compactSidebar = window.innerWidth > 1200 || (
          paletteBox.right <= canvasBox.left + 1 &&
          document.querySelector('.docked-properties').hidden &&
          propertiesBox.width === 0 &&
          Math.abs(canvasBox.top - document.querySelector('.compact-dock-bar').getBoundingClientRect().top) <= 1 &&
          Math.abs(canvasBox.bottom - paletteBox.bottom) <= 1
        )
        const dockVisibilityLayouts = []
        for (const [showPalette, showProperties] of [[false, true], [true, false], [false, false], [true, true]]) {
          for (const [name, shown] of [['팔레트 표시', showPalette], ['속성 표시', showProperties]]) {
            const control = document.querySelector('button[aria-label="' + name + '"]')
            if ((control.getAttribute('aria-pressed') === 'true') !== shown) control.click()
          }
          await wait()
          const score = document.querySelector('.score-canvas').getBoundingClientRect()
          const dockRects = [showPalette && document.querySelector('.docked-palette'),
            showProperties && document.querySelector('.docked-properties')]
            .filter(dock => dock && !dock.hidden).map((dock) => dock.getBoundingClientRect())
          const hiddenSteps = [...document.querySelectorAll('.dock-width-step')]
            .every((button) => button.getBoundingClientRect().width === 0)
          dockVisibilityLayouts.push({
            showPalette, showProperties,
            scoreWidth: score.width,
            noOverlap: dockRects.every((dock) => dock.right <= score.left + 1 || dock.left >= score.right - 1),
            fullCanvasWhenHidden: showPalette || showProperties || score.width >= window.innerWidth - 1,
            compactStepsHidden: window.innerWidth > 1200 || hiddenSteps,
            noDocumentOverflow: document.documentElement.scrollWidth <= window.innerWidth + 1
          })
        }
        document.querySelector('#dock-tab-palette')?.click()
        await wait()
        return {
          initialCollapsed, initialSliderHidden, collapsedHeight, expandedHeight,
          expandedSliderVisible,
          compactSidebar,
          integratedWorkspaceTools,
          quickRowHeight: quickBox.height,
          clefTiles,
          paletteHeight: paletteBox.height,
          scoreTop: canvasBox.top,
          paletteTop: paletteBox.top,
          dockVisibilityLayouts,
          restoredHeight: toolbar.getBoundingClientRect().height,
          horizontalOverflow: toolbar.scrollWidth > toolbar.clientWidth + 1
        }
      })()
    `)
    if (!initialTempo.initialCollapsed || !initialTempo.initialSliderHidden ||
        !initialTempo.expandedSliderVisible || initialTempo.expandedHeight < initialTempo.collapsedHeight ||
        (width <= 1100 && initialTempo.expandedHeight <= initialTempo.collapsedHeight) ||
        Math.abs(initialTempo.restoredHeight - initialTempo.collapsedHeight) > 1 || initialTempo.horizontalOverflow ||
        !initialTempo.compactSidebar || !initialTempo.integratedWorkspaceTools) {
      throw new Error('Initial score tempo geometry failed: ' + JSON.stringify({ width, ...initialTempo }))
    }
    if (initialTempo.dockVisibilityLayouts.some((state) =>
      !state.noOverlap || !state.fullCanvasWhenHidden || !state.compactStepsHidden || !state.noDocumentOverflow)) {
      throw new Error('Dock visibility layout failed: ' + JSON.stringify({ width, states: initialTempo.dockVisibilityLayouts }))
    }
    if (initialTempo.clefTiles.length !== 4 || initialTempo.clefTiles.some((tile) =>
      !tile.hasGlyph || !tile.glyphContained || !tile.tileContained || !tile.fontReady)) {
      throw new Error('Clef palette glyph geometry failed: ' + JSON.stringify({ width, tiles: initialTempo.clefTiles }))
    }
    const initialScreenshot = path.join(app.getPath('temp'), 'chromatics-v1-score-initial-' + width + '.png')
    fs.writeFileSync(initialScreenshot, (await window.webContents.capturePage()).toPNG())

    await window.webContents.executeJavaScript(`
      document.querySelector('button[aria-label="선택 마디 시작에 낮은음자리표 적용"]').focus()
    `)
    window.webContents.debugger.attach('1.3')
    try {
      await window.webContents.debugger.sendCommand('Input.dispatchKeyEvent', {
        type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r'
      })
      await window.webContents.debugger.sendCommand('Input.dispatchKeyEvent', {
        type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13
      })
    } finally {
      window.webContents.debugger.detach()
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
    const keyboardClefApplied = await window.webContents.executeJavaScript(`
      document.querySelector('select[aria-label="마디 시작 음자리표"]').value === 'bass' &&
      document.querySelector('button[aria-label="선택 마디 시작에 낮은음자리표 적용"]').getAttribute('aria-pressed') === 'true'
    `)
    await window.webContents.executeJavaScript(`
      window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ctrlKey: true, key: 'z', code: 'KeyZ' }))
    `)
    await new Promise((resolve) => setTimeout(resolve, 100))
    const keyboardClefUndone = await window.webContents.executeJavaScript(`
      document.querySelector('select[aria-label="마디 시작 음자리표"]').value === 'treble'
    `)
    if (!keyboardClefApplied || !keyboardClefUndone) {
      throw new Error('Clef palette keyboard activation failed: ' + JSON.stringify({ width, keyboardClefApplied, keyboardClefUndone }))
    }

    const result = await window.webContents.executeJavaScript(`
      (async () => {
        const wait = () => new Promise((resolve) => setTimeout(resolve, 100))
        const clickByName = (name) => {
          const button = [...document.querySelectorAll('button')]
            .find((candidate) =>
              candidate.getAttribute('aria-label') === name || candidate.textContent.trim() === name
            )
          if (!button) throw new Error('Missing button: ' + name)
          button.click()
          return button
        }
        const palette = () => document.querySelector('.selection-toolbar[aria-label="표기 객체"]')
        const region = (name) => document.querySelector('section[aria-label="' + name + '"]')
        const runSearchCommand = async (label) => {
          window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ctrlKey: true, code: 'KeyK', key: 'k' }))
          await wait()
          const input = document.querySelector('input[aria-label="명령 검색어"]')
          if (!input) throw new Error('Command palette did not open')
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, label)
          input.dispatchEvent(new Event('input', { bubbles: true }))
          await wait()
          input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }))
          await wait()
        }
        const visible = (element) => {
          const style = getComputedStyle(element)
          const box = element.getBoundingClientRect()
          return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0
        }

        clickByName('파일')
        await wait()
        clickByName('작업 도구 접기')
        await wait()
        await runSearchCommand('표기 도구 열기')
        const toolbar = palette()
        const commandRestoredToolbar = visible(toolbar) &&
          !visible(document.querySelector('[role="region"][aria-label="파일 작업"]'))
        const resizeHandles = [...document.querySelectorAll('.dock-resize-handle')]
        const compactResizeHandlesHidden =
          window.innerWidth > 1200 || resizeHandles.every((handle) => !visible(handle))
        const lines = region('라인과 범위 기호')
        const noteSymbols = region('음표 기호 팔레트')
        const repeats = region('반복과 볼타')
        if (!toolbar || !lines || !noteSymbols || !repeats) throw new Error('Notation palette regions are missing')
        const defaultDenseFamiliesCollapsed =
          noteSymbols.getAttribute('data-collapsed') === 'true' &&
          repeats.getAttribute('data-collapsed') === 'true'
        clickByName('음표 기호 팔레트 펼치기')
        await wait()

        const sourceFavorite = [...noteSymbols.querySelectorAll('button')]
          .find((button) => button.getAttribute('aria-label') === '악센트 즐겨찾기에 추가')
        if (!sourceFavorite) throw new Error('Source notation favorite control is missing')
        sourceFavorite.click()
        await wait()
        const sourceFavorites = region('즐겨찾는 표기')
        if (!sourceFavorites) throw new Error('Source notation favorite was not pinned')
        clickByName('악센트 적용')
        await wait()
        const recent = region('최근 사용 표기')
        const recentAccent = recent && [...recent.querySelectorAll('button')]
          .find((button) => button.getAttribute('aria-label') === '최근 사용: 악센트 적용')
        if (!recentAccent) throw new Error('Recent notation palette item is missing')
        const favorites = region('즐겨찾는 표기')
        const favoritesAccent = favorites && [...favorites.querySelectorAll('button')]
          .find((button) => button.getAttribute('aria-label') === '즐겨찾기: 악센트 적용')
        if (!favoritesAccent) throw new Error('Pinned notation favorite is missing')
        const primaryBeforeSaved =
          Boolean(noteSymbols.compareDocumentPosition(favorites) & Node.DOCUMENT_POSITION_FOLLOWING) &&
          Boolean(noteSymbols.compareDocumentPosition(recent) & Node.DOCUMENT_POSITION_FOLLOWING)
        const recentToolbarOverflow = toolbar.scrollWidth > toolbar.clientWidth + 1

        const oneAtATime = document.querySelector('input[aria-label="한 번에 하나씩 팔레트 보기"]')
        if (!oneAtATime || oneAtATime.disabled) throw new Error('One-at-a-time workspace control is unavailable')
        oneAtATime.click()
        await wait()
        clickByName('음표 기호 팔레트 펼치기')
        await wait()

        const moved = clickByName('음표 기호 팔레트 위로 이동')
        await wait()
        const search = document.querySelector('input[aria-label="기호 검색"]')
        if (!search) throw new Error('Palette search is missing')
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(search, '트릴')
        search.dispatchEvent(new Event('input', { bubbles: true }))
        await wait()

        const visibleControls = [...toolbar.querySelectorAll('button, input, select')]
          .filter(visible)
        const toolbarBox = toolbar.getBoundingClientRect()
        const horizontalEscape = visibleControls.some((control) => {
          const box = control.getBoundingClientRect()
          return box.left < toolbarBox.left - 1 || box.right > toolbarBox.right + 1
        })
        clickByName('팔레트 숨기기')
        await wait()
        await runSearchCommand('표기 객체 팔레트 열기')
        const dockedPalette = document.querySelector('aside[aria-label="고정 팔레트"]')
        const commandRestoredDock = visible(dockedPalette) &&
          !document.querySelector('[role="dialog"][aria-label="명령 검색"]') &&
          document.activeElement === dockedPalette
        const notationOnlyDock = !dockedPalette.querySelector('.docked-palette__actions') &&
          ![...dockedPalette.querySelectorAll('button')].some((button) =>
            /^(악보|음표|표기 객체|가사) 팔레트 열기$/.test(button.getAttribute('aria-label') || ''))
        const dockedDynamics = dockedPalette.querySelector('section[aria-label="셈여림 팔레트"]')
        if (!dockedDynamics) throw new Error('Docked dynamics palette is missing')
        const dockedDynamicTileWidths = [...dockedDynamics.querySelectorAll('.docked-palette__symbol-grid button')]
          .map((button) => button.getBoundingClientRect().width)
        const dockedCompactDynamicTiles = window.innerWidth > 1100 ||
          Math.max(...dockedDynamicTileWidths) <= 72
        const dockedMeasureNotationCollapse = [...dockedPalette.querySelectorAll('button')]
          .find((button) => button.getAttribute('aria-label') === '마디 표기 팔레트 접기')
        if (!dockedMeasureNotationCollapse) throw new Error('Docked measure notation close control is missing')
        const dockedMeasureNotationDefaultExpanded =
          dockedMeasureNotationCollapse.getAttribute('aria-expanded') === 'true'
        const dockedMeasureSettingsEntry = [...dockedPalette.querySelectorAll('button')]
          .find((button) => button.getAttribute('aria-label') === '음자리표, 조표 및 박자표 설정 열기')
        if (!dockedMeasureSettingsEntry) throw new Error('Docked measure settings entry is missing')
        const measureGrid = dockedMeasureSettingsEntry.closest('.docked-palette__symbol-grid')
        const measureGridBox = measureGrid.getBoundingClientRect()
        const measureTileMaxHeight = Math.max(...[...measureGrid.querySelectorAll('button')]
          .map((button) => button.getBoundingClientRect().height))
        const expandedMeasureTilesContained = [...measureGrid.querySelectorAll('button')].every((button) => {
          const box = button.getBoundingClientRect()
          return box.left >= measureGridBox.left - 1 && box.right <= measureGridBox.right + 1 &&
            button.scrollWidth <= button.clientWidth + 1
        })
        const compactGridDeclarationValid = CSS.supports(
          'grid-template-columns', 'repeat(auto-fit, minmax(48px, max-content))'
        )
        dockedMeasureSettingsEntry.click()
        await wait()
        const dockedMeasureSettingsFocus = document.activeElement?.getAttribute('aria-label') === '선택 마디부터 조표'
        const measureClef = document.querySelector('select[aria-label="마디 시작 음자리표"]')
        const dockedMeasureClefAvailable = Boolean(measureClef && visible(measureClef) && !measureClef.disabled)
        if (!visible(dockedPalette)) {
          document.querySelector('#dock-tab-palette').click()
          await wait()
        }
        const dockedTempoEntry = [...dockedPalette.querySelectorAll('button')]
          .find((button) => button.getAttribute('aria-label') === '빠르기 설정 열기')
        if (!dockedTempoEntry) throw new Error('Docked tempo settings entry is missing')
        dockedTempoEntry.click()
        await wait()
        const dockedTempoFocus = document.activeElement?.getAttribute('aria-label') === '빠르기'
        dockedMeasureNotationCollapse.click()
        await wait()
        const dockedMeasureNotationExpand = [...dockedPalette.querySelectorAll('button')]
          .find((button) => button.getAttribute('aria-label') === '마디 표기 팔레트 펼치기')
        if (!dockedMeasureNotationExpand) throw new Error('Docked measure notation expand control is missing')
        const dockedArticulationToggle = [...dockedPalette.querySelectorAll('button')]
          .find((button) => button.getAttribute('aria-label') === '아티큘레이션 팔레트 펼치기')
        if (!dockedArticulationToggle) throw new Error('Docked articulation expand control is missing')
        const dockedArticulationsDefaultCollapsed =
          dockedArticulationToggle.getAttribute('aria-expanded') === 'false'
        dockedArticulationToggle.click()
        await wait()
        const dockedArticulationCollapse = [...dockedPalette.querySelectorAll('button')]
          .find((button) => button.getAttribute('aria-label') === '아티큘레이션 팔레트 접기')
        if (!dockedArticulationCollapse) throw new Error('Docked articulation close control is missing')
        dockedArticulationCollapse.click()
        await wait()
        const dockedOverflow = dockedPalette.scrollWidth > dockedPalette.clientWidth + 1
        const state = {
          width: window.innerWidth,
          compactResizeHandlesHidden,
          documentOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
          toolbarOverflow: toolbar.scrollWidth > toolbar.clientWidth + 1,
          horizontalEscape,
          noteOrder: noteSymbols.getAttribute('data-palette-order'),
          linesOrder: lines.getAttribute('data-palette-order'),
          noteCollapsed: noteSymbols.getAttribute('data-collapsed'),
          linesVisible: Boolean(region('라인과 범위 기호')),
          defaultDenseFamiliesCollapsed,
          primaryBeforeSaved,
          recentVisibleAfterSearch: Boolean(region('최근 사용 표기')),
          favoritesVisibleAfterSearch: Boolean(region('즐겨찾는 표기')),
          recentToolbarOverflow,
          oneAtATimeDisabledDuringSearch: oneAtATime.disabled,
          moveDisabledDuringSearch: moved.disabled,
          trillVisible: Boolean(document.querySelector('button[aria-label="트릴 꾸밈음 기호 적용"]')),
          dockedCompactDynamicTiles,
          commandRestoredDock,
          commandRestoredToolbar,
          notationOnlyDock,
          dockedDynamicTileWidths,
          dockedMeasureNotationDefaultExpanded,
          dockedMeasureSettingsFocus,
          dockedMeasureClefAvailable,
          expandedMeasureTilesContained,
          measureTileMaxHeight,
          compactGridDeclarationValid,
          dockedTempoFocus,
          dockedMeasureNotationCollapsed: dockedMeasureNotationExpand.getAttribute('aria-expanded') === 'false',
          dockedMeasureNotationEntryVisibleAfterCollapse: Boolean(dockedPalette.querySelector('button[aria-label="음자리표, 조표 및 박자표 설정 열기"]')),
          clefTilesVisibleAfterCollapse: Boolean(dockedPalette.querySelector('.docked-palette__clef-grid')),
          dockedArticulationsDefaultCollapsed,
          dockedArticulationsCollapsed: dockedArticulationCollapse.getAttribute('aria-expanded') === 'false',
          dockedStaccatoVisibleAfterCollapse: Boolean(dockedPalette.querySelector('button[aria-label="스타카토 적용"]')),
          dockedOrnamentVisibleAfterCollapse: Boolean(dockedPalette.querySelector('button[aria-label="트릴 적용"]')),
          dockedOverflow,
          storedDockedSections: localStorage.getItem('chromatics.docked-palette-sections.v1'),
          storedOneAtATime: localStorage.getItem('chromatics.notation-palette-one-at-a-time.v1'),
          storedOrder: localStorage.getItem('chromatics.notation-palette-panel-order.v1'),
          storedRecentItems: localStorage.getItem('chromatics.notation-palette-recent-items.v1'),
          storedFavoriteItems: localStorage.getItem('chromatics.notation-palette-favorite-items.v1')
        }
        return state
      })()
    `)

    if (
      result.width !== width ||
      !result.compactResizeHandlesHidden ||
      result.documentOverflow ||
      result.toolbarOverflow ||
      result.horizontalEscape ||
      result.noteOrder !== '0' ||
      result.linesOrder !== '1' ||
      result.noteCollapsed !== 'false' ||
      result.linesVisible ||
      !result.defaultDenseFamiliesCollapsed ||
      !result.primaryBeforeSaved ||
      result.recentVisibleAfterSearch ||
      result.favoritesVisibleAfterSearch ||
      result.recentToolbarOverflow ||
      !result.oneAtATimeDisabledDuringSearch ||
      !result.moveDisabledDuringSearch ||
      !result.trillVisible ||
      !result.dockedCompactDynamicTiles ||
      !result.commandRestoredDock ||
      !result.commandRestoredToolbar ||
      !result.notationOnlyDock ||
      !result.dockedMeasureNotationDefaultExpanded ||
      !result.dockedMeasureSettingsFocus ||
      !result.dockedMeasureClefAvailable ||
      !result.expandedMeasureTilesContained ||
      result.measureTileMaxHeight > 56 ||
      !result.compactGridDeclarationValid ||
      !result.dockedTempoFocus ||
      !result.dockedMeasureNotationCollapsed ||
      result.dockedMeasureNotationEntryVisibleAfterCollapse ||
      result.clefTilesVisibleAfterCollapse ||
      !result.dockedArticulationsDefaultCollapsed ||
      !result.dockedArticulationsCollapsed ||
      result.dockedStaccatoVisibleAfterCollapse ||
      result.dockedOrnamentVisibleAfterCollapse ||
      result.dockedOverflow ||
      result.storedDockedSections !== '{"measureNotation":true,"dynamics":false,"articulations":true,"ornaments":true}' ||
      result.storedOneAtATime !== 'true' ||
      result.storedOrder !== '["noteSymbols","lines","measureNotation","repeats"]' ||
      result.storedRecentItems !== '["articulation:accent"]' ||
      result.storedFavoriteItems !== '["articulation:accent"]'
    ) {
      throw new Error(`Notation palette workspace verification failed: ${JSON.stringify(result)}`)
    }

    const screenshot = path.join(app.getPath('temp'), `chromatics-v1-notation-palette-${width}.png`)
    fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG())
    captures.push({ width, screenshot, initialScreenshot, initialTempo, keyboardClefApplied, keyboardClefUndone, ...result })
  }

  return captures
}

async function verifyPartViewHeadlessExportState(window) {
  await loadFixture(window)
  window.setSize(1400, 900)
  await new Promise((resolve) => setTimeout(resolve, 500))

  const result = await window.webContents.executeJavaScript(`
    (async () => {
      const wait = () => new Promise((resolve) => setTimeout(resolve, 120))
      const setSelectValue = (select, value) => {
        if (!select) {
          throw new Error('Select control not found.')
        }

        const setter = Object.getOwnPropertyDescriptor(
          HTMLSelectElement.prototype,
          'value'
        ).set
        setter.call(select, value)
        select.dispatchEvent(new Event('change', { bubbles: true }))
      }
      const chooseScoreStructure = (value) => {
        const option = document.querySelector(
          \`.new-score-template-option[data-template-id="\${value}"]\`
        )
        if (!option) {
          throw new Error('New score structure option not found: ' + value)
        }
        option.click()
      }
      const clickToolbar = async (label) => {
        await window.__qaOpenEditingSurface(label)
        await wait()
      }
      const expandScoreStructure = async () => {
        const button = document.querySelector(
          'button[aria-label="파트와 보표 펼치기"]'
        )

        if (button) {
          button.click()
          await wait()
          return
        }

        if (!document.querySelector('select[aria-label="악보 보기"]')) {
          throw new Error('Score structure disclosure control not found.')
        }
      }
      const openNewScore = async () => {
        document
          .querySelector('button[aria-label="새 악보 만들기"]')
          ?.click()
        await wait()

        chooseScoreStructure('string-quartet')
        await wait()
        document
          .querySelector('form[aria-label="새 악보 만들기"]')
          ?.dispatchEvent(
            new SubmitEvent('submit', {
              bubbles: true,
              cancelable: true
            })
          )
        await new Promise((resolve) => setTimeout(resolve, 350))
      }

      await openNewScore()
      await clickToolbar('악보')
      await expandScoreStructure()
      setSelectValue(
        document.querySelector('select[aria-label="악보 보기"]'),
        'part'
      )
      await wait()
      setSelectValue(
        document.querySelector('select[aria-label="파트보 선택"]'),
        'viola'
      )
      await wait()
      await clickToolbar('내보내기')
      setSelectValue(
        document.querySelector('select[aria-label="PDF 설정 프리셋"]'),
        'compact-parts'
      )
      await wait()

      const page = document.querySelector('.score-page')
      const partTitle = document.querySelector('[aria-label="파트보 제목"]')
      const partIds = [
        ...new Set(
          [...document.querySelectorAll('.notation-event')]
            .map((event) => event.getAttribute('data-part-id'))
            .filter(Boolean)
        )
      ]
      const staffLabels = [
        ...document.querySelectorAll('.notation-staff-label')
      ].map((label) => ({
        partId: label.getAttribute('data-part-id'),
        staffId: label.getAttribute('data-staff-id'),
        text: label.textContent?.trim()
      }))

      return {
        exportButtons: [
          ...document.querySelectorAll('.export-actions button')
        ].map((button) => ({
          ariaLabel: button.getAttribute('aria-label'),
          title: button.getAttribute('title'),
          text: button.textContent.trim()
        })),
        page: {
          margin: page?.getAttribute('data-pdf-page-margin-mm'),
          orientation: page?.getAttribute('data-pdf-page-orientation'),
          partId: page?.getAttribute('data-part-id'),
          size: page?.getAttribute('data-pdf-page-size'),
          staffSize: page?.getAttribute('data-pdf-staff-size-percent'),
          systemSpacing: page?.getAttribute(
            'data-pdf-system-spacing-percent'
          ),
          viewMode: page?.getAttribute('data-view-mode')
        },
        partIds,
        partTitle: {
          partId: partTitle?.getAttribute('data-part-id'),
          text: partTitle?.textContent?.trim()
        },
        staffLabels,
        status: [...document.querySelectorAll('.editor-status span')]
          .map((value) => value.textContent?.trim())
          .at(-1),
        exportQuickOpen: document
          .querySelector('.toolbar-tabs button[aria-label="내보내기"]')
          ?.getAttribute('aria-expanded')
      }
    })()
  `)

  const exportAriaLabels = result.exportButtons.map((button) => button.ariaLabel)

  if (
    result.exportQuickOpen !== 'true' ||
    result.page.viewMode !== 'part' ||
    result.page.partId !== 'viola' ||
    result.page.margin !== '6' ||
    result.page.staffSize !== '90' ||
    result.page.systemSpacing !== '90' ||
    result.partTitle.text !== 'Viola' ||
    result.partTitle.partId !== 'viola' ||
    result.partIds.join('|') !== 'viola' ||
    !result.staffLabels.every((label) => label.partId === 'viola') ||
    !exportAriaLabels.includes('PDF 변환') ||
    !exportAriaLabels.includes('MIDI 내보내기')
  ) {
    throw new Error(
      `Part view headless export state verification failed: ${JSON.stringify(result)}`
    )
  }

  return result
}

async function verifyPartXmlExportRoundTrip(window) {
  // The preceding workflow leaves a Viola part view. Intercept only file I/O;
  // App projection, serializer, parser and notation renderer remain real.
  const exported = await window.webContents.executeJavaScript(`
    (async () => {
      let request
      window.inC = {
        musicXml: { exportCopy: async input => {
          request = input
          return { fileName: input.suggestedName, filePath: '/headless/viola.musicxml' }
        } }
      }
      document.querySelector('button[aria-label="MusicXML 내보내기"]').click()
      await new Promise(resolve => setTimeout(resolve, 250))
      if (!request) throw new Error('Part XML request missing: ' + document.querySelector('.editor-status').textContent)
      const xml = new DOMParser().parseFromString(request.contents, 'application/xml')
      return {
        ...request,
        partNames: [...xml.querySelectorAll('score-part > part-name')].map(node => node.textContent),
        partCount: xml.querySelectorAll('score-partwise > part').length,
        noteCount: xml.querySelectorAll('note').length,
        parseError: Boolean(xml.querySelector('parsererror'))
      }
    })()
  `)
  if (exported.parseError || exported.partCount !== 1 ||
      exported.partNames.join('|') !== 'Viola' || exported.noteCount !== 8 ||
      !exported.suggestedName.endsWith('-viola.musicxml') || exported.filePath) {
    throw new Error('Selected part XML export failed: ' + JSON.stringify(exported))
  }
  const artifact = path.join(app.getPath('temp'), 'chromatics-headless-part-export.musicxml')
  fs.writeFileSync(artifact, exported.contents)
  const contents = fs.readFileSync(artifact, 'utf8')
  const reopened = await window.webContents.executeJavaScript(`
    (async () => {
      window.inC.musicXml.open = async () => ({
        filePath: ${JSON.stringify(artifact)},
        fileName: 'chromatics-headless-part-export.musicxml',
        contents: ${JSON.stringify(contents)}
      })
      window.inC.recentMusicXml = { add: async () => [] }
      window.inC.autosave = { clear: async () => {}, write: async () => {} }
      document.querySelector('button[aria-label="MusicXML 가져오기"]').click()
      await new Promise(resolve => setTimeout(resolve, 400))
      return {
        parts: [...document.querySelectorAll('select[aria-label="파트보 선택"] option')].map(node => node.textContent),
        events: document.querySelectorAll('.notation-event').length
      }
    })()
  `)
  if (reopened.parts.join('|') !== 'Viola' || reopened.events !== 8) {
    throw new Error('Part XML renderer reopen failed: ' + JSON.stringify(reopened))
  }
  return { artifact, partNames: exported.partNames, noteCount: exported.noteCount, reopened }
}

async function verifyPersistentNoteToolbar(window) {
  const viewports = []
  for (const width of [960, 1400]) {
    await loadFixture(window, 'release-test')
    window.setSize(width, 720)
    await new Promise(resolve => setTimeout(resolve, 150))
    const read = () => window.webContents.executeJavaScript(`(() => {
      const bar = document.querySelector('.note-entry-toolbar')
      const box = bar.getBoundingClientRect()
      const controls = [...bar.querySelectorAll('button, select, output')]
      const style = getComputedStyle(bar)
      const groups = [...bar.children].filter(item => item.getClientRects().length)
      const twoRowHeight = 2 * Math.max(...groups.map(item => {
        const itemStyle = getComputedStyle(item)
        return item.getBoundingClientRect().height + parseFloat(itemStyle.marginTop) + parseFloat(itemStyle.marginBottom)
      })) +
        (parseFloat(style.rowGap) || 0) + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) +
        parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)
      const contained = controls.every(item => {
        const rect = item.getBoundingClientRect()
        return rect.width > 0 && rect.left >= box.left && rect.right <= box.right && rect.top >= box.top && rect.bottom <= box.bottom
      })
      return {
        height: box.height, twoRowHeight, contained,
        labels: controls.map(item => item.getAttribute('aria-label')).filter(Boolean),
        events: [...document.querySelectorAll('.notation-preview .notation-event')].map(item => item.dataset.eventId).join('|'),
        selected: document.querySelector('.notation-event.is-selected')?.dataset.eventId,
        inputActive: bar.querySelector('[aria-label="음표 입력"]').getAttribute('aria-pressed'),
        overflow: document.documentElement.scrollWidth > innerWidth + 1 || document.documentElement.scrollHeight > innerHeight + 1,
        canvasHeight: document.querySelector('.score-canvas').getBoundingClientRect().height,
        focused: document.activeElement.getAttribute('aria-label'),
        playDisabled: document.querySelector('.transport-controls [aria-label="재생"]').disabled
      }
    })()`)
    const initial = await read()
    const modes = []
    for (const label of ['악보', '표기 객체', '가사', '파일', '내보내기']) {
      await window.webContents.executeJavaScript(`window.__qaOpenEditingSurface('${label}')`)
      await new Promise(resolve => setTimeout(resolve, 100))
      const state = await read()
      if (!state.contained || !Number.isFinite(state.twoRowHeight) || state.height > state.twoRowHeight + 1 || Math.abs(state.height - initial.height) > 1 || state.overflow || state.canvasHeight < 150 || state.events !== initial.events || state.selected !== initial.selected) throw new Error('Persistent note toolbar ' + label + ': ' + JSON.stringify(state))
      modes.push(label)
    }
    const durationSymbols = await window.webContents.executeJavaScript(`(async () => {
      await document.fonts.ready
      return [...document.querySelectorAll('.note-entry-toolbar [data-duration-symbol]')].map(svg => {
        const text = svg.querySelector('text')
        const style = getComputedStyle(text)
        const canvas = document.createElement('canvas')
        canvas.width = 256
        canvas.height = 256
        const context = canvas.getContext('2d')
        context.font = style.fontSize + ' ' + style.fontFamily
        context.textAlign = 'center'
        context.fillText(text.textContent, 128, 128)
        const pixels = context.getImageData(0, 0, 256, 256).data
        let left = 256, top = 256, right = -1, bottom = -1, inkPixels = 0
        for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
          if (pixels[(y * 256 + x) * 4 + 3] > 0) {
            left = Math.min(left, x); right = Math.max(right, x)
            top = Math.min(top, y); bottom = Math.max(bottom, y)
            inkPixels++
          }
        }
        const svgX = Number(text.getAttribute('x')), svgY = Number(text.getAttribute('y'))
        const ink = { left: svgX + left - 128, right: svgX + right + 1 - 128,
          top: svgY + top - 128, bottom: svgY + bottom + 1 - 128 }
        const box = svg.viewBox.baseVal
        return {
          duration: svg.dataset.durationSymbol, codePoint: text.textContent.codePointAt(0),
          font: style.fontFamily, fontLoaded: document.fonts.check(style.fontSize + ' Bravura', text.textContent),
          inkPixels, ink, contained: ink.left >= 0 && ink.top >= 0 && ink.right <= box.width && ink.bottom <= box.height,
          width: svg.getBoundingClientRect().width, height: svg.getBoundingClientRect().height
        }
      })
    })()`)
    const durationCodes = { whole: 0xe1d2, half: 0xe1d3, quarter: 0xe1d5, eighth: 0xe1d7, '16th': 0xe1d9, '32nd': 0xe1db, '64th': 0xe1dd }
    if (durationSymbols.length !== 7 || durationSymbols.some(symbol => !symbol.contained || !symbol.fontLoaded || symbol.inkPixels < 10 || symbol.codePoint !== durationCodes[symbol.duration] || symbol.width !== 22 || symbol.height !== 26)) throw new Error('Duration symbol rendering: ' + JSON.stringify(durationSymbols))
    await window.webContents.executeJavaScript(`document.querySelector('.note-entry-toolbar [aria-label="음표 입력"]').focus()`)
    const key = async (value, code, keyCode, text) => {
      window.webContents.debugger.attach('1.3')
      try {
        await window.webContents.debugger.sendCommand('Input.dispatchKeyEvent', { type: 'keyDown', key: value, code, windowsVirtualKeyCode: keyCode, ...(text ? { text } : {}) })
        await window.webContents.debugger.sendCommand('Input.dispatchKeyEvent', { type: 'keyUp', key: value, code, windowsVirtualKeyCode: keyCode })
      } finally { window.webContents.debugger.detach() }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    await key('Enter', 'Enter', 13, '\r')
    const entered = await read()
    if (entered.inputActive !== 'true' || entered.events !== initial.events || entered.playDisabled) throw new Error('Enter input mode: ' + JSON.stringify(entered))
    await window.webContents.executeJavaScript(`const button = document.querySelector('.note-entry-toolbar [aria-label="8분음표"]'); button.click(); button.focus()`)
    await key('d', 'KeyD', 68, 'd')
    const inserted = await read()
    if (inserted.events === initial.events) throw new Error('Toolbar focus swallowed note entry: ' + JSON.stringify(inserted))
    await key('Escape', 'Escape', 27)
    const exited = await read()
    if (exited.inputActive !== 'false') throw new Error('Input Escape failed: ' + JSON.stringify(exited))
    await window.webContents.executeJavaScript(`document.querySelector('.note-entry-toolbar [aria-label="음표 입력"]').focus()`)
    const beforeTab = await read()
    await key('Tab', 'Tab', 9)
    const afterTab = await read()
    if (afterTab.focused === beforeTab.focused || afterTab.selected !== beforeTab.selected || afterTab.events !== beforeTab.events) throw new Error('Input toolbar Tab routed to score: ' + JSON.stringify(afterTab))
    const screenshot = path.join(app.getPath('temp'), 'chromatics-v1-persistent-note-toolbar-' + width + '.png')
    fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG())
    viewports.push({ width, initial, modes, durationSymbols, entered, inserted, exited, afterTab, screenshot })
  }
  return viewports
}

async function verifyPersistentTransport(window) {
  const viewports = []
  for (const width of [960, 1400]) {
    await loadFixture(window, 'release-test')
    window.setSize(width, 720)
    await new Promise(resolve => setTimeout(resolve, 150))
    const read = () => window.webContents.executeJavaScript(`(() => {
      const toolbar = document.querySelector('[role="toolbar"][aria-label="재생 컨트롤"]')
      const canvas = document.querySelector('.score-canvas').getBoundingClientRect()
      const mixer = document.querySelector('#part-mixer-panel')
      const mixerBox = mixer.getBoundingClientRect()
      const menu = document.querySelector('[role="menubar"]')?.getBoundingClientRect()
      const box = toolbar?.getBoundingClientRect()
      return {
        transportCount: document.querySelectorAll('[role="toolbar"][aria-label="재생 컨트롤"]').length,
        controls: [...toolbar.querySelectorAll('button')].map(button => ({label: button.getAttribute('aria-label'), disabled: button.disabled})),
        contained: !!box && box.left >= 0 && box.right <= innerWidth && box.bottom <= 100 && box.left >= menu.right,
        mixerOpen: !mixer.hidden,
        mixerBelowScore: !mixer.hidden && Math.abs(mixerBox.top - canvas.bottom) <= 1,
        mixerHeight: mixerBox.height,
        canvasHeight: canvas.height,
        mixerBeforeStatus: mixerBox.bottom <= document.querySelector('.editor-status').getBoundingClientRect().top + 1,
        overflow: document.documentElement.scrollWidth > innerWidth + 1 || document.documentElement.scrollHeight > innerHeight + 1,
        selectedEvent: document.querySelector('.notation-event.is-selected')?.dataset.eventId,
        edits: [...document.querySelectorAll('.editor-status span')].find(item => item.textContent.endsWith('회 수정'))?.textContent
      }
    })()`)
    const initial = await read()
    if (initial.transportCount !== 1 || !initial.contained || initial.overflow || initial.mixerOpen) throw new Error('Initial persistent transport: ' + JSON.stringify(initial))
    const modes = []
    for (const label of ['악보', '음표', '표기 객체', '가사', '파일', '내보내기']) {
      await window.webContents.executeJavaScript(`window.__qaOpenEditingSurface('${label}')`)
      await new Promise(resolve => setTimeout(resolve, 80))
      const state = await read()
      if (!state.contained || state.overflow || state.transportCount !== 1) throw new Error('Transport mode ' + label + ': ' + JSON.stringify(state))
      modes.push(label)
    }
    await window.webContents.executeJavaScript(`document.querySelector('[aria-controls="part-mixer-panel"]').focus()`)
    window.webContents.debugger.attach('1.3')
    try {
      await window.webContents.debugger.sendCommand('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32, text: ' ' })
      await window.webContents.debugger.sendCommand('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 })
    } finally { window.webContents.debugger.detach() }
    await new Promise(resolve => setTimeout(resolve, 100))
    const opened = await read()
    if (!opened.mixerOpen || !opened.mixerBelowScore || !opened.mixerBeforeStatus || opened.mixerHeight > 180 || opened.canvasHeight < 200 || opened.overflow || opened.edits !== initial.edits || opened.selectedEvent !== initial.selectedEvent || opened.controls.find(item => item.label === '재생').disabled) throw new Error('Keyboard mixer opening: ' + JSON.stringify(opened))
    await window.webContents.executeJavaScript(`window.__qaOpenEditingSurface('음표')`)
    await new Promise(resolve => setTimeout(resolve, 100))
    const editing = await read()
    if (!editing.mixerOpen || !editing.mixerBelowScore) throw new Error('Mixer lost during editing: ' + JSON.stringify(editing))
    const screenshot = path.join(app.getPath('temp'), 'chromatics-v1-persistent-transport-' + width + '.png')
    fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG())
    window.webContents.debugger.attach('1.3')
    let printHidden
    try {
      await window.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { media: 'print' })
      printHidden = await window.webContents.executeJavaScript(`!document.querySelector('.transport-controls').getClientRects().length && !document.querySelector('#part-mixer-panel').getClientRects().length`)
      await window.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { media: 'screen' })
    } finally { window.webContents.debugger.detach() }
    if (!printHidden) throw new Error('Transport or mixer leaked into print')
    const ensemble = await window.webContents.executeJavaScript(`(async () => {
      const wait = () => new Promise(resolve => setTimeout(resolve, 150))
      document.querySelector('.toolbar-tabs button[aria-label="파일"]').click()
      await wait()
      document.querySelector('button[aria-label="새 악보 만들기"]').click()
      await wait()
      document.querySelector('.new-score-template-option[data-template-id="string-quartet"]').click()
      await wait()
      document.querySelector('form[aria-label="새 악보 만들기"]').dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))
      await wait()
      await window.__qaOpenEditingSurface('음표')
      const toggle = document.querySelector('[aria-controls="part-mixer-panel"]')
      if (toggle.getAttribute('aria-expanded') !== 'true') toggle.click()
      await wait()
      const mixer = document.querySelector('#part-mixer-panel')
      const tracks = [...mixer.querySelectorAll('.part-mixer__row')]
      const volume = tracks.at(-1).querySelector('input[type="range"]')
      volume.focus()
      await wait()
      const box = mixer.getBoundingClientRect()
      const last = volume.getBoundingClientRect()
      return {
        tracks: tracks.length, height: box.height, viewportHeight: innerHeight,
        scrollHeight: mixer.scrollHeight, scrollTop: mixer.scrollTop,
        lastVolumeReachable: last.top >= box.top && last.bottom <= box.bottom,
        focusedLastVolume: document.activeElement === volume,
        horizontalOverflow: mixer.scrollWidth > mixer.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth + 1,
        canvasHeight: document.querySelector('.score-canvas').getBoundingClientRect().height
      }
    })()`)
    if (ensemble.tracks !== 4 || ensemble.height > ensemble.viewportHeight / 4 + 1 || !ensemble.lastVolumeReachable || !ensemble.focusedLastVolume || ensemble.horizontalOverflow || ensemble.canvasHeight < 200) throw new Error('Ensemble mixer containment: ' + JSON.stringify(ensemble))
    viewports.push({ width, initial, modes, opened, editing, printHidden, screenshot, ensemble })
  }
  return viewports
}

async function verifyPlaybackMixerHeadlessState(window) {
  await loadFixture(window)
  window.setSize(1280, 900)
  await new Promise((resolve) => setTimeout(resolve, 400))

  const result = await window.webContents.executeJavaScript(`
    (async () => {
      const wait = () => new Promise((resolve) => setTimeout(resolve, 120))
      document.querySelector('button[aria-controls="part-mixer-panel"]')?.click()
      await wait()

      const volume = document.querySelector('input[aria-label="Melody 볼륨"]')
      if (volume) {
        const setter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value'
        ).set
        setter.call(volume, '75')
        volume.dispatchEvent(new Event('input', { bubbles: true }))
        volume.dispatchEvent(new Event('change', { bubbles: true }))
      }
      document.querySelector('button[aria-label="재생"]')?.click()
      await new Promise((resolve) => setTimeout(resolve, 600))

      const activity = document.querySelector(
        '[aria-label="Melody 재생 상태"]'
      )
      const row = activity?.closest('.part-mixer__row')

      return {
        activity: activity?.textContent?.trim(),
        active: row?.getAttribute('data-playback-active'),
        mixerStorage: JSON.parse(
          window.localStorage.getItem('chromatics.part-mixer.v1') ?? '{}'
        ),
        transportVisible: !!document.querySelector('.transport-controls')?.getClientRects().length,
        mixerExpanded: document
          .querySelector('button[aria-controls="part-mixer-panel"]')
          ?.getAttribute('aria-expanded'),
        volumeText: row?.querySelector('.part-mixer__volume output')
          ?.textContent?.trim()
      }
    })()
  `)

  if (
    !result.transportVisible ||
    result.mixerExpanded !== 'true' ||
    result.volumeText !== '75%' ||
    result.mixerStorage['part-1']?.volume !== 0.75 ||
    !['재생 중', '대기'].includes(result.activity) ||
    !['true', 'false'].includes(result.active)
  ) {
    throw new Error(
      `Playback mixer headless state verification failed: ${JSON.stringify(result)}`
    )
  }

  return result
}

async function verifyNewScoreWizard(window) {
  await loadFixture(window)

  await executeMetadataStep(
    window,
    'open new score wizard',
    `
    document.querySelector('button[aria-label="새 악보 만들기"]')?.click()
  `
  )
  await new Promise((resolve) => setTimeout(resolve, 150))
  await executeMetadataStep(
    window,
    'fill new score wizard',
    `
    const setInputValue = (input, value) => {
      if (!input) {
        throw new Error('New score input not found.')
      }

      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value'
      ).set
      setter.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
    const setSelectValue = (select, value) => {
      if (!select) {
        throw new Error('New score select not found.')
      }

      const setter = Object.getOwnPropertyDescriptor(
        HTMLSelectElement.prototype,
        'value'
      ).set
      setter.call(select, value)
      select.dispatchEvent(new Event('change', { bubbles: true }))
    }
    const labels = [...document.querySelectorAll('.new-score-form label')]
    const field = (name) =>
      labels.find((label) => label.textContent?.includes(name))
        ?.querySelector('input, select')

    setInputValue(field('제목'), '새 출발')
    setInputValue(field('작곡가'), '김작곡')
    setSelectValue(field('조표'), 'd-major')
    setSelectValue(field('박자표'), '3-4')
    setInputValue(field('마디 수'), '3')
    setInputValue(field('빠르기'), '96')
    document
      .querySelector('form[aria-label="새 악보 만들기"]')
      ?.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))
  `
  )
  await new Promise((resolve) => setTimeout(resolve, 300))

  const result = await window.webContents.executeJavaScript(`
    (() => {
      const statusValues = [
        ...document.querySelectorAll('.editor-status span')
      ].map((value) => value.textContent?.trim())
      const selectedEvent = document
        .querySelector('.notation-event.is-selected')
        ?.getAttribute('data-event-id')
      const selectedMeasure = selectedEvent
        ? selectedEvent.match(/^measure-(\\d+)/)?.[1]
        : document
            .querySelector('.notation-measure.is-selected')
            ?.getAttribute('data-measure-id')
            ?.match(/^measure-(\\d+)/)?.[1]
      const selectedRest = document.querySelector(
        '.notation-event[data-event-id="measure-1-full-measure-rest"]'
      )
      const selectedMeasureElement = document.querySelector(
        '.notation-measure[data-measure-id="measure-1"]'
      )
      const svg = document.querySelector('.notation-preview svg')
      const svgBox = svg?.getBoundingClientRect()
      const restBox = selectedRest?.getBoundingClientRect()
      const svgWidth = Number(svg?.getAttribute('width'))
      const renderedSvgWidth = svgBox?.width ?? 0
      const svgScale =
        Number.isFinite(svgWidth) && svgWidth > 0
          ? renderedSvgWidth / svgWidth
          : 1
      const noteStartX = Number(
        selectedMeasureElement?.getAttribute('data-full-measure-rest-start-x')
      )
      const noteEndX = Number(
        selectedMeasureElement?.getAttribute('data-full-measure-rest-end-x')
      )
      const fullRestCenterDelta =
        restBox &&
        svgBox &&
        Number.isFinite(noteStartX) &&
        Number.isFinite(noteEndX)
          ? Math.abs(
              restBox.x -
                svgBox.x +
                restBox.width / 2 -
                ((noteStartX + noteEndX) / 2) * svgScale
            )
          : undefined

      return {
        title: document
          .querySelector('button[aria-label="악보 제목 수정"]')
          ?.textContent?.trim(),
        composer: document
          .querySelector('button[aria-label="작곡가 수정"]')
          ?.textContent?.trim(),
        measureCount: document.querySelectorAll('.notation-measure').length,
        eventCount: document.querySelectorAll('.notation-event').length,
        selectedEvent,
        selectedMeasure,
        tempo: document
          .querySelector('section[aria-label="빠르기"] output')
          ?.textContent?.trim(),
        fullRestCenterDelta,
        status: statusValues.at(-1),
        dialogOpen: Boolean(
          document.querySelector('form[aria-label="새 악보 만들기"]')
        )
      }
    })()
  `)

  if (
    result.title !== '새 출발' ||
    result.composer !== '김작곡' ||
    result.measureCount !== 3 ||
    result.eventCount !== 3 ||
    result.selectedEvent !== 'measure-1-full-measure-rest' ||
    result.selectedMeasure !== '1' ||
    result.tempo !== '96 BPM' ||
    typeof result.fullRestCenterDelta !== 'number' ||
    result.fullRestCenterDelta > 12 ||
    result.status !== '새 악보를 만들었습니다.' ||
    result.dialogOpen
  ) {
    throw new Error(
      `New score wizard verification failed: ${JSON.stringify(result)}`
    )
  }

  return result
}

async function verifyGrandStaffPreview(window) {
  // score-setup.create-grand-staff-score
  // layout.multi-staff-notation-object-anchoring
  await loadFixture(window)

  await executeMetadataStep(
    window,
    'open grand staff new score wizard',
    `
    document.querySelector('button[aria-label="새 악보 만들기"]')?.click()
  `
  )
  await new Promise((resolve) => setTimeout(resolve, 150))
  await executeMetadataStep(
    window,
    'fill grand staff new score wizard',
    `
    const setInputValue = (input, value) => {
      if (!input) {
        throw new Error('Grand staff input not found.')
      }

      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value'
      ).set
      setter.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
    const setSelectValue = (select, value) => {
      if (!select) {
        throw new Error('Grand staff select not found.')
      }

      const setter = Object.getOwnPropertyDescriptor(
        HTMLSelectElement.prototype,
        'value'
      ).set
      setter.call(select, value)
      select.dispatchEvent(new Event('change', { bubbles: true }))
    }
    const chooseScoreStructure = (value) => {
      const option = document.querySelector(
        \`.new-score-template-option[data-template-id="\${value}"]\`
      )
      if (!option) {
        throw new Error('Grand staff structure option not found: ' + value)
      }
      option.click()
    }
    const labels = [...document.querySelectorAll('.new-score-form label')]
    const field = (name) =>
      labels.find((label) => label.textContent?.includes(name))
        ?.querySelector('input, select')

    setInputValue(field('제목'), 'Grand Staff Smoke')
    chooseScoreStructure('piano-grand-staff')
    await new Promise((resolve) => setTimeout(resolve, 120))
    setInputValue(field('마디 수'), '3')
    document
      .querySelector('form[aria-label="새 악보 만들기"]')
      ?.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))
  `
  )
  await new Promise((resolve) => setTimeout(resolve, 450))

  const result = await runStep('grand staff preview read initial render state', () =>
    window.webContents.executeJavaScript(`
    (() => {
      const staffLabels = [
        ...document.querySelectorAll('.notation-staff-label')
      ].map((label) => ({
        text: label.textContent?.trim(),
        partId: label.getAttribute('data-part-id'),
        staffId: label.getAttribute('data-staff-id'),
        y: Number(label.getAttribute('y'))
      }))
      const passiveEvents = [
        ...document.querySelectorAll('.notation-event--passive-staff')
      ].map((event) => ({
        eventId: event.getAttribute('data-event-id'),
        partId: event.getAttribute('data-part-id'),
        staffId: event.getAttribute('data-staff-id')
      }))
      const svg = document.querySelector('.notation-preview svg')

      return {
        title: document
          .querySelector('button[aria-label="악보 제목 수정"]')
          ?.textContent?.trim(),
        measureCount: document.querySelectorAll('.notation-measure').length,
        eventCount: document.querySelectorAll('.notation-event').length,
        passiveEventCount: passiveEvents.length,
        lowerStaffMeasureCount: document.querySelectorAll('.notation-measure[data-part-id="part-1"][data-staff-id="staff-2"]').length,
        lowerStaffEventCount: passiveEvents.filter(
          (event) => event.partId === 'part-1' && event.staffId === 'staff-2'
        ).length,
        staffLabels,
        svgHeight: Number(svg?.getAttribute('height')),
        status: [...document.querySelectorAll('.editor-status span')]
          .map((value) => value.textContent?.trim())
          .at(-1)
      }
    })()
  `)
  )

  const labelTexts = result.staffLabels.map((label) => label.text)
  const staffKeys = result.staffLabels.map(
    (label) => `${label.partId}:${label.staffId}`
  )

  if (
    result.title !== 'Grand Staff Smoke' ||
    result.measureCount !== 6 ||
    result.lowerStaffMeasureCount !== 3 ||
    result.eventCount !== 6 ||
    result.passiveEventCount !== 3 ||
    result.lowerStaffEventCount !== 3 ||
    labelTexts.length !== 1 ||
    !labelTexts.includes('Piano') ||
    !staffKeys.includes('part-1:staff-1') ||
    staffKeys.includes('part-1:staff-2') ||
    result.svgHeight < 250 ||
    result.status !== '새 악보를 만들었습니다.'
  ) {
    throw new Error(
      `Grand staff preview verification failed: ${JSON.stringify(result)}`
    )
  }

  await executeMetadataStep(
    window,
    'select grand staff lower staff event',
    `
    const lowerStaffEvent = document.querySelector(
      '.notation-event--passive-staff[data-part-id="part-1"][data-staff-id="staff-2"]'
    )

    if (!lowerStaffEvent) {
      throw new Error('Lower staff event not found.')
    }

    lowerStaffEvent.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `
  )
  await new Promise((resolve) => setTimeout(resolve, 200))

  const selectedLowerStaff = await runStep('grand staff preview read lower staff selection', () =>
    window.webContents.executeJavaScript(`
    (() => {
      const selected = document.querySelector('.notation-event.is-selected')

      return {
        eventId: selected?.getAttribute('data-event-id'),
        partId: selected?.getAttribute('data-part-id'),
        staffId: selected?.getAttribute('data-staff-id')
      }
    })()
  `)
  )

  await runStep('grand staff preview toggle note input', () =>
    window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'KeyN',
        key: 'n'
      })
    )
  `)
  )
  await new Promise((resolve) => setTimeout(resolve, 150))

  await runStep('grand staff preview enter lower staff note', () =>
    window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'KeyC',
        key: 'c'
      })
    )
  `)
  )
  await new Promise((resolve) => setTimeout(resolve, 300))

  const lowerStaffInput = await runStep('grand staff preview read lower staff input', () =>
    window.webContents.executeJavaScript(`
    (() => {
      const selected = document.querySelector('.notation-event.is-selected')
      const lowerStaffEvents = [
        ...document.querySelectorAll(
          '.notation-event[data-part-id="part-1"][data-staff-id="staff-2"]'
        )
      ]
      const selectedEventId = selected?.getAttribute('data-event-id')

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith('회 수정'))
          ?.textContent?.trim(),
        eventCount: document.querySelectorAll('.notation-event').length,
        lowerStaffEventCount: lowerStaffEvents.length,
        selectedEventId,
        selectedPartId: selected?.getAttribute('data-part-id'),
        selectedStaffId: selected?.getAttribute('data-staff-id'),
        selectedIsLowerStaff: lowerStaffEvents.some(
          (event) => event.getAttribute('data-event-id') === selectedEventId
        ),
        status: [...document.querySelectorAll('.editor-status span')]
          .map((value) => value.textContent?.trim())
          .at(-1)
      }
    })()
  `)
  )

  if (
    selectedLowerStaff.partId !== 'part-1' ||
    selectedLowerStaff.staffId !== 'staff-2' ||
    lowerStaffInput.editCount === '0회 수정' ||
    lowerStaffInput.eventCount < 6 ||
    lowerStaffInput.lowerStaffEventCount < 3 ||
    lowerStaffInput.selectedPartId !== 'part-1' ||
    lowerStaffInput.selectedStaffId !== 'staff-2' ||
    !lowerStaffInput.selectedIsLowerStaff
  ) {
    throw new Error(
      `Grand staff lower staff input verification failed: ${JSON.stringify({
        selectedLowerStaff,
        lowerStaffInput
      })}`
    )
  }

  await executeMetadataStep(
    window,
    'add lower staff anchored text',
    `
    const setInputByLabel = (label, value) => {
      const input = document.querySelector(\`input[aria-label="\${label}"]\`)

      if (!input) {
        throw new Error(\`Input not found: \${label}\`)
      }

      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value'
      ).set
      input.focus()
      setter.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      input.blur()
    }

    await window.__qaOpenTextProperties('보표 글자')
    setInputByLabel('보표 글자', 'lower dolce')
  `
  )
  await new Promise((resolve) => setTimeout(resolve, 300))

  await executeMetadataStep(
    window,
    'add lower staff anchored dynamic',
    `
    const setSelectByLabel = (label, value) => {
      const select = document.querySelector(\`select[aria-label="\${label}"]\`)

      if (!select) {
        throw new Error(\`Select not found: \${label}\`)
      }

      const setter = Object.getOwnPropertyDescriptor(
        HTMLSelectElement.prototype,
        'value'
      ).set
      setter.call(select, value)
      select.dispatchEvent(new Event('change', { bubbles: true }))
    }

    await window.__qaOpenTextProperties('셈여림')
    setSelectByLabel('셈여림', 'mf')
  `
  )
  await new Promise((resolve) => setTimeout(resolve, 300))

  const lowerStaffAnnotations = await window.webContents.executeJavaScript(`
    (() => {
      const lowerMeasureId = 'part-1-staff-2-measure-1'
      const lowerStaffLabelY = Number(
        document
          .querySelector('.notation-staff-label[data-staff-id="staff-2"]')
          ?.getAttribute('y')
      )
      const read = (selector) => {
        const element = document.querySelector(selector)

        return element
          ? {
              measureId: element.getAttribute('data-measure-id'),
              text: element.textContent?.trim(),
              y: Number(element.getAttribute('y'))
            }
          : undefined
      }

      return {
        dynamic: read(
          '.notation-dynamic-mark[data-measure-id="' + lowerMeasureId + '"]'
        ),
        lowerStaffLabelY,
        staffText: read(
          '.notation-staff-text[data-measure-id="' + lowerMeasureId + '"]'
        )
      }
    })()
  `)

  if (
    lowerStaffAnnotations.staffText?.text !== 'lower dolce' ||
    lowerStaffAnnotations.dynamic?.text !== 'mf' ||
    !lowerStaffAnnotations.staffText ||
    !lowerStaffAnnotations.dynamic ||
    lowerStaffAnnotations.staffText.y <= 100 ||
    lowerStaffAnnotations.dynamic.y <= lowerStaffAnnotations.lowerStaffLabelY
  ) {
    throw new Error(
      `Grand staff annotation anchoring verification failed: ${JSON.stringify(lowerStaffAnnotations)}`
    )
  }

  return {
    ...result,
    selectedLowerStaff,
    lowerStaffInput,
    lowerStaffAnnotations
  }
}

async function verifyKeySignatureControl(window) {
  await loadFixture(window)

  await executeMetadataStep(window, 'open measure properties for key signature', `
    await window.__qaOpenEditingSurface('악보')
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  await executeMetadataStep(window, 'select key signature target measure', `
    document
      .querySelector('.notation-measure[data-measure-id="measure-2"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  await executeMetadataStep(
    window,
    'change key signature from selected measure',
    `
    const select = document.querySelector('select[aria-label="선택 마디부터 조표"]')

    if (!select) {
      throw new Error('조표 select not found.')
    }

    const setter = Object.getOwnPropertyDescriptor(
      HTMLSelectElement.prototype,
      'value'
    ).set
    setter.call(select, 'c-major')
    select.dispatchEvent(new Event('change', { bubbles: true }))
  `
  )
  await new Promise((resolve) => setTimeout(resolve, 250))

  const result = await window.webContents.executeJavaScript(`
    (() => {
      const statusValues = [
        ...document.querySelectorAll('.editor-status span')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: statusValues.find((value) => value?.endsWith('회 수정')),
        selectedMeasure: document
          .querySelector('.notation-measure.is-selected')
          ?.getAttribute('data-measure-id')
          ?.match(/^measure-(\\d+)/)?.[1],
        status: statusValues.at(-1),
        value: document.querySelector('select[aria-label="선택 마디부터 조표"]')
          ?.value
      }
    })()
  `)

  if (
    result.editCount !== '1회 수정' ||
    result.selectedMeasure !== '2' ||
    result.status !== '선택한 마디부터 조표를 바꿨습니다.' ||
    result.value !== 'c-major'
  ) {
    throw new Error(
      `Key signature control verification failed: ${JSON.stringify(result)}`
    )
  }

  return result
}

async function verifyTimeSignatureControl(window) {
  await loadFixture(window)

  await executeMetadataStep(window, 'open measure properties for time signature', `
    await window.__qaOpenEditingSurface('악보')
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  await executeMetadataStep(
    window,
    'select measure for time signature change',
    `
    document
      .querySelector('.notation-measure[data-measure-id="measure-3"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `
  )
  await new Promise((resolve) => setTimeout(resolve, 150))

  await executeMetadataStep(
    window,
    'change time signature for selected measure',
    `
    const select = document.querySelector('select[aria-label="선택 마디 박자표"]')

    if (!select) {
      throw new Error('박자표 select not found.')
    }

    const setter = Object.getOwnPropertyDescriptor(
      HTMLSelectElement.prototype,
      'value'
    ).set
    setter.call(select, '2-4')
    select.dispatchEvent(new Event('change', { bubbles: true }))
  `
  )
  await new Promise((resolve) => setTimeout(resolve, 250))

  const result = await window.webContents.executeJavaScript(`
    (() => {
      const statusValues = [
        ...document.querySelectorAll('.editor-status span')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: statusValues.find((value) => value?.endsWith('회 수정')),
        eventCount: document.querySelectorAll('.notation-event').length,
        selectedMeasure: document
          .querySelector('.notation-measure.is-selected')
          ?.getAttribute('data-measure-id')
          ?.match(/^measure-(\\d+)/)?.[1],
        status: statusValues.at(-1),
        value: document.querySelector('select[aria-label="선택 마디 박자표"]')
          ?.value
      }
    })()
  `)

  if (
    result.editCount !== '1회 수정' ||
    result.eventCount !== 32 ||
    result.selectedMeasure !== '3' ||
    result.status !== '선택한 마디의 박자표를 바꿨습니다.' ||
    result.value !== '2-4'
  ) {
    throw new Error(
      `Time signature control verification failed: ${JSON.stringify(result)}`
    )
  }

  return result
}

async function verifyMeasureDeletion(window) {
  await loadFixture(window)

  await executeMetadataStep(
    window,
    'delete selected measure with keyboard',
    `
    document
      .querySelector('.notation-measure[data-measure-id="measure-3"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `
  )
  await new Promise((resolve) => setTimeout(resolve, 150))
  await executeMetadataStep(
    window,
    'press backspace on selected measure',
    `
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: 'Backspace'
      })
    )
  `
  )
  await new Promise((resolve) => setTimeout(resolve, 250))

  const deleted = await window.webContents.executeJavaScript(`
    (() => {
      const statusValues = [
        ...document.querySelectorAll('.editor-status span')
      ].map((value) => value.textContent?.trim())
      const selectedEvent = document
        .querySelector('.notation-event.is-selected')
        ?.getAttribute('data-event-id')
      const selectedMeasure = document
        .querySelector('.notation-measure.is-selected')
        ?.getAttribute('data-measure-id')
        ?.match(/^measure-(\\d+)/)?.[1]

      return {
        editCount: statusValues.find((value) => value?.endsWith('회 수정')),
        eventCount: document.querySelectorAll('.notation-event').length,
        measureCount: document.querySelectorAll('.notation-measure').length,
        selectedEvent: selectedEvent ?? '—',
        selectedMeasure,
        selectedType: selectedMeasure ? '마디' : '이벤트',
        status: statusValues.at(-1)
      }
    })()
  `)

  await loadFixture(window)
  await executeMetadataStep(
    window,
    'create one-measure score',
    `
    document.querySelector('button[aria-label="새 악보 만들기"]')?.click()
  `
  )
  await new Promise((resolve) => setTimeout(resolve, 150))
  await executeMetadataStep(
    window,
    'submit one-measure score',
    `
    const labels = [...document.querySelectorAll('.new-score-form label')]
    const field = (name) =>
      labels.find((label) => label.textContent?.includes(name))
        ?.querySelector('input, select')
    const input = field('마디 수')

    if (!input) {
      throw new Error('Measure count input not found.')
    }

    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value'
    ).set
    setter.call(input, '1')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    document
      .querySelector('form[aria-label="새 악보 만들기"]')
      ?.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))
  `
  )
  await new Promise((resolve) => setTimeout(resolve, 250))
  await executeMetadataStep(
    window,
    'try deleting final measure',
    `
    document.querySelector('button[aria-label="마디 삭제"]')?.click()
  `
  )
  await new Promise((resolve) => setTimeout(resolve, 150))

  const finalMeasure = await window.webContents.executeJavaScript(`
    (() => {
      const statusValues = [
        ...document.querySelectorAll('.editor-status span')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: statusValues.find((value) => value?.endsWith('회 수정')),
        measureCount: document.querySelectorAll('.notation-measure').length,
        status: statusValues.at(-1)
      }
    })()
  `)

  if (
    deleted.editCount !== '1회 수정' ||
    deleted.eventCount !== 30 ||
    deleted.measureCount !== 7 ||
    deleted.selectedEvent !== '—' ||
    deleted.selectedMeasure !== '4' ||
    deleted.selectedType !== '마디' ||
    deleted.status !== '마디를 삭제했습니다.' ||
    finalMeasure.editCount !== '0회 수정' ||
    finalMeasure.measureCount !== 1 ||
    finalMeasure.status !== '마지막 남은 마디는 삭제할 수 없습니다.'
  ) {
    throw new Error(
      `Measure deletion verification failed: ${JSON.stringify({
        deleted,
        finalMeasure
      })}`
    )
  }

  return {
    deleted,
    finalMeasure
  }
}

async function editMetadataField(window, field, value, key) {
  await openMetadataField(window, field)
  const label = field === 'title' ? '악보 제목' : '작곡가'

  await executeMetadataStep(
    window,
    `edit ${field}`,
    `
    const input = document.querySelector('input[aria-label="${label}"]')
    window.setInputValue(input, ${JSON.stringify(value)})
    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: ${JSON.stringify(key)}
      })
    )
  `
  )
  await new Promise((resolve) => setTimeout(resolve, 150))
}

async function openMetadataField(window, field) {
  const label = field === 'title' ? '악보 제목 수정' : '작곡가 수정'

  await executeMetadataStep(
    window,
    `open ${field}`,
    `
    document.querySelector('button[aria-label="${label}"]')?.click()
  `
  )
  await new Promise((resolve) => setTimeout(resolve, 100))
  await executeMetadataStep(
    window,
    `prepare ${field} input setter`,
    `
    window.setInputValue = (input, value) => {
      if (!input) {
        throw new Error('Metadata input not found.')
      }

      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value'
      ).set
      setter.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
  `
  )
}

async function executeMetadataStep(window, label, body) {
  const result = await window.webContents.executeJavaScript(`
    (async () => {
      try {
        ${body}
        return { ok: true }
      } catch (error) {
        return {
          ok: false,
          label: ${JSON.stringify(label)},
          message: error?.message,
          stack: error?.stack
        }
      }
    })()
  `)

  if (!result.ok) {
    throw new Error(
      `Metadata renderer step failed (${result.label}): ${result.message}\n${result.stack}`
    )
  }
}

async function inspect(window, width, output) {
  window.setSize(width, 1000)
  await new Promise((resolve) => setTimeout(resolve, 600))
  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m4-g4"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))
  const image = await window.webContents.capturePage()
  fs.writeFileSync(output, image.toPNG())

  return window.webContents.executeJavaScript(`
    (() => {
      const svg = document.querySelector('.notation-preview svg')
      const measures = [...document.querySelectorAll('.notation-measure')]
      const events = [...document.querySelectorAll('.notation-event')]
      const eventMappingIsValid = events.every((event) => {
        const eventBox = event.getBBox()
        const eventCenter = eventBox.x + eventBox.width / 2
        return measures.some((measure) => {
          const start = Number(measure.getAttribute('x'))
          const end = start + Number(measure.getAttribute('width'))
          return eventCenter >= start && eventCenter <= end
        })
      })
      const systems = new Set(
        measures.map((measure) => measure.getAttribute('data-system-index'))
      )
      const systemRightEdges = [...systems].map((systemIndex) => {
        const systemMeasures = measures.filter(
          (measure) =>
            measure.getAttribute('data-system-index') === systemIndex
        )
        const last = systemMeasures.at(-1)
        return Number(last.getAttribute('x')) +
          Number(last.getAttribute('width'))
      })
      const svgWidth = Number(svg?.getAttribute('width'))
      const systemsFillWidth = systemRightEdges.every(
        (rightEdge) => Math.abs(rightEdge - (svgWidth - 8)) < 0.01
      )
      const selectedEvent = document
        .querySelector('.notation-event.is-selected')
        ?.getAttribute('data-event-id')
      return {
        width: window.innerWidth,
        measureCount: measures.length,
        eventCount: events.length,
        systemCount: systems.size,
        svgWidth,
        systemRightEdges,
        systemsFillWidth,
        eventMappingIsValid,
        selectedInspectorEvent: selectedEvent,
        tupletCount: document.querySelectorAll('.vf-tuplet').length,
        tieCount: document.querySelectorAll('.vf-stavetie').length,
        toolbarOverflow:
          document.querySelector('.toolbar').scrollWidth >
          document.querySelector('.toolbar').clientWidth
      }
    })()
  `)
}

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    width: 1400,
    height: 1000,
    show: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true
    }
  })

  if (process.argv.includes('--notation-palette-only')) {
    const notationPaletteWorkspace = await runStep('notation palette workspace', () =>
      verifyNotationPaletteWorkspace(window)
    )
    console.log(JSON.stringify({ notationPaletteWorkspace }, null, 2))
    window.close()
    app.quit()
    return
  }

  if (process.argv.includes('--status-bar-only')) {
    const editorStatusBar = await runStep('editor status bar', () => verifyEditorStatusBar(window))
    console.log(JSON.stringify({ editorStatusBar }, null, 2))
    window.close()
    app.quit()
    return
  }

  if (process.argv.includes('--compact-docks-only')) {
    const compactDockTabs = await runStep('compact dock tabs', () => verifyCompactDockTabs(window))
    console.log(JSON.stringify({ compactDockTabs }, null, 2))
    window.close()
    app.quit()
    return
  }

  if (process.argv.includes('--menu-surfaces-only')) {
    const menuDrivenSurfaces = await runStep('menu-driven surfaces', () => verifyMenuDrivenSurfaces(window))
    console.log(JSON.stringify({ menuDrivenSurfaces }, null, 2))
    window.close()
    app.quit()
    return
  }

  if (process.argv.includes('--shared-dock-only')) {
    const sharedDesktopDock = await runStep('shared desktop dock', () => verifySharedDesktopDock(window))
    console.log(JSON.stringify({ sharedDesktopDock }, null, 2))
    window.close()
    app.quit()
    return
  }

  if (process.argv.includes('--note-toolbar-only')) {
    const persistentNoteToolbar = await runStep('persistent note toolbar', () => verifyPersistentNoteToolbar(window))
    console.log(JSON.stringify({ persistentNoteToolbar }, null, 2))
    window.close()
    app.quit()
    return
  }

  if (process.argv.includes('--transport-only')) {
    const persistentTransport = await runStep('persistent transport', () => verifyPersistentTransport(window))
    console.log(JSON.stringify({ persistentTransport }, null, 2))
    window.close()
    app.quit()
    return
  }

  if (process.argv.includes('--workspace-scroll-only')) {
    const workspaceScrollIsolation = await runStep('workspace scroll isolation', () => verifyWorkspaceScrollIsolation(window))
    console.log(JSON.stringify({ workspaceScrollIsolation }, null, 2))
    window.close()
    app.quit()
    return
  }

  if (process.argv.includes('--properties-only')) {
    const propertiesDockEditing = await runStep('properties dock editing', () => verifyPropertiesDockEditing(window))
    console.log(JSON.stringify({ propertiesDockEditing }, null, 2))
    window.close()
    app.quit()
    return
  }

  await loadFixture(window)
  const keyboard = await runStep('keyboard routing', () =>
    verifyKeyboardRouting(window)
  )
  const fileActions = await runStep('file actions', () =>
    verifyFileActions(window)
  )
  const compactToolbarModes = await runStep('compact toolbar modes', () =>
    verifyCompactToolbarModes(window)
  )
  const menuDrivenSurfaces = await runStep('menu-driven surfaces', () => verifyMenuDrivenSurfaces(window))
  const sharedDesktopDock = await runStep('shared desktop dock', () => verifySharedDesktopDock(window))
  const commercialHeadlessViewports = await runStep(
    'commercial headless viewports',
    () => verifyCommercialHeadlessViewports(window)
  )
  const propertiesDockEditing = await runStep('properties dock editing', () =>
    verifyPropertiesDockEditing(window)
  )
  const workspaceScrollIsolation = await runStep('workspace scroll isolation', () =>
    verifyWorkspaceScrollIsolation(window)
  )
  const compactDockTabs = await runStep('compact dock tabs', () => verifyCompactDockTabs(window))
  const notationPaletteWorkspace = await runStep(
    'notation palette workspace',
    () => verifyNotationPaletteWorkspace(window)
  )
  const editorStatusBar = await runStep('editor status bar', () => verifyEditorStatusBar(window))
  const partViewHeadlessExportState = await runStep(
    'part view headless export state',
    () => verifyPartViewHeadlessExportState(window)
  )
  const partXmlExportRoundTrip = await runStep('part XML export round trip', () =>
    verifyPartXmlExportRoundTrip(window)
  )
  const playbackMixerHeadlessState = await runStep(
    'playback mixer headless state',
    () => verifyPlaybackMixerHeadlessState(window)
  )
  const persistentTransport = await runStep('persistent transport', () => verifyPersistentTransport(window))
  const persistentNoteToolbar = await runStep('persistent note toolbar', () => verifyPersistentNoteToolbar(window))
  const newScore = await runStep('new score wizard', () =>
    verifyNewScoreWizard(window)
  )
  const grandStaffPreview = await runStep('grand staff preview', () =>
    verifyGrandStaffPreview(window)
  )
  const keySignature = await runStep('key signature control', () =>
    verifyKeySignatureControl(window)
  )
  const timeSignature = await runStep('time signature control', () =>
    verifyTimeSignatureControl(window)
  )
  const measureDeletion = await runStep('measure deletion', () =>
    verifyMeasureDeletion(window)
  )
  const metadata = await runStep('metadata editing', () =>
    verifyMetadataEditing(window)
  )
  const beams = await runStep('beam rendering', () =>
    verifyBeamRendering(window)
  )
  const ties = await runStep('tie editing', () => verifyTieEditing(window))
  const outOfStaffNotes = await runStep('out-of-staff notes', () =>
    verifyOutOfStaffNotes(window)
  )
  const releaseScenarioBounds = await runStep('release scenario bounds', () =>
    verifyReleaseScenarioBounds(window)
  )
  await loadFixture(window)

  const desktop = await inspect(
    window,
    1400,
    path.join(app.getPath('temp'), 'in-c-mvp-desktop.png')
  )
  const minimum = await inspect(
    window,
    1100,
    path.join(app.getPath('temp'), 'in-c-mvp-minimum.png')
  )
  const results = [desktop, minimum]

  for (const result of results) {
    if (
      result.measureCount !== 8 ||
      result.eventCount !== 33 ||
      !result.eventMappingIsValid ||
      !result.systemsFillWidth ||
      result.selectedInspectorEvent !== 'm4-g4' ||
      result.tupletCount !== 1 ||
      result.tieCount < 1 ||
      result.toolbarOverflow
    ) {
      throw new Error(`MVP renderer verification failed: ${JSON.stringify(result)}`)
    }
  }

  console.log(
    JSON.stringify(
      {
        keyboard,
        beams,
        ties,
        fileActions,
        compactToolbarModes,
        menuDrivenSurfaces,
        sharedDesktopDock,
        commercialHeadlessViewports,
        propertiesDockEditing,
        workspaceScrollIsolation,
        compactDockTabs,
        notationPaletteWorkspace,
        editorStatusBar,
        partViewHeadlessExportState,
        partXmlExportRoundTrip,
        playbackMixerHeadlessState,
        persistentTransport,
        persistentNoteToolbar,
        newScore,
        grandStaffPreview,
        keySignature,
        timeSignature,
        measureDeletion,
        metadata,
        outOfStaffNotes,
        releaseScenarioBounds,
        desktop,
        minimum
      },
      null,
      2
    )
  )
  window.close()
  app.quit()
}).catch((error) => {
  console.error(error)
  app.exit(1)
})
