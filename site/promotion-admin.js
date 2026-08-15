import { configureAnalytics } from './analytics.js'
import {
  isSupabaseConfigured,
  supabase
} from './auth.js'
import { initAuthNavigation } from './auth-nav.js'
import { createLoginUrlWithRedirect } from './auth-redirect.js'

const statusElement = document.querySelector('[data-admin-status]')
const summaryElement = document.querySelector('[data-admin-summary]')
const tableElement = document.querySelector('[data-admin-table]')
const refreshButton = document.querySelector('[data-admin-refresh]')

let currentSession
let registrations = []

const roleLabels = {
  performer: '연주자',
  planner: '기획자',
  ensemble: '단체/앙상블',
  other: '기타'
}

const recitalStatusLabels = {
  scheduled: '날짜가 잡힌 연주회 있음',
  planning: '연주회 준비 중',
  notYet: '아직 정해진 연주회 없음'
}

const helpLabels = {
  audienceTarget: '관객 타깃',
  copywriting: '소개 문구/콘텐츠',
  channels: '홍보 채널',
  report: '반응 리포트',
  design: '이미지/포스터 디자인',
  notSure: '필요한 것 정리'
}

const reviewStatusLabels = {
  new: '새 등록',
  contacted: '확인 완료',
  archived: '보관'
}

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const formatDateTime = (value) =>
  new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))

const setStatus = (message, tone = 'neutral') => {
  if (!statusElement) {
    return
  }

  statusElement.hidden = !message
  statusElement.textContent = message
  statusElement.dataset.tone = tone
}

const setLoading = (isLoading) => {
  if (refreshButton instanceof HTMLButtonElement) {
    refreshButton.disabled = isLoading
    refreshButton.textContent = isLoading ? '불러오는 중' : '새로고침'
  }
}

const getReadableErrorMessage = (error) => {
  const message = error?.message ?? ''

  if (/permission denied|row-level security|42501/i.test(message)) {
    return '관리자 권한이 필요합니다. Supabase profiles.role을 admin으로 설정해 주세요.'
  }

  if (/schema cache|promotion_interest_registrations/i.test(message)) {
    return '관심 등록 관리자 migration을 Supabase에 적용한 뒤 다시 열어 주세요.'
  }

  return error?.message ?? '관심 등록 목록을 불러오지 못했습니다.'
}

const createRegistrationSelect = () =>
  [
    'id',
    'applicant_name',
    'role',
    'contact_phone',
    'contact_email',
    'contact_instagram',
    'upcoming_recital',
    'help_needed',
    'notes',
    'source_path',
    'review_status',
    'created_at',
    'reviewed_at'
  ].join(',')

const renderSummary = () => {
  if (!summaryElement) {
    return
  }

  const newCount = registrations.filter((item) => item.review_status === 'new').length
  const contactedCount = registrations.filter((item) => item.review_status === 'contacted').length
  const archivedCount = registrations.filter((item) => item.review_status === 'archived').length

  summaryElement.hidden = false
  summaryElement.innerHTML = `
    <span>전체 ${registrations.length}</span>
    <span>새 등록 ${newCount}</span>
    <span>확인 완료 ${contactedCount}</span>
    <span>보관 ${archivedCount}</span>
  `
}

const renderRegistrations = () => {
  if (!tableElement) {
    return
  }

  renderSummary()
  tableElement.hidden = false

  if (registrations.length === 0) {
    tableElement.innerHTML = '<p class="admin-empty">아직 관심 등록이 없습니다.</p>'
    return
  }

  tableElement.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>등록</th>
          <th>신청자</th>
          <th>상황</th>
          <th>연락처</th>
          <th>필요한 도움</th>
          <th>상태</th>
          <th>처리</th>
        </tr>
      </thead>
      <tbody>
        ${registrations.map(renderRegistrationRow).join('')}
      </tbody>
    </table>
  `
}

const renderRegistrationRow = (item) => {
  const helpNeeded = Array.isArray(item.help_needed)
    ? item.help_needed.map((value) => helpLabels[value] ?? value).join(', ')
    : ''
  const contacts = [
    item.contact_phone ? `전화 ${item.contact_phone}` : '',
    item.contact_email ? `이메일 ${item.contact_email}` : '',
    item.contact_instagram ? `인스타 ${item.contact_instagram}` : ''
  ].filter(Boolean)
  const note = item.notes ? `<p class="admin-table__note">${escapeHtml(item.notes)}</p>` : ''
  const isNew = item.review_status === 'new'

  return `
    <tr>
      <td>
        <time datetime="${escapeHtml(item.created_at)}">${escapeHtml(formatDateTime(item.created_at))}</time>
        ${note}
      </td>
      <td>
        <strong>${escapeHtml(item.applicant_name)}</strong>
        <span>${escapeHtml(roleLabels[item.role] ?? item.role)}</span>
      </td>
      <td>${escapeHtml(recitalStatusLabels[item.upcoming_recital] ?? item.upcoming_recital)}</td>
      <td>${escapeHtml(contacts.join(' / '))}</td>
      <td>${escapeHtml(helpNeeded || '-')}</td>
      <td>${escapeHtml(reviewStatusLabels[item.review_status] ?? item.review_status)}</td>
      <td>
        <div class="admin-table__actions">
          <button
            class="button button--secondary"
            data-admin-review="${escapeHtml(item.id)}"
            data-admin-review-status="contacted"
            ${isNew ? '' : 'disabled'}
            type="button"
          >
            확인
          </button>
          <button
            class="button button--secondary"
            data-admin-review="${escapeHtml(item.id)}"
            data-admin-review-status="archived"
            type="button"
          >
            보관
          </button>
        </div>
      </td>
    </tr>
  `
}

const fetchRegistrations = async () => {
  if (!isSupabaseConfigured || !supabase) {
    setStatus('Supabase 환경 변수가 설정되어야 관심 등록을 확인할 수 있습니다.', 'error')
    return
  }

  setLoading(true)
  setStatus('관심 등록을 불러오는 중입니다.')

  const { data, error } = await supabase
    .from('promotion_interest_registrations')
    .select(createRegistrationSelect())
    .order('created_at', { ascending: false })
    .limit(100)

  setLoading(false)

  if (error) {
    registrations = []
    renderRegistrations()
    setStatus(getReadableErrorMessage(error), 'error')
    return
  }

  registrations = data ?? []
  renderRegistrations()
  setStatus('')
}

const markRegistration = async (id, reviewStatus) => {
  if (!supabase || !currentSession?.user) {
    return
  }

  setStatus('처리 상태를 저장하는 중입니다.')

  const { error } = await supabase
    .from('promotion_interest_registrations')
    .update({
      review_status: reviewStatus,
      reviewed_at: new Date().toISOString(),
      reviewer_user_id: currentSession.user.id
    })
    .eq('id', id)

  if (error) {
    setStatus(getReadableErrorMessage(error), 'error')
    return
  }

  await fetchRegistrations()
}

const bindEvents = () => {
  refreshButton?.addEventListener('click', fetchRegistrations)
  tableElement?.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) {
      return
    }

    const button = event.target.closest('[data-admin-review]')

    if (!(button instanceof HTMLButtonElement)) {
      return
    }

    const id = button.dataset.adminReview
    const reviewStatus = button.dataset.adminReviewStatus

    if (!id || !reviewStatus) {
      return
    }

    markRegistration(id, reviewStatus)
  })
}

const init = async () => {
  configureAnalytics()
  initAuthNavigation()
  bindEvents()

  if (!isSupabaseConfigured || !supabase) {
    setStatus('Supabase 환경 변수가 설정되어야 관심 등록을 확인할 수 있습니다.', 'error')
    return
  }

  const { data } = await supabase.auth.getSession()
  currentSession = data.session

  supabase.auth.onAuthStateChange((_event, session) => {
    currentSession = session
  })

  if (!currentSession?.user) {
    window.location.replace(createLoginUrlWithRedirect({ target: window.location.href }))
    return
  }

  await fetchRegistrations()
}

init()
