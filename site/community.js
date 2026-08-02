import { configureAnalytics } from './analytics.js'
import {
  isSupabaseConfigured,
  supabase
} from './auth.js'
import { initAuthNavigation } from './auth-nav.js'
import { createDisabledTooltip } from './tooltip.js'

const postsElement = document.querySelector('[data-community-posts]')
const statusElement = document.querySelector('[data-community-status]')
const writeActionElement = document.querySelector('[data-community-write-action]')

let currentSession
let posts = []

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const getProfileName = (item) =>
  item?.profiles?.display_name ?? item?.profile?.display_name ?? 'in C 사용자'

const formatListDate = (value) =>
  new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium'
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

const renderAuthState = () => {
  const isSignedIn = Boolean(currentSession?.user)
  const canWrite = isSignedIn && isSupabaseConfigured && supabase

  if (!writeActionElement) {
    return
  }

  writeActionElement.replaceChildren()

  if (canWrite) {
    const link = document.createElement('a')
    link.className = 'button button--primary'
    link.href = './community-write.html'
    link.textContent = '글쓰기'
    writeActionElement.append(link)
    return
  }

  writeActionElement.append(
    createDisabledTooltip({
      buttonClass: 'button button--primary',
      label: '글쓰기',
      tooltip: '로그인하면 글을 쓸 수 있어요.'
    })
  )
}

const createPostSelect = () =>
  [
    'id',
    'author_user_id',
    'title',
    'body',
    'created_at',
    'updated_at',
    'profiles(display_name)'
  ].join(',')

const fetchPosts = async () => {
  if (!isSupabaseConfigured || !supabase) {
    posts = []
    renderPosts()
    setStatus('Supabase 환경 변수를 설정하면 Community 게시판을 불러옵니다.', 'error')
    return
  }

  setStatus('게시글을 불러오는 중입니다.')

  const query = supabase
    .from('community_posts')
    .select(createPostSelect())
    .eq('status', 'public')
    .order('created_at', { ascending: false })
    .limit(50)

  const { data, error } = await query

  if (error) {
    posts = []
    renderPosts()
    setStatus(getReadableErrorMessage(error), 'error')
    return
  }

  posts = data ?? []
  renderPosts()
  setStatus('')
}

const renderPosts = () => {
  if (!postsElement) {
    return
  }

  if (posts.length === 0) {
    postsElement.innerHTML = `
      <li class="community-post-empty">
        <p>아직 게시글이 없습니다.</p>
      </li>
    `
    return
  }

  postsElement.innerHTML = posts
    .map(
      (post) => {
        const postUrl = `./community-post.html?post=${encodeURIComponent(post.id)}`

        return `
        <li class="community-post-row" data-community-post-url="${postUrl}">
          <a class="community-post-row__title" href="${postUrl}">
            ${escapeHtml(post.title)}
          </a>
          <span class="community-post-row__author">${escapeHtml(getProfileName(post))}</span>
          <time class="community-post-row__date" datetime="${escapeHtml(post.created_at)}">
            ${escapeHtml(formatListDate(post.created_at))}
          </time>
        </li>
      `
      }
    )
    .join('')
}

const bindEvents = () => {
  postsElement?.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) {
      return
    }

    if (event.target.closest('a')) {
      return
    }

    const row = event.target.closest('[data-community-post-url]')

    if (row instanceof HTMLElement && row.dataset.communityPostUrl) {
      window.location.href = row.dataset.communityPostUrl
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
      renderAuthState()
    })
  }

  renderAuthState()
  await fetchPosts()
}

init()
