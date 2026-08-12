import {
  authProviderIds,
  isSupabaseConfigured,
  supabase
} from './auth.js'
import {
  clearStoredRedirectTarget,
  getRequestedAuthRedirectTarget
} from './auth-redirect.js'
import { initAuthNavigation } from './auth-nav.js'
import { configureAnalytics, trackEvent } from './analytics.js'
import { initGlobalBanner } from './global-banner.js'

const statusElement = document.querySelector('[data-auth-status]')
const actionsElement = document.querySelector('[data-auth-actions]')
const sessionElement = document.querySelector('[data-auth-session]')
const signOutButton = document.querySelector('[data-auth-sign-out]')
const userNameElement = document.querySelector('[data-auth-user-name]')
const userEmailElement = document.querySelector('[data-auth-user-email]')
const providerButtons = [
  ...document.querySelectorAll('[data-auth-provider]')
]
const pendingProviderButtons = [
  ...document.querySelectorAll('[data-auth-pending-provider]')
]
const authCallbackParamNames = new Set([
  'access_token',
  'code',
  'error',
  'error_code',
  'error_description',
  'refresh_token',
  'token_type',
  'type'
])
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
    button.setAttribute('aria-busy', String(isDisabled))
  }
}

const getRedirectUrl = () => {
  const url = new URL(window.location.href)
  url.pathname = url.pathname.replace(/[^/]*$/, 'login.html')
  url.search = ''
  url.searchParams.set('redirectTo', getRequestedAuthRedirectTarget())
  url.hash = ''
  return url.href
}

const getAuthCallbackParams = () => {
  const params = new URLSearchParams(window.location.search)
  const hash = window.location.hash.replace(/^#/, '')
  const hashParams = hash.includes('=')
    ? new URLSearchParams(hash)
    : new URLSearchParams()

  for (const [key, value] of hashParams) {
    if (!params.has(key)) {
      params.set(key, value)
    }
  }

  return params
}

const hasAuthCallbackParams = (params) => {
  for (const name of authCallbackParamNames) {
    if (params.has(name)) {
      return true
    }
  }

  return false
}

const clearAuthCallbackUrl = () => {
  const url = new URL(window.location.href)
  const hash = url.hash.replace(/^#/, '')
  const hasStructuredHash = hash.includes('=')
  const hashParams = hasStructuredHash
    ? new URLSearchParams(hash)
    : new URLSearchParams()
  let changed = false

  for (const name of authCallbackParamNames) {
    if (url.searchParams.has(name)) {
      url.searchParams.delete(name)
      changed = true
    }

    if (hashParams.has(name)) {
      hashParams.delete(name)
      changed = true
    }
  }

  if (hasStructuredHash) {
    url.hash = hashParams.toString()
  }

  if (changed) {
    window.history.replaceState({}, document.title, url.href)
  }
}

const getDisplayName = (user) =>
  user?.user_metadata?.full_name ??
  user?.user_metadata?.name ??
  user?.user_metadata?.nickname ??
  user?.user_metadata?.preferred_username ??
  user?.email ??
  '로그인됨'

const getProviderLabel = (user) => {
  const provider =
    user?.app_metadata?.provider ?? user?.identities?.[0]?.provider

  return {
    google: 'Google',
    kakao: '카카오'
  }[provider] ?? '간편로그인'
}

const getAccountDescription = (user) =>
  user?.email ?? `${getProviderLabel(user)} 계정으로 로그인되었습니다.`

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
    userEmailElement.textContent = user ? getAccountDescription(user) : ''
  }

  if (user) {
    setStatus('로그인되어 있습니다.')
  } else {
    setStatus('원하는 계정으로 로그인하세요.')
    setActionsDisabled(false)
  }
}

const redirectSignedInUser = (session, { allowDefault = false } = {}) => {
  if (!session?.user) {
    return false
  }

  const target = getRequestedAuthRedirectTarget({
    fallback: allowDefault ? undefined : ''
  })

  if (!target) {
    return false
  }

  clearStoredRedirectTarget()
  window.location.replace(target)
  return true
}

const signInWithProvider = async (providerKey) => {
  const provider = authProviderIds[providerKey]
  const providerLabel =
    providerButtons.find((button) => button.dataset.authProvider === providerKey)
      ?.dataset.authProviderLabel ?? '간편로그인'

  if (!supabase || !provider) {
    setStatus('로그인 설정을 확인할 수 없습니다.', 'error')
    return
  }

  setActionsDisabled(true)
  setStatus(`${providerLabel} 화면으로 이동합니다.`)
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
  initGlobalBanner()
  configureAnalytics()
  initAuthNavigation()

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

  for (const button of pendingProviderButtons) {
    button.addEventListener('click', () => {
      const provider = button.dataset.authPendingProvider
      trackEvent('auth_social_pending', {
        platform: provider
      })
      setStatus(
        '카카오 로그인은 이메일 제공 권한 확인 뒤 연결합니다. 지금은 Google 로그인을 사용해 주세요.',
        'error'
      )
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
  const callbackParams = getAuthCallbackParams()
  const isAuthCallback = hasAuthCallbackParams(callbackParams)
  const callbackError =
    callbackParams.get('error_description') ?? callbackParams.get('error')

  if (error || callbackError) {
    setActionsDisabled(false)
    setStatus(error?.message ?? callbackError, 'error')
    trackEvent(error ? 'auth_session_error' : 'auth_callback_error')
    clearAuthCallbackUrl()
    return
  }

  renderSession(data.session)
  clearAuthCallbackUrl()

  if (redirectSignedInUser(data.session, { allowDefault: isAuthCallback })) {
    return
  }

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
      trackEvent('auth_signed_in')

      if (redirectSignedInUser(session, { allowDefault: true })) {
        return
      }
    }

    renderSession(session)
  })
}

init()
