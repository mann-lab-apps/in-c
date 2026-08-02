import { configureAnalytics, trackEvent } from './analytics.js'
import {
  isSupabaseConfigured,
  supabase
} from './auth.js'
import { initAuthNavigation } from './auth-nav.js'

const params = new URLSearchParams(window.location.search)
const postId = params.get('post')
const statusElement = document.querySelector('[data-community-post-status]')
const detailElement = document.querySelector('[data-community-post-detail]')
const detailBodyElement = document.querySelector('[data-community-post-detail-body]')

let currentSession
let currentPost
let comments = []
let editingCommentId = ''

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

const renderPostMeta = (post) => `
  <p class="community-detail-meta">
    <span>${escapeHtml(getProfileName(post))}</span>
    <span aria-hidden="true">·</span>
    <time datetime="${escapeHtml(post.created_at)}">${escapeHtml(formatDate(post.created_at))}</time>
  </p>
`

const renderCommentForm = () => {
  if (!currentSession?.user) {
    return ''
  }

  const editingComment = comments.find(
    (comment) =>
      comment.id === editingCommentId &&
      comment.author_user_id === currentSession.user.id
  )
  const formMode = editingComment ? 'edit' : 'create'

  return `
    <form
      class="community-comment-form"
      data-community-comment-form
      data-community-comment-mode="${formMode}"
    >
      <label>
        <span>댓글</span>
        <textarea maxlength="2000" minlength="1" name="body" required rows="4">${escapeHtml(
          editingComment?.body ?? ''
        )}</textarea>
      </label>
      <div class="community-comment-actions">
        <button class="button button--primary" type="submit">${
          editingComment ? '댓글 수정' : '댓글 남기기'
        }</button>
        ${
          editingComment
            ? '<button class="button button--secondary" type="button" data-community-comment-cancel>취소</button>'
            : ''
        }
      </div>
    </form>
  `
}

const renderCommentActions = (comment) => `
  <div class="community-comment-actions">
    <button
      class="button button--secondary"
      type="button"
      data-community-comment-edit="${escapeHtml(comment.id)}"
    >
      댓글 수정
    </button>
    <button
      class="button button--secondary"
      type="button"
      data-community-comment-delete="${escapeHtml(comment.id)}"
    >
      댓글 삭제
    </button>
  </div>
`

const renderComments = () => {
  const list = comments
    .map((comment) => {
      const canManage = comment.author_user_id === currentSession?.user?.id

      return `
        <li class="community-comment">
          <div class="community-comment__meta">
            <span>${escapeHtml(getProfileName(comment))}</span>
            <span>${escapeHtml(formatDate(comment.created_at))}</span>
          </div>
          <p>${escapeHtml(comment.body)}</p>
          ${canManage ? renderCommentActions(comment) : ''}
        </li>
      `
    })
    .join('')

  return `
    <section class="community-comments">
      ${comments.length ? `<ul class="community-comment-list">${list}</ul>` : ''}
      ${renderCommentForm()}
    </section>
  `
}

const renderDetail = () => {
  if (!detailElement || !detailBodyElement || !currentPost) {
    return
  }

  const isOwner = currentPost.author_user_id === currentSession?.user?.id
  detailElement.hidden = false

  document.title = `${currentPost.title} | Community | in C`
  detailBodyElement.innerHTML = `
    <article class="community-detail-article">
      <div class="community-detail-nav">
        <a href="./community.html">목록</a>
      </div>
      <header class="community-detail-article__header">
        <h1>${escapeHtml(currentPost.title)}</h1>
        ${renderPostMeta(currentPost)}
      </header>
      <div class="community-detail-article__body">${escapeHtml(currentPost.body)}</div>
      ${
        isOwner
          ? `<div class="community-post-actions community-post-actions--owner">
              <a class="button button--secondary" href="./community-write.html?post=${encodeURIComponent(
                currentPost.id
              )}">수정</a>
              <button class="button button--secondary" type="button" data-community-post-delete>
                삭제
              </button>
            </div>`
          : ''
      }
      ${renderComments()}
    </article>
  `
}

const fetchPost = async () => {
  if (!postId) {
    setStatus('게시글을 찾을 수 없습니다.', 'error')
    return
  }

  if (!isSupabaseConfigured || !supabase) {
    setStatus('Supabase 환경 변수를 설정하면 Community 게시글을 불러옵니다.', 'error')
    return
  }

  setStatus('게시글을 불러오는 중입니다.')

  const { data, error } = await supabase
    .from('community_posts')
    .select(
      [
        'id',
        'author_user_id',
        'title',
        'body',
        'created_at',
        'updated_at',
        'profiles(display_name)'
      ].join(',')
    )
    .eq('id', postId)
    .eq('status', 'public')
    .single()

  if (error) {
    setStatus(getReadableErrorMessage(error), 'error')
    return
  }

  currentPost = data
  await fetchComments()
  setStatus('')
  trackEvent('community_view', {
    content_slug: currentPost.id,
    content_title: currentPost.title,
    content_type: 'community_post'
  })
}

const fetchComments = async () => {
  if (!supabase || !currentPost) {
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
    .eq('post_id', currentPost.id)
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

const deletePost = async () => {
  if (!supabase || !currentSession?.user || !currentPost) {
    setStatus('로그인이 필요합니다.', 'error')
    return
  }

  if (currentPost.author_user_id !== currentSession.user.id) {
    setStatus('이 게시글을 삭제할 권한이 없습니다.', 'error')
    return
  }

  if (!window.confirm('게시글을 삭제할까요? 댓글도 함께 삭제됩니다.')) {
    return
  }

  setStatus('게시글을 삭제하는 중입니다.')
  const { error } = await supabase
    .from('community_posts')
    .delete()
    .eq('id', currentPost.id)
    .eq('author_user_id', currentSession.user.id)

  if (error) {
    setStatus(getReadableErrorMessage(error), 'error')
    return
  }

  trackEvent('community_delete', {
    content_slug: currentPost.id,
    content_title: currentPost.title,
    content_type: 'community_post'
  })

  window.location.href = './community.html'
}

const saveComment = async (event) => {
  event.preventDefault()

  const form = event.target

  if (
    !supabase ||
    !currentSession?.user ||
    !currentPost ||
    !(form instanceof HTMLFormElement)
  ) {
    setStatus('로그인이 필요합니다.', 'error')
    return
  }

  try {
    await ensureProfile()

    const body = form.elements.namedItem('body').value.trim()
    if (!body) {
      setStatus('댓글 내용을 입력해 주세요.', 'error')
      return
    }

    const editingComment = comments.find(
      (comment) =>
        comment.id === editingCommentId &&
        comment.author_user_id === currentSession.user.id
    )
    const request = editingComment
      ? supabase
          .from('community_comments')
          .update({ body, status: 'public' })
          .eq('id', editingComment.id)
          .eq('author_user_id', currentSession.user.id)
      : supabase.from('community_comments').insert({
          author_user_id: currentSession.user.id,
          body,
          post_id: currentPost.id,
          status: 'public'
        })

    setStatus(editingComment ? '댓글을 수정하는 중입니다.' : '댓글을 등록하는 중입니다.')
    const { error } = await request

    if (error) {
      throw error
    }

    trackEvent(
      editingComment ? 'community_comment_update' : 'community_comment_create',
      {
        content_slug: currentPost.id,
        content_title: currentPost.title,
        content_type: 'community_comment'
      }
    )

    editingCommentId = ''
    form.reset()
    await fetchComments()
    setStatus(editingComment ? '댓글을 수정했습니다.' : '댓글을 등록했습니다.')
  } catch (error) {
    setStatus(getReadableErrorMessage(error), 'error')
  }
}

const deleteComment = async (commentId) => {
  if (!supabase || !currentSession?.user) {
    setStatus('로그인이 필요합니다.', 'error')
    return
  }

  const comment = comments.find((candidate) => candidate.id === commentId)

  if (!comment || comment.author_user_id !== currentSession.user.id) {
    setStatus('이 댓글을 삭제할 권한이 없습니다.', 'error')
    return
  }

  if (!window.confirm('댓글을 삭제할까요?')) {
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

  trackEvent('community_comment_delete', {
    content_slug: comment.post_id,
    content_type: 'community_comment'
  })

  if (editingCommentId === commentId) {
    editingCommentId = ''
  }

  await fetchComments()
  setStatus('댓글을 삭제했습니다.')
}

const bindEvents = () => {
  document.addEventListener('click', async (event) => {
    if (!(event.target instanceof Element)) {
      return
    }

    const deleteButton = event.target.closest('[data-community-post-delete]')
    const commentDeleteButton = event.target.closest(
      '[data-community-comment-delete]'
    )
    const commentEditButton = event.target.closest(
      '[data-community-comment-edit]'
    )
    const commentCancelButton = event.target.closest(
      '[data-community-comment-cancel]'
    )

    if (deleteButton) {
      await deletePost()
      return
    }

    if (commentDeleteButton) {
      await deleteComment(commentDeleteButton.dataset.communityCommentDelete)
      return
    }

    if (commentEditButton) {
      editingCommentId = commentEditButton.dataset.communityCommentEdit
      renderDetail()
      setStatus('댓글을 수정할 수 있습니다.')
      return
    }

    if (commentCancelButton) {
      editingCommentId = ''
      renderDetail()
      setStatus('댓글 수정을 취소했습니다.')
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
}

const init = async () => {
  configureAnalytics()
  initAuthNavigation()
  bindEvents()

  if (supabase) {
    const { data } = await supabase.auth.getSession()
    currentSession = data.session
    supabase.auth.onAuthStateChange((_event, session) => {
      currentSession = session
      renderDetail()
    })
  }

  await fetchPost()
}

init()
