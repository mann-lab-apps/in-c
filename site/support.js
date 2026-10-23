import { bindTrackedLinks, configureAnalytics, trackEvent } from './analytics.js'
import { isSupabaseConfigured, supabase } from './auth.js'

const form = document.querySelector('[data-support-form]')
const statusElement = document.querySelector('[data-support-status]')
const submitButton = document.querySelector('[data-support-submit]')

const getField = (name) => form?.elements.namedItem(name)

const getValue = (name) => String(getField(name)?.value ?? '').trim()

const setStatus = (message, tone = 'neutral') => {
  if (!statusElement) {
    return
  }

  statusElement.textContent = message
  statusElement.dataset.tone = tone
  statusElement.hidden = !message
}

const setFormDisabled = (isDisabled) => {
  if (!form) {
    return
  }

  for (const field of form.elements) {
    field.disabled = isDisabled
  }

  if (submitButton) {
    submitButton.textContent = isDisabled ? '접수 중' : '문의 접수하기'
  }
}

const getUpcomingRecital = () => (getValue('schedule') ? 'scheduled' : 'planning')

const createNotes = () =>
  [
    `공연·연주회명: ${getValue('concertTitle')}`,
    `지역·공연장: ${getValue('venue')}`,
    `일정: ${getValue('schedule') || '미정'}`,
    '',
    '공연 소개',
    getValue('message')
  ].join('\n')

const createInquiryPayload = () => ({
  applicant_name: getValue('applicantName'),
  role: 'other',
  contact_phone: null,
  contact_email: getValue('contactEmail'),
  contact_instagram: null,
  upcoming_recital: getUpcomingRecital(),
  help_needed: ['channels'],
  notes: createNotes(),
  source_path: `${window.location.pathname || '/support.html'}${window.location.search || ''}`
})

const saveInquiry = async (payload) => {
  if (!isSupabaseConfigured || !supabase) {
    console.warn(
      '[in C support] Supabase env is missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
    )
    throw new Error('promotion_interest_registrations is not configured')
  }

  const { error } = await supabase
    .from('promotion_interest_registrations')
    .insert(payload)

  if (error) {
    throw error
  }
}

const getReadableErrorMessage = (error) => {
  const message = error?.message ?? ''

  if (/schema cache|promotion_interest_registrations|not configured/i.test(message)) {
    return '문의 접수 환경을 연결하는 중입니다. 급한 문의는 이메일로 보내주세요.'
  }

  return '문의가 접수되지 않았습니다. 잠시 후 다시 시도해 주세요.'
}

const submitForm = async (event) => {
  event.preventDefault()

  if (!form?.reportValidity()) {
    return
  }

  const payload = createInquiryPayload()
  setFormDisabled(true)
  setStatus('문의 내용을 접수하는 중입니다.')

  try {
    await saveInquiry(payload)
    trackEvent('support_inquiry_submit', {
      source_path: payload.source_path,
      upcoming_recital: payload.upcoming_recital
    })
    form.reset()
    setStatus('문의가 접수되었습니다. 확인 후 이메일로 연락드릴게요.')
  } catch (error) {
    console.error('[in C support] Failed to submit inquiry.', error)
    setStatus(getReadableErrorMessage(error), 'error')
  } finally {
    setFormDisabled(false)
  }
}

const init = () => {
  configureAnalytics()
  bindTrackedLinks()
  form?.addEventListener('submit', submitForm)
}

init()
