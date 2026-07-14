import { bindTrackedLinks, configureAnalytics, trackEvent } from './analytics.js'
import { columns } from './columns-data.js'
import { works } from './product-data.js'

const catalogUrl = new URL('./compositions-catalog.json', import.meta.url)
const columnsBySlug = new Map(columns.map((column) => [column.slug, column]))
const worksById = new Map(works.map((work) => [work.id, work]))

const statusLabels = {
  available: '공개됨',
  planned: '등록 예정'
}

let allCompositions = []
let selectedSlug = new URLSearchParams(window.location.search).get('score')
let activeTag = ''
let query = ''
let difficulty = ''

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const formatList = (items) =>
  items.length > 0
    ? items.map((item) => `<span>${escapeHtml(item)}</span>`).join('')
    : '<span>연결 전</span>'

const formatColumnLinks = (items) =>
  items.length > 0
    ? items
        .map(
          (item) => {
            const column = columnsBySlug.get(item)
            const label = column?.title ?? item
            const href = column ? `./columns/${column.slug}.html` : './columns.html'

            return `<a href="${href}" data-track-event="column_link" data-track-content-type="column" data-track-content-slug="${escapeHtml(
              item
            )}">${escapeHtml(label)}</a>`
          }
        )
        .join('')
    : '<span>연결 전</span>'

const getPublishedCompositions = () =>
  allCompositions.filter((composition) => composition.status === 'available')

const getFilteredCompositions = () => {
  const normalizedQuery = query.trim().toLowerCase()

  return getPublishedCompositions().filter((composition) => {
    const matchesQuery =
      !normalizedQuery ||
      [
        composition.title,
        composition.subtitle,
        composition.source,
        composition.key,
        composition.meter,
        ...(composition.tags ?? [])
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    const matchesDifficulty =
      !difficulty || composition.difficulty === difficulty
    const matchesTag = !activeTag || composition.tags?.includes(activeTag)

    return matchesQuery && matchesDifficulty && matchesTag
  })
}

const createDownloadAction = (label, url, type, composition, fileType) => {
  if (!url) {
    return `<button class="button button--secondary" type="button" disabled>${label} 준비 중</button>`
  }

  return `<a class="button ${
    type === 'primary' ? 'button--primary' : 'button--secondary'
  }" href="${url}" data-track-event="composition_download" data-track-content-type="composition" data-track-content-slug="${
    composition.slug
  }" data-track-file="${fileType}">${label}</a>`
}

const createChromaticsAction = (url, composition) => {
  if (!url) {
    return '<button class="button button--primary" type="button" disabled>Chromatics 열기 준비 중</button>'
  }

  return `<a class="button button--primary" href="${url}" data-track-event="open_in_chromatics" data-track-content-type="composition" data-track-content-slug="${composition.slug}" data-track-file="chromatics">Chromatics에서 열기</a>`
}

const createWorkLink = (workId) => {
  const work = worksById.get(workId)

  if (!work) {
    return '<span>연결 전</span>'
  }

  return `<a href="./works.html?work=${encodeURIComponent(
    work.slug
  )}" data-track-event="work_link" data-track-content-type="work" data-track-content-slug="${escapeHtml(
    work.slug
  )}">${escapeHtml(work.title)}</a>`
}

const renderFilters = () => {
  const difficultySelect = document.querySelector('[data-composition-difficulty]')
  const tagContainer = document.querySelector('[data-composition-tags]')

  if (difficultySelect) {
    const difficulties = [...new Set(getPublishedCompositions().map((item) => item.difficulty))]
    difficultySelect.innerHTML = [
      '<option value="">전체</option>',
      ...difficulties.map(
        (item) =>
          `<option value="${escapeHtml(item)}" ${
            item === difficulty ? 'selected' : ''
          }>${escapeHtml(item)}</option>`
      )
    ].join('')
  }

  if (tagContainer) {
    const tags = [...new Set(getPublishedCompositions().flatMap((item) => item.tags ?? []))]
    tagContainer.innerHTML = [
      `<button type="button" class="${
        activeTag ? '' : 'is-active'
      }" data-composition-tag="">전체</button>`,
      ...tags.map(
        (tag) =>
          `<button type="button" class="${
            tag === activeTag ? 'is-active' : ''
          }" data-composition-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`
      )
    ].join('')
  }
}

const renderCompositionDetail = (composition) => {
  const detail = document.querySelector('[data-composition-detail]')

  if (!detail || !composition) {
    return
  }

  document.title = `${composition.title} | in C Compositions`

  detail.innerHTML = `
    <article class="composition-detail-card">
      <div>
        <p class="eyebrow">${escapeHtml(statusLabels[composition.status] ?? composition.status)}</p>
        <h2>${escapeHtml(composition.title)}</h2>
        <p>${escapeHtml(composition.subtitle)}</p>
      </div>
      <dl class="composition-facts">
        <div><dt>난이도</dt><dd>${escapeHtml(composition.difficulty)}</dd></div>
        <div><dt>조성</dt><dd>${escapeHtml(composition.key)}</dd></div>
        <div><dt>박자</dt><dd>${escapeHtml(composition.meter)}</dd></div>
        <div><dt>출처</dt><dd>${escapeHtml(composition.source)}</dd></div>
      </dl>
      <div class="composition-actions" aria-label="악보 열기와 다운로드">
        ${createChromaticsAction(composition.assets.chromatics, composition)}
        ${createDownloadAction('MusicXML 다운로드', composition.assets.musicxml, 'secondary', composition, 'musicxml')}
      </div>
      <p class="composition-action-note">브라우저가 MusicXML을 내려받으면 Chromatics 앱에서 파일을 열어 주세요. PDF가 필요하면 Chromatics에서 변환합니다.</p>
      <section class="composition-note" aria-labelledby="work-title">
        <h3 id="work-title">작품 허브</h3>
        <div class="tag-list">${createWorkLink(composition.workId)}</div>
      </section>
      <section class="composition-note" aria-labelledby="copyright-title">
        <h3 id="copyright-title">저작권/출처 확인 메모</h3>
        <p>${escapeHtml(composition.copyrightNote)}</p>
      </section>
      <section class="composition-note" aria-labelledby="column-title">
        <h3 id="column-title">관련 Columns</h3>
        <div class="tag-list">${formatColumnLinks(composition.relatedColumns)}</div>
      </section>
    </article>
  `

  trackEvent('composition_view', {
    content_type: 'composition',
    content_slug: composition.slug,
    content_title: composition.title,
    difficulty: composition.difficulty,
    key: composition.key,
    meter: composition.meter
  })
}

const renderCompositionList = (compositions) => {
  const list = document.querySelector('[data-composition-list]')

  if (!list) {
    return
  }

  if (compositions.length === 0) {
    list.innerHTML = '<p class="empty-state">조건에 맞는 공개 악보가 없습니다.</p>'
    return
  }

  list.replaceChildren(
    ...compositions.map((composition) => {
      const card = document.createElement('article')
      card.className = [
        'composition-card',
        composition.slug === selectedSlug ? 'is-active' : ''
      ]
        .filter(Boolean)
        .join(' ')
      card.innerHTML = `
        <div class="composition-card__head">
          <div>
            <p class="eyebrow">${escapeHtml(statusLabels[composition.status] ?? composition.status)}</p>
            <h3>${escapeHtml(composition.title)}</h3>
            <p>${escapeHtml(composition.subtitle)}</p>
          </div>
          <span>${escapeHtml(composition.difficulty)}</span>
        </div>
        <dl class="composition-card__facts">
          <div><dt>조성</dt><dd>${escapeHtml(composition.key)}</dd></div>
          <div><dt>박자</dt><dd>${escapeHtml(composition.meter)}</dd></div>
        </dl>
        <div class="tag-list">${formatList(composition.tags)}</div>
        <a class="button button--secondary" href="?score=${encodeURIComponent(
          composition.slug
        )}" data-composition-select="${escapeHtml(
          composition.slug
        )}" data-track-event="composition_select" data-track-content-type="composition" data-track-content-slug="${escapeHtml(
          composition.slug
        )}">상세 보기</a>
      `
      return card
    })
  )
}

const selectComposition = (slug, { pushState = false } = {}) => {
  const published = getPublishedCompositions()
  const fallback = getFilteredCompositions()[0] ?? published[0]
  const composition = published.find((item) => item.slug === slug) ?? fallback

  if (!composition) {
    return
  }

  selectedSlug = composition.slug

  if (pushState) {
    const nextUrl = new URL(window.location.href)
    nextUrl.searchParams.set('score', composition.slug)
    window.history.pushState({ score: composition.slug }, '', nextUrl)
  }

  renderCompositionList(getFilteredCompositions())
  renderCompositionDetail(composition)
}

const render = () => {
  renderFilters()
  const filtered = getFilteredCompositions()

  if (!filtered.some((composition) => composition.slug === selectedSlug)) {
    selectedSlug = filtered[0]?.slug ?? getPublishedCompositions()[0]?.slug
  }

  renderCompositionList(filtered)
  selectComposition(selectedSlug)
}

const bindFilters = () => {
  const queryInput = document.querySelector('[data-composition-query]')
  const difficultySelect = document.querySelector('[data-composition-difficulty]')

  queryInput?.addEventListener('input', (event) => {
    query = event.target.value
    render()
  })

  difficultySelect?.addEventListener('change', (event) => {
    difficulty = event.target.value
    render()
  })

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) {
      return
    }

    const tagButton = event.target.closest('[data-composition-tag]')

    if (tagButton) {
      activeTag = tagButton.dataset.compositionTag ?? ''
      render()
      return
    }

    const selectLink = event.target.closest('[data-composition-select]')

    if (!selectLink) {
      return
    }

    event.preventDefault()
    selectComposition(selectLink.dataset.compositionSelect, { pushState: true })
  })
}

const init = async () => {
  bindTrackedLinks()
  configureAnalytics()
  bindFilters()

  const response = await fetch(catalogUrl)
  const catalog = await response.json()
  allCompositions = catalog.compositions ?? []

  render()
}

window.addEventListener('popstate', () => {
  selectedSlug = new URLSearchParams(window.location.search).get('score')
  selectComposition(selectedSlug)
})

init().catch(() => {
  const list = document.querySelector('[data-composition-list]')
  if (list) {
    list.innerHTML = '<p>악보 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>'
  }
})
