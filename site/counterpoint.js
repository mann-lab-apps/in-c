const DEFAULT_API_BASE =
  window.location.port === '4174' ? '' : 'http://127.0.0.1:4174'
const POLL_INTERVAL_MS = 900
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024

const form = document.querySelector('[data-counterpoint-form]')
const fileInput = document.querySelector('[data-counterpoint-file]')
const dropzone = document.querySelector('[data-counterpoint-dropzone]')
const selected = document.querySelector('[data-counterpoint-selected]')
const submit = document.querySelector('[data-counterpoint-submit]')
const statusText = document.querySelector('[data-counterpoint-status]')
const resultPanel = document.querySelector('[data-counterpoint-result]')
const downloadLink = document.querySelector('[data-counterpoint-download]')
const reportList = document.querySelector('[data-counterpoint-report]')
const warningsPanel = document.querySelector('[data-counterpoint-warnings]')
const warningsList = warningsPanel?.querySelector('ul')

let pollTimer

const setStatus = (message, tone = 'neutral') => {
  if (!statusText) return
  statusText.textContent = message
  statusText.dataset.tone = tone
}

const apiBase = () => {
  const params = new URLSearchParams(window.location.search)
  return params.get('api') ?? DEFAULT_API_BASE
}

const endpoint = (path) => `${apiBase()}${path}`

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const setActiveStep = (state) => {
  for (const step of document.querySelectorAll('[data-step]')) {
    step.dataset.active = String(step.dataset.step === state)
    step.dataset.done = String(
      (state === 'processing' && step.dataset.step === 'queued') ||
        (state === 'complete' && step.dataset.step !== 'complete')
    )
  }
}

const readFileAsBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      const result = String(reader.result ?? '')
      resolve(result.includes(',') ? result.split(',').pop() : result)
    })
    reader.addEventListener('error', () => reject(reader.error))
    reader.readAsDataURL(file)
  })

const updateSelectedFile = () => {
  const file = fileInput?.files?.[0]
  if (!selected) return
  if (!file) {
    selected.hidden = true
    selected.textContent = ''
    return
  }

  selected.hidden = false
  selected.textContent = `${file.name} · ${formatBytes(file.size)}`
}

const renderReport = (job) => {
  if (!reportList) return
  const report = job.report ?? {}
  const rows = [
    ['mode', report.mode ?? '-'],
    ['engine', report.engine ?? '-'],
    ['pages', String(report.pages ?? '-')],
    ['output', report.outputFilename ?? '-']
  ]

  reportList.replaceChildren(
    ...rows.map(([term, value]) => {
      const row = document.createElement('div')
      const dt = document.createElement('dt')
      const dd = document.createElement('dd')
      dt.textContent = term
      dd.textContent = value
      row.append(dt, dd)
      return row
    })
  )

  const warnings = report.warnings ?? []
  if (warningsPanel && warningsList) {
    warningsPanel.hidden = warnings.length === 0
    warningsList.replaceChildren(
      ...warnings.map((warning) => {
        const item = document.createElement('li')
        item.textContent = warning
        return item
      })
    )
  }
}

const showResult = (job) => {
  if (!resultPanel || !downloadLink) return
  resultPanel.hidden = false
  downloadLink.href = endpoint(`/api/counterpoint/jobs/${job.id}/download`)
  downloadLink.textContent = `${job.report?.outputFilename ?? 'MusicXML'} 다운로드`
  renderReport(job)
}

const pollJob = async (id) => {
  const response = await fetch(endpoint(`/api/counterpoint/jobs/${id}`))
  if (!response.ok) {
    throw new Error(`상태 조회 실패: ${response.status}`)
  }
  const job = await response.json()
  setActiveStep(job.status)

  if (job.status === 'queued') {
    setStatus('변환 대기 중입니다.')
    return
  }

  if (job.status === 'processing') {
    setStatus('악보를 읽고 MusicXML 초안을 만드는 중입니다.')
    return
  }

  window.clearInterval(pollTimer)
  pollTimer = undefined
  submit.disabled = false

  if (job.status === 'complete') {
    setStatus('변환이 완료되었습니다. 결과를 검수해 주세요.', 'success')
    showResult(job)
    return
  }

  setStatus(job.error ?? '변환에 실패했습니다.', 'error')
  renderReport(job)
}

const startPolling = (id) => {
  window.clearInterval(pollTimer)
  pollJob(id).catch((error) => setStatus(error.message, 'error'))
  pollTimer = window.setInterval(() => {
    pollJob(id).catch((error) => {
      window.clearInterval(pollTimer)
      pollTimer = undefined
      submit.disabled = false
      setStatus(error.message, 'error')
    })
  }, POLL_INTERVAL_MS)
}

fileInput?.addEventListener('change', updateSelectedFile)

dropzone?.addEventListener('dragover', (event) => {
  event.preventDefault()
  dropzone.dataset.dragging = 'true'
})

dropzone?.addEventListener('dragleave', () => {
  dropzone.dataset.dragging = 'false'
})

dropzone?.addEventListener('drop', (event) => {
  event.preventDefault()
  dropzone.dataset.dragging = 'false'
  if (!fileInput || !event.dataTransfer?.files?.length) return
  fileInput.files = event.dataTransfer.files
  updateSelectedFile()
})

form?.addEventListener('submit', async (event) => {
  event.preventDefault()
  const file = fileInput?.files?.[0]
  if (!file) {
    setStatus('변환할 PDF, JPG, PNG 파일을 선택해 주세요.', 'error')
    return
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    setStatus('프로토타입 업로드 한도는 15MB입니다.', 'error')
    return
  }

  submit.disabled = true
  resultPanel.hidden = true
  setActiveStep('queued')
  setStatus('파일을 로컬 서버로 보내는 중입니다.')

  try {
    const dataBase64 = await readFileAsBase64(file)
    const response = await fetch(endpoint('/api/counterpoint/jobs'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        dataBase64
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error ?? `업로드 실패: ${response.status}`)
    }

    const job = await response.json()
    startPolling(job.id)
  } catch (error) {
    submit.disabled = false
    setStatus(error instanceof Error ? error.message : '업로드에 실패했습니다.', 'error')
  }
})
