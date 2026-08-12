const AUTH_REDIRECT_STORAGE_KEY = 'inC.authRedirectTo'
const DEFAULT_AUTH_REDIRECT_PATH = './community.html'

const getStoredRedirectTarget = () => {
  try {
    return window.sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

const storeRedirectTarget = (target) => {
  try {
    window.sessionStorage.setItem(AUTH_REDIRECT_STORAGE_KEY, target)
  } catch {
    // Some privacy modes can block sessionStorage. The query param still carries the intent.
  }
}

const clearStoredRedirectTarget = () => {
  try {
    window.sessionStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY)
  } catch {
    // Ignore storage cleanup failures; the redirect target is validated on every read.
  }
}

const toBrowserPath = (url) => `${url.pathname}${url.search}${url.hash}`

const isLoginPath = (url) => {
  const loginUrl = new URL('./login.html', window.location.href)
  return url.pathname === loginUrl.pathname
}

const sanitizeAuthRedirectTarget = (
  rawTarget,
  fallback = DEFAULT_AUTH_REDIRECT_PATH
) => {
  if (!rawTarget) {
    return fallback
  }

  try {
    const targetUrl = new URL(rawTarget, window.location.href)

    if (targetUrl.origin !== window.location.origin || isLoginPath(targetUrl)) {
      return fallback
    }

    return toBrowserPath(targetUrl)
  } catch {
    return fallback
  }
}

const getRequestedAuthRedirectTarget = ({
  fallback = DEFAULT_AUTH_REDIRECT_PATH
} = {}) => {
  const params = new URLSearchParams(window.location.search)
  const queryTarget = sanitizeAuthRedirectTarget(
    params.get('redirectTo'),
    ''
  )
  const storedTarget = sanitizeAuthRedirectTarget(getStoredRedirectTarget(), '')
  const target = queryTarget || storedTarget || fallback

  if (target) {
    storeRedirectTarget(target)
  }

  return target
}

const createLoginUrlWithRedirect = ({
  loginPath = './login.html',
  target = window.location.href
} = {}) => {
  const safeTarget = sanitizeAuthRedirectTarget(target)
  const loginUrl = new URL(loginPath, window.location.href)
  loginUrl.searchParams.set('redirectTo', safeTarget)
  storeRedirectTarget(safeTarget)
  return loginUrl.href
}

export {
  clearStoredRedirectTarget,
  createLoginUrlWithRedirect,
  DEFAULT_AUTH_REDIRECT_PATH,
  getRequestedAuthRedirectTarget,
  sanitizeAuthRedirectTarget,
  storeRedirectTarget
}
