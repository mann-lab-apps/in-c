import { bindTrackedLinks, configureAnalytics, trackEvent } from './analytics.js'

const form = document.querySelector('[data-pilot-form]')
const statusElement = document.querySelector('[data-pilot-status]')
const interestRecipient = ''

const roleLabels = {
  performer: '연주자',
  planner: '기획자',
  ensemble: '단체/앙상블',
  other: '기타'
}

const recitalStatusLabels = {
  scheduled: '날짜가 잡힌 클래식 연주회가 있음',
  planning: '연주회를 준비 중이며 홍보 방향을 미리 잡고 싶음',
  notYet: '아직 정해진 연주회는 없지만 관심 있음'
}

const helpLabels = {
  audienceTarget: '관객 타깃 정리',
  copywriting: '연주회 소개 문구와 콘텐츠 방향',
  channels: '홍보 채널 선택',
  report: '홍보 후 반응 리포트',
  design: '홍보 이미지/포스터 디자인',
  notSure: '필요한 것부터 함께 정리'
}

const getField = (name) => form?.elements.namedItem(name)

const getValue = (name) => String(getField(name)?.value ?? '').trim()

const getCheckedValues = (name) =>
  form
    ? [...form.querySelectorAll(`[name="${name}"]:checked`)].map((field) =>
        field instanceof HTMLInputElement ? field.value : ''
      )
    : []

const setStatus = (message, tone = 'neutral') => {
  if (!statusElement) {
    return
  }

  statusElement.hidden = !message
  statusElement.textContent = message
  statusElement.dataset.tone = tone
}

const validateContact = () => {
  const phoneField = getField('contactPhone')
  const hasContact = ['contactPhone', 'contactEmail', 'contactInstagram'].some(
    (name) => getValue(name)
  )

  if (phoneField instanceof HTMLInputElement) {
    phoneField.setCustomValidity(hasContact ? '' : '전화, 이메일, 인스타 ID 중 하나 이상 입력해 주세요.')
  }

  return hasContact
}

const formatInterestEmail = () => {
  const helpNeeded = getCheckedValues('helpNeeded')
  const lines = [
    'in C 클래식 연주회 홍보 관심 등록',
    '',
    `이름: ${getValue('applicantName')}`,
    `역할: ${roleLabels[getValue('role')] ?? getValue('role')}`,
    `전화: ${getValue('contactPhone') || '-'}`,
    `이메일: ${getValue('contactEmail') || '-'}`,
    `인스타 ID: ${getValue('contactInstagram') || '-'}`,
    '',
    `현재 상황: ${recitalStatusLabels[getValue('upcomingRecital')] ?? getValue('upcomingRecital')}`,
    `필요한 도움: ${helpNeeded.length > 0 ? helpNeeded.map((value) => helpLabels[value] ?? value).join(', ') : '-'}`,
    '',
    `비고: ${getValue('notes') || '-'}`
  ]

  return lines.join('\n')
}

const openMailDraft = () => {
  const subject = '[in C] 클래식 연주회 홍보 관심 등록'
  const body = formatInterestEmail()
  const params = new URLSearchParams({
    subject,
    body
  })

  window.location.href = `mailto:${interestRecipient}?${params.toString()}`
}

const submitForm = (event) => {
  event.preventDefault()
  validateContact()

  if (!form?.reportValidity()) {
    return
  }

  const helpNeeded = getCheckedValues('helpNeeded')
  setStatus('메일 앱 초안을 열고 있습니다. 열리지 않으면 수신 경로가 정해진 뒤 다시 안내합니다.')
  trackEvent('promotion_interest_mailto_open', {
    role: getValue('role'),
    recital_status: getValue('upcomingRecital'),
    help_count: String(helpNeeded.length)
  })
  openMailDraft()
}

const bindEvents = () => {
  form?.addEventListener('submit', submitForm)
  form?.addEventListener('reset', () => {
    window.setTimeout(() => {
      validateContact()
      setStatus('')
    })
  })
  for (const name of ['contactPhone', 'contactEmail', 'contactInstagram']) {
    getField(name)?.addEventListener('input', validateContact)
  }
}

const init = () => {
  configureAnalytics()
  bindTrackedLinks()
  validateContact()
  bindEvents()
}

init()
