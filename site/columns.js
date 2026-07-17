import {
  bindTrackedLinks,
  configureAnalytics,
  createReadCompletionTracker,
  trackEvent
} from './analytics.js'
import { columnMap, columns } from './columns-data.js'
import { works } from './product-data.js'

const publishedColumns = columns.filter((column) => column.status === 'public')
const articleBySlug = new Map(publishedColumns.map((column) => [column.slug, column]))
const workByTitle = new Map(works.map((work) => [work.title, work]))
const trackReadCompletion = createReadCompletionTracker()
const mapCenter = { x: 680, y: 360 }
const mapZoomStep = 0.16
const mapScaleBounds = { min: 0.72, max: 1.55 }
let mapScale = 1
let mapPan = { x: 0, y: 0 }
let mapDrag = null

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

const renderMarkdown = (markdown) => {
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
        .map((item) => {
          const work = workByTitle.get(item)

          if (!work) {
            return `<li>${escapeHtml(item)}</li>`
          }

          return `<li><a href="./compositions.html?work=${encodeURIComponent(
            work.slug
          )}" data-track-event="work_link" data-track-content-type="work" data-track-content-slug="${escapeHtml(
            work.slug
          )}">${escapeHtml(item)}</a></li>`
        })
        .join('')}</ul>`
    : '<p>아직 연결된 항목이 없습니다.</p>'

const createCompositionChipList = (items = []) =>
  items.length > 0
    ? `<ul class="chip-list">${items
        .map(
          (item) =>
            `<li><a href="./compositions.html?score=${encodeURIComponent(
              item.slug
            )}" data-track-event="composition_select" data-track-content-type="composition" data-track-content-slug="${escapeHtml(
              item.slug
            )}">${escapeHtml(item.title)}</a></li>`
        )
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

const getMindMapLayout = () => {
  const groupPositions = [
    { x: 680, y: 104, direction: 'top' },
    { x: 1110, y: 360, direction: 'right' },
    { x: 680, y: 616, direction: 'bottom' },
    { x: 250, y: 360, direction: 'left' }
  ]

  return columnMap.map((group, index) => {
    const position = groupPositions[index % groupPositions.length]
    const columnCount = group.columns.length
    const columnGap = 132

    return {
      ...group,
      ...position,
      columnPositions: group.columns.map((slug, columnIndex) => {
        const offset = (columnIndex - (columnCount - 1) / 2) * columnGap

        if (position.direction === 'top') {
          return { slug, x: position.x + offset, y: position.y - 92 }
        }

        if (position.direction === 'bottom') {
          return { slug, x: position.x + offset, y: position.y + 92 }
        }

        if (position.direction === 'left') {
          return { slug, x: position.x - 236, y: position.y + offset }
        }

        return { slug, x: position.x + 236, y: position.y + offset }
      })
    }
  })
}

const getMapTransform = () =>
  `translate(${mapPan.x} ${mapPan.y}) scale(${mapScale})`

const applyMapTransform = () => {
  const viewport = document.querySelector('[data-map-viewport]')

  if (viewport) {
    viewport.setAttribute('transform', getMapTransform())
  }
}

const setMapScale = (nextScale) => {
  mapScale = Math.min(
    mapScaleBounds.max,
    Math.max(mapScaleBounds.min, Number(nextScale.toFixed(2)))
  )
  applyMapTransform()
}

const resetMapView = () => {
  mapScale = 1
  mapPan = { x: 0, y: 0 }
  applyMapTransform()
}

const getTextLines = (text, maxLength = 13) => {
  const words = text.split(' ')
  const lines = []
  let current = ''

  for (const word of words) {
    if (!current) {
      current = word
      continue
    }

    if (`${current} ${word}`.length <= maxLength) {
      current = `${current} ${word}`
      continue
    }

    lines.push(current)
    current = word
  }

  if (current) {
    lines.push(current)
  }

  return lines.flatMap((line) => {
    if (line.length <= maxLength) {
      return [line]
    }

    const chunks = []

    for (let index = 0; index < line.length; index += maxLength) {
      chunks.push(line.slice(index, index + maxLength))
    }

    return chunks
  })
}

const renderSvgText = (text, x, y, className, maxLength = 13) =>
  getTextLines(text, maxLength)
    .slice(0, 3)
    .map(
      (line, index, lines) =>
        `<text class="${className}" x="${x}" y="${
          y + (index - (lines.length - 1) / 2) * 16
        }" text-anchor="middle" dominant-baseline="middle">${escapeHtml(
          line
        )}</text>`
    )
    .join('')

const renderArticle = (column) => {
  const article = document.querySelector('[data-column-article]')

  if (!article) {
    return
  }

  article.innerHTML = `
    <header class="column-article__header">
      <p class="eyebrow">${escapeHtml(column.category)}</p>
      <h1>${escapeHtml(column.title)}</h1>
      <p class="column-article__summary">${escapeHtml(column.summary)}</p>
      <dl class="column-meta">
        <div><dt>상태</dt><dd>공개</dd></div>
        <div><dt>읽는 시간</dt><dd>${column.readingMinutes}분</dd></div>
        <div><dt>게시일</dt><dd>${column.publishedAt}</dd></div>
      </dl>
      <ul class="tag-list" aria-label="태그">
        ${column.tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join('')}
      </ul>
    </header>
    <div class="markdown-body">
      ${renderMarkdown(column.body)}
    </div>
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

const renderMap = (selectedSlug) => {
  const map = document.querySelector('[data-column-map]')

  if (!map) {
    return
  }

  const groups = getMindMapLayout()
  const links = groups
    .map((group) => {
      const isActive = group.columns.includes(selectedSlug)
      const groupLink = `<path class="mind-map-link ${
        isActive ? 'is-active' : ''
      }" d="M${mapCenter.x} ${mapCenter.y} C ${mapCenter.x} ${group.y}, ${
        group.x
      } ${mapCenter.y}, ${group.x} ${group.y}" />`

      const columnLinks = group.columnPositions
        .map(
          (position) =>
            `<path class="mind-map-link mind-map-link--thin ${
              position.slug === selectedSlug ? 'is-active' : ''
            }" d="M${group.x} ${group.y} C ${group.x} ${position.y}, ${
              position.x
            } ${group.y}, ${position.x} ${position.y}" />`
        )
        .join('')

      return `${groupLink}${columnLinks}`
    })
    .join('')

  const groupNodes = groups
    .map(
      (group) => `
        <g class="mind-map-group ${
          group.columns.includes(selectedSlug) ? 'is-active' : ''
        } mind-map-group--${group.id}">
          <rect x="${group.x - 112}" y="${group.y - 38}" width="224" height="76" rx="13" />
          ${renderSvgText(group.title, group.x, group.y - 7, 'mind-map-title')}
          ${renderSvgText(group.description, group.x, group.y + 18, 'mind-map-note', 20)}
        </g>
      `
    )
    .join('')

  const columnNodes = groups
    .flatMap((group) =>
      group.columnPositions.map((position) => {
        const column = columns.find((item) => item.slug === position.slug)

        if (!column) {
          return ''
        }

        const isPublished = column.status === 'public'
        const isActive = column.slug === selectedSlug
        const href = isPublished ? getColumnUrl(column.slug) : '#'
        const className = [
          'mind-map-column',
          isActive ? 'is-active' : '',
          isPublished ? '' : 'is-private'
        ]
          .filter(Boolean)
          .join(' ')

        return `
          <a class="${className}" href="${href}" data-column-link="${column.slug}" aria-label="${escapeHtml(column.title)}" aria-disabled="${String(!isPublished)}">
            <rect x="${position.x - 116}" y="${position.y - 31}" width="232" height="62" rx="31" />
            ${renderSvgText(column.title, position.x, position.y - 7, 'mind-map-column-title', 12)}
            <text class="mind-map-column-status" x="${position.x}" y="${position.y + 17}" text-anchor="middle" dominant-baseline="middle">${isPublished ? '공개' : '준비 중'}</text>
          </a>
        `
      })
    )
    .join('')

  map.innerHTML = `
    <div class="mind-map-toolbar" aria-label="지도 보기 조절">
      <button type="button" data-map-action="zoom-out" aria-label="축소">−</button>
      <button type="button" data-map-action="reset" aria-label="초기화">1:1</button>
      <button type="button" data-map-action="zoom-in" aria-label="확대">+</button>
    </div>
    <svg class="mind-map-svg" viewBox="0 0 1360 720" role="img" aria-labelledby="mind-map-title mind-map-desc">
      <title id="mind-map-title">Columns 클래식 이해 마인드맵</title>
      <desc id="mind-map-desc">클래식 이해 지도에서 주제 갈래와 칼럼을 연결해 보여줍니다.</desc>
      <g data-map-viewport class="mind-map-viewport" transform="${getMapTransform()}">
        <g class="mind-map-links">${links}</g>
        <g class="mind-map-center">
          <circle cx="${mapCenter.x}" cy="${mapCenter.y}" r="82" />
          <text x="${mapCenter.x}" y="${mapCenter.y - 11}" text-anchor="middle" dominant-baseline="middle">클래식</text>
          <text x="${mapCenter.x}" y="${mapCenter.y + 15}" text-anchor="middle" dominant-baseline="middle">이해 지도</text>
        </g>
        <g class="mind-map-groups">${groupNodes}</g>
        <g class="mind-map-columns">${columnNodes}</g>
      </g>
    </svg>
  `
}

document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) {
    return
  }

  const control = event.target.closest('[data-map-action]')

  if (!control) {
    return
  }

  const action = control.dataset.mapAction

  if (action === 'zoom-in') {
    setMapScale(mapScale + mapZoomStep)
  }

  if (action === 'zoom-out') {
    setMapScale(mapScale - mapZoomStep)
  }

  if (action === 'reset') {
    resetMapView()
  }
})

document.addEventListener('pointerdown', (event) => {
  if (!(event.target instanceof Element)) {
    return
  }

  const svg = event.target.closest('.mind-map-svg')

  if (!svg || event.target.closest('[data-column-link]')) {
    return
  }

  mapDrag = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    startPan: { ...mapPan }
  }
  svg.setPointerCapture(event.pointerId)
  svg.classList.add('is-dragging')
})

document.addEventListener('pointermove', (event) => {
  if (!mapDrag || mapDrag.pointerId !== event.pointerId) {
    return
  }

  mapPan = {
    x: mapDrag.startPan.x + (event.clientX - mapDrag.x) / mapScale,
    y: mapDrag.startPan.y + (event.clientY - mapDrag.y) / mapScale
  }
  applyMapTransform()
})

document.addEventListener('pointerup', (event) => {
  if (!mapDrag || mapDrag.pointerId !== event.pointerId) {
    return
  }

  document.querySelector('.mind-map-svg')?.classList.remove('is-dragging')
  mapDrag = null
})

document.addEventListener('pointercancel', () => {
  document.querySelector('.mind-map-svg')?.classList.remove('is-dragging')
  mapDrag = null
})

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
            <span>${escapeHtml(column.category)}</span>
            <strong>${escapeHtml(column.title)}</strong>
            <small>${column.readingMinutes}분 · ${column.tags.map(escapeHtml).join(', ')}</small>
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
  renderMap(column.slug)
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

bindTrackedLinks()
configureAnalytics()
selectColumn(getSelectedSlug())
