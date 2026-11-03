module.paths.unshift(
  require('node:path').resolve(__dirname, '../node_modules')
)

const { app, BrowserWindow, nativeTheme } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const assert = require('node:assert/strict')

app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'chromatics-notation-snapshots-')))

const baselinePath = path.resolve(
  __dirname,
  '../docs/testing/notation-snapshot-baseline.json'
)
const { parseNotationSnapshotOptions } = require('./notation-snapshot-options.cjs')
let shouldUpdate, fixedCanvas, studioProfile, captureProfile
const profilePath = path.resolve(__dirname, '../docs/testing/studio-r3-notation-profile.json')
const profileOut = path.resolve(process.env.DDIRORI_SNAPSHOT_QA_OUT || 'out/ddirori/studio-r3-snapshot')
const profileContract = {
  id: 'studio-r3-default-workspace-v3', fixture: 'release-test',
  viewports: [[960, 1000], [1400, 1000]], theme: 'light',
  dockWidths: { palette: 280, properties: 280 }, dockVisibility: { palette: true, properties: true },
  dockLayout: { compact: 'shared', desktop: 'shared', active: 'palette' },
  notationView: { mode: 'fit-width', zoom: 100 }, noteDetailsOpen: false, inputActive: false
}

async function loadFixture(window, fixture) {
  await window.loadFile(
    path.resolve(__dirname, '../out/renderer/index.html'),
    {
      query: {
        fixture
      }
    }
  )
  await new Promise((resolve) => setTimeout(resolve, 800))
}

async function readSnapshot(window, width) {
  if (studioProfile) {
    window.setContentSize(width, 1000)
    await window.webContents.executeJavaScript(`localStorage.setItem('chromatics.dock-widths.v1',${JSON.stringify(JSON.stringify(profileContract.dockWidths))});
      localStorage.setItem('chromatics.dock-visibility.v1',${JSON.stringify(JSON.stringify(profileContract.dockVisibility))});
      localStorage.setItem('chromatics.notation-view.v1',${JSON.stringify(JSON.stringify(profileContract.notationView))});
      localStorage.setItem('chromatics.note-details.v1','false');localStorage.setItem('chromatics.dock-active.v1','"palette"')`)
    await loadFixture(window, profileContract.fixture)
    const actualWorkspace = await window.webContents.executeJavaScript(`({
      id:'studio-r3-default-workspace-v3',fixture:'release-test',viewports:[[960,1000],[1400,1000]],
      theme:document.querySelector('.studio-document').dataset.theme,
      dockWidths:JSON.parse(localStorage.getItem('chromatics.dock-widths.v1')),
      dockVisibility:JSON.parse(localStorage.getItem('chromatics.dock-visibility.v1')),
      dockLayout:{compact:'shared',desktop:'shared',active:JSON.parse(localStorage.getItem('chromatics.dock-active.v1'))},
      notationView:JSON.parse(localStorage.getItem('chromatics.notation-view.v1')),
      // Historical profile flag remains false when the retired surface is absent.
      noteDetailsOpen:Boolean(document.querySelector('.studio-note-details')?.open),
      inputActive:document.querySelector('.studio-input-context').dataset.inputActive === 'true'
    })`)
    assert.equal(await window.webContents.executeJavaScript("document.querySelector('.studio-note-details')===null&&Boolean(document.querySelector('.studio-selected-properties .studio-chord-properties'))"),true,'Retired detail controls are replaced by real selected chord properties')
    assert.deepEqual(actualWorkspace, profileContract, 'Profile must use its explicit real workspace state')
    const visibleDocks=await window.webContents.executeJavaScript(`({palette:document.querySelector('#studio-palette').checkVisibility(),properties:document.querySelector('#studio-properties').checkVisibility(),switcher:document.querySelector('.studio-dock-switcher').checkVisibility()})`)
    assert.deepEqual(visibleDocks,{palette:true,properties:false,switcher:true},'One shared desktop dock must match the real workspace contract')
    assert.equal(await window.webContents.executeJavaScript('innerHeight'), 1000)
  } else window.setSize(width, 1000)
  // Isolate engraving from intentional workspace/dock reflow, without changing baselines.
  if (fixedCanvas) {
    const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'))[width]
    await window.webContents.executeJavaScript(`document.querySelector('.notation-preview').style.width = ${JSON.stringify(`${baseline.svg.width}px`)}`)
  }
  await new Promise((resolve) => setTimeout(resolve, 600))

  const screenshot = await window.webContents.capturePage()
  const screenshotPath = path.join(
    studioProfile ? profileOut : app.getPath('temp'),
    `in-c-notation-snapshot-${width}.png`
  )

  fs.writeFileSync(screenshotPath, screenshot.toPNG())

  const metrics = await window.webContents.executeJavaScript(`
    (() => {
      const round = (value) => Math.round(Number(value) * 10) / 10
      const svg = document.querySelector('.notation-preview svg')
      const svgBox = svg?.getBoundingClientRect()
      const readBox = (element) => {
        const box = element.getBoundingClientRect()
        return {
          height: round(box.height),
          width: round(box.width),
          x: round(box.x - (svgBox?.x ?? 0)),
          y: round(box.y - (svgBox?.y ?? 0))
        }
      }
      const readElements = (selector) =>
        [...document.querySelectorAll(selector)].map((element, index) => ({
          box: readBox(element),
          id:
            element.getAttribute('data-event-id') ??
            element.getAttribute('data-measure-id') ??
            element.textContent?.trim() ??
            selector,
          index
        }))

      return {
        dynamicMarks: readElements('.notation-dynamic-mark'),
        eventCount: document.querySelectorAll('.notation-event').length,
        fermatas: readElements('.notation-fermata'),
        hairpins: readElements('.notation-hairpin'),
        rehearsalMarks: readElements('.notation-rehearsal-mark'),
        slurs: readElements('.notation-slur'),
        svg: {
          height: Number(svg?.getAttribute('height')),
          width: Number(svg?.getAttribute('width'))
        },
        tempo: document.querySelector('.notation-tempo-marking')?.textContent?.trim(),
        viewportWidth: window.innerWidth
      }
    })()
  `)

  return {
    ...metrics,
    screenshot: {
      height: screenshot.getSize().height,
      path: screenshotPath,
      width: screenshot.getSize().width
    }
  }
}

function comparableNotationMetrics(snapshot) {
  return Object.fromEntries(
    Object.entries(snapshot).map(([width, metrics]) => {
      const { screenshot, ...notationMetrics } = metrics

      return [width, notationMetrics]
    })
  )
}

function diffSnapshots(expected, actual) {
  const expectedJson = JSON.stringify(expected, null, 2)
  const actualJson = JSON.stringify(actual, null, 2)

  if (expectedJson === actualJson) {
    return undefined
  }

  return {
    actualJson,
    expectedJson
  }
}

async function main() {
  // Validate before opening a window, reading fixtures or writing any baseline.
  ;({ shouldUpdate, fixedCanvas, studioProfile, captureProfile } = parseNotationSnapshotOptions(process.argv.slice(2)))
  await app.whenReady()

  const window = new BrowserWindow({
    height: 1000,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    },
    width: 1400
  })

  try {
    if (studioProfile) { fs.mkdirSync(profileOut, { recursive: true }); nativeTheme.themeSource = 'light' }
    await loadFixture(window, 'release-test')

    const snapshot = {
      960: await readSnapshot(window, 960),
      1400: await readSnapshot(window, 1400)
    }
    const comparable = comparableNotationMetrics(snapshot)

    if (studioProfile) {
      const actual = { contract: profileContract, metrics: comparable }
      fs.writeFileSync(path.join(profileOut, 'actual.json'), `${JSON.stringify(actual, null, 2)}\n`)
      if (captureProfile) {
        console.log('Captured Studio profile candidate; not a baseline approval or verification PASS')
        return
      }
      const expected = JSON.parse(fs.readFileSync(profilePath, 'utf8'))
      assert.deepEqual(expected.contract, profileContract, 'Reviewed profile contract must match the explicit fixture')
      assert.deepEqual(comparable, expected.metrics, 'Studio profile notation changed; review actual.json and captures')
      console.log('Verified Studio R3 workspace notation profile; historical baseline unchanged')
      return
    }

    if (shouldUpdate) {
      fs.mkdirSync(path.dirname(baselinePath), { recursive: true })
      fs.writeFileSync(baselinePath, `${JSON.stringify(comparable, null, 2)}\n`)
      console.log(`Updated notation snapshot baseline: ${baselinePath}`)
      console.log(
        `Screenshot artifacts: ${Object.values(snapshot)
          .map((entry) => entry.screenshot.path)
          .join(', ')}`
      )
      return
    }

    const expected = comparableNotationMetrics(
      JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
    )
    const diff = diffSnapshots(expected, comparable)

    if (diff) {
      const diffPath = path.join(app.getPath('temp'), 'in-c-notation-snapshot-diff.json')

      fs.writeFileSync(
        diffPath,
        JSON.stringify(
          {
            actual: JSON.parse(diff.actualJson),
            expected: JSON.parse(diff.expectedJson)
          },
          null,
          2
        )
      )
      throw new Error(
        `Notation snapshot metrics changed. Diff: ${diffPath}. Screenshots: ${Object.values(snapshot)
          .map((entry) => entry.screenshot.path)
          .join(', ')}`
      )
    }

    console.log(
      `Verified notation snapshots. Screenshots: ${Object.values(snapshot)
        .map((entry) => entry.screenshot.path)
        .join(', ')}`
    )
  } finally {
    window.destroy()
    app.quit()
  }
}

main().catch((error) => {
  console.error(error)
  app.exit(1)
})
