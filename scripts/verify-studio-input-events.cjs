// T04 diagnostics against the built product, with isolated data and event traces.
const {app, BrowserWindow} = require('electron')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const assert = require('node:assert/strict')
const out = path.resolve(process.env.DDIRORI_STUDIO_EVENT_OUT || 'out/ddirori/studio-r2-t04-baseline')
const focusControl = process.argv.includes('--focus-control')
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'studio-input-events-')))
app.disableHardwareAcceleration()

app.whenReady().then(async () => {
  const win = new BrowserWindow({width:1400, height:1000, show:true,
    webPreferences:{sandbox:true, contextIsolation:true, backgroundThrottling:false}})
  const run = (fn, arg) => win.webContents.executeJavaScript(`(${fn.toString()})(${JSON.stringify(arg) ?? ''})`)
  const settled = () => run(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  const records = []
  const sink = new BrowserWindow({width:240,height:120,show:false,webPreferences:{sandbox:true,contextIsolation:true}})
  try {
    await sink.loadURL('data:text/html,<title>T04 focus control</title><p>Isolated QA window</p>')
    await win.loadFile(path.resolve(process.env.DDIRORI_STUDIO_EVENT_HTML || path.resolve(__dirname, '../out/renderer/index.html')), {query:{fixture:'release-test'}})
    await run(() => document.fonts.ready)
    await run(() => {
      window.inputTrace = []
      window.readInput = stage => {
        const input = document.querySelector('[aria-label="표기 세로 이동"]')
        return {stage, time:performance.now(), value:input?.value, attribute:input?.getAttribute('value'),
          tracker:input?._valueTracker?.getValue(), valid:input?.validity.valid,
          invalid:input?.getAttribute('aria-invalid'), focused:document.activeElement === input,
          documentFocused:document.hasFocus(), selection:document.querySelector('[aria-label="표기 객체 선택"]')?.value,
          history:document.querySelector('.editor-status')?.textContent,
          error:input?.getAttribute('aria-describedby') ? document.getElementById(input.getAttribute('aria-describedby'))?.textContent : null}
      }
      for (const event of ['focus', 'blur', 'focusin', 'focusout', 'compositionstart', 'compositionend', 'input', 'change', 'keydown']) {
        document.addEventListener(event, e => {
          if (e.target.getAttribute?.('aria-label') === '표기 세로 이동')
            window.inputTrace.push({...window.readInput(event), key:e.key, composing:e.isComposing, phase:'capture'})
        }, true)
      }
      window.changeInput = value => {
        const input = document.querySelector('[aria-label="표기 세로 이동"]')
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value)
        input.dispatchEvent(new Event('input',{bubbles:true}))
        input.dispatchEvent(new Event('change',{bubbles:true}))
      }
      const button = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === '표기 객체')
      button.click()
    })
    await settled()
    for (const mode of focusControl ? ['background-control', 'focused', 'keyboard'] : ['same-task', 'legacy', 'focused', 'keyboard']) {
      for (let attempt = 0; attempt < 12; attempt++) {
        if (focusControl) {
          app.focus({steal:true})
          win.focus()
          await run(() => new Promise((resolve, reject) => {
            const start = performance.now()
            const check = () => document.hasFocus() ? resolve() : performance.now()-start > 2000 ? reject(new Error('T04 focus precondition failed')) : requestAnimationFrame(check)
            check()
          }))
        }
        await run(() => {
          const select = document.querySelector('[aria-label="표기 객체 선택"]')
          Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,'')
          select.dispatchEvent(new Event('change',{bubbles:true}))
        })
        await settled()
        await run(() => {
          const select = document.querySelector('[aria-label="표기 객체 선택"]')
          Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,
            [...select.options].find(option => option.value.startsWith('hairpin:')).value)
          select.dispatchEvent(new Event('change',{bubbles:true}))
        })
        await settled()
        await run(() => {
          window.inputTrace = []
          document.querySelector('.span-properties__geometry summary').click()
          document.querySelector('[aria-label="표기 세로 이동"]').focus()
          window.changeInput('3')
        })
        await settled()
        const stages = [await run(() => window.readInput('draft-3'))]
        await run(() => {
          const input = document.querySelector('[aria-label="표기 세로 이동"]')
          input.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'한'}))
          input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',isComposing:true,keyCode:229,bubbles:true}))
        })
        stages.push(await run(() => window.readInput('composition-enter')))
        await run(mode => {
          const input = document.querySelector('[aria-label="표기 세로 이동"]')
          input.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'한'}))
          input.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))
          if (mode === 'same-task') {
            window.changeInput('99')
            input.focus(); input.blur()
          }
        }, mode)
        await settled()
        stages.push(await run(() => window.readInput('escape')))
        if (mode === 'background-control') {
          sink.show(); sink.focus()
          await run(() => new Promise((resolve,reject) => {
            const start=performance.now()
            const check=()=> !document.hasFocus() ? resolve() : performance.now()-start>2000 ? reject(new Error('Background focus precondition failed')) : setTimeout(check,16)
            check()
          }))
          assert.equal(await run(() => document.hasFocus()), false, 'Background control must really lose OS focus')
          await run(() => window.changeInput('99'))
        } else if (mode === 'same-task') {
          // Deliberately stress an impossible same-task keyboard sequence.
        } else if (mode === 'keyboard') {
          await run(() => document.querySelector('[aria-label="표기 세로 이동"]').focus())
          await win.webContents.insertText('99')
        } else {
          await run(mode => {
            if (mode === 'focused') document.querySelector('[aria-label="표기 세로 이동"]').focus()
            window.changeInput('99')
          }, mode)
        }
        await settled()
        stages.push(await run(() => window.readInput('invalid-draft')))
        await run(() => {
          const input = document.querySelector('[aria-label="표기 세로 이동"]')
          input.focus(); input.blur()
        })
        await settled()
        const final = await run(() => window.readInput('blur'))
        stages.push(final)
        const backgroundReproduced = mode === 'background-control' && final.invalid === 'false' && final.value === '99' && !final.documentFocused &&
          !(await run(() => window.inputTrace)).some(event => event.stage === 'focusout' && event.value === '99')
        const preserved = /0회 수정/.test(final.history) && stages[1].focused && final.selection === stages[0].selection
        const passed = preserved && (mode === 'background-control' ? backgroundReproduced && stages[2].value === '' :
          final.invalid === 'true' && final.value === '' && /sp/.test(final.error || '') && (mode === 'same-task' || stages[2].value === ''))
        records.push({mode,attempt,passed,backgroundReproduced,stages,events:await run(() => window.inputTrace)})
      }
    }
    fs.mkdirSync(out,{recursive:true})
    fs.writeFileSync(path.join(out,'event-traces.json'), JSON.stringify({versions:process.versions,records},null,2))
    const failed = records.filter(record => !record.passed)
    console.log(JSON.stringify({runs:records.length,failed:failed.map(({mode,attempt,stages})=>({mode,attempt,final:stages.at(-1)})),out},null,2))
    assert.equal(failed.length,0,'T04 event sequence must preserve validation, selection and command0')
  } finally {sink.destroy(); win.destroy(); app.quit()}
}).catch(error => {console.error(error); app.exit(1)})
