import { bindTrackedLinks, configureAnalytics, trackEvent } from './analytics.js'

const form = document.querySelector('[data-pilot-form]')
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
  copyButton?.addEventListener('click', copyResult)
  downloadButton?.addEventListener('click', downloadResult)
}

const init = () => {
  configureAnalytics()
  bindTrackedLinks()
  bindEvents()
}

init()
