const { readdirSync, readFileSync } = require('node:fs')
const { extname, join, resolve } = require('node:path')

const repoRoot = resolve(__dirname, '..')
const siteRoot = resolve(repoRoot, 'site')
const docsPath = resolve(repoRoot, 'docs/product/analytics-events.md')
const operationsDocsPath = resolve(repoRoot, 'docs/product/analytics-operations.md')
const configPath = resolve(siteRoot, 'analytics-config.json')
const forbiddenParamNames = new Set([
  'address',
  'email',
  'ip',
  'name',
  'phone',
  'user_id',
  'userid'
])
const requiredKeyEvents = [
  'download_primary',
  'download_platform',
  'open_in_chromatics',
  'composition_download',
  'feedback_submit'
]
const requiredCustomDimensions = [
  'content_type',
  'content_slug',
  'content_title',
  'category',
  'reading_minutes',
  'difficulty',
  'key',
  'meter',
  'platform',
  'file_name',
  'location',
  'answer'
]

function read(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), 'utf8')
}

function walkFiles(directory, extensions) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) {
      return walkFiles(path, extensions)
    }

    if (!extensions.has(extname(entry.name))) {
      return []
    }

    return [path]
  })
}

function parseImplementedEvents(markdown) {
  const implementedSection = markdown.match(
    /## Implemented Events\n([\s\S]*?)(?=\n## )/
  )

  if (!implementedSection) {
    throw new Error('docs/product/analytics-events.md missing Implemented Events section')
  }

  return new Set(
    [...implementedSection[1].matchAll(/\| `([a-z0-9_]+)` \|/g)].map(
      (match) => match[1]
    )
  )
}

function parseSourceEvents(source) {
  const events = new Set()
  const patterns = [
    /data-track-event=["']([a-z0-9_]+)["']/g,
    /trackEvent\(\s*["']([a-z0-9_]+)["']/g,
    /trackReadCompletion\([\s\S]*?,\s*[^,]+,\s*["']([a-z0-9_]+)["']/g,
    /dataset\.trackEvent\s*=[^;\n]+/g
  ]

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      if (match[1]) {
        events.add(match[1])
        continue
      }

      for (const eventName of match[0].matchAll(/["']([a-z0-9_]+)["']/g)) {
        events.add(eventName[1])
      }
    }
  }

  return events
}

function getSourceBundle() {
  const files = walkFiles(siteRoot, new Set(['.html', '.js']))
  return files.map((file) => readFileSync(file, 'utf8')).join('\n')
}

function verifyConfig() {
  let config

  try {
    config = JSON.parse(readFileSync(configPath, 'utf8'))
  } catch (error) {
    throw new Error(`site/analytics-config.json is invalid JSON: ${error.message}`)
  }

  if (config.provider !== 'ga4') {
    throw new Error('analytics provider must be ga4')
  }

  if (typeof config.enabled !== 'boolean') {
    throw new Error('analytics enabled must be a boolean')
  }

  if (typeof config.measurementId !== 'string') {
    throw new Error('analytics measurementId must be a string')
  }

  if (config.enabled && !/^G-[A-Z0-9]+$/.test(config.measurementId.trim())) {
    throw new Error('enabled GA4 analytics requires a G- measurementId')
  }
}

function verifyPrivacyGuard(source) {
  const forbiddenHits = []
  const analyticsSource = read('site/analytics.js')

  for (const name of forbiddenParamNames) {
    const dataAttributeName = name.replaceAll('_', '-')
    const paramPattern = new RegExp(`\\b${name}\\s*:`, 'i')
    const dataPattern = new RegExp(`data-track-${dataAttributeName}\\b`, 'i')
    const allowlistPattern = new RegExp(`['"]${name}['"]`, 'i')

    if (
      paramPattern.test(source) ||
      dataPattern.test(source) ||
      allowlistPattern.test(analyticsSource)
    ) {
      forbiddenHits.push(name)
    }
  }

  if (forbiddenHits.length > 0) {
    throw new Error(
      `analytics source contains forbidden parameter name(s): ${forbiddenHits.join(', ')}`
    )
  }

  if (!analyticsSource.includes('allowedEventParams')) {
    throw new Error('site/analytics.js must keep an allowedEventParams privacy guard')
  }

  if (!analyticsSource.includes('disableAnalytics')) {
    throw new Error('site/analytics.js must disable analytics safely on invalid config')
  }
}

function verifyOperationsDocs(markdown) {
  for (const event of requiredKeyEvents) {
    if (!markdown.includes(`\`${event}\``)) {
      throw new Error(`analytics operations docs missing key event: ${event}`)
    }
  }

  for (const dimension of requiredCustomDimensions) {
    if (!markdown.includes(`\`${dimension}\``)) {
      throw new Error(`analytics operations docs missing custom dimension: ${dimension}`)
    }
  }

  if (!markdown.includes('Search Console')) {
    throw new Error('analytics operations docs must include Search Console setup')
  }

  if (!markdown.includes('Realtime') || !markdown.includes('DebugView')) {
    throw new Error('analytics operations docs must include Realtime and DebugView checks')
  }
}

function main() {
  verifyConfig()

  const docs = readFileSync(docsPath, 'utf8')
  const operationsDocs = readFileSync(operationsDocsPath, 'utf8')
  const documentedEvents = parseImplementedEvents(docs)
  const source = getSourceBundle()
  const sourceEvents = parseSourceEvents(source)
  const missingFromDocs = [...sourceEvents].filter(
    (event) => !documentedEvents.has(event)
  )
  const missingFromSource = [...documentedEvents].filter(
    (event) => !sourceEvents.has(event) && !source.includes(event)
  )

  verifyPrivacyGuard(source)
  verifyOperationsDocs(operationsDocs)

  if (missingFromDocs.length > 0) {
    throw new Error(
      `source event(s) missing from Implemented Events: ${missingFromDocs.join(', ')}`
    )
  }

  if (missingFromSource.length > 0) {
    throw new Error(
      `documented event(s) missing from site source: ${missingFromSource.join(', ')}`
    )
  }

  console.log(`Verified analytics config and ${documentedEvents.size} documented event(s).`)
}

try {
  main()
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
