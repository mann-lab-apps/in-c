// Actual built renderer in isolated Electron; no product files or user profile.
const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const assert = require('node:assert/strict')
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ddirori-electron-'))
app.setPath('userData', profile)
// Software compositing also supports capturePage under Linux Xvfb runners.
app.disableHardwareAcceleration()
const out = path.resolve(__dirname, '../out/ddirori/shared-baseline')
app.whenReady().then(async () => {
  const win = new BrowserWindow({width:1200,height:1000,show:true,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false}})
  try {
    await win.loadFile(path.resolve(__dirname, '../out/renderer/index.html'), {query:{fixture:'release-test'}})
    const result = await win.webContents.executeJavaScript(`(async () => {
      const pause = () => new Promise(r => setTimeout(r, 100));
      const button = label => [...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') || b.textContent.trim()) === label);
      button('표기 객체').click(); await pause();
      const objects = document.querySelector('[aria-label="표기 객체 선택"]');
      const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
      set.call(objects, [...objects.options].find(o => o.value.startsWith('hairpin:')).value);
      objects.dispatchEvent(new Event('change',{bubbles:true})); await pause();
      document.querySelector('.span-properties__geometry').open = true;
      const input = document.querySelector('input[aria-label="표기 세로 이동"]');
      input.focus();
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'0');
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true})); await pause();
      input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); input.dispatchEvent(new FocusEvent('focusout',{bubbles:true})); input.blur(); await pause();
      const committed = input.value;
      window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyZ',key:'z',ctrlKey:true,bubbles:true})); await pause();
      const panel = document.querySelector('.span-properties');
      return {committed, undone:input.value, host:panel.classList.contains('ddirori'),
        font:getComputedStyle(input).fontFamily, height:input.getBoundingClientRect().height,
        popover:'showPopover' in HTMLElement.prototype, dialog:'showModal' in HTMLDialogElement.prototype,
        panelWidth:panel.getBoundingClientRect().width, overflow:panel.scrollWidth > panel.clientWidth+1};
    })()`)
    assert.equal(result.committed, '0')
    assert.equal(result.undone, '')
    assert.equal(result.host, true)
    assert.equal(result.overflow, false)
    assert.ok(result.popover && result.dialog && result.height >= 32)
    await win.webContents.executeJavaScript('document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))')
    fs.mkdirSync(out,{recursive:true})
    fs.writeFileSync(path.join(out,'studio-electron.png'),(await win.webContents.capturePage()).toPNG())
    fs.writeFileSync(path.join(out,'studio-electron.json'),JSON.stringify({at:new Date().toISOString(),versions:process.versions,result,scope:'Built product renderer; fixture, isolated userData, no file/audio bridge. Native history and shared CSS verified; no physical IME or OS accessibility claims.'},null,2))
    console.log('Studio Electron shared panel and single undo passed',result)
  } finally {
    win.destroy()
    app.quit()
  }
}).catch(error => {console.error(error);app.exit(1)})
