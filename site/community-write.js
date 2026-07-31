import { configureAnalytics, trackEvent } from './analytics.js'
import {
  isSupabaseConfigured,
  supabase
} from './auth.js'
import { initAuthNavigation } from './auth-nav.js'

const statusElement = document.querySelector('[data-community-write-status]')
const authPanel = document.querySelector('[data-community-write-auth]')
const writePanel = document.querySelector('[data-community-write-panel]')
const formElement = document.querySelector('[data-community-post-form]')
const submitButton = document.querySelector('[data-community-submit]')
const pageTitle = document.querySelector('[data-community-write-title]')
const formTitle = document.querySelector('[data-community-form-title]')
const formDescription = document.querySelector('[data-community-form-description]')
const params = new URLSearchParams(window.location.search)
const editingPostId = params.get('post')

let currentSession

const setStatus = (message, tone = 'neutral') => {
  if (!statusElement) {
    return
  }

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
  const formHeading = isEditing ? '게시글 수정' : '새 글 작성'

  document.title = `${title} | Community | in C`

  if (pageTitle) {
    pageTitle.textContent = title
  }

  if (formTitle) {
    formTitle.textContent = formHeading
  }

  if (formDescription) {
    formDescription.textContent = isEditing
      ? '수정 후 게시판 상세 화면으로 이동합니다.'
      : '작성 후 게시판 상세 화면으로 이동합니다.'
  }

  if (submitButton) {
    submitButton.textContent = isEditing ? '수정' : '게시'
  }
}

const ensureProfile = async () => {
  const user = currentSession?.user

  if (!supabase || !user) {
    return
  }

  const { error } = await supabase.from('profiles').upsert({
    user_id: user.id,
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

  if (authPanel) {
    authPanel.hidden = isSignedIn
  }

  if (writePanel) {
    writePanel.hidden = !isSignedIn
  }

  setFormDisabled(!isSignedIn)
}

const loadPostForEdit = async () => {
  if (!editingPostId || !supabase || !currentSession?.user || !formElement) {
    return
  }

  setStatus('게시글을 불러오는 중입니다.')

  const { data, error } = await supabase
    .from('community_posts')
    .select('id,author_user_id,category,title,body,status')
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

  getFormField('category').value = data.category
  getFormField('title').value = data.title
  getFormField('body').value = data.body
  setStatus('게시글을 수정할 수 있습니다.')
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
      category: getFormField('category').value,
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
      category: payload.category,
      content_slug: data.id,
      content_title: payload.title,
      content_type: 'community_post'
    })

    window.location.href = `./community.html?post=${encodeURIComponent(data.id)}`
  } catch (error) {
    setStatus(getReadableErrorMessage(error), 'error')
    setFormDisabled(false)
  }
}

const init = async () => {
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
  })

  if (!currentSession?.user) {
    setStatus('글을 작성하려면 로그인하세요.')
    return
  }

  formElement?.addEventListener('submit', savePost)
  await loadPostForEdit()

  if (!editingPostId) {
    setStatus('새 글을 작성할 수 있습니다.')
  }
}

init()
