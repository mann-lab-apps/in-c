const categories = [
  { id: 'all', label: '전체' },
  { id: 'play', label: '놀이' },
  { id: 'lullaby', label: '자장가' },
  { id: 'season', label: '계절' },
  { id: 'language', label: '말놀이' },
  { id: 'round', label: '돌림노래' }
]

const songs = [
  {
    title: 'Frere Jacques',
    category: 'round',
    origin: '프랑스 전승 돌림노래',
    meter: '4/4',
    range: '좁은 음역',
    tags: ['반복', '돌림노래', '아침'],
    note: '같은 문장이 두 번 반복된 뒤 높은 자리로 이동해 아이들이 구조를 빨리 따라잡습니다.'
  },
  {
    title: 'Ah! vous dirai-je, maman',
    category: 'play',
    origin: '18세기 프랑스 선율',
    meter: '4/4',
    range: '한 옥타브 안팎',
    tags: ['반복', '변주', '별'],
    note: '두 마디 단위의 질문과 대답이 분명해 새 가사를 얹는 연습에 좋습니다.'
  },
  {
    title: '섬집 아기',
    category: 'lullaby',
    origin: '한국 창작 동요',
    meter: '6/8',
    range: '완만한 곡선',
    tags: ['자장가', '바다', '호흡'],
    note: '긴 호흡과 부드러운 흔들림이 장면을 먼저 만들고, 말은 그 위에 천천히 놓입니다.'
  },
  {
    title: '나비야',
    category: 'season',
    origin: '독일 전승 선율 기반',
    meter: '2/4',
    range: '짧은 동기 반복',
    tags: ['봄', '관찰', '동물'],
    note: '짧은 부름말을 반복하기 쉬워 계절 관찰 수업과 연결하기 좋습니다.'
  },
  {
    title: '곰 세 마리',
    category: 'language',
    origin: '한국 구전 놀이 노래',
    meter: '4/4',
    range: '말 리듬 중심',
    tags: ['가족', '말놀이', '캐릭터'],
    note: '인물마다 성격을 바꾸는 구조라 리듬보다 발음과 억양 놀이가 먼저 살아납니다.'
  },
  {
    title: 'Rain, Rain, Go Away',
    category: 'play',
    origin: '영미권 전승 동요',
    meter: '2/4',
    range: '짧은 하행',
    tags: ['비', '놀이', '반복'],
    note: '단순한 청유형 문장이 반복되어 날씨, 움직임, 이름 바꾸기 활동으로 확장됩니다.'
  }
]

const seededThreads = [
  {
    title: '비 오는 날에는 의성어를 먼저 정하면 좋을까요?',
    category: '작곡 초안',
    body: '톡톡, 후두둑, 사락 같은 말을 먼저 정하고 선율을 붙이는 방식으로 실험 중입니다.'
  },
  {
    title: '돌림노래를 처음 설명할 때 쓸 만한 예시',
    category: '수업 후기',
    body: 'Frere Jacques는 두 팀으로 나눠도 시작 위치가 분명해서 첫 활동으로 안정적이었습니다.'
  }
]

const threadStorageKey = 'inc:nursery-lab:threads'

const state = {
  category: 'all',
  query: '',
  draft: null,
  threads: [...seededThreads, ...loadThreads()]
}

function loadThreads() {
  try {
    const parsed = JSON.parse(localStorage.getItem(threadStorageKey) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveThreads() {
  localStorage.setItem(
    threadStorageKey,
    JSON.stringify(state.threads.filter((thread) => !seededThreads.includes(thread)))
  )
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function renderCategories() {
  const target = document.querySelector('[data-nursery-categories]')
  if (!target) {
    return
  }

  target.replaceChildren(
    ...categories.map((category) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = category.label
      button.dataset.category = category.id
      button.setAttribute('aria-pressed', String(state.category === category.id))
      button.addEventListener('click', () => {
        state.category = category.id
        renderCategories()
        renderCatalog()
      })
      return button
    })
  )
}

function matchesSong(song) {
  const query = state.query.trim().toLowerCase()
  const inCategory = state.category === 'all' || song.category === state.category
  if (!inCategory) {
    return false
  }

  if (!query) {
    return true
  }

  return [song.title, song.origin, song.meter, song.range, song.note, ...song.tags]
    .join(' ')
    .toLowerCase()
    .includes(query)
}

function renderCatalog() {
  const target = document.querySelector('[data-nursery-catalog]')
  if (!target) {
    return
  }

  const visibleSongs = songs.filter(matchesSong)
  if (!visibleSongs.length) {
    target.innerHTML = '<p class="nursery-empty">조건에 맞는 동요가 아직 없습니다.</p>'
    return
  }

  target.innerHTML = visibleSongs
    .map(
      (song) => `
        <article class="nursery-song-card">
          <div class="nursery-song-card__head">
            <span>${escapeHtml(categories.find((category) => category.id === song.category)?.label ?? '동요')}</span>
            <strong>${escapeHtml(song.title)}</strong>
          </div>
          <p>${escapeHtml(song.note)}</p>
          <dl>
            <div><dt>출처</dt><dd>${escapeHtml(song.origin)}</dd></div>
            <div><dt>박자</dt><dd>${escapeHtml(song.meter)}</dd></div>
            <div><dt>음역</dt><dd>${escapeHtml(song.range)}</dd></div>
          </dl>
          <div class="nursery-tags">
            ${song.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}
          </div>
        </article>
      `
    )
    .join('')
}

function getComposeData() {
  const form = document.querySelector('[data-compose-form]')
  const data = new FormData(form)
  return {
    scene: data.get('scene')?.toString() ?? '',
    mood: data.get('mood')?.toString() ?? '',
    age: Number(data.get('age') ?? 5),
    lines: Number(data.get('lines') ?? 4),
    keyword: data.get('keyword')?.toString().trim() || '라라'
  }
}

function buildDraft() {
  const data = getComposeData()
  const title = `${data.scene} 노래`
  const repeatRule =
    data.lines <= 4
      ? `마지막 낱말 "${data.keyword}"를 두 번 반복합니다.`
      : `앞 ${Math.ceil(data.lines / 2)}줄은 말놀이, 뒤 ${Math.floor(data.lines / 2)}줄은 같은 선율의 대답으로 둡니다.`

  return {
    title,
    rows: [
      ['대상', `${data.age}세 전후, 한 번 듣고 후렴을 따라 부를 수 있는 길이`],
      ['장면', data.scene],
      ['정서', data.mood],
      ['선율', data.mood.includes('포근') ? '3도 안팎으로 천천히 오르내리는 곡선' : '짧은 동기를 한 음씩 옮기는 반복'],
      ['가사 규칙', repeatRule],
      ['첫 후렴', `${data.keyword}, ${data.keyword}, 우리 같이 불러요`]
    ]
  }
}

function renderDraft() {
  state.draft = buildDraft()

  const title = document.querySelector('[data-draft-title]')
  const body = document.querySelector('[data-draft-body]')
  if (title) {
    title.textContent = state.draft.title
  }
  if (body) {
    body.innerHTML = state.draft.rows
      .map(([term, description]) => `<div><dt>${escapeHtml(term)}</dt><dd>${escapeHtml(description)}</dd></div>`)
      .join('')
  }
}

function renderRangeLabels() {
  const age = document.querySelector('[data-age-range]')
  const ageLabel = document.querySelector('[data-age-label]')
  const lines = document.querySelector('[data-line-range]')
  const lineLabel = document.querySelector('[data-line-label]')

  if (age && ageLabel) {
    ageLabel.textContent = `${age.value}세`
  }
  if (lines && lineLabel) {
    lineLabel.textContent = `${lines.value}줄`
  }
}

function renderThreads() {
  const target = document.querySelector('[data-thread-list]')
  if (!target) {
    return
  }

  target.innerHTML = state.threads
    .map(
      (thread) => `
        <article class="nursery-thread">
          <span>${escapeHtml(thread.category)}</span>
          <h3>${escapeHtml(thread.title)}</h3>
          <p>${escapeHtml(thread.body)}</p>
        </article>
      `
    )
    .join('')
}

function bindSearch() {
  const search = document.querySelector('[data-nursery-search]')
  if (!search) {
    return
  }

  search.addEventListener('input', () => {
    state.query = search.value
    renderCatalog()
  })
}

function bindComposer() {
  const form = document.querySelector('[data-compose-form]')
  if (!form) {
    return
  }

  form.addEventListener('input', () => {
    renderRangeLabels()
    renderDraft()
  })

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    renderRangeLabels()
    renderDraft()
  })

  document.querySelector('[data-share-draft]')?.addEventListener('click', () => {
    renderDraft()
    const form = document.querySelector('[data-share-form]')
    if (!form || !state.draft) {
      return
    }

    form.elements.title.value = state.draft.title
    form.elements.category.value = '작곡 초안'
    form.elements.body.value = state.draft.rows
      .map(([term, description]) => `${term}: ${description}`)
      .join('\n')
    form.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
  })
}

function bindShareForm() {
  const form = document.querySelector('[data-share-form]')
  if (!form) {
    return
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const data = new FormData(form)
    state.threads.unshift({
      title: data.get('title')?.toString().trim() ?? '',
      category: data.get('category')?.toString() ?? '작곡 초안',
      body: data.get('body')?.toString().trim() ?? ''
    })
    saveThreads()
    renderThreads()
    form.reset()
  })
}

renderCategories()
renderCatalog()
renderRangeLabels()
renderDraft()
renderThreads()
bindSearch()
bindComposer()
bindShareForm()
