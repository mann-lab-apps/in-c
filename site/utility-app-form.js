import { bindTrackedLinks, configureAnalytics, trackEvent } from './analytics.js'
import {
  isSupabaseConfigured,
  supabase
} from './auth.js'

const form = document.querySelector('[data-utility-app-form]')
const statusElement = document.querySelector('[data-utility-app-status]')
const submitButton = document.querySelector('[data-utility-app-submit]')

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
    submitButton.textContent = isDisabled ? '제안 저장 중' : '도구 제안하기'
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

  if (/schema cache|utility_app_requests/i.test(message)) {
    return '도구 제안 저장 환경을 연결하는 중입니다. 잠시 후 다시 시도해 주세요.'
  }

  return '도구 제안을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

const createRequestPayload = () => ({
  applicant_name: getValue('applicantName'),
  role: getValue('role'),
  contact_phone: getNullableValue('contactPhone'),
  contact_email: getNullableValue('contactEmail'),
  contact_instagram: getNullableValue('contactInstagram'),
  activity_context: getValue('activityContext'),
  problem_frequency: getValue('problemFrequency'),
  problem_description: getValue('problemDescription'),
  current_workaround: getValue('currentWorkaround'),
  desired_tool: getValue('desiredTool'),
  expected_users: getCheckedValues('expectedUsers'),
  source_path: window.location.pathname || '/utility-apps.html'
})

const saveUtilityAppRequest = async (payload) => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('utility_app_requests is not configured')
  }

  const { error } = await supabase
    .from('utility_app_requests')
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

  const payload = createRequestPayload()
  setFormDisabled(true)
  setStatus('도구 제안을 저장하는 중입니다.')

  try {
    await saveUtilityAppRequest(payload)
    trackEvent('utility_app_request_submit', {
      role: payload.role,
      category: payload.activity_context,
      frequency: payload.problem_frequency,
      help_count: String(payload.expected_users.length)
    })
    form.reset()
    setStatus('제안이 접수되었습니다. 만들 수 있는 작은 공개 도구인지 확인하고 연락드릴게요.')
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
