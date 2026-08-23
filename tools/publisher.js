const storageKey = 'in-c-publisher-draft-v1'

const form = document.querySelector('[data-publish-form]')
const titleInput = document.querySelector('[data-publish-title]')
const slugInput = document.querySelector('[data-publish-slug]')
const dateInput = document.querySelector('[data-publish-date]')
const summaryInput = document.querySelector('[data-publish-summary]')
const categoryInput = document.querySelector('[data-publish-category]')
const tagsInput = document.querySelector('[data-publish-tags]')
const bodyInput = document.querySelector('[data-publish-body]')
const targetInputs = [...document.querySelectorAll('[data-publish-target]')]
const packagePreview = document.querySelector('[data-publish-package]')
const draftState = document.querySelector('[data-draft-state]')
const targetCount = document.querySelector('[data-target-count]')
const copyButton = document.querySelector('[data-copy-package]')
const resetButton = document.querySelector('[data-reset-draft]')

const today = () => new Date().toISOString().slice(0, 10)

const slugify = (value) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

const getTargets = () =>
  targetInputs.filter((input) => input.checked).map((input) => input.value)

const getTags = () =>
  tagsInput.value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

const getPackage = () => ({
  version: 1,
  source: 'in-c-publisher',
  canonical: {
    site: 'in-c',
    slug: slugInput.value.trim(),
    path: `columns/${slugInput.value.trim()}.html`
  },
  post: {
    status: 'draft',
    title: titleInput.value.trim(),
    slug: slugInput.value.trim(),
    publishedAt: dateInput.value,
    category: categoryInput.value,
    tags: getTags(),
    summary: summaryInput.value.trim(),
    body: bodyInput.value.trim()
  },
  distribution: getTargets().map((target) => ({
    target,
    state: target === 'in-c' ? 'ready' : 'adapter-needed'
  }))
})

const render = () => {
  if (!slugInput.value.trim() && titleInput.value.trim()) {
    slugInput.value = slugify(titleInput.value)
  }

  if (!dateInput.value) {
    dateInput.value = today()
  }

  const selectedTargets = getTargets()
  targetCount.textContent = `${selectedTargets.length}개`
  packagePreview.textContent = JSON.stringify(getPackage(), null, 2)
}

const saveDraft = () => {
  localStorage.setItem(storageKey, JSON.stringify(getPackage()))
  draftState.textContent = `저장됨 ${new Date().toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit'
  })}`
}

const copyText = async (value) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const field = document.createElement('textarea')
  field.value = value
  field.setAttribute('readonly', '')
  field.style.position = 'fixed'
  field.style.opacity = '0'
  document.body.append(field)
  field.select()
  document.execCommand('copy')
  field.remove()
}

const loadDraft = () => {
  const saved = localStorage.getItem(storageKey)

  if (!saved) {
    dateInput.value = today()
    render()
    return
  }

  try {
    const draft = JSON.parse(saved)
    const post = draft.post ?? {}
    titleInput.value = post.title ?? ''
    slugInput.value = post.slug ?? ''
    dateInput.value = post.publishedAt ?? today()
    summaryInput.value = post.summary ?? ''
    categoryInput.value = post.category ?? '작품 듣기'
    tagsInput.value = Array.isArray(post.tags) ? post.tags.join(', ') : ''
    bodyInput.value = post.body ?? ''

    const targets = new Set((draft.distribution ?? []).map((item) => item.target))
    for (const input of targetInputs) {
      input.checked = targets.has(input.value)
    }
    if (getTargets().length === 0) {
      targetInputs[0].checked = true
    }

    draftState.textContent = '저장된 초안'
  } catch {
    dateInput.value = today()
  }

  render()
}

form.addEventListener('input', render)
form.addEventListener('change', render)
form.addEventListener('submit', (event) => {
  event.preventDefault()
  saveDraft()
  render()
})

copyButton.addEventListener('click', async () => {
  await copyText(packagePreview.textContent)
  draftState.textContent = '복사됨'
})

resetButton.addEventListener('click', () => {
  localStorage.removeItem(storageKey)
  form.reset()
  targetInputs[0].checked = true
  dateInput.value = today()
  draftState.textContent = '저장 전'
  render()
})

loadDraft()
