import { bindTrackedLinks, configureAnalytics, trackEvent } from './analytics.js'
import { columns } from './columns-data.js'
import compositionCatalog from './compositions-catalog.json'
import { classes, concerts, creators, works } from './product-data.js'

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
const concertsById = new Map(concerts.map((concert) => [concert.id, concert]))
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
          `./works.html?work=${work.slug}`,
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
      .map((creator) =>
        link(
          `./creators.html?creator=${creator.slug}`,
          creator.displayName,
          'creator_link',
          `data-track-content-type="creator" data-track-content-slug="${escapeHtml(creator.slug)}"`
        )
      )
  )

const renderConcertChips = (ids) =>
  chipList(
    ids
      .map((id) => concertsById.get(id))
      .filter(Boolean)
      .map((concert) =>
        link(
          `./concerts.html?concert=${concert.slug}`,
          concert.title,
          'concert_link',
          `data-track-content-type="concert" data-track-content-slug="${escapeHtml(concert.slug)}"`
        )
      )
  )

const renderClassChips = (ids) =>
  chipList(
    ids
      .map((id) => classes.find((classItem) => classItem.id === id))
      .filter(Boolean)
      .map((classItem) =>
        link(
          `./classes.html?class=${classItem.slug}`,
          classItem.title,
          'class_link',
          `data-track-content-type="class" data-track-content-slug="${escapeHtml(classItem.slug)}"`
        )
      )
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

const renderWorkDetail = (work) => {
  const detail = document.querySelector('[data-product-detail]')
  if (!detail) return

  setDetail(work, 'work', work.title, 'work_view')
  detail.innerHTML = `
    <article class="product-detail-card">
      <header>
        <p class="eyebrow">Work</p>
        <h2>${escapeHtml(work.title)}</h2>
        <p>${escapeHtml(work.summary)}</p>
      </header>
      <dl class="composition-facts">
        <div><dt>원어/출처명</dt><dd>${escapeHtml(work.originalTitle)}</dd></div>
        <div><dt>시대</dt><dd>${escapeHtml(work.era)}</dd></div>
        <div><dt>장르</dt><dd>${escapeHtml(work.genre)}</dd></div>
        <div><dt>권리 상태</dt><dd>${escapeHtml(work.copyrightStatus)}</dd></div>
      </dl>
      <section class="composition-note"><h3>오늘 들을 지점</h3><p>${escapeHtml(work.listeningPoint)}</p></section>
      <section class="composition-note"><h3>악보</h3>${renderScoreChips(work.scores)}</section>
      <section class="composition-note"><h3>Columns</h3>${renderColumnChips(work.columns)}</section>
      <section class="composition-note"><h3>Creators</h3>${renderCreatorChips(work.creators)}</section>
      <section class="composition-note"><h3>Concerts</h3>${renderConcertChips(work.concerts)}</section>
    </article>
  `
}

const renderCreatorDetail = (creator) => {
  const detail = document.querySelector('[data-product-detail]')
  if (!detail) return

  setDetail(creator, 'creator', creator.displayName, 'creator_view')
  detail.innerHTML = `
    <article class="product-detail-card">
      <header>
        <p class="eyebrow">Creator</p>
        <h2>${escapeHtml(creator.displayName)}</h2>
        <p>${escapeHtml(creator.summary)}</p>
      </header>
      <div class="tag-list">${creator.roles.map((role) => `<span>${escapeHtml(role)}</span>`).join('')}</div>
      <section class="composition-note"><h3>관련 작품</h3>${renderWorkChips(creator.works)}</section>
      <section class="composition-note"><h3>관련 공연</h3>${renderConcertChips(creator.concerts)}</section>
      <section class="composition-note"><h3>관련 Classes</h3>${renderClassChips(creator.classes)}</section>
      <section class="composition-note"><h3>관련 Columns</h3>${renderColumnChips(creator.columns)}</section>
    </article>
  `
}

const renderConcertDetail = (concert) => {
  const detail = document.querySelector('[data-product-detail]')
  if (!detail) return

  setDetail(concert, 'concert', concert.title, 'concert_view')
  detail.innerHTML = `
    <article class="product-detail-card">
      <header>
        <p class="eyebrow">Concert Preview</p>
        <h2>${escapeHtml(concert.title)}</h2>
        <p>${escapeHtml(concert.summary)}</p>
      </header>
      <dl class="composition-facts">
        <div><dt>일정</dt><dd>${escapeHtml(concert.dateLabel)}</dd></div>
        <div><dt>장소</dt><dd>${escapeHtml(concert.venue)}</dd></div>
        <div><dt>지역</dt><dd>${escapeHtml(concert.city)}</dd></div>
      </dl>
      <section class="composition-note"><h3>오늘은 이 지점만 들어보세요</h3><p>${escapeHtml(concert.listeningPoint)}</p></section>
      <section class="composition-note"><h3>연결된 작품</h3>${renderWorkChips(concert.works)}</section>
      <section class="composition-note"><h3>Creators</h3>${renderCreatorChips(concert.creators)}</section>
      <section class="composition-note"><h3>관련 Columns</h3>${renderColumnChips(concert.columns)}</section>
    </article>
  `
}

const renderClassDetail = (classItem) => {
  const detail = document.querySelector('[data-product-detail]')
  if (!detail) return

  setDetail(classItem, 'class', classItem.title, 'class_view')
  detail.innerHTML = `
    <article class="product-detail-card">
      <header>
        <p class="eyebrow">Class</p>
        <h2>${escapeHtml(classItem.title)}</h2>
        <p>${escapeHtml(classItem.summary)}</p>
      </header>
      <dl class="composition-facts">
        <div><dt>유형</dt><dd>${escapeHtml(classItem.type)}</dd></div>
        <div><dt>형식</dt><dd>${escapeHtml(classItem.format)}</dd></div>
        <div><dt>수준</dt><dd>${escapeHtml(classItem.level)}</dd></div>
      </dl>
      <section class="composition-note">
        <h3>학습 경로</h3>
        <ul class="limit-list">
          ${classItem.outline.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </section>
      <section class="composition-note"><h3>강사/Creator</h3>${renderCreatorChips(classItem.creators)}</section>
      <section class="composition-note"><h3>관련 작품</h3>${renderWorkChips(classItem.works)}</section>
      <section class="composition-note"><h3>관련 Columns</h3>${renderColumnChips(classItem.columns)}</section>
    </article>
  `
}

const pageConfig = {
  works: {
    items: works,
    param: 'work',
    select: (slug) => works.find((item) => item.slug === slug) ?? works[0],
    renderDetail: renderWorkDetail,
    labelKey: 'genre'
  },
  creators: {
    items: creators,
    param: 'creator',
    select: (slug) => creators.find((item) => item.slug === slug) ?? creators[0],
    renderDetail: renderCreatorDetail,
    labelKey: 'displayName'
  },
  concerts: {
    items: concerts,
    param: 'concert',
    select: (slug) => concerts.find((item) => item.slug === slug) ?? concerts[0],
    renderDetail: renderConcertDetail,
    labelKey: 'dateLabel'
  },
  classes: {
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
