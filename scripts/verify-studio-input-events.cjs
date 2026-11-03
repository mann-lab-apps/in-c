// T04 diagnostics against the built product, with isolated data and event traces.
const {app, BrowserWindow} = require('electron')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const assert = require('node:assert/strict')
const out = path.resolve(process.env.DDIRORI_STUDIO_EVENT_OUT || 'out/ddirori/studio-r2-t04-baseline')
const focusControl = process.argv.includes('--focus-control')
fs.mkdirSync(out, {recursive:true})
let stage = 'startup'
const deadline = setTimeout(() => {console.error('T04 deadline at '+stage);app.exit(1)}, 120000)
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'studio-input-events-')))
app.disableHardwareAcceleration()

app.whenReady().then(async () => {
  const win = new BrowserWindow({width:1400, height:1000, show:true,
    webPreferences:{sandbox:true, contextIsolation:true, backgroundThrottling:false}})
  const run = (fn, arg) => win.webContents.executeJavaScript(`(${fn.toString()})(${JSON.stringify(arg) ?? ''})`)
  const settled = () => run(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  const records = []
  let failedRun = false
  const sink = new BrowserWindow({width:240,height:120,show:false,webPreferences:{sandbox:true,contextIsolation:true}})
  const foreground = async () => {
    app.focus({steal:true});win.focus()
    const start = Date.now()
    while (!(win.isFocused() && win.webContents.isFocused() && await run(() => document.hasFocus()))) {
      assert.ok(Date.now()-start<5000,'T04 native focus precondition failed: '+stage)
      await settled()
    }
  }
  const click = async label => {
    await run(label => {
      const button = [...document.querySelectorAll('button')].find(n => (n.getAttribute('aria-label') || n.textContent.trim()) === label && n.checkVisibility())
      if (!button || button.disabled) throw Error('Unavailable T04 command: '+label)
      button.scrollIntoView({block:'nearest'});button.focus();button.click()
    },label)
    await settled()
  }
  const selectSpan = async prefix => {
    await click('도구');await click('범위 표기 찾기')
    await run(() => {
      const button = [...document.querySelectorAll('label')].find(n => n.textContent === '표기 객체 선택')?.control
      if (!button?.checkVisibility() || button.disabled || button.getAttribute('role') !== 'combobox') throw Error('Actual public span Select unavailable')
      button.scrollIntoView({block:'nearest'});button.focus();button.click()
    })
    await settled()
    const selected = await run(prefix => {
      const option = [...document.querySelectorAll('[role="option"]')].find(n => n.checkVisibility() && (prefix === '' ? n.dataset.value === '' : n.dataset.value?.startsWith(prefix)))
      if (!option || option.getAttribute('aria-disabled') === 'true') throw Error('Actual span option unavailable: '+prefix)
      const value = option.dataset.value;option.scrollIntoView({block:'nearest'});option.click();return value
    },prefix)
    await settled();return selected
  }
  try {
    await sink.loadURL('data:text/html,<title>T04 focus control</title><p>Isolated QA window</p>')
    await win.loadFile(path.resolve(process.env.DDIRORI_STUDIO_EVENT_HTML || path.resolve(__dirname, '../out/renderer/index.html')), {query:{fixture:'release-test'}})
    await run(() => document.fonts.ready)
    await foreground()
    await run(() => {
      window.inputTrace = []
      window.readInput = stage => {
        const input = document.querySelector('[aria-label="표기 세로 이동"]')
        return {stage, time:performance.now(), value:input?.value, attribute:input?.getAttribute('value'),
          tracker:input?._valueTracker?.getValue(), valid:input?.validity.valid,
          invalid:input?.getAttribute('aria-invalid'), focused:document.activeElement === input,
          documentFocused:document.hasFocus(), selection:[...document.querySelectorAll('label')].find(n => n.textContent === '표기 객체 선택')?.control?.textContent,
          selectionId:document.querySelector('[aria-label="선택 표기 ID"]')?.textContent,
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
    })
    await settled()
    for (const mode of focusControl ? ['background-control', 'focused', 'keyboard'] : ['same-task', 'legacy', 'focused', 'keyboard']) {
      for (let attempt = 0; attempt < 12; attempt++) {
        stage = `${mode}:${attempt}`;console.log(stage)
        await foreground()
        await selectSpan('')
        const spanId = await selectSpan('hairpin:')
        await run(() => {
          window.inputTrace = []
          const disclosure = [...document.querySelectorAll('.studio-span-properties__geometry button')].find(n => n.textContent.trim() === '배치 · 형상')
          if (!disclosure?.checkVisibility() || disclosure.disabled) throw Error('Actual geometry disclosure unavailable')
          if (disclosure.getAttribute('aria-expanded') !== 'true') disclosure.click()
        })
        await settled()
        await run(() => {
          const input = document.querySelector('[aria-label="표기 세로 이동"]')
          if (!input?.checkVisibility() || input.disabled) throw Error('Actual geometry input unavailable')
          input.scrollIntoView({block:'nearest'});input.focus()
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
        const preserved = /0회 수정/.test(final.history) && stages[1].focused && final.selection === stages[0].selection && final.selectionId === spanId.slice('hairpin:'.length)
        const passed = preserved && (mode === 'background-control' ? backgroundReproduced && stages[2].value === '' :
          final.invalid === 'true' && final.value === '' && /sp/.test(final.error || '') && (mode === 'same-task' || stages[2].value === ''))
        records.push({mode,attempt,passed,backgroundReproduced,spanId,stages,events:await run(() => window.inputTrace),nativeWindow:win.isFocused(),nativeContents:win.webContents.isFocused()})
        if (attempt === 0) {
          const geometry = await run(() => {
            const input=document.querySelector('[aria-label="표기 세로 이동"]'),error=document.getElementById(input.getAttribute('aria-describedby'))
            const visible=node=>{
              if(!node?.checkVisibility())return false
              const r=node.getBoundingClientRect(),footer=document.querySelector('.studio-status').getBoundingClientRect()
              if(r.left<0||r.right>innerWidth||r.top<0||r.bottom>Math.min(innerHeight,footer.top))return false
              for(let parent=node.parentElement;parent;parent=parent.parentElement){
                const style=getComputedStyle(parent),p=parent.getBoundingClientRect()
                if(/auto|scroll|hidden|clip/.test(style.overflowY)&&(r.top<p.top||r.bottom>p.bottom))return false
              }
              return true
            }
            return {inputVisible:visible(input),errorVisible:visible(error),input:input.getBoundingClientRect().toJSON(),error:error?.getBoundingClientRect().toJSON(),viewport:[innerWidth,innerHeight]}
          })
          fs.writeFileSync(path.join(out,mode+'-geometry.json'),JSON.stringify(geometry,null,2))
          fs.writeFileSync(path.join(out,mode+'.png'),(await win.webContents.capturePage()).toPNG())
          if(mode!=='background-control')assert.ok(geometry.inputVisible&&geometry.errorVisible,'The foreground field and linked sp error must be visible: '+mode)
        }
      }
    }
    fs.mkdirSync(out,{recursive:true})
    fs.writeFileSync(path.join(out,'event-traces.json'), JSON.stringify({versions:process.versions,records},null,2))
    const failed = records.filter(record => !record.passed)
    console.log(JSON.stringify({runs:records.length,failed:failed.map(({mode,attempt,stages})=>({mode,attempt,final:stages.at(-1)})),out},null,2))
    assert.equal(failed.length,0,'T04 event sequence must preserve validation, selection and command0')
  } catch(error) {
    failedRun = true;console.error(stage,error)
    fs.writeFileSync(path.join(out,'partial-traces.json'),JSON.stringify({stage,error:String(error),records,events:await run(()=>window.inputTrace).catch(()=>[])},null,2))
    fs.writeFileSync(path.join(out,'failure.png'),(await win.webContents.capturePage()).toPNG())
  } finally {clearTimeout(deadline);sink.destroy();win.destroy();app.exit(failedRun?1:0)}
}).catch(error => {console.error(error); app.exit(1)})
