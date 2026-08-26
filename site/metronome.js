import { bindTrackedLinks, configureAnalytics, trackEvent } from './analytics.js'

const storageKey = 'in-c-click-preferences'
const minBpm = 30
const maxBpm = 240
const lookaheadMs = 25
const scheduleAheadSeconds = 0.1

const elements = {
  form: document.querySelector('[data-metronome-form]'),
  bpmOutput: document.querySelector('[data-bpm-output]'),
  bpmInput: document.querySelector('[data-bpm-input]'),
  bpmSlider: document.querySelector('[data-bpm-slider]'),
  pulse: document.querySelector('[data-pulse]'),
  beatLabel: document.querySelector('[data-beat-label]'),
  startStop: document.querySelector('[data-start-stop]'),
  tapTempo: document.querySelector('[data-tap-tempo]'),
  accentToggle: document.querySelector('[data-accent-toggle]')
}

const defaultState = {
  bpm: 96,
  meter: 4,
  accentFirstBeat: true
}

let state = { ...defaultState }
let audioContext = null
let schedulerId = null
let nextNoteTime = 0
let currentBeat = 0
let visibleBeat = 0
let isPlaying = false
let tapTimes = []

const clampBpm = (value) => {
  const numericValue = Number.parseInt(String(value), 10)

  if (!Number.isFinite(numericValue)) {
    return defaultState.bpm
  }

  return Math.min(maxBpm, Math.max(minBpm, numericValue))
}

const getSavedState = () => {
  try {
    const savedState = JSON.parse(window.localStorage.getItem(storageKey) ?? '{}')

    return {
      bpm: clampBpm(savedState.bpm ?? defaultState.bpm),
      meter: [2, 3, 4, 6].includes(Number(savedState.meter))
        ? Number(savedState.meter)
        : defaultState.meter,
      accentFirstBeat:
        typeof savedState.accentFirstBeat === 'boolean'
          ? savedState.accentFirstBeat
          : defaultState.accentFirstBeat
    }
  } catch {
    return { ...defaultState }
  }
}

const saveState = () => {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state))
  } catch {
    // Local preferences are nice to have, but the metronome should keep running without them.
  }
}

const getMeterLabel = () => `${state.meter} / ${state.meter === 6 ? 8 : 4}`

const render = () => {
  if (elements.bpmOutput) {
    elements.bpmOutput.value = String(state.bpm)
    elements.bpmOutput.textContent = String(state.bpm)
  }

  if (elements.bpmInput instanceof HTMLInputElement) {
    elements.bpmInput.value = String(state.bpm)
  }

  if (elements.bpmSlider instanceof HTMLInputElement) {
    elements.bpmSlider.value = String(state.bpm)
  }

  if (elements.beatLabel) {
    const beatNumber = isPlaying ? visibleBeat + 1 : 1
    elements.beatLabel.textContent = `${beatNumber} / ${getMeterLabel().split(' / ')[0]}`
  }

  if (elements.startStop) {
    elements.startStop.textContent = isPlaying ? '정지' : '시작'
    elements.startStop.setAttribute('aria-pressed', String(isPlaying))
  }

  if (elements.accentToggle instanceof HTMLInputElement) {
    elements.accentToggle.checked = state.accentFirstBeat
  }

  for (const field of document.querySelectorAll('input[name="meter"]')) {
    if (field instanceof HTMLInputElement) {
      field.checked = Number(field.value) === state.meter
    }
  }
}

const setBpm = (value) => {
  state.bpm = clampBpm(value)
  saveState()
  if (isPlaying && !audioContext) {
    startVisualFallback()
  }
  render()
}

const setMeter = (value) => {
  state.meter = [2, 3, 4, 6].includes(Number(value)) ? Number(value) : 4
  currentBeat = 0
  visibleBeat = 0
  saveState()
  render()
}

const getAudioContext = async () => {
  if (!audioContext) {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext
    if (!AudioContextConstructor) {
      throw new Error('Web Audio API is not available')
    }
    audioContext = new AudioContextConstructor()
  }

  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }

  return audioContext
}

const scheduleClick = (time, beatIndex) => {
  if (!audioContext) {
    return
  }

  const isAccent = state.accentFirstBeat && beatIndex === 0
  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(isAccent ? 1320 : 880, time)
  gain.gain.setValueAtTime(0.0001, time)
  gain.gain.exponentialRampToValueAtTime(isAccent ? 0.28 : 0.18, time + 0.004)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045)

  oscillator.connect(gain)
  gain.connect(audioContext.destination)
  oscillator.start(time)
  oscillator.stop(time + 0.055)

  window.setTimeout(() => {
    if (isPlaying) {
      triggerPulse(isAccent, beatIndex)
    }
  }, Math.max(0, (time - audioContext.currentTime) * 1000))
}

const triggerPulse = (isAccent, beatIndex = visibleBeat) => {
  visibleBeat = beatIndex % state.meter
  elements.pulse?.classList.remove('is-pulsing', 'is-accent')

  window.requestAnimationFrame(() => {
    elements.pulse?.classList.toggle('is-accent', isAccent)
    elements.pulse?.classList.add('is-pulsing')
    render()
  })
}

const scheduler = () => {
  if (!audioContext) {
    return
  }

  while (nextNoteTime < audioContext.currentTime + scheduleAheadSeconds) {
    const beatToSchedule = currentBeat
    scheduleClick(nextNoteTime, beatToSchedule)
    nextNoteTime += 60 / state.bpm
    currentBeat = (currentBeat + 1) % state.meter
  }
}

const startVisualFallback = () => {
  if (schedulerId) {
    window.clearInterval(schedulerId)
  }

  schedulerId = window.setInterval(() => {
    const beatToShow = currentBeat
    triggerPulse(state.accentFirstBeat && beatToShow === 0, beatToShow)
    currentBeat = (currentBeat + 1) % state.meter
  }, (60 / state.bpm) * 1000)
}

const start = async () => {
  try {
    await getAudioContext()
  } catch {
    audioContext = null
  }

  isPlaying = true
  currentBeat = 0
  visibleBeat = 0

  if (audioContext) {
    nextNoteTime = audioContext.currentTime + 0.04
    schedulerId = window.setInterval(scheduler, lookaheadMs)
    scheduler()
  } else {
    startVisualFallback()
    triggerPulse(state.accentFirstBeat, 0)
    currentBeat = 1 % state.meter
  }

  render()
  trackEvent('metronome_start', {
    category: 'metronome',
    meter: getMeterLabel()
  })
}

const stop = () => {
  isPlaying = false
  currentBeat = 0
  visibleBeat = 0

  if (schedulerId) {
    window.clearInterval(schedulerId)
    schedulerId = null
  }

  elements.pulse?.classList.remove('is-pulsing', 'is-accent')
  render()
  trackEvent('metronome_stop', {
    category: 'metronome',
    meter: getMeterLabel()
  })
}

const togglePlayback = async () => {
  if (isPlaying) {
    stop()
    return
  }

  await start()
}

const tapTempo = () => {
  const now = window.performance.now()
  tapTimes = tapTimes.filter((time) => now - time < 2500)
  tapTimes.push(now)

  if (tapTimes.length >= 2) {
    const intervals = tapTimes.slice(1).map((time, index) => time - tapTimes[index])
    const averageInterval =
      intervals.reduce((total, interval) => total + interval, 0) / intervals.length
    setBpm(Math.round(60000 / averageInterval))
  }

  triggerPulse(false, visibleBeat)
  trackEvent('metronome_tap_tempo', { category: 'metronome' })
}

const isTypingTarget = (target) =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  target instanceof HTMLSelectElement

const bindEvents = () => {
  elements.form?.addEventListener('submit', (event) => {
    event.preventDefault()
  })

  elements.startStop?.addEventListener('click', togglePlayback)
  elements.tapTempo?.addEventListener('click', tapTempo)

  elements.bpmInput?.addEventListener('input', (event) => {
    setBpm(event.target.value)
  })

  elements.bpmSlider?.addEventListener('input', (event) => {
    setBpm(event.target.value)
  })

  for (const button of document.querySelectorAll('[data-bpm-step]')) {
    button.addEventListener('click', () => {
      setBpm(state.bpm + Number(button.dataset.bpmStep ?? 0))
    })
  }

  for (const field of document.querySelectorAll('input[name="meter"]')) {
    field.addEventListener('change', (event) => {
      if (event.target instanceof HTMLInputElement) {
        setMeter(event.target.value)
      }
    })
  }

  elements.accentToggle?.addEventListener('change', (event) => {
    if (event.target instanceof HTMLInputElement) {
      state.accentFirstBeat = event.target.checked
      saveState()
      render()
    }
  })

  window.addEventListener('keydown', (event) => {
    if (isTypingTarget(event.target)) {
      return
    }

    if (event.code === 'Space') {
      event.preventDefault()
      togglePlayback()
    }

    if (event.key.toLowerCase() === 't') {
      tapTempo()
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setBpm(state.bpm + 1)
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setBpm(state.bpm - 1)
    }
  })
}

const init = () => {
  configureAnalytics()
  bindTrackedLinks()
  state = getSavedState()
  bindEvents()
  render()
}

init()
