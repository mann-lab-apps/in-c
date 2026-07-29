import {
  isSupabaseConfigured,
  supabase
} from './auth.js'

const getDisplayName = (user) =>
  user?.user_metadata?.full_name ??
  user?.user_metadata?.name ??
  user?.email ??
  '계정'

const createAuthNav = (link) => {
  const initialText = link.textContent
  const initialHref = link.getAttribute('href') ?? './login.html'
  const initialCurrent = link.getAttribute('aria-current')
  let currentSession

  const render = (session) => {
    currentSession = session
    const user = session?.user

    if (user) {
      const name = getDisplayName(user)
      link.textContent = '로그아웃'
      link.href = '#logout'
      link.dataset.authState = 'signed-in'
      link.setAttribute('aria-label', `${name} 계정에서 로그아웃`)
      link.removeAttribute('aria-current')
      return
    }

    link.textContent = initialText
    link.setAttribute('href', initialHref)
    link.dataset.authState = 'signed-out'
    link.removeAttribute('aria-label')

    if (initialCurrent) {
      link.setAttribute('aria-current', initialCurrent)
    } else {
      link.removeAttribute('aria-current')
    }
  }

  const bind = () => {
    link.addEventListener('click', async (event) => {
      if (!currentSession?.user || !supabase) {
        return
      }

      event.preventDefault()
      link.setAttribute('aria-busy', 'true')
      const { error } = await supabase.auth.signOut()
      link.removeAttribute('aria-busy')

      if (!error) {
        render(undefined)
      }
    })
  }

  return {
    bind,
    render
  }
}

const initAuthNavigation = async () => {
  const link = document.querySelector('.nav-login-link')

  if (!link || !isSupabaseConfigured || !supabase) {
    return
  }

  const authNav = createAuthNav(link)
  authNav.bind()

  const { data } = await supabase.auth.getSession()
  authNav.render(data.session)

  supabase.auth.onAuthStateChange((_event, session) => {
    authNav.render(session)
  })
}

export {
  initAuthNavigation
}
