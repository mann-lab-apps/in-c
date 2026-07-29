import {
  authProviderIds,
  isSupabaseConfigured,
  supabase
} from './auth.js'
import { configureAnalytics, trackEvent } from './analytics.js'

const statusElement = document.querySelector('[data-auth-status]')
const actionsElement = document.querySelector('[data-auth-actions]')
const sessionElement = document.querySelector('[data-auth-session]')
const signOutButton = document.querySelector('[data-auth-sign-out]')
const userNameElement = document.querySelector('[data-auth-user-name]')
const userEmailElement = document.querySelector('[data-auth-user-email]')
const providerButtons = [
  ...document.querySelectorAll('[data-auth-provider]')
]

const setStatus = (message, tone = 'neutral') => {
  if (!statusElement) {
    return
  }

  statusElement.textContent = message
  statusElement.dataset.tone = tone
}

const setActionsDisabled = (isDisabled) => {
  for (const button of providerButtons) {
    button.disabled = isDisabled
  }
}

const getRedirectUrl = () => {
  const url = new URL(window.location.href)
  url.pathname = url.pathname.replace(/[^/]*$/, 'login.html')
  url.search = ''
  url.hash = ''
  return url.href
}

const getDisplayName = (user) =>
  user?.user_metadata?.full_name ??
  user?.user_metadata?.name ??
  user?.email ??
  '로그인됨'

const renderSession = (session) => {
  const user = session?.user

  if (sessionElement) {
    sessionElement.hidden = !user
  }

  if (actionsElement) {
    actionsElement.hidden = Boolean(user)
  }

  if (userNameElement) {
    userNameElement.textContent = getDisplayName(user)
  }

  if (userEmailElement) {
    userEmailElement.textContent = user?.email ?? '이메일 정보를 확인할 수 없습니다.'
  }

  if (user) {
    setStatus('로그인되어 있습니다.')
  } else {
    setStatus('원하는 계정으로 로그인하세요.')
  }
}

const signInWithProvider = async (providerKey) => {
  const provider = authProviderIds[providerKey]

  if (!supabase || !provider) {
    setStatus('로그인 설정을 확인할 수 없습니다.', 'error')
    return
  }

  setActionsDisabled(true)
  setStatus('로그인 화면으로 이동합니다.')
  trackEvent('auth_social_start', {
    platform: providerKey
  })

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: getRedirectUrl()
    }
  })

  if (error) {
    setActionsDisabled(false)
    setStatus(error.message, 'error')
    trackEvent('auth_social_error', {
      platform: providerKey
    })
  }
}

const init = async () => {
  configureAnalytics()

  if (!isSupabaseConfigured || !supabase) {
    setActionsDisabled(true)
    setStatus(
      'Supabase URL과 publishable key를 설정하면 간편로그인을 사용할 수 있습니다.',
      'error'
    )
    return
  }

  for (const button of providerButtons) {
    button.addEventListener('click', () => {
      signInWithProvider(button.dataset.authProvider)
    })
  }

  signOutButton?.addEventListener('click', async () => {
    setStatus('로그아웃 중입니다.')
    const { error } = await supabase.auth.signOut()

    if (error) {
      setStatus(error.message, 'error')
      trackEvent('auth_sign_out_error')
      return
    }

    trackEvent('auth_sign_out')
    renderSession(undefined)
  })

  const { data, error } = await supabase.auth.getSession()

  if (error) {
    setStatus(error.message, 'error')
    trackEvent('auth_session_error')
    return
  }

  renderSession(data.session)

  supabase.auth.onAuthStateChange((_event, session) => {
    renderSession(session)
  })
}

init()
