import { bindTrackedLinks, configureAnalytics } from './analytics.js'
import { initSiteShell } from './site-shell.js'
import { isClearedAudio } from './classic-quiz-audio.js'
import { quizWorks } from './classic-quiz-data.js'
import {
  DAILY_LIMIT,
  ERA_OPTIONS,
  KST_TIME_ZONE,
  SESSION_SIZE,
  TIMER_MAX_DELAY,
  composerAliases,
  createPracticeRound,
  createReviewRound,
  dailyRoundBlueprints,
  getRoundHint,
  getRoundPrompt,
  modeLabels,
  targetLabels,
  workTaxonomyById
} from './classic-quiz-rounds.js'

const STORAGE_KEY = 'inc.classicQuiz.v2'
const STORAGE_SCHEMA_VERSION = 3
const CHOSEONG = [
  'ㄱ',
  'ㄲ',
  'ㄴ',
  'ㄷ',
  'ㄸ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅃ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅉ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ'
]

const works = quizWorks.map((work) => ({
  ...work,
  ...(workTaxonomyById[work.id] ?? { popularityTier: 2, genreKo: '클래식' })
}))
const composers = [...new Set(works.map((work) => work.composerKo))]
const titles = works.map((work) => formatWorkTitle(work))
const genres = [...new Set(works.map((work) => work.genreKo))]
const workByTitle = new Map(works.map((work) => [formatWorkTitle(work), work]))

let audioContext
let audioElement
let activeNodes = []
let activeTimeout
let activeAudioFallbackTimeout
let timerFrame
let reminderTimeout
let selectedMode = 'daily'
let state = createInitialState()

function createInitialState() {
  return {
    mode: selectedMode,
    questions: [],
    rounds: [],
    currentIndex: 0,
    correct: 0,
    score: 0,
    responses: [],
    misses: [],
    answeredIds: new Set(),
    combo: 0,
    questionStartedAt: 0,
    currentOptions: [],
    currentAnswer: '',
    currentPool: [],
    currentHint: '',
    isReview: false
  }
}

function formatWorkTitle(work) {
  return work.nicknameKo ? `${work.titleKo} '${work.nicknameKo}'` : work.titleKo
}

function formatFullWork(work) {
  return `${work.composerKo} - ${formatWorkTitle(work)}`
}

function getCurrentWork() {
  return state.questions[state.currentIndex]
}

function getCurrentRound() {
  return state.rounds[state.currentIndex] ?? createPracticeRound(state.mode, state.currentIndex)
}

function shuffle(items) {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]]
  }
  return copy
}

function createEmptyTrainingStats() {
  return {
    missedWorkCounts: {},
    missedComposerCounts: {},
    missedGenreCounts: {},
    targetMissCounts: {},
    methodMissCounts: {}
  }
}

function normalizeStorageShape(value) {
  const data = value && typeof value === 'object' ? value : {}
  return {
    ...data,
    schemaVersion: STORAGE_SCHEMA_VERSION,
    dailyChallenge: data.dailyChallenge ?? {},
    dailyStats: {
      streak: 0,
      bestDailyScore: 0,
      bestDailyAccuracy: 0,
      lastDailyDateKey: '',
      lastDailyScore: 0,
      lastDailyAccuracy: 0,
      ...(data.dailyStats ?? {})
    },
    trainingStats: {
      ...createEmptyTrainingStats(),
      ...(data.trainingStats ?? {})
    },
    missedWorkIds: Array.isArray(data.missedWorkIds) ? data.missedWorkIds : [],
    improvedWorkIds: Array.isArray(data.improvedWorkIds) ? data.improvedWorkIds : []
  }
}

function getStorage() {
  try {
    return normalizeStorageShape(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}'))
  } catch {
    return normalizeStorageShape({})
  }
}

function saveStorage(patch) {
  const current = getStorage()
  const next = {
    ...current,
    ...patch,
    schemaVersion: STORAGE_SCHEMA_VERSION,
    bestScore: Math.max(current.bestScore ?? 0, patch.lastResult?.score ?? 0),
    updatedAt: new Date().toISOString()
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

function getKstParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: KST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value),
    month: Number(parts.find((part) => part.type === 'month')?.value),
    day: Number(parts.find((part) => part.type === 'day')?.value)
  }
}

function getKstDateKey(date = new Date()) {
  const { year, month, day } = getKstParts(date)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getDateKeyDiffDays(fromKey, toKey) {
  if (!fromKey || !toKey) {
    return Number.POSITIVE_INFINITY
  }
  const from = fromKey.split('-').map(Number)
  const to = toKey.split('-').map(Number)
  if (from.length !== 3 || to.length !== 3 || from.some(Number.isNaN) || to.some(Number.isNaN)) {
    return Number.POSITIVE_INFINITY
  }
  const fromTime = Date.UTC(from[0], from[1] - 1, from[2])
  const toTime = Date.UTC(to[0], to[1] - 1, to[2])
  return Math.round((toTime - fromTime) / 86_400_000)
}

function getNextKstMidnight(date = new Date()) {
  const { year, month, day } = getKstParts(date)
  return new Date(Date.UTC(year, month - 1, day + 1, -9, 0, 0, 0))
}

function formatKstDateTime(isoText) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: KST_TIME_ZONE,
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(isoText))
}

function getDailyAttemptState() {
  const todayKey = getKstDateKey()
  const dailyChallenge = getStorage().dailyChallenge ?? {}
  const attemptsUsed = dailyChallenge.dateKey === todayKey ? dailyChallenge.attemptsUsed ?? 0 : 0
  const nextAttemptAt = getNextKstMidnight().toISOString()

  return {
    todayKey,
    attemptsUsed,
    remaining: Math.max(0, DAILY_LIMIT - attemptsUsed),
    nextAttemptAt,
    reminderEnabled: Boolean(dailyChallenge.reminderEnabled)
  }
}

function saveDailyAttempt(patch) {
  const current = getStorage()
  saveStorage({
    dailyChallenge: {
      ...(current.dailyChallenge ?? {}),
      ...patch
    }
  })
}

function consumeDailyAttempt() {
  const daily = getDailyAttemptState()
  saveDailyAttempt({
    dateKey: daily.todayKey,
    attemptsUsed: Math.min(DAILY_LIMIT, daily.attemptsUsed + 1),
    nextAttemptAt: daily.nextAttemptAt,
    lastStartedAt: new Date().toISOString()
  })
  renderDailyStatus()
  scheduleLocalReminder()
}

function canStartDailyAttempt() {
  return getDailyAttemptState().remaining > 0
}

function renderDailyStatus() {
  const daily = getDailyAttemptState()
  const { dailyStats } = getStorage()
  const status = document.querySelector('[data-daily-status]')
  const next = document.querySelector('[data-daily-next]')
  const streak = document.querySelector('[data-daily-streak]')
  const best = document.querySelector('[data-daily-best]')
  const last = document.querySelector('[data-daily-last]')
  const reminder = document.querySelector('[data-enable-reminder]')
  const startButtons = document.querySelectorAll('[data-start-selected]')

  if (status) {
    status.textContent =
      daily.remaining > 0
        ? `${daily.remaining}회`
        : `${formatKstDateTime(daily.nextAttemptAt)} 회복`
  }
  if (next) {
    next.textContent =
      daily.remaining > 0
        ? '오늘 도전을 아직 시작할 수 있어요'
        : '연습과 오답 복습은 계속 가능합니다'
  }
  if (streak) {
    streak.textContent = `연속 ${dailyStats.streak ?? 0}일`
  }
  if (best) {
    best.textContent = `데일리 최고 ${dailyStats.bestDailyScore ?? 0}점`
  }
  if (last) {
    last.textContent = dailyStats.lastDailyDateKey
      ? `최근 데일리 ${dailyStats.lastDailyScore ?? 0}점 · ${dailyStats.lastDailyAccuracy ?? 0}%`
      : '최근 데일리 없음'
  }

  for (const button of startButtons) {
    const isLocked = selectedMode === 'daily' && daily.remaining <= 0 && !state.isReview
    const startLabel =
      selectedMode === 'composer'
        ? '▶ 작곡가 연습 시작'
        : selectedMode === 'title'
          ? '▶ 곡명 연습 시작'
          : '▶ 오늘 도전 시작'
    button.disabled = isLocked
    button.textContent = isLocked ? '내일 다시 열려요' : startLabel
  }

  if (reminder) {
    if (!('Notification' in window)) {
      reminder.disabled = true
      reminder.textContent = '알림 미지원'
    } else if (Notification.permission === 'granted' || daily.reminderEnabled) {
      reminder.textContent = '회복 알림 켜짐'
    } else if (Notification.permission === 'denied') {
      reminder.disabled = true
      reminder.textContent = '알림 차단됨'
    } else {
      reminder.disabled = false
      reminder.textContent = '회복 알림 받기'
    }
  }
}

function scheduleLocalReminder() {
  window.clearTimeout(reminderTimeout)
  const daily = getDailyAttemptState()
  if (!daily.reminderEnabled || daily.remaining > 0 || !('Notification' in window)) {
    return
  }

  const delay = new Date(daily.nextAttemptAt).getTime() - Date.now()
  if (delay <= 0) {
    renderDailyStatus()
    return
  }

  reminderTimeout = window.setTimeout(() => {
    renderDailyStatus()
    if (Notification.permission === 'granted') {
      new Notification('오늘의 클래식 10문제가 열렸어요', {
        body: '짧은 클립 듣고 오늘 기록을 새로 세워보세요.',
        tag: 'classic-quiz-daily-ready'
      })
    }
  }, Math.min(delay, TIMER_MAX_DELAY))
}

async function requestReminderPermission() {
  if (!('Notification' in window)) {
    return 'unsupported'
  }

  return Notification.permission === 'default'
    ? Notification.requestPermission()
    : Notification.permission
}

async function registerPushSubscription() {
  return {
    available: false,
    reason: 'MVP에는 서버와 Web Push VAPID 키가 없어서 로컬 알림만 사용합니다.'
  }
}

async function enableReminder() {
  const permission = await requestReminderPermission()

  saveDailyAttempt({ reminderEnabled: permission === 'granted' })
  renderDailyStatus()
  scheduleLocalReminder()
}

function setPanel(name) {
  document.body.dataset.quizPanel = name
  for (const panel of document.querySelectorAll('[data-panel]')) {
    panel.hidden = panel.dataset.panel !== name
  }
}

function setMode(mode) {
  selectedMode = mode
  state.mode = mode
  for (const button of document.querySelectorAll('[data-mode-choice]')) {
    button.setAttribute('aria-pressed', String(button.dataset.modeChoice === mode))
  }
  updateStatus()
  renderDailyStatus()
}

function updateStatus() {
  const progressLabel = document.querySelector('[data-progress-label]')
  const scoreLabel = document.querySelector('[data-score-label]')
  const progressBar = document.querySelector('[data-progress-bar]')
  const total = state.questions.length || SESSION_SIZE
  const completed = state.questions.length === 0 ? 0 : state.currentIndex
  const progress = state.questions.length === 0 ? 0 : (completed / total) * 100

  if (progressLabel) {
    progressLabel.textContent =
      state.questions.length === 0
        ? '대기'
        : `${Math.min(state.currentIndex + 1, total)} / ${total}`
  }
  if (scoreLabel) {
    scoreLabel.textContent = `${state.score}점`
  }
  if (progressBar) {
    progressBar.style.width = `${progress}%`
  }
}

function renderLastResult() {
  const target = document.querySelector('[data-last-result]')
  if (!target) {
    return
  }

  const { lastResult, bestScore } = getStorage()
  if (!lastResult) {
    target.innerHTML = '<span>최근 기록</span><strong>아직 없음</strong>'
    return
  }

  const mode = modeLabels[lastResult.mode] ?? '데일리'
  target.innerHTML = `
    <span>최근 ${mode} 모드</span>
    <strong>${lastResult.score}점 · ${lastResult.accuracy}%</strong>
    <small>최고 ${bestScore ?? lastResult.score}점</small>
  `
}

function getStoredMisses() {
  const { missedWorkIds } = getStorage()
  return missedWorkIds
    .map((id) => works.find((work) => work.id === id))
    .filter(Boolean)
    .slice(0, SESSION_SIZE)
}

function renderReviewEntry() {
  const card = document.querySelector('[data-review-card]')
  const count = document.querySelector('[data-review-count]')
  if (!card || !count) {
    return
  }

  const misses = getStoredMisses()
  card.hidden = misses.length === 0
  count.textContent = `최근 오답 ${misses.length}곡`
}

function getQuestionPool(round) {
  if (round.target === 'composer') {
    return composers
  }
  if (round.target === 'title') {
    return titles
  }
  if (round.target === 'era') {
    return ERA_OPTIONS
  }
  if (round.target === 'genre') {
    return genres
  }
  return titles
}

function getQuestionAnswer(work, round) {
  if (round.target === 'composer') {
    return work.composerKo
  }
  if (round.target === 'title') {
    return formatWorkTitle(work)
  }
  if (round.target === 'era') {
    return work.era
  }
  if (round.target === 'genre') {
    return work.genreKo
  }
  return formatWorkTitle(work)
}

function createOptions(work, round) {
  const answer = getQuestionAnswer(work, round)
  const pool = getQuestionPool(round)
  const options = shuffle(pool.filter((item) => item !== answer)).slice(0, 3)
  return shuffle([answer, ...options])
}

function pickWorkForRound(round, tracker) {
  const candidates = works.filter(
    (work) => work.popularityTier <= round.maxPopularityTier && !tracker.usedIds.has(work.id)
  )
  const pool =
    candidates.length > 0 ? candidates : works.filter((work) => !tracker.usedIds.has(work.id))
  const scored = shuffle(pool.length > 0 ? pool : works).map((work) => {
    const composerPenalty = tracker.composerCounts.get(work.composerKo) ?? 0
    const genrePenalty = tracker.genreCounts.get(work.genreKo) ?? 0
    const audioBonus = isClearedAudio(work) ? -0.2 : 0
    return {
      work,
      score: composerPenalty * 1.1 + genrePenalty * 0.7 + audioBonus
    }
  })
  scored.sort((left, right) => left.score - right.score)
  return scored[0].work
}

function rememberPickedWork(tracker, work) {
  tracker.usedIds.add(work.id)
  tracker.composerCounts.set(work.composerKo, (tracker.composerCounts.get(work.composerKo) ?? 0) + 1)
  tracker.genreCounts.set(work.genreKo, (tracker.genreCounts.get(work.genreKo) ?? 0) + 1)
}

function createDailyQuestionSet() {
  const tracker = {
    usedIds: new Set(),
    composerCounts: new Map(),
    genreCounts: new Map()
  }
  const questions = dailyRoundBlueprints.map((round) => {
    const work = pickWorkForRound(round, tracker)
    rememberPickedWork(tracker, work)
    return work
  })

  return {
    questions,
    rounds: dailyRoundBlueprints
  }
}

function createPracticeQuestionSet(mode, customQuestions) {
  const questions = customQuestions ?? createBalancedPracticeSet()
  return {
    questions,
    rounds: questions.map((_, index) => createPracticeRound(mode, index))
  }
}

function createReviewQuestionSet(customQuestions) {
  const questions = shuffle(customQuestions).slice(0, SESSION_SIZE)
  return {
    questions,
    rounds: questions.map((_, index) => createReviewRound(index))
  }
}

function createBalancedPracticeSet() {
  const tracker = {
    usedIds: new Set(),
    composerCounts: new Map(),
    genreCounts: new Map()
  }
  const questions = []
  for (let index = 0; index < SESSION_SIZE; index += 1) {
    const round = createPracticeRound(selectedMode, index)
    const work = pickWorkForRound(round, tracker)
    rememberPickedWork(tracker, work)
    questions.push(work)
  }
  return questions
}

function renderChoiceAnswers(work, round) {
  const grid = document.querySelector('[data-answer-grid]')
  const inputForm = document.querySelector('[data-input-answer]')

  state.currentOptions = createOptions(work, round)
  grid.hidden = false
  inputForm.hidden = true
  grid.replaceChildren(
    ...state.currentOptions.map((option, index) => {
      const button = document.createElement('button')
      const key = String.fromCharCode(65 + index)
      button.className = 'classic-answer-button'
      button.type = 'button'
      button.innerHTML = `<span>${key}</span><strong>${option}</strong>`
      button.addEventListener('click', () => submitAnswer(option))
      return button
    })
  )
}

function renderInputAnswer(round) {
  const grid = document.querySelector('[data-answer-grid]')
  const inputForm = document.querySelector('[data-input-answer]')
  const input = document.querySelector('[data-answer-input]')
  const label = document.querySelector('[data-input-label]')
  const suggestions = document.querySelector('[data-suggestion-list]')

  state.currentPool = getQuestionPool(round)
  state.currentOptions = []
  grid.hidden = true
  grid.replaceChildren()
  inputForm.hidden = false
  input.value = ''
  input.disabled = false
  input.placeholder =
    round.method === 'autocomplete' ? '예: 베토벤, 운명, 달빛' : '정답을 직접 입력'
  label.textContent = round.method === 'autocomplete' ? '자동완성 검색' : '주관식 정답'
  inputForm.querySelector('button[type="submit"]').disabled = false
  suggestions.hidden = round.method !== 'autocomplete'
  suggestions.replaceChildren()
  updateSuggestions()
  input.focus({ preventScroll: true })
}

function normalizeAnswer(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[’'""“”‘’.,:;!?()[\]{}<>·\-\s]/g, '')
}

function toChoseong(value) {
  return String(value)
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0) - 0xac00
      if (code < 0 || code > 11171) {
        return char
      }
      return CHOSEONG[Math.floor(code / 588)]
    })
    .join('')
}

function getSearchTermsForOption(option, round) {
  if (round.target === 'composer') {
    return [
      option,
      ...(composerAliases[option] ?? []),
      ...works.filter((work) => work.composerKo === option).map((work) => work.composerEn)
    ].filter(Boolean)
  }

  if (round.target === 'title') {
    const work = workByTitle.get(option)
    return [
      option,
      work?.titleKo,
      work?.titleEn,
      work?.nicknameKo,
      ...(work?.searchAliasesKo ?? [])
    ].filter(Boolean)
  }

  return [option]
}

function matchesSearchQuery(option, round, query) {
  const normalizedQuery = normalizeAnswer(query)
  const initialQuery = normalizeAnswer(toChoseong(query))
  if (!normalizedQuery && !initialQuery) {
    return true
  }

  return getSearchTermsForOption(option, round).some((term) => {
    const normalizedTerm = normalizeAnswer(term)
    const initialTerm = normalizeAnswer(toChoseong(term))
    return (
      normalizedTerm.includes(normalizedQuery) ||
      (initialQuery.length > 0 && initialTerm.includes(initialQuery))
    )
  })
}

function getAcceptedAnswers(work, round) {
  if (round.target === 'composer') {
    return [work.composerKo, work.composerEn, ...(composerAliases[work.composerKo] ?? [])]
  }
  if (round.target === 'title') {
    return [
      work.titleKo,
      work.titleEn,
      formatWorkTitle(work),
      work.nicknameKo,
      ...(work.searchAliasesKo ?? [])
    ].filter(Boolean)
  }
  if (round.target === 'era') {
    return [work.era]
  }
  if (round.target === 'genre') {
    return [work.genreKo]
  }
  return [state.currentAnswer]
}

function isAnswerCorrect(selected, work, round) {
  if (round.method === 'choice') {
    return selected === state.currentAnswer
  }

  const normalizedSelected = normalizeAnswer(selected)
  return getAcceptedAnswers(work, round).some((answer) => {
    const normalizedAnswer = normalizeAnswer(answer)
    const minLength = Math.min(normalizedSelected.length, normalizedAnswer.length)
    return (
      normalizedAnswer === normalizedSelected ||
      (minLength >= 2 &&
        (normalizedAnswer.includes(normalizedSelected) ||
          normalizedSelected.includes(normalizedAnswer)))
    )
  })
}

function getScoreBreakdown(round, elapsedSeconds, isCorrect, streakAfter) {
  if (!isCorrect) {
    return {
      base: 0,
      speedBonus: 0,
      streakBonus: 0,
      total: 0
    }
  }

  const speedBonus = Math.max(0, Math.round((12 - elapsedSeconds) * 10))
  const streakBonus = streakAfter >= 2 ? Math.min(70, (streakAfter - 1) * 12) : 0
  const base = round.scoreBase ?? 100
  return {
    base,
    speedBonus,
    streakBonus,
    total: base + speedBonus + streakBonus
  }
}

function startQuiz(customQuestions) {
  const isReview = Array.isArray(customQuestions)
  const consumesDailyAttempt = selectedMode === 'daily' && !isReview
  if (consumesDailyAttempt && !canStartDailyAttempt()) {
    renderDailyStatus()
    setPanel('intro')
    return
  }

  stopPlayback()
  stopTimer()
  state = createInitialState()
  state.isReview = isReview
  state.mode = isReview ? 'review' : selectedMode
  const questionSet =
    isReview
      ? createReviewQuestionSet(customQuestions)
      : selectedMode === 'daily'
      ? createDailyQuestionSet()
      : createPracticeQuestionSet(selectedMode)

  state.questions = questionSet.questions
  state.rounds = questionSet.rounds
  state.currentIndex = 0
  if (consumesDailyAttempt) {
    consumeDailyAttempt()
  }
  renderQuestion()
}

function startStoredReview() {
  const misses = getStoredMisses()
  if (misses.length === 0) {
    renderReviewEntry()
    return
  }
  startQuiz(misses)
}

function startPractice(mode) {
  setMode(mode)
  startQuiz()
}

function renderQuestion() {
  const work = getCurrentWork()
  const round = getCurrentRound()
  state.currentAnswer = getQuestionAnswer(work, round)
  state.currentHint = getRoundHint(round)
  state.questionStartedAt = performance.now()

  document.querySelector('[data-question-title]').textContent = getRoundPrompt(round)
  document.querySelector('[data-difficulty-label]').textContent =
    `${state.currentIndex + 1}R · ${round.label} · ${work.difficulty} · 대중성 ${work.popularityTier}`
  document.querySelector('[data-round-brief]').textContent =
    `${round.briefKo ?? state.currentHint} ${round.rewardKo ?? ''}`.trim()
  setAudioState('idle', work)

  if (round.method === 'choice') {
    renderChoiceAnswers(work, round)
  } else {
    renderInputAnswer(round)
  }

  updateStatus()
  setPanel('question')
  startTimer()
}

function submitAnswer(selected) {
  if (state.answeredIds.has(getCurrentWork()?.id)) {
    return
  }

  stopPlayback()
  stopTimer()
  const work = getCurrentWork()
  const round = getCurrentRound()
  state.answeredIds.add(work.id)

  const elapsedSeconds = Math.max(
    0.1,
    (performance.now() - state.questionStartedAt) / 1000
  )
  const isCorrect = isAnswerCorrect(selected, work, round)
  const streakAfter = isCorrect ? state.combo + 1 : 0
  const scoreBreakdown = getScoreBreakdown(round, elapsedSeconds, isCorrect, streakAfter)
  const points = scoreBreakdown.total

  state.responses.push({
    id: work.id,
    round: round.label,
    target: round.target,
    method: round.method,
    selected,
    isCorrect,
    elapsedSeconds,
    points,
    scoreBreakdown,
    streakAfter
  })
  if (isCorrect) {
    state.correct += 1
    state.score += points
    state.combo = streakAfter
  } else {
    state.misses.push(work)
    state.combo = 0
  }

  renderAnsweredState(selected)
  window.setTimeout(() => renderFeedback(work, selected, isCorrect, points), 360)
}

function renderAnsweredState(selected) {
  for (const button of document.querySelectorAll('.classic-answer-button')) {
    const value = button.querySelector('strong')?.textContent
    button.disabled = true
    button.dataset.state =
      value === state.currentAnswer ? 'correct' : value === selected ? 'wrong' : 'dim'
  }

  const input = document.querySelector('[data-answer-input]')
  const submit = document.querySelector('[data-input-answer] button[type="submit"]')
  if (input && !input.closest('[data-input-answer]')?.hidden) {
    input.disabled = true
    submit.disabled = true
  }
}

function updateSuggestions() {
  const round = getCurrentRound()
  const suggestions = document.querySelector('[data-suggestion-list]')
  const input = document.querySelector('[data-answer-input]')
  if (!suggestions || !input || round.method !== 'autocomplete') {
    return
  }

  const matches = state.currentPool
    .filter((item) => matchesSearchQuery(item, round, input.value))
    .slice(0, 5)

  suggestions.hidden = false
  suggestions.replaceChildren(
    ...matches.map((item) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = item
      button.addEventListener('click', () => submitAnswer(item))
      return button
    })
  )
}

function submitInputAnswer(event) {
  event.preventDefault()
  const input = document.querySelector('[data-answer-input]')
  const value = input?.value.trim()
  if (!value) {
    input?.focus()
    return
  }
  submitAnswer(value)
}

function renderFeedback(work, selected, isCorrect, points) {
  const response = state.responses.at(-1)
  const result = document.querySelector('[data-feedback-result]')
  result.textContent = isCorrect ? `정답 · +${points}점` : `괜찮아요 · 정답은 ${state.currentAnswer}`
  result.dataset.correct = String(isCorrect)

  document.querySelector('[data-feedback-title]').textContent = formatFullWork(work)
  document.querySelector('[data-feedback-work]').textContent = work.titleEn
  document.querySelector('[data-feedback-body]').textContent = work.notesKo
  document.querySelector('[data-feedback-confusion]').textContent =
    isCorrect ? `좋아요. ${work.confusionNoteKo}` : `헷갈린 포인트: ${work.confusionNoteKo}`
  document.querySelector('[data-feedback-score-detail]').textContent =
    response?.scoreBreakdown?.total > 0
      ? `기본 ${response.scoreBreakdown.base} + 빠른 답 ${response.scoreBreakdown.speedBonus} + 연속 정답 ${response.scoreBreakdown.streakBonus}`
      : '오답은 점수가 붙지 않지만, 오답 노트에 남겨 다음 연습에 반영합니다.'
  document.querySelector('[data-feedback-era]').textContent = `${work.era} · ${work.difficulty}`
  document.querySelector('[data-feedback-familiar]').textContent = work.familiarReasonKo
  document.querySelector('[data-feedback-license]').textContent =
    isClearedAudio(work) ? '오픈 출처 확인' : '데모 음원'

  const sourceLink = document.querySelector('[data-feedback-source]')
  if (sourceLink) {
    sourceLink.hidden = !isClearedAudio(work)
    sourceLink.href = work.sourceUrl || '#'
    sourceLink.textContent = work.performer
      ? `음원 출처: ${work.performer}`
      : '음원 출처 보기'
  }

  const next = document.querySelector('[data-next-question]')
  next.textContent =
    state.currentIndex + 1 >= state.questions.length ? '결과 보기 →' : '다음 문제 →'

  updateStatus()
  setPanel('feedback')
}

function nextQuestion() {
  if (state.currentIndex + 1 >= state.questions.length) {
    renderResult()
    return
  }

  state.currentIndex += 1
  renderQuestion()
}

function renderRoundBreakdown() {
  const target = document.querySelector('[data-round-breakdown]')
  if (!target) {
    return
  }

  const title = document.createElement('span')
  title.className = 'classic-round-breakdown__title'
  title.textContent = '라운드별 기록'

  const list = document.createElement('ol')
  state.responses.forEach((response, index) => {
    const round = state.rounds[index] ?? createPracticeRound(state.mode, index)
    const item = document.createElement('li')
    item.dataset.correct = String(response.isCorrect)

    const label = document.createElement('strong')
    label.textContent = `${round.roundNumber ?? index + 1}R · ${round.label}`

    const meta = document.createElement('span')
    meta.textContent = `${response.isCorrect ? '정답' : '오답'} · ${response.elapsedSeconds.toFixed(1)}초 · ${response.points}점`

    item.append(label, meta)
    list.append(item)
  })

  target.replaceChildren(title, list)
}

function incrementCount(map, key, amount = 1) {
  if (!key) {
    return
  }
  map[key] = (map[key] ?? 0) + amount
}

function getTopEntry(counts) {
  return Object.entries(counts ?? {}).sort((left, right) => right[1] - left[1])[0]
}

function mergeTrainingStats(currentStats, responses) {
  const next = {
    ...createEmptyTrainingStats(),
    ...(currentStats ?? {})
  }

  for (const response of responses) {
    if (response.isCorrect) {
      continue
    }
    const work = works.find((item) => item.id === response.id)
    incrementCount(next.missedWorkCounts, response.id)
    incrementCount(next.missedComposerCounts, work?.composerKo)
    incrementCount(next.missedGenreCounts, work?.genreKo)
    incrementCount(next.targetMissCounts, response.target)
    incrementCount(next.methodMissCounts, response.method)
  }

  return next
}

function updateMissedWorkIds(currentIds, responses, isReview) {
  const current = new Set(currentIds ?? [])
  for (const response of responses) {
    if (response.isCorrect && isReview) {
      current.delete(response.id)
    } else if (!response.isCorrect) {
      current.add(response.id)
    }
  }
  return [...current].slice(-30)
}

function updateImprovedWorkIds(currentIds, responses, isReview) {
  const current = new Set(currentIds ?? [])
  if (!isReview) {
    return [...current]
  }
  for (const response of responses) {
    if (response.isCorrect) {
      current.add(response.id)
    }
  }
  return [...current].slice(-60)
}

function buildDailyStats(currentStats, result) {
  if (state.mode !== 'daily' || state.isReview) {
    return currentStats
  }

  const todayKey = getKstDateKey()
  const dayDiff = getDateKeyDiffDays(currentStats.lastDailyDateKey, todayKey)
  const streak =
    currentStats.lastDailyDateKey === todayKey
      ? Math.max(1, currentStats.streak ?? 1)
      : dayDiff === 1
        ? (currentStats.streak ?? 0) + 1
        : 1

  return {
    ...currentStats,
    streak,
    bestDailyScore: Math.max(currentStats.bestDailyScore ?? 0, result.score),
    bestDailyAccuracy: Math.max(currentStats.bestDailyAccuracy ?? 0, result.accuracy),
    lastDailyDateKey: todayKey,
    lastDailyScore: result.score,
    lastDailyAccuracy: result.accuracy,
    lastDailyAverageSeconds: result.averageSeconds
  }
}

function getSessionWeakness() {
  const missesByTarget = {}
  const missesByMethod = {}
  for (const response of state.responses) {
    if (!response.isCorrect) {
      incrementCount(missesByTarget, response.target)
      incrementCount(missesByMethod, response.method)
    }
  }

  const target = getTopEntry(missesByTarget)
  const method = getTopEntry(missesByMethod)
  if (target) {
    return {
      target: target[0],
      method: method?.[0] ?? '',
      count: target[1]
    }
  }

  const slowest = [...state.responses].sort(
    (left, right) => right.elapsedSeconds - left.elapsedSeconds
  )[0]
  return slowest
    ? {
        target: slowest.target,
        method: slowest.method,
        count: 0,
        slowestSeconds: slowest.elapsedSeconds
      }
    : null
}

function getPracticeRecommendation(weakness) {
  if (!weakness) {
    return '다음엔 데일리에서 후반 주관식까지 속도를 조금 더 끌어올려보세요.'
  }
  if (weakness.target === 'title') {
    return '곡명 연습에서 별칭과 정식명을 같이 눌러보면 다음 데일리 후반이 편해집니다.'
  }
  if (weakness.target === 'composer') {
    return '작곡가 연습으로 베토벤/모차르트/바흐처럼 자주 나오는 이름부터 빠르게 굳혀보세요.'
  }
  if (weakness.target === 'era') {
    return '시대 문제는 바로크의 규칙성, 고전의 균형감, 낭만의 선율감을 큰 덩어리로 들어보세요.'
  }
  if (weakness.target === 'genre') {
    return '장르가 약하면 곡명보다 “교향곡/오페라/무곡/소품” 같은 쓰임새를 먼저 잡아보세요.'
  }
  return '오답만 다시 풀어보고, 비슷한 별칭의 곡을 한 번 더 들어보면 기억이 빨리 붙습니다.'
}

function renderTrainingTip() {
  const target = document.querySelector('[data-training-tip]')
  if (!target) {
    return
  }

  const weakness = getSessionWeakness()
  const title = weakness?.count
    ? `${targetLabels[weakness.target] ?? '문제'}에서 ${weakness.count}번 흔들렸어요`
    : weakness?.slowestSeconds
      ? `${targetLabels[weakness.target] ?? '문제'}에서 시간이 가장 오래 걸렸어요`
      : '오늘은 균형이 좋았어요'
  const body = getPracticeRecommendation(weakness)

  target.replaceChildren()
  const heading = document.createElement('strong')
  heading.textContent = title
  const copy = document.createElement('span')
  copy.textContent = body
  target.append(heading, copy)
}

function renderDailySummary(result) {
  const target = document.querySelector('[data-daily-summary]')
  if (!target) {
    return
  }

  if (state.isReview) {
    const remaining = getStoredMisses().length
    target.textContent =
      remaining > 0
        ? `복습 완료 · 아직 오답 노트에 ${remaining}곡이 남아 있어요.`
        : '복습 완료 · 최근 오답 노트가 비었습니다.'
    return
  }

  if (state.mode !== 'daily' || state.isReview) {
    target.textContent = '연습과 오답 복습은 데일리 제한 없이 계속 가능합니다.'
    return
  }

  const { dailyStats } = getStorage()
  target.textContent =
    `데일리 기록 저장 완료 · 연속 ${dailyStats.streak ?? 0}일 · 최고 ${Math.max(dailyStats.bestDailyScore ?? 0, result.score)}점`
}

function renderResult() {
  stopTimer()
  const total = state.questions.length
  const accuracy = total === 0 ? 0 : Math.round((state.correct / total) * 100)
  const average =
    state.responses.length === 0
      ? 0
      : state.responses.reduce((sum, response) => sum + response.elapsedSeconds, 0) /
        state.responses.length

  document.querySelector('[data-result-title]').textContent =
    state.isReview
      ? '오답 복습 완료'
      : state.correct >= 8
        ? '귀가 꽤 빠른데요'
        : '오늘은 여기까지 익숙해졌어요'
  document.querySelector('[data-result-score]').textContent = `${state.score}점`
  document.querySelector('[data-result-accuracy]').textContent = `${accuracy}%`
  document.querySelector('[data-result-average]').textContent = `${average.toFixed(1)}초`
  renderRoundBreakdown()
  renderTrainingTip()

  const misses = document.querySelector('[data-misses]')
  const retryButton = document.querySelector('[data-retry-misses]')
  if (state.misses.length > 0) {
    const list = document.createElement('ul')
    for (const work of state.misses) {
      const item = document.createElement('li')
      item.innerHTML = `<strong>${formatFullWork(work)}</strong><span>${work.titleEn}</span><small>${work.confusionNoteKo}</small>`
      list.append(item)
    }
    misses.replaceChildren(
      document.createTextNode(state.isReview ? '아직 헷갈린 곡' : '틀린 곡'),
      list
    )
    retryButton.hidden = false
  } else {
    misses.textContent = state.isReview
      ? '이번 복습에서는 전부 맞혔습니다.'
      : '오답 없음. 오늘은 꽤 잘 들었습니다.'
    retryButton.hidden = true
  }

  const result = {
    mode: state.mode,
    score: state.score,
    accuracy,
    averageSeconds: Number(average.toFixed(1)),
    finishedAt: new Date().toISOString()
  }
  const storage = getStorage()
  const trainingStats = mergeTrainingStats(storage.trainingStats, state.responses)
  const missedWorkIds = updateMissedWorkIds(storage.missedWorkIds, state.responses, state.isReview)
  const improvedWorkIds = updateImprovedWorkIds(
    storage.improvedWorkIds,
    state.responses,
    state.isReview
  )

  if (!state.isReview) {
    saveStorage({
      lastResult: result,
      dailyStats: buildDailyStats(storage.dailyStats, result),
      trainingStats,
      missedWorkIds,
      improvedWorkIds
    })
  } else {
    saveStorage({
      lastReviewResult: result,
      trainingStats,
      missedWorkIds,
      improvedWorkIds
    })
  }
  renderDailySummary(result)

  updateStatus()
  const progressBar = document.querySelector('[data-progress-bar]')
  if (progressBar) {
    progressBar.style.width = '100%'
  }
  renderLastResult()
  renderDailyStatus()
  renderReviewEntry()
  setPanel('result')
}

function retryMisses() {
  if (state.misses.length === 0) {
    return
  }
  startQuiz(state.misses)
}

function noteToFrequency(note) {
  const match = note.match(/^([A-G])(#|b)?(\d)$/)
  if (!match) {
    return 440
  }

  const [, pitch, accidental = '', octaveText] = match
  const semitoneMap = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11
  }
  const accidentalOffset = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0
  const midi = (Number(octaveText) + 1) * 12 + semitoneMap[pitch] + accidentalOffset
  return 440 * 2 ** ((midi - 69) / 12)
}

function ensureAudioContext() {
  audioContext ??= new AudioContext()
  if (audioContext.state === 'suspended') {
    audioContext.resume()
  }
  return audioContext
}

function setAudioState(status, work = getCurrentWork()) {
  const player = document.querySelector('.classic-player')
  const label = document.querySelector('[data-play-label]')
  const hint = document.querySelector('[data-play-hint]')
  const badge = document.querySelector('[data-audio-status]')
  const isOpenAudio = work && isClearedAudio(work)

  if (player) {
    player.dataset.audioState = status
  }
  if (badge) {
    const sourceLabel = isOpenAudio ? '오픈 음원' : '데모 클립'
    const statusLabels = {
      idle: sourceLabel,
      loading: '음원 준비 중',
      playing: isOpenAudio ? '오픈 음원 재생 중' : '데모 재생 중',
      fallback: '데모로 재생 중',
      error: '재생 실패'
    }
    badge.textContent = statusLabels[status] ?? sourceLabel
  }
  if (label) {
    const labels = {
      idle: '클립 듣기',
      loading: '불러오는 중',
      playing: '재생 중',
      fallback: '데모로 재생 중',
      error: '다시 듣기'
    }
    label.textContent = labels[status] ?? '클립 듣기'
  }
  if (hint) {
    const hints = {
      idle: state.currentHint,
      loading: '외부 음원을 여는 중입니다',
      playing: '들리는 순간 떠오르는 답을 고르세요',
      fallback: '외부 음원이 느리면 데모 선율로 이어갑니다',
      error: '네트워크가 불안정해 데모 선율로 이어갈 수 있어요'
    }
    hint.textContent = hints[status] || state.currentHint
  }
}

function stopPlayback({ resetUi = false } = {}) {
  window.clearTimeout(activeTimeout)
  window.clearTimeout(activeAudioFallbackTimeout)
  if (audioElement) {
    audioElement.pause()
    audioElement.removeAttribute('src')
    audioElement.load()
    audioElement = undefined
  }
  for (const node of activeNodes) {
    try {
      node.stop?.()
      node.disconnect?.()
    } catch {
      // Some Web Audio nodes may already be released.
    }
  }
  activeNodes = []
  document.querySelector('.classic-player')?.classList.remove('is-playing')
  document.querySelector('.classic-wave')?.classList.remove('is-playing')
  if (resetUi) {
    setAudioState('idle')
  }
}

function playLicensedClip(work) {
  const source = work.localAudioPath || work.audioUrl
  if (!source || !isClearedAudio(work)) {
    return false
  }

  setAudioState('loading', work)
  audioElement = new Audio(source)
  audioElement.preload = 'auto'
  audioElement.volume = 0.88
  const clipStart = work.clipStart ?? 0
  const clipDuration = work.clipDuration ?? 8
  const clipEnd = clipStart + clipDuration
  let didFallback = false
  let didBegin = false

  const fallbackToSynth = () => {
    if (didFallback) {
      return
    }
    didFallback = true
    stopPlayback()
    setAudioState('fallback', work)
    playSynthClip(work)
  }

  const begin = () => {
    if (didBegin || didFallback) {
      return
    }
    didBegin = true
    try {
      audioElement.currentTime = clipStart
    } catch {
      fallbackToSynth()
      return
    }

    audioElement
      .play()
      .then(() => {
        if (didFallback) {
          return
        }
        window.clearTimeout(activeAudioFallbackTimeout)
        setAudioState('playing', work)
        markPlaying(clipDuration)
      })
      .catch(fallbackToSynth)
  }

  activeAudioFallbackTimeout = window.setTimeout(fallbackToSynth, 7000)
  audioElement.addEventListener('loadedmetadata', begin, { once: true })
  if (audioElement.readyState >= 1) {
    begin()
  }
  audioElement.addEventListener('timeupdate', () => {
    if (audioElement && audioElement.currentTime >= clipEnd) {
      stopPlayback({ resetUi: true })
    }
  })
  audioElement.addEventListener('ended', () => stopPlayback({ resetUi: true }), { once: true })
  audioElement.addEventListener('error', () => {
    fallbackToSynth()
  })
  audioElement.load()
  return true
}

function markPlaying(duration) {
  document.querySelector('.classic-player')?.classList.add('is-playing')
  document.querySelector('.classic-wave')?.classList.add('is-playing')
  activeTimeout = window.setTimeout(() => {
    stopPlayback({ resetUi: true })
  }, duration * 1000 + 120)
}

function createVoice(context, destination, note, start, duration, config) {
  const frequency = noteToFrequency(note)
  const gain = context.createGain()
  const filter = context.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(config.filter, start)
  filter.Q.setValueAtTime(0.9, start)

  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(config.level, start + config.attack)
  gain.gain.exponentialRampToValueAtTime(config.level * 0.42, start + duration * 0.58)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)

  for (const detune of config.detune) {
    const oscillator = context.createOscillator()
    oscillator.type = config.type
    oscillator.frequency.setValueAtTime(frequency, start)
    oscillator.detune.setValueAtTime(detune, start)
    oscillator.connect(filter)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.04)
    activeNodes.push(oscillator)
  }

  filter.connect(gain)
  gain.connect(destination)
  activeNodes.push(filter, gain)
}

function getSynthConfig(work) {
  const presets = {
    piano: { type: 'triangle', filter: 2200, level: 0.16, attack: 0.012, detune: [-4, 4] },
    strings: { type: 'sawtooth', filter: 1250, level: 0.1, attack: 0.08, detune: [-8, 0, 8] },
    brass: { type: 'sawtooth', filter: 1600, level: 0.12, attack: 0.035, detune: [-5, 5] },
    woodwind: { type: 'sine', filter: 1900, level: 0.18, attack: 0.035, detune: [-2, 2] },
    reed: { type: 'square', filter: 1150, level: 0.09, attack: 0.035, detune: [-3, 3] }
  }
  return presets[work.synth] ?? presets.piano
}

function playSynthClip(work) {
  const context = ensureAudioContext()
  const now = context.currentTime + 0.04
  const beat = 60 / work.tempo
  const master = context.createGain()
  const compressor = context.createDynamicsCompressor()
  const config = getSynthConfig(work)

  master.gain.setValueAtTime(0.56, now)
  master.connect(compressor)
  compressor.connect(context.destination)
  activeNodes.push(master, compressor)

  let cursor = now
  while (cursor < now + work.clipDuration) {
    for (const [note, beats] of work.motif) {
      const duration = Math.min(beat * beats * 0.92, now + work.clipDuration - cursor)
      if (duration <= 0) {
        break
      }
      createVoice(context, master, note, cursor, Math.max(0.12, duration), config)
      cursor += beat * beats
      if (cursor >= now + work.clipDuration) {
        break
      }
    }
  }

  let bassCursor = now
  let bassIndex = 0
  while (bassCursor < now + work.clipDuration) {
    const bassNote = work.bass[bassIndex % work.bass.length]
    createVoice(context, master, bassNote, bassCursor, beat * 1.8, {
      type: 'sine',
      filter: 800,
      level: 0.09,
      attack: 0.025,
      detune: [0]
    })
    bassCursor += beat * 2
    bassIndex += 1
  }

  markPlaying(work.clipDuration)
}

function playClip() {
  const work = getCurrentWork()
  if (!work) {
    return
  }

  stopPlayback()
  if (!playLicensedClip(work)) {
    setAudioState('fallback', work)
    playSynthClip(work)
  }
}

function startTimer() {
  stopTimer()
  const label = document.querySelector('[data-timer-label]')
  const tick = () => {
    if (label) {
      const elapsedSeconds = (performance.now() - state.questionStartedAt) / 1000
      label.textContent = `${elapsedSeconds.toFixed(1)}초`
    }
    timerFrame = window.requestAnimationFrame(tick)
  }
  timerFrame = window.requestAnimationFrame(tick)
}

function stopTimer() {
  if (timerFrame) {
    window.cancelAnimationFrame(timerFrame)
    timerFrame = undefined
  }
}

function bindEvents() {
  for (const button of document.querySelectorAll('[data-mode-choice]')) {
    button.addEventListener('click', () => setMode(button.dataset.modeChoice))
  }
  for (const button of document.querySelectorAll('[data-start-selected]')) {
    button.addEventListener('click', () => startQuiz())
  }

  document.querySelector('[data-play-clip]')?.addEventListener('click', playClip)
  document.querySelector('[data-input-answer]')?.addEventListener('submit', submitInputAnswer)
  document.querySelector('[data-answer-input]')?.addEventListener('input', updateSuggestions)
  document.querySelector('[data-next-question]')?.addEventListener('click', nextQuestion)
  document.querySelector('[data-retry-misses]')?.addEventListener('click', retryMisses)
  document.querySelector('[data-start-review]')?.addEventListener('click', startStoredReview)
  for (const button of document.querySelectorAll('[data-start-practice]')) {
    button.addEventListener('click', () => startPractice(button.dataset.startPractice))
  }
  document.querySelector('[data-enable-reminder]')?.addEventListener('click', enableReminder)
}

function init() {
  initSiteShell()
  bindTrackedLinks()
  configureAnalytics()
  bindEvents()
  renderLastResult()
  renderDailyStatus()
  renderReviewEntry()
  scheduleLocalReminder()
  updateStatus()
}

init()
