import { bindTrackedLinks, configureAnalytics, trackEvent } from './analytics.js'
import {
  isSupabaseConfigured,
  supabase
} from './auth.js'
import { initAuthNavigation } from './auth-nav.js'

const categoryLabels = {
  notice: '공지',
  question: '질문',
  feedback: '피드백',
  general: '일반'
}

const postsElement = document.querySelector('[data-community-posts]')
const detailElement = document.querySelector('[data-community-detail]')
const detailBodyElement = document.querySelector('[data-community-detail-body]')
const statusElement = document.querySelector('[data-community-status]')
const writeLink = document.querySelector('[data-community-write-link]')
const loginLink = document.querySelector('[data-community-login-link]')
const categoryButtons = [
  ...document.querySelectorAll('[data-community-category]')
]

let currentSession
let selectedPostId = new URLSearchParams(window.location.search).get('post')
let selectedCategory = ''
let posts = []
let comments = []

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const getDisplayName = (user) =>
  user?.user_metadata?.full_name ??
  user?.user_metadata?.name ??
  user?.user_metadata?.nickname ??
  user?.email ??
  'in C 사용자'

const getProfileName = (item) =>
  item?.profiles?.display_name ?? item?.profile?.display_name ?? 'in C 사용자'

const formatDate = (value) =>
  new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))

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

const getSelectedPost = () =>
  posts.find((post) => post.id === selectedPostId) ?? posts[0]

const setSelectedPost = (postId, { replace = false } = {}) => {
  selectedPostId = postId

  const url = new URL(window.location.href)
  if (postId) {
    url.searchParams.set('post', postId)
  } else {
    url.searchParams.delete('post')
  }

  window.history[replace ? 'replaceState' : 'pushState']({}, '', url.href)
}

const renderAuthState = () => {
  const isSignedIn = Boolean(currentSession?.user)

  if (loginLink) {
    loginLink.hidden = isSignedIn
  }

  if (writeLink) {
    writeLink.hidden = !isSignedIn || !isSupabaseConfigured || !supabase
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

const createPostSelect = () =>
  [
    'id',
    'author_user_id',
    'category',
    'title',
    'body',
    'created_at',
    'updated_at',
    'profiles(display_name)'
  ].join(',')

const fetchPosts = async () => {
  if (!isSupabaseConfigured || !supabase) {
    posts = []
    comments = []
    renderPosts()
    renderDetail()
    setStatus('Supabase 환경 변수를 설정하면 Community 게시판을 불러옵니다.', 'error')
    return
  }

  setStatus('게시글을 불러오는 중입니다.')

  let query = supabase
    .from('community_posts')
    .select(createPostSelect())
    .eq('status', 'public')
    .order('created_at', { ascending: false })
    .limit(50)

  if (selectedCategory) {
    query = query.eq('category', selectedCategory)
  }

  const { data, error } = await query

  if (error) {
    posts = []
    comments = []
    renderPosts()
    renderDetail()
    setStatus(getReadableErrorMessage(error), 'error')
    return
  }

  posts = data ?? []
  const selected = getSelectedPost()
  setSelectedPost(selected?.id ?? '', { replace: true })
  renderPosts()
  await fetchComments()
  setStatus(
    posts.length > 0
      ? `게시글 ${posts.length}개를 불러왔습니다.`
      : '아직 공개 게시글이 없습니다.'
  )
}

const fetchComments = async () => {
  const selected = getSelectedPost()

  if (!supabase || !selected) {
    comments = []
    renderDetail()
    return
  }

  const { data, error } = await supabase
    .from('community_comments')
    .select(
      [
        'id',
        'post_id',
        'author_user_id',
        'body',
        'created_at',
        'updated_at',
        'profiles(display_name)'
      ].join(',')
    )
    .eq('post_id', selected.id)
    .eq('status', 'public')
    .order('created_at', { ascending: true })

  if (error) {
    comments = []
    renderDetail()
    setStatus(getReadableErrorMessage(error), 'error')
    return
  }

  comments = data ?? []
  renderDetail()
}

const renderPostMeta = (post) => `
  <dl>
    <div><dt>분류</dt><dd>${escapeHtml(categoryLabels[post.category])}</dd></div>
    <div><dt>작성자</dt><dd>${escapeHtml(getProfileName(post))}</dd></div>
    <div><dt>작성일</dt><dd>${escapeHtml(formatDate(post.created_at))}</dd></div>
  </dl>
`

const renderPosts = () => {
  if (!postsElement) {
    return
  }

  if (posts.length === 0) {
    postsElement.innerHTML = `
      <li class="community-post-card">
        <h3>게시글 없음</h3>
        <p>선택한 분류에 공개 글이 없습니다.</p>
      </li>
    `
    return
  }

  postsElement.innerHTML = posts
    .map(
      (post) => `
        <li class="community-post-card ${
          post.id === selectedPostId ? 'is-selected' : ''
        }">
          <h3>
            <a href="./community.html?post=${encodeURIComponent(
              post.id
            )}" data-community-post-select="${escapeHtml(
              post.id
            )}" data-track-event="community_view" data-track-content-type="community_post" data-track-content-slug="${escapeHtml(
              post.id
            )}">
              ${escapeHtml(post.title)}
            </a>
          </h3>
          <p>${escapeHtml(post.body.slice(0, 150))}${
            post.body.length > 150 ? '...' : ''
          }</p>
          ${renderPostMeta(post)}
        </li>
      `
    )
    .join('')
}

const renderCommentForm = () => {
  if (!currentSession?.user) {
    return '<p>댓글을 남기려면 로그인하세요.</p>'
  }

  return `
    <form class="community-comment-form" data-community-comment-form>
      <label>
        <span>댓글</span>
        <textarea maxlength="2000" minlength="1" name="body" required rows="4"></textarea>
      </label>
      <button class="button button--primary" type="submit">댓글 남기기</button>
    </form>
  `
}

const renderComments = () => {
  const list = comments.length
    ? comments
        .map((comment) => {
          const canDelete = comment.author_user_id === currentSession?.user?.id

          return `
            <li class="community-comment">
              <div class="community-comment__meta">
                <span>${escapeHtml(getProfileName(comment))}</span>
                <span>${escapeHtml(formatDate(comment.created_at))}</span>
              </div>
              <p>${escapeHtml(comment.body)}</p>
              ${
                canDelete
                  ? `<div class="community-comment-actions"><button class="button button--secondary" type="button" data-community-comment-delete="${escapeHtml(
                      comment.id
                    )}">댓글 삭제</button></div>`
                  : ''
              }
            </li>
          `
        })
        .join('')
    : '<li class="community-comment"><p>아직 댓글이 없습니다.</p></li>'

  return `
    <section class="community-comments" aria-labelledby="community-comments-title">
      <h3 id="community-comments-title">댓글</h3>
      <ul class="community-comment-list">${list}</ul>
      ${renderCommentForm()}
    </section>
  `
}

const renderDetail = () => {
  if (!detailElement || !detailBodyElement) {
    return
  }

  const selected = getSelectedPost()

  detailElement.hidden = !selected

  if (!selected) {
    detailBodyElement.innerHTML = ''
    return
  }

  const isOwner = selected.author_user_id === currentSession?.user?.id

  detailBodyElement.innerHTML = `
    <article class="community-detail-article">
      <div>
        <p class="eyebrow">${escapeHtml(categoryLabels[selected.category])}</p>
        <h2>${escapeHtml(selected.title)}</h2>
      </div>
      ${renderPostMeta(selected)}
      <p class="community-detail-article__body">${escapeHtml(selected.body)}</p>
      ${
        isOwner
          ? `<div class="community-post-actions">
              <a class="button button--secondary" href="./community-write.html?post=${encodeURIComponent(
                selected.id
              )}">수정</a>
              <button class="button button--secondary" type="button" data-community-post-delete="${escapeHtml(
                selected.id
              )}">삭제</button>
            </div>`
          : ''
      }
      ${renderComments()}
    </article>
  `

  trackEvent('community_view', {
    category: selected.category,
    content_slug: selected.id,
    content_title: selected.title,
    content_type: 'community_post'
  })
}

const deletePost = async (postId) => {
  if (!supabase || !currentSession?.user) {
    setStatus('로그인이 필요합니다.', 'error')
    return
  }

  const post = posts.find((candidate) => candidate.id === postId)

  if (!post || post.author_user_id !== currentSession.user.id) {
    setStatus('이 게시글을 삭제할 권한이 없습니다.', 'error')
    return
  }

  setStatus('게시글을 삭제하는 중입니다.')
  const { error } = await supabase
    .from('community_posts')
    .delete()
    .eq('id', postId)
    .eq('author_user_id', currentSession.user.id)

  if (error) {
    setStatus(getReadableErrorMessage(error), 'error')
    return
  }

  selectedPostId = ''
  await fetchPosts()
  setStatus('게시글을 삭제했습니다.')
}

const saveComment = async (event) => {
  event.preventDefault()

  const selected = getSelectedPost()
  const form = event.currentTarget

  if (!supabase || !currentSession?.user || !selected || !form) {
    setStatus('로그인이 필요합니다.', 'error')
    return
  }

  setStatus('댓글을 등록하는 중입니다.')

  try {
    await ensureProfile()

    const body = form.elements.namedItem('body').value.trim()
    const { error } = await supabase.from('community_comments').insert({
      author_user_id: currentSession.user.id,
      body,
      post_id: selected.id,
      status: 'public'
    })

    if (error) {
      throw error
    }

    form.reset()
    await fetchComments()
    setStatus('댓글을 등록했습니다.')
  } catch (error) {
    setStatus(getReadableErrorMessage(error), 'error')
  }
}

const deleteComment = async (commentId) => {
  if (!supabase || !currentSession?.user) {
    setStatus('로그인이 필요합니다.', 'error')
    return
  }

  setStatus('댓글을 삭제하는 중입니다.')
  const { error } = await supabase
    .from('community_comments')
    .delete()
    .eq('id', commentId)
    .eq('author_user_id', currentSession.user.id)

  if (error) {
    setStatus(getReadableErrorMessage(error), 'error')
    return
  }

  await fetchComments()
  setStatus('댓글을 삭제했습니다.')
}

const bindEvents = () => {
  for (const button of categoryButtons) {
    button.addEventListener('click', async () => {
      selectedCategory = button.dataset.communityCategory ?? ''

      for (const candidate of categoryButtons) {
        candidate.classList.toggle('is-active', candidate === button)
      }

      selectedPostId = ''
      await fetchPosts()
    })
  }

  document.addEventListener('click', async (event) => {
    if (!(event.target instanceof Element)) {
      return
    }

    const postLink = event.target.closest('[data-community-post-select]')
    const deleteButton = event.target.closest('[data-community-post-delete]')
    const commentDeleteButton = event.target.closest(
      '[data-community-comment-delete]'
    )

    if (postLink) {
      event.preventDefault()
      setSelectedPost(postLink.dataset.communityPostSelect)
      renderPosts()
      await fetchComments()
      return
    }

    if (deleteButton) {
      await deletePost(deleteButton.dataset.communityPostDelete)
      return
    }

    if (commentDeleteButton) {
      await deleteComment(commentDeleteButton.dataset.communityCommentDelete)
    }
  })

  document.addEventListener('submit', async (event) => {
    if (!(event.target instanceof Element)) {
      return
    }

    if (event.target.matches('[data-community-comment-form]')) {
      await saveComment(event)
    }
  })

  window.addEventListener('popstate', async () => {
    selectedPostId = new URLSearchParams(window.location.search).get('post')
    renderPosts()
    await fetchComments()
  })
}

const init = async () => {
  bindTrackedLinks()
  configureAnalytics()
  initAuthNavigation()
  bindEvents()

  if (supabase) {
    const { data } = await supabase.auth.getSession()
    currentSession = data.session
    supabase.auth.onAuthStateChange((_event, session) => {
      currentSession = session
      renderAuthState()
      renderDetail()
    })
  }

  renderAuthState()
  await fetchPosts()
}

init()
