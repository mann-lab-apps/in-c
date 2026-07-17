import { bindTrackedLinks, configureAnalytics, trackEvent } from './analytics.js'
import { columns } from './columns-data.js'
import compositionCatalog from './compositions-catalog.json'
import { classes, creators, works } from './product-data.js'

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const compositions = compositionCatalog.compositions ?? []
const worksById = new Map(works.map((work) => [work.id, work]))
const creatorsById = new Map(creators.map((creator) => [creator.id, creator]))
const columnsBySlug = new Map(columns.map((column) => [column.slug, column]))
const compositionsBySlug = new Map(compositions.map((composition) => [composition.slug, composition]))

const link = (href, label, eventName, extra = '') =>
  `<a href="${href}" data-track-event="${eventName}" ${extra}>${escapeHtml(label)}</a>`

const empty = '<span>연결 전</span>'

const chipList = (items) =>
  items.length > 0 ? `<div class="tag-list">${items.join('')}</div>` : `<div class="tag-list">${empty}</div>`

const renderColumnChips = (slugs) =>
  chipList(
    slugs
      .map((slug) => columnsBySlug.get(slug))
      .filter(Boolean)
      .map((column) =>
        link(
          `./columns/${column.slug}.html`,
          column.title,
          'column_link',
          `data-track-content-type="column" data-track-content-slug="${escapeHtml(column.slug)}"`
        )
      )
  )

const renderWorkChips = (ids) =>
  chipList(
    ids
      .map((id) => worksById.get(id))
      .filter(Boolean)
      .map((work) =>
        link(
          `./compositions.html?work=${work.slug}`,
          work.title,
          'work_link',
          `data-track-content-type="work" data-track-content-slug="${escapeHtml(work.slug)}"`
        )
      )
  )

const renderCreatorChips = (ids) =>
  chipList(
    ids
      .map((id) => creatorsById.get(id))
      .filter(Boolean)
      .map((creator) => `<span>${escapeHtml(creator.displayName)}</span>`)
  )

const renderScoreChips = (slugs) =>
  chipList(
    slugs
      .map((slug) => compositionsBySlug.get(slug))
      .filter(Boolean)
      .map((composition) =>
        link(
          `./compositions.html?score=${composition.slug}`,
          composition.title,
          'composition_select',
          `data-track-content-type="composition" data-track-content-slug="${escapeHtml(composition.slug)}"`
        )
      )
  )

const renderList = (container, items, selectedSlug, paramName, titleKey) => {
  container.innerHTML = items
    .map(
      (item) => `
        <article class="product-card ${item.slug === selectedSlug ? 'is-active' : ''}">
          <div>
            <p class="eyebrow">${escapeHtml(item[titleKey] ?? item.title)}</p>
            <h3>${escapeHtml(item.title ?? item.displayName)}</h3>
            <p>${escapeHtml(item.summary)}</p>
          </div>
          <a class="button button--secondary" href="?${paramName}=${encodeURIComponent(item.slug)}" data-product-select="${escapeHtml(item.slug)}">상세 보기</a>
        </article>
      `
    )
    .join('')
}

const setDetail = (item, type, title, eventName) => {
  document.title = `${title} | in C`
  trackEvent(eventName, {
    content_type: type,
    content_slug: item.slug,
    content_title: item.title ?? item.displayName
  })
}

const renderClassDetail = (classItem) => {
  const detail = document.querySelector('[data-product-detail]')
  if (!detail) return

  setDetail(classItem, 'community_class', classItem.title, 'community_view')
  detail.innerHTML = `
    <article class="product-detail-card">
      <header>
        <p class="eyebrow">Community</p>
        <h2>${escapeHtml(classItem.title)}</h2>
        <p>${escapeHtml(classItem.summary)}</p>
      </header>
      <dl class="composition-facts">
        <div><dt>유형</dt><dd>${escapeHtml(classItem.type)}</dd></div>
        <div><dt>형식</dt><dd>${escapeHtml(classItem.format)}</dd></div>
        <div><dt>수준</dt><dd>${escapeHtml(classItem.level)}</dd></div>
      </dl>
      <section class="composition-note">
        <h3>학습/클래스 후보</h3>
        <ul class="limit-list">
          ${classItem.outline.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </section>
      <section class="composition-note"><h3>관련 인물</h3>${renderCreatorChips(classItem.creators)}</section>
      <section class="composition-note"><h3>관련 작품</h3>${renderWorkChips(classItem.works)}</section>
      <section class="composition-note"><h3>관련 Columns</h3>${renderColumnChips(classItem.columns)}</section>
    </article>
  `
}

const pageConfig = {
  community: {
    items: classes,
    param: 'class',
    select: (slug) => classes.find((item) => item.slug === slug) ?? classes[0],
    renderDetail: renderClassDetail,
    labelKey: 'type'
  }
}

const init = () => {
  bindTrackedLinks()
  configureAnalytics()

  const pageType = document.body.dataset.productPage
  const config = pageConfig[pageType]
  const list = document.querySelector('[data-product-list]')
  if (!config || !list) return

  const select = (slug, { pushState = false } = {}) => {
    const item = config.select(slug)
    if (!item) return

    if (pushState) {
      const nextUrl = new URL(window.location.href)
      nextUrl.searchParams.set(config.param, item.slug)
      window.history.pushState({ [config.param]: item.slug }, '', nextUrl)
    }

    renderList(list, config.items, item.slug, config.param, config.labelKey)
    config.renderDetail(item)
  }

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return

    const link = event.target.closest('[data-product-select]')
    if (!link) return

    event.preventDefault()
    select(link.dataset.productSelect, { pushState: true })
  })

  window.addEventListener('popstate', () => {
    select(new URLSearchParams(window.location.search).get(config.param))
  })

  select(new URLSearchParams(window.location.search).get(config.param))
}

init()
