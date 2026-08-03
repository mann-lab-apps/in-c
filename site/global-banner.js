import { concerts } from './product-data.js'

const POSTER_SEQUENCE_LENGTH = 18

const getRootRelativeHref = (fileName) => {
  const isNestedColumnPage = window.location.pathname.includes('/columns/')
  return `${isNestedColumnPage ? '../' : './'}${fileName}`
}

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const getPosterEntries = () => {
  const fallbackImageSrc = getRootRelativeHref('social-preview.png')
  const entries = concerts.map((concert) => ({
    title: concert.title,
    meta: [concert.dateLabel, concert.venue].filter(Boolean).join(' · '),
    description: concert.summary,
    imageSrc: concert.posterImage ?? fallbackImageSrc,
    imageAlt: concert.posterAlt ?? `${concert.title} 공연 포스터`,
    href: concert.externalUrl ?? getRootRelativeHref('concerts.html')
  }))

  return entries.length > 0
    ? Array.from(
        { length: POSTER_SEQUENCE_LENGTH },
        (_, index) => entries[index % entries.length]
      )
    : [
        {
          title: 'in C Concerts',
          meta: '공연 프리뷰',
          description: '공연을 작품과 감상 질문 곁에서 소개합니다.',
          imageSrc: fallbackImageSrc,
          imageAlt: 'in C 공연 포스터',
          href: getRootRelativeHref('concerts.html')
        }
      ]
}

const createPoster = (poster, index) => {
  const item = document.createElement('li')
  item.className = 'global-ad-banner__poster'

  const button = document.createElement('button')
  button.className = 'global-ad-banner__poster-button'
  button.type = 'button'
  button.dataset.posterIndex = String(index)
  button.setAttribute('aria-label', `${poster.title} 포스터 크게 보기`)

  const image = document.createElement('img')
  image.src = poster.imageSrc
  image.alt = poster.imageAlt
  image.loading = 'lazy'
  image.decoding = 'async'
  image.width = 72
  image.height = 96

  button.append(image)
  item.append(button)
  return item
}

export const initGlobalBanner = () => {
  const header = document.querySelector('.site-header')
  const main = document.querySelector('main')

  if (!header || !main || document.querySelector('[data-global-ad-banner]')) {
    return
  }

  const banner = document.createElement('aside')
  banner.className = 'global-ad-banner'
  banner.dataset.globalAdBanner = ''
  banner.setAttribute('aria-label', '공연 포스터')

  const posters = getPosterEntries()
  const posterItems = [...posters, ...posters].map((poster, index) =>
    createPoster(poster, index % posters.length)
  )
  banner.innerHTML = `
    <div class="global-ad-banner__rail" aria-label="흘러가는 공연 포스터 목록">
      <ul class="global-ad-banner__posters"></ul>
    </div>
  `

  banner.querySelector('.global-ad-banner__posters')?.append(...posterItems)
  header.before(banner)

  const dialog = document.createElement('dialog')
  dialog.className = 'global-ad-modal'
  dialog.dataset.globalAdModal = ''
  document.body.append(dialog)

  const closeModal = () => {
    if (typeof dialog.close === 'function' && dialog.open) {
      dialog.close()
      return
    }

    dialog.removeAttribute('open')
  }

  const openModal = (poster) => {
    dialog.innerHTML = `
      <button class="global-ad-modal__close" type="button" aria-label="확대 포스터 닫기">
        닫기
      </button>
      <div class="global-ad-modal__body">
        <img src="${escapeHtml(poster.imageSrc)}" alt="${escapeHtml(poster.imageAlt)}" />
        <div class="global-ad-modal__copy">
          <p class="global-ad-modal__eyebrow">Concert Poster</p>
          <h2>${escapeHtml(poster.title)}</h2>
          <p class="global-ad-modal__meta">${escapeHtml(poster.meta)}</p>
          <p>${escapeHtml(poster.description)}</p>
          <a
            class="button button--primary"
            data-track-event="global_ad_banner_click"
            data-track-location="global_banner_modal"
            href="${escapeHtml(poster.href)}"
          >공연 보기</a>
        </div>
      </div>
    `

    dialog
      .querySelector('.global-ad-modal__close')
      ?.addEventListener('click', closeModal)

    if (typeof dialog.showModal === 'function') {
      dialog.showModal()
      return
    }

    dialog.setAttribute('open', '')
  }

  banner.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) {
      return
    }

    const button = event.target.closest('[data-poster-index]')

    if (!(button instanceof HTMLElement)) {
      return
    }

    const poster = posters[Number(button.dataset.posterIndex)]

    if (poster) {
      openModal(poster)
    }
  })

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      closeModal()
    }
  })
}
