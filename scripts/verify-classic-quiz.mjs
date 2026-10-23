#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)))

const paths = {
  html: resolve(rootDir, 'site/classic-quiz.html'),
  creditsHtml: resolve(rootDir, 'site/classic-quiz-credits.html'),
  manifest: resolve(rootDir, 'site/classic-quiz.webmanifest'),
  sitemap: resolve(rootDir, 'site/public/sitemap.xml'),
  candidates: resolve(rootDir, 'docs/product/classical-quick-quiz-audio-candidates.json'),
  plan: resolve(rootDir, 'docs/product/classical-quick-quiz-audio-download-plan.json'),
  data: resolve(rootDir, 'site/classic-quiz-data.js'),
  audio: resolve(rootDir, 'site/classic-quiz-audio.js'),
  rounds: resolve(rootDir, 'site/classic-quiz-rounds.js')
}

const requiredSelectors = [
  'data-mode-choice="daily"',
  'data-mode-choice="composer"',
  'data-mode-choice="title"',
  'data-start-selected',
  'data-start-review',
  'data-start-practice="composer"',
  'data-start-practice="title"',
  'data-review-card',
  'data-daily-status',
  'data-daily-streak',
  'data-play-clip',
  'data-audio-status',
  'data-answer-grid',
  'data-input-answer',
  'data-answer-input',
  'data-feedback-confusion',
  'data-feedback-score-detail',
  'data-round-breakdown',
  'data-training-tip',
  'data-daily-summary',
  'classic-quiz-credits.html'
]

const requiredWorkFields = [
  'id',
  'composerKo',
  'composerEn',
  'titleKo',
  'titleEn',
  'nicknameKo',
  'era',
  'difficulty',
  'audioUrl',
  'localAudioPath',
  'audioFormat',
  'audioSizeBytes',
  'audioDurationSeconds',
  'audioChecksum',
  'clipStart',
  'clipDuration',
  'sourceName',
  'sourceUrl',
  'license',
  'licenseUrl',
  'performer',
  'performerUrl',
  'notesKo',
  'confusionNoteKo',
  'searchAliasesKo',
  'familiarReasonKo',
  'modeTags',
  'verifiedAudioStatus',
  'rightsNotes'
]

const requiredRoundFields = [
  'roundNumber',
  'target',
  'method',
  'difficultyBand',
  'maxPopularityTier',
  'scoreBase',
  'hintPolicy',
  'label',
  'briefKo',
  'rewardKo'
]

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function readJson(pathname) {
  return JSON.parse(await readFile(pathname, 'utf8'))
}

function hasValue(value) {
  if (Array.isArray(value)) {
    return value.length > 0
  }
  return value !== undefined && value !== null && value !== ''
}

function hasField(object, field) {
  return Object.prototype.hasOwnProperty.call(object, field)
}

async function loadModule(pathname) {
  return import(pathToFileURL(pathname).href)
}

async function main() {
  const [html, creditsHtml, manifest, sitemap, candidates, plan, dataModule, audioModule, roundsModule] =
    await Promise.all([
      readFile(paths.html, 'utf8'),
      readFile(paths.creditsHtml, 'utf8'),
      readJson(paths.manifest),
      readFile(paths.sitemap, 'utf8'),
      readJson(paths.candidates),
      readJson(paths.plan),
      loadModule(paths.data),
      loadModule(paths.audio),
      loadModule(paths.rounds)
    ])

  for (const selector of requiredSelectors) {
    assert(html.includes(selector), `classic-quiz.html missing ${selector}`)
  }
  assert(creditsHtml.includes('data-credit-list'), 'credits page missing data-credit-list')

  assert(manifest.start_url === './classic-quiz.html', 'manifest start_url must target quiz')
  assert(manifest.scope === './', 'manifest scope must remain ./')
  // These prototypes remain buildable but are outside the public site scope.
  // Keep this contract aligned with verify-site-content.mjs.
  for (const [page, content] of [
    ['classic-quiz.html', html],
    ['classic-quiz-credits.html', creditsHtml]
  ]) {
    assert(!sitemap.includes(page), `sitemap must not index deferred page: ${page}`)
    assert(content.includes('noindex,nofollow'), `${page} must be marked noindex`)
  }

  const { quizWorks } = dataModule
  const { clearedAudioByWorkId } = audioModule
  const { dailyRoundBlueprints, SESSION_SIZE, workTaxonomyById } = roundsModule
  assert(Array.isArray(quizWorks), 'quizWorks must be an array')
  assert(quizWorks.length >= 20, 'quizWorks must keep at least 20 seed works')
  assert(dailyRoundBlueprints.length === SESSION_SIZE, 'daily rounds must match session size')

  for (const [index, round] of dailyRoundBlueprints.entries()) {
    for (const field of requiredRoundFields) {
      assert(hasValue(round[field]), `round ${index + 1} missing ${field}`)
    }
    assert(round.roundNumber === index + 1, `round ${index + 1} has wrong roundNumber`)
  }

  for (const work of quizWorks) {
    const taxonomy = workTaxonomyById[work.id]
    assert(taxonomy, `${work.id} missing taxonomy`)
    const combined = { ...work, ...taxonomy }
    for (const field of requiredWorkFields) {
      assert(hasField(combined, field), `${work.id} missing ${field}`)
    }
    assert(hasValue(combined.genreKo), `${work.id} missing genreKo`)
    assert(hasValue(combined.popularityTier), `${work.id} missing popularityTier`)
    if (combined.verifiedAudioStatus !== 'cleared-open' && combined.verifiedAudioStatus !== 'cleared-contract') {
      assert(!combined.audioUrl, `${work.id} has audioUrl without cleared status`)
      assert(!combined.localAudioPath, `${work.id} has localAudioPath without cleared status`)
    }
  }

  const candidateById = new Map(candidates.candidates.map((candidate) => [candidate.seedId, candidate]))
  const clearedCandidates = candidates.candidates.filter(
    (candidate) => candidate.verifiedAudioStatus === 'cleared-open'
  )
  assert(plan.items.length === clearedCandidates.length, 'download plan count must match cleared candidates')

  for (const candidate of clearedCandidates) {
    const appAudio = clearedAudioByWorkId[candidate.seedId]
    assert(appAudio, `${candidate.seedId} missing in app audio metadata`)
    assert(appAudio.audioUrl === candidate.actualAudioUrl, `${candidate.seedId} audio URL mismatch`)
    assert(appAudio.sourceUrl === candidate.sourceUrl, `${candidate.seedId} source URL mismatch`)
    assert(appAudio.licenseUrl === candidate.licenseUrl, `${candidate.seedId} license URL mismatch`)
    assert(appAudio.verifiedAudioStatus === 'cleared-open', `${candidate.seedId} is not cleared-open`)
  }

  for (const seedId of Object.keys(clearedAudioByWorkId)) {
    assert(candidateById.has(seedId), `${seedId} app audio record lacks candidate entry`)
  }

  console.log(
    `Verified classic quiz: ${quizWorks.length} works, ${dailyRoundBlueprints.length} rounds, ${clearedCandidates.length} cleared-open audio records.`
  )
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
