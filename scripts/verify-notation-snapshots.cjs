module.paths.unshift(
  require('node:path').resolve(__dirname, '../node_modules')
)

const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

const baselinePath = path.resolve(
  __dirname,
  '../docs/testing/notation-snapshot-baseline.json'
)
const shouldUpdate = process.argv.includes('--update')

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
  window.setSize(width, 1000)
  await new Promise((resolve) => setTimeout(resolve, 600))

  const screenshot = await window.webContents.capturePage()
  const screenshotPath = path.join(
    app.getPath('temp'),
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

function withoutArtifactPaths(snapshot) {
  return Object.fromEntries(
    Object.entries(snapshot).map(([width, metrics]) => [
      width,
      {
        ...metrics,
        screenshot: {
          height: metrics.screenshot.height,
          width: metrics.screenshot.width
        }
      }
    ])
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
    await loadFixture(window, 'release-test')

    const snapshot = {
      960: await readSnapshot(window, 960),
      1400: await readSnapshot(window, 1400)
    }
    const comparable = withoutArtifactPaths(snapshot)

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

    const expected = JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
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
