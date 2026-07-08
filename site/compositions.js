const catalogUrl = new URL('./compositions-catalog.json', import.meta.url)

const statusLabels = {
  available: '공개됨',
  planned: '등록 예정'
}

const params = new URLSearchParams(window.location.search)
const selectedSlug = params.get('score')

const formatList = (items) =>
  items.length > 0 ? items.map((item) => `<span>${item}</span>`).join('') : '<span>연결 전</span>'

const createAction = (label, url, type) => {
  if (!url) {
    return `<button class="button button--secondary" type="button" disabled>${label} 준비 중</button>`
  }

  return `<a class="button ${type === 'primary' ? 'button--primary' : 'button--secondary'}" href="${url}">${label}</a>`
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
        <p class="eyebrow">${statusLabels[composition.status] ?? composition.status}</p>
        <h2>${composition.title}</h2>
        <p>${composition.subtitle}</p>
      </div>
      <dl class="composition-facts">
        <div><dt>난이도</dt><dd>${composition.difficulty}</dd></div>
        <div><dt>조성</dt><dd>${composition.key}</dd></div>
        <div><dt>박자</dt><dd>${composition.meter}</dd></div>
        <div><dt>출처</dt><dd>${composition.source}</dd></div>
      </dl>
      <div class="composition-actions" aria-label="악보 열기와 다운로드">
        ${createAction('PDF 다운로드', composition.assets.pdf, 'primary')}
        ${createAction('MusicXML 다운로드', composition.assets.musicxml, 'secondary')}
        ${createAction('Chromatics에서 열기', composition.assets.chromatics, 'secondary')}
      </div>
      <section class="composition-note" aria-labelledby="copyright-title">
        <h3 id="copyright-title">저작권/출처 확인 메모</h3>
        <p>${composition.copyrightNote}</p>
      </section>
      <section class="composition-note" aria-labelledby="column-title">
        <h3 id="column-title">관련 Columns</h3>
        <div class="tag-list">${formatList(composition.relatedColumns)}</div>
      </section>
    </article>
  `
}

const renderCompositionList = (compositions) => {
  const list = document.querySelector('[data-composition-list]')

  if (!list) {
    return
  }

  list.replaceChildren(
    ...compositions.map((composition) => {
      const card = document.createElement('article')
      card.className = 'composition-card'
      card.innerHTML = `
        <div class="composition-card__head">
          <div>
            <p class="eyebrow">${statusLabels[composition.status] ?? composition.status}</p>
            <h3>${composition.title}</h3>
            <p>${composition.subtitle}</p>
          </div>
          <span>${composition.difficulty}</span>
        </div>
        <dl class="composition-card__facts">
          <div><dt>조성</dt><dd>${composition.key}</dd></div>
          <div><dt>박자</dt><dd>${composition.meter}</dd></div>
        </dl>
        <div class="tag-list">${formatList(composition.tags)}</div>
        <a class="button button--secondary" href="?score=${composition.slug}">상세 보기</a>
      `
      return card
    })
  )
}

const init = async () => {
  const response = await fetch(catalogUrl)
  const catalog = await response.json()
  const compositions = catalog.compositions ?? []

  renderCompositionList(compositions)
  renderCompositionDetail(
    compositions.find((composition) => composition.slug === selectedSlug) ?? compositions[0]
  )
}

init().catch(() => {
  const list = document.querySelector('[data-composition-list]')
  if (list) {
    list.innerHTML = '<p>악보 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>'
  }
})
