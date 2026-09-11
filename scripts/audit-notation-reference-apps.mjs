import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

const rootDir = resolve(new URL('..', import.meta.url).pathname)
const manifestPath = resolve(
  rootDir,
  'src/musicxml/fixtures/external-apps/manifest.json'
)

const applicationRoots = [
  '/Applications',
  process.env.HOME ? join(process.env.HOME, 'Applications') : null
].filter(Boolean)

const referenceApps = [
  {
    sourceApp: 'MuseScore',
    role: 'primary-current-free-market-reference',
    appNamePattern: /musescore/i,
    executableCandidates: ['Contents/MacOS/mscore', 'Contents/MacOS/MuseScore 4']
  },
  {
    sourceApp: 'Dorico',
    role: 'secondary-commercial-reference',
    appNamePattern: /dorico/i,
    executableCandidates: [
      'Contents/MacOS/Dorico 6',
      'Contents/MacOS/Dorico 5',
      'Contents/MacOS/Dorico'
    ]
  },
  {
    sourceApp: 'Sibelius',
    role: 'secondary-commercial-reference',
    appNamePattern: /sibelius/i,
    executableCandidates: ['Contents/MacOS/Sibelius']
  },
  {
    sourceApp: 'Finale',
    role: 'primary-legacy-finale-style-migration-reference',
    appNamePattern: /finale/i,
    executableCandidates: ['Contents/MacOS/Finale']
  }
]

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function readBundleVersion(appPath) {
  const plistPath = join(appPath, 'Contents/Info.plist')

  if (!existsSync(plistPath)) {
    return null
  }

  const plist = readFileSync(plistPath, 'utf8')
  const match = plist.match(
    /<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/
  )

  return match?.[1] ?? null
}

function listApplications() {
  const apps = []

  for (const root of applicationRoots) {
    if (!existsSync(root)) {
      continue
    }

    for (const entry of readdirSync(root)) {
      if (!entry.endsWith('.app')) {
        continue
      }

      const appPath = join(root, entry)

      try {
        if (statSync(appPath).isDirectory()) {
          apps.push(appPath)
        }
      } catch {
        // Ignore unreadable bundles; this audit only records reachable evidence.
      }
    }
  }

  return apps
}

function findReferenceApp(referenceApp, apps) {
  const appPath = apps.find((candidate) =>
    referenceApp.appNamePattern.test(basename(candidate))
  )

  if (!appPath) {
    return {
      sourceApp: referenceApp.sourceApp,
      role: referenceApp.role,
      status: 'not-installed',
      appPath: null,
      version: null,
      executablePath: null
    }
  }

  const executablePath =
    referenceApp.executableCandidates
      .map((candidate) => join(appPath, candidate))
      .find((candidate) => existsSync(candidate)) ?? null

  return {
    sourceApp: referenceApp.sourceApp,
    role: referenceApp.role,
    status: 'installed',
    appPath,
    version: readBundleVersion(appPath),
    executablePath
  }
}

function main() {
  if (!existsSync(manifestPath)) {
    throw new Error(`Missing external MusicXML fixture manifest: ${manifestPath}`)
  }

  const manifest = readJson(manifestPath)
  const requiredAppExports = manifest.requiredAppExports ?? []
  const apps = listApplications()
  const detected = referenceApps.map((referenceApp) =>
    findReferenceApp(referenceApp, apps)
  )

  for (const referenceApp of referenceApps) {
    const manifestEntry = requiredAppExports.find(
      (entry) => entry.sourceApp === referenceApp.sourceApp
    )

    if (!manifestEntry) {
      throw new Error(
        `Missing requiredAppExports entry for ${referenceApp.sourceApp}`
      )
    }

    if (manifestEntry.referenceRole !== referenceApp.role) {
      throw new Error(
        `${referenceApp.sourceApp} referenceRole must be ${referenceApp.role}`
      )
    }

    if (!String(manifestEntry.fixtureSourcePolicy ?? '').trim()) {
      throw new Error(
        `${referenceApp.sourceApp} fixtureSourcePolicy must describe the RC fixture source`
      )
    }
  }

  const collectedFixtureApps = new Set(
    (manifest.fixtures ?? [])
      .filter((fixture) => fixture.origin === 'app-export')
      .map((fixture) => fixture.sourceApp)
  )

  const summary = detected.map((app) => {
    const manifestEntry = requiredAppExports.find(
      (entry) => entry.sourceApp === app.sourceApp
    )

    const appExportCollected = collectedFixtureApps.has(app.sourceApp)

    return {
      sourceApp: app.sourceApp,
      role: app.role,
      localStatus: app.status,
      appPath: app.appPath,
      version: app.version,
      executablePath: app.executablePath,
      requiredFixtureStatus: manifestEntry.collectionStatus,
      targetFixtureId: manifestEntry.targetFixtureId,
      appExportCollected,
      nextAction: appExportCollected
        ? `Run GUI/manual reopen snapshot QA for ${manifestEntry.targetFixtureId}`
        : app.status === 'installed'
          ? `Run manual GUI/CLI export QA and collect ${manifestEntry.targetFixtureId}.musicxml`
          : `Install ${app.sourceApp} or provide a documented ${app.sourceApp}-origin MusicXML fixture`
    }
  })

  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), summary }, null, 2))
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
