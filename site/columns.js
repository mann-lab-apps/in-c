import {
  bindTrackedLinks,
  configureAnalytics,
  createReadCompletionTracker,
  trackEvent
} from './analytics.js'
import { initAuthNavigation } from './auth-nav.js'
import { columns } from './columns-data.js'
import { initGlobalBanner } from './global-banner.js'

const publishedColumns = columns.filter((column) => column.status === 'public')
const articleBySlug = new Map(publishedColumns.map((column) => [column.slug, column]))
const trackReadCompletion = createReadCompletionTracker()

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const renderInlineMarkdown = (value) =>
  escapeHtml(value).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

const getColumnUrl = (slug) => `./columns/${slug}.html`

const normalizeAssetSrc = (src, assetPrefix) => {
  if (/^(?:https?:)?\/\//.test(src) || src.startsWith('/') || src.startsWith('.')) {
    return src
  }

  return `${assetPrefix}${src}`
}

const renderFigureMarkdown = (line, assetPrefix) => {
  const match = /^!\[(?<alt>.*?)\]\((?<src>\S+)(?:\s+"(?<caption>.*?)")?\)$/.exec(
    line
  )

  if (!match?.groups) {
    return undefined
  }

  const { alt, src } = match.groups
  const safeAlt = escapeHtml(alt)
  const safeSrc = escapeHtml(normalizeAssetSrc(src, assetPrefix))

  return `
    <figure class="column-figure">
      <img src="${safeSrc}" alt="${safeAlt}" loading="lazy" />
    </figure>
  `
}

const renderMarkdown = (markdown, { assetPrefix = './' } = {}) => {
  const blocks = []
  const lines = markdown.trim().split('\n')
  let paragraph = []
  let list = []

  const flushParagraph = () => {
    if (paragraph.length === 0) {
      return
    }

    blocks.push(`<p>${renderInlineMarkdown(paragraph.join(' '))}</p>`)
    paragraph = []
  }

  const flushList = () => {
    if (list.length === 0) {
      return
    }

    blocks.push(
      `<ul>${list
        .map((item) => `<li>${renderInlineMarkdown(item)}</li>`)
        .join('')}</ul>`
    )
    list = []
  }

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) {
      flushParagraph()
      flushList()
      continue
    }

    const figure = renderFigureMarkdown(trimmed, assetPrefix)

    if (figure) {
      flushParagraph()
      flushList()
      blocks.push(figure)
      continue
    }

    if (trimmed.startsWith('## ')) {
      flushParagraph()
      flushList()
      blocks.push(`<h2>${escapeHtml(trimmed.slice(3))}</h2>`)
      continue
    }

    if (trimmed.startsWith('- ')) {
      flushParagraph()
      list.push(trimmed.slice(2))
      continue
    }

    paragraph.push(trimmed)
  }

  flushParagraph()
  flushList()

  return blocks.join('')
}

const setMeta = (column) => {
  document.title = `${column.title} | Columns | in C`

  const description = document.querySelector('meta[name="description"]')
  const ogTitle = document.querySelector('meta[property="og:title"]')
  const ogDescription = document.querySelector('meta[property="og:description"]')

  if (description) {
    description.content = column.summary
  }

  if (ogTitle) {
    ogTitle.content = `${column.title} | Columns`
  }

  if (ogDescription) {
    ogDescription.content = column.summary
  }
}

const getSelectedSlug = () => {
  const params = new URLSearchParams(window.location.search)
  const fromQuery = params.get('column')

  if (fromQuery && articleBySlug.has(fromQuery)) {
    return fromQuery
  }

  return publishedColumns[0]?.slug
}

const createChipList = (items) =>
  items.length > 0
    ? `<ul class="chip-list">${items
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join('')}</ul>`
    : '<p>아직 연결된 항목이 없습니다.</p>'

const createCompositionChipList = (items = []) =>
  items.length > 0
    ? `<ul class="chip-list">${items
        .map((item) => `<li>${escapeHtml(item.title)}</li>`)
        .join('')}</ul>`
    : '<p>아직 연결된 항목이 없습니다.</p>'

const feedbackOptions = [
  { value: 'heard_something', label: '오늘 들을 지점이 생겼어요' },
  { value: 'still_confusing', label: '아직 어렵게 느껴져요' },
  { value: 'want_next_question', label: '다음 질문이 궁금해요' }
]

const renderFeedbackPanel = (column) => `
  <section class="feedback-panel" data-feedback-panel="${escapeHtml(
    column.slug
  )}" aria-label="칼럼 피드백">
    <div>
      <p class="eyebrow">Feedback</p>
      <h2>이 글이 듣는 데 도움이 되었나요?</h2>
      <p>개인정보 없이 짧은 응답만 남깁니다.</p>
    </div>
    <button class="button button--secondary" data-feedback-open="${escapeHtml(
      column.slug
    )}" type="button">답하기</button>
  </section>
`

const renderFeedbackForm = (panel, column) => {
  panel.innerHTML = `
    <form class="feedback-form" data-feedback-form="${escapeHtml(column.slug)}">
      <div>
        <p class="eyebrow">Feedback</p>
        <h2>하나만 골라 주세요</h2>
      </div>
      <div class="feedback-options">
        ${feedbackOptions
          .map(
            (option, index) => `
              <label>
                <input ${
                  index === 0 ? 'checked' : ''
                } name="feedback" type="radio" value="${escapeHtml(option.value)}" />
                <span>${escapeHtml(option.label)}</span>
              </label>
            `
          )
          .join('')}
      </div>
      <button class="button button--primary" type="submit">보내기</button>
    </form>
  `
}

const renderFeedbackThanks = (panel) => {
  panel.innerHTML = `
    <div class="feedback-thanks" role="status">
      <p class="eyebrow">Feedback</p>
      <h2>고맙습니다</h2>
      <p>다음 Columns 질문을 정할 때 함께 보겠습니다.</p>
    </div>
  `
}

const renderArticle = (column) => {
  const article = document.querySelector('[data-column-article]')

  if (!article) {
    return
  }

  const articleBody = `
    <div class="markdown-body">
      ${renderMarkdown(column.body)}
    </div>
  `

  article.innerHTML = article.hasAttribute('data-column-body-only')
    ? articleBody
    : `
      <header class="column-article__header">
        <p class="eyebrow">${escapeHtml(column.category)}</p>
        <h1>${escapeHtml(column.title)}</h1>
        <p class="column-article__summary">${escapeHtml(column.summary)}</p>
        <p class="column-published">게시일 ${escapeHtml(column.publishedAt)}</p>
        <ul class="tag-list" aria-label="태그">
          ${column.tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join('')}
        </ul>
      </header>
      ${articleBody}
      ${renderFeedbackPanel(column)}
      <aside class="related-panel" aria-label="관련 항목">
        <section>
          <h2>관련 작품</h2>
          ${createChipList(column.relatedWorks)}
        </section>
        <section>
          <h2>관련 악보</h2>
          ${createCompositionChipList(column.relatedCompositions)}
        </section>
        <section>
          <h2>관련 작곡가</h2>
          ${createChipList(column.relatedComposers)}
        </section>
        <section>
          <h2>관련 공연</h2>
          ${createChipList(column.relatedPerformances)}
        </section>
      </aside>
    `

  trackReadCompletion(`column:${column.slug}`, article, 'column_read_complete', {
    content_type: 'column',
    content_slug: column.slug,
    content_title: column.title,
    category: column.category,
    reading_minutes: column.readingMinutes
  })
}

const renderList = (selectedSlug) => {
  const list = document.querySelector('[data-column-list]')

  if (!list) {
    return
  }

  list.innerHTML = publishedColumns
    .map(
      (column) => `
        <li>
          <a class="column-list-item ${column.slug === selectedSlug ? 'is-active' : ''}" href="${getColumnUrl(column.slug)}" data-column-link="${column.slug}">
            <strong>${escapeHtml(column.title)}</strong>
            <small>${escapeHtml(column.summary)}</small>
          </a>
        </li>
      `
    )
    .join('')
}

const selectColumn = (slug, { pushState = false } = {}) => {
  const column = articleBySlug.get(slug) ?? publishedColumns[0]

  if (!column) {
    return
  }

  if (pushState) {
    const nextUrl = new URL(window.location.href)
    nextUrl.searchParams.set('column', column.slug)
    window.history.pushState({ column: column.slug }, '', nextUrl)
  }

  setMeta(column)
  renderList(column.slug)
  renderArticle(column)
  trackEvent('column_view', {
    content_type: 'column',
    content_slug: column.slug,
    content_title: column.title,
    category: column.category,
    reading_minutes: column.readingMinutes
  })
}

document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) {
    return
  }

  const feedbackButton = event.target.closest('[data-feedback-open]')

  if (feedbackButton) {
    const slug = feedbackButton.dataset.feedbackOpen
    const column = slug ? articleBySlug.get(slug) : undefined
    const panel = slug
      ? document.querySelector(`[data-feedback-panel="${CSS.escape(slug)}"]`)
      : null

    if (column && panel) {
      renderFeedbackForm(panel, column)
      trackEvent('feedback_open', {
        content_type: 'column',
        content_slug: column.slug,
        content_title: column.title,
        location: 'column_article'
      })
    }

    return
  }

  const link = event.target.closest('[data-column-link]')

  if (!link) {
    return
  }

  const slug = link.dataset.columnLink

  if (!slug || !articleBySlug.has(slug)) {
    event.preventDefault()
    return
  }

  event.preventDefault()
  selectColumn(slug, { pushState: true })
})

document.addEventListener('submit', (event) => {
  const form = event.target

  if (!(form instanceof HTMLFormElement) || !form.matches('[data-feedback-form]')) {
    return
  }

  event.preventDefault()

  const slug = form.dataset.feedbackForm
  const column = slug ? articleBySlug.get(slug) : undefined
  const panel = slug
    ? document.querySelector(`[data-feedback-panel="${CSS.escape(slug)}"]`)
    : null
  const formData = new FormData(form)
  const answer = String(formData.get('feedback') ?? '')

  if (!column || !panel || !answer) {
    return
  }

  trackEvent('feedback_submit', {
    content_type: 'column',
    content_slug: column.slug,
    content_title: column.title,
    answer,
    location: 'column_article'
  })
  renderFeedbackThanks(panel)
})

window.addEventListener('popstate', () => {
  selectColumn(getSelectedSlug())
})

initGlobalBanner()
bindTrackedLinks()
configureAnalytics()
initAuthNavigation()
selectColumn(getSelectedSlug())
