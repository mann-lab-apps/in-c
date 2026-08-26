const landingModel = {
  eyebrow: 'Hyehwa Field Pilot',
  title: '혜화 무료 클래식 파일럿',
  lead:
    '혜화 생활권의 무료·일반공개 클래식 공연을 직접 모아, 공연을 몰랐던 관객에게 전달하고 실제 관람이 일어나는지 검증합니다.',
  formTitle: '무료 공연 제보·협의',
  formDescription:
    '혜화 주변에서 일반인이 무료로 볼 수 있는 클래식 공연이 있다면 알려주세요. in C가 직접 확인하고 사용 허락과 관객 안내 방식을 함께 정리합니다.',
  roles: ['연주자', '주최·기획자', '학과·단체·앙상블', '제보자/기타'],
  states: [
    '혜화 생활권 무료 공연 일정이 확정되어 있어요.',
    '정기적으로 무료·공개 공연을 준비하고 있어요.',
    '당장 일정은 없지만 공급 방식은 논의할 수 있어요.'
  ],
  helpNeeded: [
    '공연명·일시·장소를 확인할 수 있어요.',
    '포스터나 소개문 사용 허락을 논의할 수 있어요.',
    'Instagram 게시물 링크나 태그 기반 전달이 가능해요.',
    '일반인 관객이 더 오는지 결과를 알고 싶어요.',
    '조건이 맞는지 먼저 확인하고 싶어요.'
  ]
}

const themes = [
  {
    id: 'sketch',
    label: 'Excalidraw / Sketch',
    shortLabel: 'Sketch',
    note: 'Mann Lab Games처럼 절제된 rough outline과 불규칙한 hachure 표식을 써서, 화이트보드에 빠르게 구조화한 느낌을 냅니다.',
    marker: '낮은 위압감'
  },
  {
    id: 'notebook',
    label: 'Rehearsal Notebook',
    shortLabel: 'Notebook',
    note: '리허설 악보, 연필 표시, 마진 메모가 섞인 작업 노트. 현재 1순위 추천안입니다.',
    marker: '1순위 추천'
  },
  {
    id: 'editorial',
    label: 'Quiet Editorial',
    shortLabel: 'Editorial',
    note: '독립 잡지처럼 조용하고 긴 호흡. 문화적 신뢰와 자기 언어를 강조합니다.',
    marker: '읽히는 신뢰'
  },
  {
    id: 'arts',
    label: 'Modern Arts Platform',
    shortLabel: 'Arts',
    note: '문화예술 플랫폼처럼 선명하고 정제된 표면. 연주회 홍보의 전문성과 전환력을 우선합니다.',
    marker: '전문적 인상'
  },
  {
    id: 'utility',
    label: 'Small SaaS / Utility',
    shortLabel: 'Utility',
    note: '작은 운영 도구처럼 명확한 입력과 상태를 중심에 둡니다. MVP 접수에는 가장 빠릅니다.',
    marker: '가장 명확함'
  },
  {
    id: 'archive',
    label: 'Card Catalog / Archive',
    shortLabel: 'Archive',
    note: '도서관 카드와 프로그램 노트의 감각. 장기적으로 작품, 사람, 연주회 연결에 강합니다.',
    marker: '연결 구조'
  }
]

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function renderOptionList(items, type) {
  return items
    .map(
      (item, index) => `
        <label class="theme-preview-option">
          <input ${index === 0 ? 'checked' : ''} disabled type="${type}" />
          <span>${escapeHtml(item)}</span>
        </label>
      `
    )
    .join('')
}

function renderInterestForm(theme) {
  const roleOptions = landingModel.roles
    .map((role) => `<option>${escapeHtml(role)}</option>`)
    .join('')

  return `
    <section class="theme-preview-form" aria-labelledby="${theme.id}-form-title">
      <header class="theme-preview-form__head">
        <p class="eyebrow">Supply</p>
        <h3 id="${theme.id}-form-title">${escapeHtml(landingModel.formTitle)}</h3>
        <p>${escapeHtml(landingModel.formDescription)}</p>
      </header>
      <form aria-label="${escapeHtml(theme.label)} 공연 제보 미리보기">
        <fieldset disabled>
          <legend>연락 주체</legend>
          <label>
            <span>이름 또는 단체명</span>
            <input placeholder="김인씨" type="text" />
          </label>
          <label>
            <span>역할</span>
            <select>
              <option>선택해 주세요</option>
              ${roleOptions}
            </select>
          </label>
          <label>
            <span>전화</span>
            <input placeholder="010-0000-0000" type="tel" />
          </label>
          <label>
            <span>이메일</span>
            <input placeholder="inc@example.com" type="email" />
          </label>
          <label>
            <span>인스타 ID</span>
            <input placeholder="@in_c" type="text" />
          </label>
          <p class="theme-preview-note">전화, 이메일, 인스타 ID 중 하나 이상 입력해 주세요.</p>
        </fieldset>
        <fieldset disabled>
          <legend>공급 상태</legend>
          <div class="theme-preview-options">
            ${renderOptionList(landingModel.states, 'radio')}
          </div>
          <div class="theme-preview-options">
            ${renderOptionList(landingModel.helpNeeded, 'checkbox')}
          </div>
          <label class="theme-preview-wide">
            <span>공연 정보 또는 비고</span>
            <textarea rows="4" placeholder="공연명, 날짜, 장소, 인스타 링크, 무료/공개 여부를 적어주세요."></textarea>
          </label>
        </fieldset>
        <div class="theme-preview-actions">
          <button type="button">공연 제보 남기기</button>
          <button type="button">초기화</button>
        </div>
      </form>
    </section>
  `
}

function renderWorkspaceMock(theme) {
  return `
    <aside class="theme-preview-workspace" aria-label="${escapeHtml(theme.label)} 시각 메모">
      <p class="theme-preview-stamp">${escapeHtml(theme.marker)}</p>
      <div class="theme-preview-staff" aria-hidden="true">
        <span></span><span></span><span></span><span></span><span></span>
      </div>
      <div class="theme-preview-sketch-board" aria-hidden="true">
        <span class="theme-preview-sketch-shape theme-preview-sketch-shape--diamond"></span>
        <span class="theme-preview-sketch-shape theme-preview-sketch-shape--circle"></span>
        <span class="theme-preview-sketch-shape theme-preview-sketch-shape--rect"></span>
      </div>
      <p class="theme-preview-margin">관객에게 들릴 말</p>
      <dl>
        <div>
          <dt>Target</dt>
          <dd>처음 오는 애호가</dd>
        </div>
        <div>
          <dt>Copy</dt>
          <dd>어렵지 않게, 하지만 가볍지 않게</dd>
        </div>
        <div>
          <dt>Channel</dt>
          <dd>인스타 / 커뮤니티 / 지인 공유</dd>
        </div>
      </dl>
    </aside>
  `
}

function renderThemeDemo(theme) {
  return `
    <section
      id="theme-${theme.id}"
      class="theme-demo theme-demo--${theme.id}"
      data-theme-demo="${theme.id}"
      aria-labelledby="${theme.id}-title"
    >
      <div class="theme-demo__intro">
        <p class="theme-demo__kicker">${escapeHtml(theme.label)}</p>
        <h2 id="${theme.id}-title">${escapeHtml(theme.shortLabel)}</h2>
        <p>${escapeHtml(theme.note)}</p>
      </div>
      <div class="theme-demo__surface">
        <header class="theme-preview-header">
          <a class="brand" href="./index.html" aria-label="in C home">
            <img src="./assets/icon.svg" width="36" height="36" alt="" />
            <span>in C</span>
          </a>
          <nav aria-label="${escapeHtml(theme.label)} 미리보기 링크">
            <a href="#theme-${theme.id}">관심 등록</a>
            <a href="#theme-${theme.id}">고지</a>
          </nav>
        </header>
        <div class="theme-preview-hero">
          <div class="theme-preview-copy">
            <p class="eyebrow">${escapeHtml(landingModel.eyebrow)}</p>
            <h3>${escapeHtml(landingModel.title)}</h3>
            <p>${escapeHtml(landingModel.lead)}</p>
          </div>
          ${renderWorkspaceMock(theme)}
        </div>
        ${renderInterestForm(theme)}
      </div>
    </section>
  `
}

const nav = document.querySelector('[data-theme-nav]')
const stack = document.querySelector('[data-theme-stack]')

if (nav && stack) {
  nav.innerHTML = themes
    .map(
      (theme) =>
        `<a href="#theme-${theme.id}">${escapeHtml(theme.shortLabel)}</a>`
    )
    .join('')
  stack.innerHTML = themes.map(renderThemeDemo).join('')
}
