import { bindTrackedLinks, configureAnalytics, trackEvent } from './analytics.js'
import {
  isSupabaseConfigured,
  supabase
} from './auth.js'

const form = document.querySelector('[data-pilot-form]')
const statusElement = document.querySelector('[data-pilot-status]')
const submitButton = document.querySelector('[data-pilot-submit]')

const getField = (name) => form?.elements.namedItem(name)

const getValue = (name) => String(getField(name)?.value ?? '').trim()

const getNullableValue = (name) => getValue(name) || null

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

const setFormDisabled = (isDisabled) => {
  if (!form) {
    return
  }

  for (const field of form.elements) {
    field.disabled = isDisabled
  }

  if (submitButton) {
    submitButton.textContent = isDisabled ? '저장 중' : '연주 홍보 신청하기'
  }
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

const getReadableErrorMessage = (error) => {
  const message = error?.message ?? ''

  if (/schema cache|promotion_interest_registrations/i.test(message)) {
    return '연주 홍보 신청 저장 환경을 연결하는 중입니다. 잠시 후 다시 시도해 주세요.'
  }

  return '연주 홍보 신청을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

const createInterestPayload = () => ({
  applicant_name: getValue('applicantName'),
  role: getValue('role'),
  contact_phone: getNullableValue('contactPhone'),
  contact_email: getNullableValue('contactEmail'),
  contact_instagram: getNullableValue('contactInstagram'),
  upcoming_recital: getValue('upcomingRecital'),
  help_needed: getCheckedValues('helpNeeded'),
  notes: getValue('notes'),
  source_path: window.location.pathname || '/index.html'
})

const saveInterestRegistration = async (payload) => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('promotion_interest_registrations is not configured')
  }

  const { error } = await supabase
    .from('promotion_interest_registrations')
    .insert(payload)

  if (error) {
    throw error
  }
}

const submitForm = async (event) => {
  event.preventDefault()
  validateContact()

  if (!form?.reportValidity()) {
    return
  }

  const payload = createInterestPayload()
  setFormDisabled(true)
  setStatus('연주 홍보 신청을 저장하는 중입니다.')

  try {
    await saveInterestRegistration(payload)
    trackEvent('promotion_interest_submit', {
      role: payload.role,
      recital_status: payload.upcoming_recital,
      help_count: String(payload.help_needed.length)
    })
    form.reset()
    setStatus('연주 홍보 신청이 접수되었습니다. 남겨주신 연락처로 직접 연락드릴게요.')
  } catch (error) {
    setStatus(getReadableErrorMessage(error), 'error')
  } finally {
    setFormDisabled(false)
    validateContact()
  }
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
