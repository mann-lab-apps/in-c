import { configureAnalytics, trackEvent } from './analytics.js'
import {
  isSupabaseConfigured,
  supabase
} from './auth.js'
import { createLoginUrlWithRedirect } from './auth-redirect.js'
import { initAuthNavigation } from './auth-nav.js'
import { initGlobalBanner } from './global-banner.js'

const statusElement = document.querySelector('[data-community-write-status]')
const writePanel = document.querySelector('[data-community-write-panel]')
const formElement = document.querySelector('[data-community-post-form]')
const submitButton = document.querySelector('[data-community-submit]')
const cancelLink = document.querySelector('[data-community-cancel]')
const pageTitle = document.querySelector('[data-community-write-title]')
const params = new URLSearchParams(window.location.search)
const editingPostId = params.get('post')

let currentSession

const setStatus = (message, tone = 'neutral') => {
  if (!statusElement) {
    return
  }

  statusElement.hidden = !message
  statusElement.textContent = message
  statusElement.dataset.tone = tone
}

const isMissingCommunitySchemaError = (error) =>
  /schema cache/i.test(error?.message ?? '') &&
  /community_(?:posts|comments)|profiles/i.test(error.message)

const getReadableErrorMessage = (error) => {
  if (isMissingCommunitySchemaError(error)) {
    return 'Community 테이블이 아직 Supabase에 적용되지 않았습니다. 0002_community_board_schema.sql migration을 적용한 뒤 다시 열어 주세요.'
  }

  return error?.message ?? '요청을 완료하지 못했습니다.'
}

const getDisplayName = (user) =>
  user?.user_metadata?.full_name ??
  user?.user_metadata?.name ??
  user?.user_metadata?.nickname ??
  user?.email ??
  'in C 사용자'

const getFormField = (name) => formElement.elements.namedItem(name)

const setFormDisabled = (isDisabled) => {
  if (!formElement) {
    return
  }

  for (const field of formElement.elements) {
    field.disabled = isDisabled
  }
}

const renderMode = () => {
  const isEditing = Boolean(editingPostId)
  const title = isEditing ? '글 수정' : '글쓰기'

  document.title = `${title} | Community | in C`

  if (pageTitle) {
    pageTitle.textContent = title
  }

  if (submitButton) {
    submitButton.textContent = isEditing ? '수정' : '게시'
  }

  if (cancelLink && editingPostId) {
    cancelLink.href = `./community-post.html?post=${encodeURIComponent(editingPostId)}`
  }
}

const ensureProfile = async () => {
  const user = currentSession?.user

  if (!supabase || !user) {
    return
  }

  const { error } = await supabase.from('profiles').upsert({
    ['user_id']: user.id,
    display_name: getDisplayName(user),
    profile_image_url: user.user_metadata?.avatar_url ?? null,
    status: 'active'
  })

  if (error) {
    throw error
  }
}

const renderAuthState = () => {
  const isSignedIn = Boolean(currentSession?.user)

  if (writePanel) {
    writePanel.hidden = !isSignedIn
  }

  setFormDisabled(!isSignedIn)
}

const redirectToLogin = () => {
  window.location.replace(createLoginUrlWithRedirect())
}

const loadPostForEdit = async () => {
  if (!editingPostId || !supabase || !currentSession?.user || !formElement) {
    return
  }

  setStatus('게시글을 불러오는 중입니다.')

  const { data, error } = await supabase
    .from('community_posts')
    .select('id,author_user_id,title,body,status')
    .eq('id', editingPostId)
    .single()

  if (error) {
    setStatus(getReadableErrorMessage(error), 'error')
    setFormDisabled(true)
    return
  }

  if (data.author_user_id !== currentSession.user.id) {
    setStatus('이 게시글을 수정할 권한이 없습니다.', 'error')
    setFormDisabled(true)
    return
  }

  getFormField('title').value = data.title
  getFormField('body').value = data.body
  setStatus('')
}

const savePost = async (event) => {
  event.preventDefault()

  if (!supabase || !currentSession?.user || !formElement) {
    setStatus('로그인이 필요합니다.', 'error')
    return
  }

  setFormDisabled(true)
  setStatus(editingPostId ? '게시글을 수정하는 중입니다.' : '게시글을 등록하는 중입니다.')

  try {
    await ensureProfile()

    const payload = {
      author_user_id: currentSession.user.id,
      category: 'general',
      title: getFormField('title').value.trim(),
      body: getFormField('body').value.trim(),
      status: 'public'
    }

    const request = editingPostId
      ? supabase
          .from('community_posts')
          .update(payload)
          .eq('id', editingPostId)
          .eq('author_user_id', currentSession.user.id)
          .select('id')
          .single()
      : supabase.from('community_posts').insert(payload).select('id').single()

    const { data, error } = await request

    if (error) {
      throw error
    }

    trackEvent(editingPostId ? 'community_update' : 'community_create', {
      content_slug: data.id,
      content_title: payload.title,
      content_type: 'community_post'
    })

    window.location.href = `./community-post.html?post=${encodeURIComponent(data.id)}`
  } catch (error) {
    setStatus(getReadableErrorMessage(error), 'error')
    setFormDisabled(false)
  }
}

const init = async () => {
  initGlobalBanner()
  configureAnalytics()
  initAuthNavigation()
  renderMode()

  if (!isSupabaseConfigured || !supabase) {
    setStatus('Supabase 환경 변수를 설정하면 Community 글쓰기를 사용할 수 있습니다.', 'error')
    renderAuthState()
    return
  }

  const { data } = await supabase.auth.getSession()
  currentSession = data.session
  renderAuthState()

  supabase.auth.onAuthStateChange((_event, session) => {
    currentSession = session
    renderAuthState()

    if (!session?.user) {
      redirectToLogin()
    }
  })

  if (!currentSession?.user) {
    redirectToLogin()
    return
  }

  formElement?.addEventListener('submit', savePost)
  await loadPostForEdit()

  setStatus('')
}

init()
