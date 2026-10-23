#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)))
const defaultCandidatesPath = resolve(
  rootDir,
  'docs/product/classical-quick-quiz-audio-candidates.json'
)
const defaultOutDir = resolve(rootDir, 'site/public/audio/classic-quiz/originals')
const defaultPlanPath = resolve(
  rootDir,
  'docs/product/classical-quick-quiz-audio-download-plan.json'
)
const defaultAppAudioPath = resolve(rootDir, 'site/classic-quiz-audio.js')
const userAgent = 'in-c-classic-quiz-audio-prep/0.1 (+https://in-c.mannlab.app)'

const args = new Set(process.argv.slice(2))
const shouldCheckNetwork = args.has('--check-network') || args.has('--download')
const shouldDownload = args.has('--download')
const shouldWritePlan = args.has('--write-plan')
const shouldVerifyLocal = args.has('--verify-local')

function getArgValue(name, fallback) {
  const index = process.argv.indexOf(name)
  return index >= 0 && process.argv[index + 1] ? resolve(rootDir, process.argv[index + 1]) : fallback
}

function slugify(value) {
  return String(value)
    .normalize('NFKD')
    .toLowerCase()
    .replace(/['".,()[\]{}]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
}

function extensionFromUrl(url, fallback = '.ogg') {
  try {
    const pathname = new URL(url).pathname
    const ext = extname(pathname)
    return ext || fallback
  } catch {
    return fallback
  }
}

function mimeFromExtension(pathname) {
  const ext = extname(pathname).toLowerCase()
  const mimeTypes = {
    '.aac': 'audio/aac',
    '.flac': 'audio/flac',
    '.m4a': 'audio/mp4',
    '.mp3': 'audio/mpeg',
    '.oga': 'audio/ogg',
    '.ogg': 'audio/ogg',
    '.opus': 'audio/ogg',
    '.wav': 'audio/wav'
  }
  return mimeTypes[ext] ?? 'application/octet-stream'
}

function toPublicPath(absPath) {
  const publicRoot = resolve(rootDir, 'site/public')
  return absPath.startsWith(publicRoot)
    ? `.${absPath.slice(publicRoot.length)}`
    : absPath
}

function fromPublicPath(publicPath) {
  if (!publicPath) {
    return ''
  }
  return resolve(rootDir, 'site/public', publicPath.replace(/^\.\//, ''))
}

async function readCandidates(pathname) {
  const raw = await readFile(pathname, 'utf8')
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed.candidates)) {
    throw new Error(`Invalid candidate JSON: ${pathname}`)
  }
  return parsed.candidates
}

async function sha256File(pathname) {
  const buffer = await readFile(pathname)
  return createHash('sha256').update(buffer).digest('hex')
}

async function inspectRemote(url) {
  const response = await fetch(url, {
    method: 'HEAD',
    headers: { 'user-agent': userAgent }
  })

  return {
    ok: response.ok,
    status: response.status,
    contentType: response.headers.get('content-type'),
    contentLength: Number(response.headers.get('content-length') ?? 0) || null,
    retryAfter: response.headers.get('retry-after')
  }
}

async function download(url, targetPath) {
  const response = await fetch(url, {
    headers: { 'user-agent': userAgent }
  })
  if (!response.ok) {
    throw new Error(`Download failed ${response.status}: ${url}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  await mkdir(resolve(targetPath, '..'), { recursive: true })
  await writeFile(targetPath, buffer)
  return {
    sizeBytes: buffer.byteLength,
    checksum: createHash('sha256').update(buffer).digest('hex')
  }
}

async function existingFileMeta(targetPath) {
  try {
    const fileStat = await stat(targetPath)
    return {
      exists: true,
      sizeBytes: fileStat.size,
      checksum: await sha256File(targetPath)
    }
  } catch {
    return {
      exists: false,
      sizeBytes: null,
      checksum: ''
    }
  }
}

async function verifyAppAudioMetadata(candidates, appAudioPath) {
  const module = await import(pathToFileURL(appAudioPath).href)
  const appRecords = module.clearedAudioByWorkId ?? {}
  const candidateById = new Map(candidates.map((candidate) => [candidate.seedId, candidate]))
  const clearedCandidateIds = candidates
    .filter((candidate) => candidate.verifiedAudioStatus === 'cleared-open')
    .map((candidate) => candidate.seedId)
  const mismatches = []
  const localAssets = []

  for (const seedId of clearedCandidateIds) {
    const appRecord = appRecords[seedId]
    const candidate = candidateById.get(seedId)
    if (!appRecord) {
      mismatches.push({ seedId, field: 'appRecord', candidate: 'exists', app: 'missing' })
      continue
    }

    const comparisons = [
      ['audioUrl', candidate.actualAudioUrl, appRecord.audioUrl],
      ['sourceUrl', candidate.sourceUrl, appRecord.sourceUrl],
      ['licenseUrl', candidate.licenseUrl, appRecord.licenseUrl],
      ['verifiedAudioStatus', candidate.verifiedAudioStatus, appRecord.verifiedAudioStatus]
    ]
    for (const [field, candidateValue, appValue] of comparisons) {
      if (candidateValue !== appValue) {
        mismatches.push({ seedId, field, candidate: candidateValue, app: appValue })
      }
    }
  }

  for (const [seedId, record] of Object.entries(appRecords)) {
    const candidate = candidateById.get(seedId)
    if (!candidate) {
      mismatches.push({ seedId, field: 'candidate', candidate: 'missing', app: 'exists' })
    }
    if (record.verifiedAudioStatus !== 'cleared-open' && record.verifiedAudioStatus !== 'cleared-contract') {
      mismatches.push({
        seedId,
        field: 'verifiedAudioStatus',
        candidate: candidate?.verifiedAudioStatus ?? 'missing',
        app: record.verifiedAudioStatus
      })
    }
    if (record.localAudioPath) {
      const localPath = fromPublicPath(record.localAudioPath)
      localAssets.push({
        seedId,
        publicPath: record.localAudioPath,
        expectedMime: mimeFromExtension(localPath),
        ...(await existingFileMeta(localPath))
      })
    }
  }

  return {
    appAudioPath,
    checkedAppRecords: Object.keys(appRecords).length,
    clearedCandidateCount: clearedCandidateIds.length,
    mismatchCount: mismatches.length,
    mismatches,
    localAssets
  }
}

function createPlanItem(candidate, outDir) {
  const ext = extensionFromUrl(candidate.actualAudioUrl)
  const fileSlug = slugify(`${candidate.seedId}-${candidate.performer || candidate.fileName}`)
  const targetPath = join(outDir, `${fileSlug}${ext}`)

  return {
    seedId: candidate.seedId,
    fileName: candidate.fileName,
    sourceName: candidate.sourceName,
    sourceUrl: candidate.sourceUrl,
    license: candidate.license,
    licenseUrl: candidate.licenseUrl,
    performer: candidate.performer,
    actualAudioUrl: candidate.actualAudioUrl,
    expectedMime: mimeFromExtension(candidate.actualAudioUrl),
    verifiedAudioStatus: candidate.verifiedAudioStatus,
    targetPath,
    publicPath: toPublicPath(targetPath),
    recommendedClipStart: candidate.recommendedClipStart,
    recommendedClipDuration: candidate.recommendedClipDuration,
    ffmpegPlan:
      'ffmpeg -ss <start> -t <duration> -i <original> -vn -ac 2 -ar 44100 -b:a 128k <clip>.mp3',
    remote: null,
    local: null
  }
}

async function main() {
  const candidatesPath = getArgValue('--candidates', defaultCandidatesPath)
  const outDir = getArgValue('--out-dir', defaultOutDir)
  const planPath = getArgValue('--plan', defaultPlanPath)
  const appAudioPath = getArgValue('--app-audio', defaultAppAudioPath)
  const candidates = await readCandidates(candidatesPath)
  const cleared = candidates.filter((item) => item.verifiedAudioStatus === 'cleared-open')
  const plan = []

  if (shouldDownload) {
    await mkdir(outDir, { recursive: true })
  }

  for (const candidate of cleared) {
    const item = createPlanItem(candidate, outDir)

    if (shouldCheckNetwork) {
      try {
        item.remote = await inspectRemote(candidate.actualAudioUrl)
      } catch (error) {
        item.remote = {
          ok: false,
          status: 0,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }

    if (shouldDownload) {
      try {
        item.local = await download(candidate.actualAudioUrl, item.targetPath)
      } catch (error) {
        item.local = {
          exists: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    } else {
      item.local = await existingFileMeta(item.targetPath)
    }

    plan.push(item)
  }

  const output = {
    generatedAt: new Date().toISOString(),
    source: candidatesPath,
    selectedStatus: 'cleared-open',
    count: plan.length,
    downloadMode: shouldDownload,
    networkChecked: shouldCheckNetwork,
    localVerified: shouldVerifyLocal,
    outDir,
    summary: {
      readyToDownload: plan.length,
      existingLocalFiles: plan.filter((item) => item.local?.exists).length,
      failedNetworkChecks: plan.filter((item) => item.remote && !item.remote.ok).length,
      downloadedFiles: plan.filter((item) => item.local?.checksum).length
    },
    metadataReport: shouldVerifyLocal
      ? await verifyAppAudioMetadata(candidates, appAudioPath)
      : null,
    items: plan
  }

  if (shouldWritePlan) {
    await writeFile(planPath, `${JSON.stringify(output, null, 2)}\n`)
    console.log(`Wrote ${plan.length} cleared-open audio plan items to ${planPath}`)
    if (output.metadataReport) {
      console.log(
        `Metadata mismatches: ${output.metadataReport.mismatchCount}; local assets checked: ${output.metadataReport.localAssets.length}`
      )
    }
    return
  }

  console.log(JSON.stringify(output, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
