import {
  bindTrackedLinks,
  configureAnalytics,
  createReadCompletionTracker,
  trackEvent
} from './analytics.js'
import { columnMap, columns } from './columns-data.js'

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
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join('')}</ul>`
    : '<p>아직 연결된 항목이 없습니다.</p>'

const getMindMapLayout = () => {
  const groupPositions = [
    { x: 590, y: 96, direction: 'top' },
    { x: 934, y: 300, direction: 'right' },
    { x: 590, y: 504, direction: 'bottom' },
    { x: 246, y: 300, direction: 'left' }
  ]

  return columnMap.map((group, index) => {
    const position = groupPositions[index % groupPositions.length]
    const columnCount = group.columns.length
    const columnGap = 82

    return {
      ...group,
      ...position,
      columnPositions: group.columns.map((slug, columnIndex) => {
        const offset = (columnIndex - (columnCount - 1) / 2) * columnGap

        if (position.direction === 'top') {
          return { slug, x: position.x + offset, y: position.y - 70 }
        }

        if (position.direction === 'bottom') {
          return { slug, x: position.x + offset, y: position.y + 70 }
        }

        if (position.direction === 'left') {
          return { slug, x: position.x - 182, y: position.y + offset }
        }

        return { slug, x: position.x + 182, y: position.y + offset }
      })
    }
  })
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
    <aside class="related-panel" aria-label="관련 항목">
      <section>
        <h2>관련 작품</h2>
        ${createChipList(column.relatedWorks)}
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
      }" d="M590 300 C ${590} ${group.y}, ${group.x} ${300}, ${group.x} ${
        group.y
      }" />`

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
        }">
          <rect x="${group.x - 92}" y="${group.y - 32}" width="184" height="64" rx="12" />
          ${renderSvgText(group.title, group.x, group.y - 7, 'mind-map-title')}
          ${renderSvgText(group.description, group.x, group.y + 17, 'mind-map-note', 18)}
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
            <rect x="${position.x - 100}" y="${position.y - 28}" width="200" height="56" rx="11" />
            ${renderSvgText(column.title, position.x, position.y - 6, 'mind-map-column-title', 11)}
            <text class="mind-map-column-status" x="${position.x}" y="${position.y + 17}" text-anchor="middle" dominant-baseline="middle">${isPublished ? '공개' : '준비 중'}</text>
          </a>
        `
      })
    )
    .join('')

  map.innerHTML = `
    <svg class="mind-map-svg" viewBox="0 0 1180 600" role="img" aria-labelledby="mind-map-title mind-map-desc">
      <title id="mind-map-title">Columns 클래식 이해 마인드맵</title>
      <desc id="mind-map-desc">클래식 이해 지도에서 주제 갈래와 칼럼을 연결해 보여줍니다.</desc>
      <g class="mind-map-links">${links}</g>
      <g class="mind-map-center">
        <circle cx="590" cy="300" r="76" />
        <text x="590" y="290" text-anchor="middle" dominant-baseline="middle">클래식</text>
        <text x="590" y="314" text-anchor="middle" dominant-baseline="middle">이해 지도</text>
      </g>
      <g class="mind-map-groups">${groupNodes}</g>
      <g class="mind-map-columns">${columnNodes}</g>
    </svg>
  `
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

window.addEventListener('popstate', () => {
  selectColumn(getSelectedSlug())
})

bindTrackedLinks()
configureAnalytics()
selectColumn(getSelectedSlug())
