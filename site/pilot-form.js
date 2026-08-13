import { bindTrackedLinks, configureAnalytics, trackEvent } from './analytics.js'
import { pilotConcert } from './pilot-concert-data.js'

const form = document.querySelector('[data-pilot-form]')
const sampleElement = document.querySelector('[data-sample-concert]')
const sampleFillButton = document.querySelector('[data-fill-sample]')
const resultPanel = document.querySelector('[data-pilot-result]')
const resultBody = document.querySelector('[data-pilot-result-body]')
const copyButton = document.querySelector('[data-copy-result]')
const downloadButton = document.querySelector('[data-download-result]')
const statusElement = document.querySelector('[data-pilot-status]')

let lastSubmissionText = ''

const posterStatusLabels = {
  ready: '포스터 디자인 완료',
  needsDesign: '디자인 의뢰 필요',
  textOnly: '텍스트 중심 홍보'
}

const getField = (name) => form?.elements.namedItem(name)

const getValue = (name) => String(getField(name)?.value ?? '').trim()

const setStatus = (message, tone = 'neutral') => {
  if (!statusElement) {
    return
  }

  statusElement.hidden = !message
  statusElement.textContent = message
  statusElement.dataset.tone = tone
}

const renderSampleConcert = () => {
  if (!sampleElement) {
    return
  }

  sampleElement.innerHTML = `
    <div class="pilot-sample__head">
      <p class="eyebrow">0번 샘플</p>
      <h2>${pilotConcert.shortTitle}</h2>
    </div>
    <dl class="pilot-sample__facts">
      <div><dt>일시</dt><dd>${pilotConcert.date} ${pilotConcert.time}</dd></div>
      <div><dt>장소</dt><dd>${pilotConcert.venue}</dd></div>
      <div><dt>프로그램</dt><dd>${pilotConcert.program}</dd></div>
      <div><dt>가격</dt><dd>${pilotConcert.price}</dd></div>
    </dl>
    <p>${pilotConcert.samplePositioning}</p>
    <p>${pilotConcert.sampleNote}</p>
    <a class="text-link" href="${pilotConcert.ticketUrl}" target="_blank" rel="noreferrer">
      공식 공연 정보
    </a>
  `
}

const fillSampleConcert = () => {
  const values = {
    applicantName: '김재만',
    contact: '',
    concertTitle: pilotConcert.title,
    concertDateTime: `${pilotConcert.date} ${pilotConcert.time}`,
    venue: `${pilotConcert.venue} / ${pilotConcert.region}`,
    ticketUrl: pilotConcert.ticketUrl,
    presenter: '서울시립교향악단',
    oneLineIntro: pilotConcert.samplePositioning,
    program: pilotConcert.program,
    ticketPrice: pilotConcert.price,
    assetUrl: pilotConcert.ticketUrl,
    existingChannels: '',
    preferredStartDate: '',
    notes:
      '내부 0번 샘플 캠페인입니다. 공식 홍보가 아니라 개인 추천 톤으로 카피와 채널 반응을 테스트합니다.'
  }

  for (const [name, value] of Object.entries(values)) {
    const field = getField(name)

    if (field) {
      field.value = value
    }
  }

  const posterReady = form?.querySelector('[name="posterStatus"][value="ready"]')
  if (posterReady instanceof HTMLInputElement) {
    posterReady.checked = true
  }

  setStatus('샘플 공연 정보를 채웠습니다.')
}

const formatSubmission = (data) => [
  '[in C 공연홍보 무료 파일럿 신청]',
  '',
  `신청자: ${data.applicantName}`,
  `연락처: ${data.contact}`,
  `공연명: ${data.concertTitle}`,
  `공연 일시: ${data.concertDateTime}`,
  `공연 장소/지역: ${data.venue}`,
  `예매/상세 링크: ${data.ticketUrl}`,
  `주최/주관/출연자 표기: ${data.presenter}`,
  `공연 소개 한 줄: ${data.oneLineIntro}`,
  `포스터 디자인 상태: ${posterStatusLabels[data.posterStatus] ?? data.posterStatus}`,
  '',
  '[선택 입력]',
  `프로그램/곡 목록: ${data.program || '-'}`,
  `티켓 가격: ${data.ticketPrice || '-'}`,
  `자료 링크: ${data.assetUrl || '-'}`,
  `기존 홍보 채널: ${data.existingChannels || '-'}`,
  `홍보 시작 희망일: ${data.preferredStartDate || '-'}`,
  `추가 요청사항/비고: ${data.notes || '-'}`,
  '',
  '[내부 처리 메모]',
  '- 디자인 의뢰 필요 선택 시 디자인비 별도 안내',
  '- 인쇄 요청은 비고 확인 후 별도 견적',
  '- 접수 후 직접 연락'
].join('\n')

const renderResult = (data) => {
  if (!resultPanel || !resultBody) {
    return
  }

  resultPanel.hidden = false
  resultBody.textContent = formatSubmission(data)
  lastSubmissionText = resultBody.textContent
  resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const readFormData = () => {
  const formData = new FormData(form)
  return Object.fromEntries([...formData.entries()].map(([key, value]) => [
    key,
    String(value).trim()
  ]))
}

const submitForm = (event) => {
  event.preventDefault()

  if (!form?.reportValidity()) {
    return
  }

  const data = readFormData()
  renderResult(data)
  setStatus('신청서 초안이 생성되었습니다. 내용을 복사해서 전달할 수 있습니다.')
  trackEvent('promotion_pilot_form_submit', {
    poster_status: data.posterStatus
  })
}

const copyResult = async () => {
  if (!lastSubmissionText) {
    setStatus('먼저 신청서 초안을 생성해 주세요.', 'error')
    return
  }

  try {
    await navigator.clipboard.writeText(lastSubmissionText)
    setStatus('신청서 초안을 복사했습니다.')
  } catch {
    setStatus('복사에 실패했습니다. 초안 내용을 직접 선택해 복사해 주세요.', 'error')
  }
}

const downloadResult = () => {
  if (!lastSubmissionText) {
    setStatus('먼저 신청서 초안을 생성해 주세요.', 'error')
    return
  }

  const blob = new Blob([lastSubmissionText], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const safeTitle = getValue('concertTitle')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'concert-promotion-pilot'

  link.href = url
  link.download = `${safeTitle}-pilot.txt`
  link.click()
  URL.revokeObjectURL(url)
  setStatus('텍스트 파일을 저장했습니다.')
}

const bindEvents = () => {
  form?.addEventListener('submit', submitForm)
  sampleFillButton?.addEventListener('click', fillSampleConcert)
  copyButton?.addEventListener('click', copyResult)
  downloadButton?.addEventListener('click', downloadResult)
}

const init = () => {
  configureAnalytics()
  bindTrackedLinks()
  renderSampleConcert()
  bindEvents()
}

init()
