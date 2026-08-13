import { bindTrackedLinks, configureAnalytics, trackEvent } from './analytics.js'

const form = document.querySelector('[data-pilot-form]')
const statusElement = document.querySelector('[data-pilot-status]')
const posterUploadElement = document.querySelector('[data-poster-upload]')

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

const readFormData = () => {
  const formData = new FormData(form)
  return Object.fromEntries(
    [...formData.entries()].map(([key, value]) => [
      key,
      value instanceof File ? value.name : String(value).trim()
    ])
  )
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

const syncPosterUpload = () => {
  const posterFileField = getField('posterFile')
  const shouldShow = getValue('posterStatus') === 'ready'

  if (posterUploadElement instanceof HTMLElement) {
    posterUploadElement.hidden = !shouldShow
  }

  if (posterFileField instanceof HTMLInputElement) {
    posterFileField.required = shouldShow
    if (!shouldShow) {
      posterFileField.value = ''
    }
  }
}

const submitForm = (event) => {
  event.preventDefault()
  validateContact()
  syncPosterUpload()

  if (!form?.reportValidity()) {
    return
  }

  const data = readFormData()
  setStatus('입력 형식을 확인했습니다. 실제 접수 경로는 별도로 안내합니다.')
  trackEvent('promotion_pilot_form_submit', {
    poster_status: data.posterStatus
  })
}

const bindEvents = () => {
  form?.addEventListener('submit', submitForm)
  form?.addEventListener('reset', () => {
    window.setTimeout(() => {
      validateContact()
      syncPosterUpload()
    })
  })
  for (const name of ['contactPhone', 'contactEmail', 'contactInstagram']) {
    getField(name)?.addEventListener('input', validateContact)
  }
  form
    ?.querySelectorAll('[name="posterStatus"]')
    .forEach((field) => field.addEventListener('change', syncPosterUpload))
}

const init = () => {
  configureAnalytics()
  bindTrackedLinks()
  validateContact()
  syncPosterUpload()
  bindEvents()
}

init()
